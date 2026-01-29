// - Updated to fetch Requirements column
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs'); 
const path = require('path');
const { supabase } = require('../config/supabase');
const { transporter, ALLIANZ_HO_EMAIL } = require('../config/mailer');
const {
    calculateNextPaymentDate,
    uploadFileToSupabase,
    uploadBufferToSupabase,
    generateApplicationPDF
} = require('../utils/helpers');

// Multer Configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type'));
    }
});

// --- EXISTING ENDPOINTS ---

router.get('/health', (req, res) => res.status(200).json({ success: true, status: 'ok' }));

// GET ACTIVE POLICIES
router.get('/policies/active', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('policy')
            .select('policy_id, policy_name, policy_type, form_type, request_type, agency, requirements') // Included requirements here too
            .eq('active_status', true)
            .order('policy_name', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (e) {
        console.error('Error fetching active policies:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 1. CHECK SERIAL
router.get('/serial-numbers/available/:policyType', async (req, res) => {
    try {
        const { policyType } = req.params;
        const typeToSearch = policyType === 'Allianz Well' ? 'Allianz Well' : 'Default';

        const { data, error } = await supabase.from('serial_number')
            .select('*')
            .eq('serial_type', typeToSearch)
            .or('is_issued.is.null,is_issued.eq.false')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("DB Check Error:", error);
            return res.status(500).json({ success: false, message: "DB Error" });
        }

        if (!data) return res.status(404).json({ success: false, message: `No available serials for ${policyType}` });

        res.json({ success: true, requiresSerial: true, serialNumber: data.serial_number.toString() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 2. SUBMIT MONITORING
router.post('/monitoring/submit', async (req, res) => {
    try {
        const body = req.body;
        console.log(`Processing Submission: ${body.policyType} | Serial: ${body.serialNumber}`);

        const MANUAL_POLICIES = ['Eazy Health', 'Allianz Fundamental Cover', 'Allianz Secure Pro'];
        const isManual = MANUAL_POLICIES.includes(body.policyType);

        let finalPolicyId = null;
        const { data: exactMatch } = await supabase.from('policy').select('policy_id').eq('policy_type', body.policyType).maybeSingle();
        if (exactMatch) finalPolicyId = exactMatch.policy_id;
        else {
            const { data: all } = await supabase.from('policy').select('policy_id, policy_type');
            const match = all?.find(p => p.policy_type.trim().toLowerCase() === body.policyType.trim().toLowerCase());
            if (match) finalPolicyId = match.policy_id;
        }
        if (!finalPolicyId) throw new Error(`Policy Type '${body.policyType}' not found.`);

        let profileId = body.profileId || null;
        if (!profileId && body.intermediaryEmail) {
            const { data: profileData } = await supabase.from('profiles').select('id').ilike('email', body.intermediaryEmail.trim()).maybeSingle();
            if (profileData) profileId = profileData.id;
        }

        if (profileId) {
            await supabase.from('profiles').update({ last_submission_at: new Date().toISOString() }).eq('id', profileId);
        }

        let serialId = null;
        if (isManual) {
            const { data: existingSerial } = await supabase.from('serial_number').select('serial_id').eq('serial_number', body.serialNumber).limit(1).maybeSingle();
            if (existingSerial) {
                serialId = existingSerial.serial_id;
                await supabase.from('serial_number').update({ is_issued: true }).eq('serial_id', serialId);
            } else {
                const { data: newSerial, error: createError } = await supabase.from('serial_number')
                    .insert([{
                        serial_number: body.serialNumber,
                        serial_type: 'Manual',
                        is_issued: true,
                        date: new Date().toISOString()
                    }])
                    .select('serial_id')
                    .single();

                if (createError) throw new Error("Failed to register manual serial number: " + createError.message);
                serialId = newSerial.serial_id;
            }
        } else {
            const { data: sysSerial } = await supabase.from('serial_number').select('serial_id').eq('serial_number', body.serialNumber).limit(1).maybeSingle();
            if (!sysSerial) throw new Error(`System Serial ${body.serialNumber} not found/valid in database.`);
            serialId = sysSerial.serial_id;
        }

        const safePremium = parseFloat(body.premiumPaid) || 0;
        const safeANP = parseFloat(body.anp) || 0;

        const { data, error } = await supabase.from('az_submissions').insert([{
            profile_id: profileId,
            client_name: `${body.clientFirstName} ${body.clientLastName}`,
            client_email: body.clientEmail,
            policy_id: finalPolicyId,
            premium_paid: safePremium,
            anp: safeANP,
            payment_interval: JSON.stringify(body.modeOfPayment),
            mode_of_payment: body.modeOfPayment,
            serial_id: serialId,
            issued_at: new Date().toISOString(),
            submission_type: body.submissionType,
            status: 'Pending',
            next_payment_date: calculateNextPaymentDate(body.policyDate, body.modeOfPayment),
            attachments: []
        }]).select().single();

        if (error) throw error;
        if (!isManual && body.serialNumber) await supabase.from('serial_number').update({ is_issued: true }).eq('serial_number', body.serialNumber);

        res.status(201).json({ success: true, data: { ...data, serial_number: body.serialNumber } });
    } catch (e) {
        console.error("SERVER ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 3. GET DETAILS (Fixed: Select Requirements)
router.get('/submissions/details/:serialNumber', async (req, res) => {
    try {
        const { serialNumber } = req.params;
        let { data: sData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', serialNumber).limit(1).maybeSingle();

        if (!sData && serialNumber.length === 9) {
            const parentSerial = serialNumber.slice(0, 8);
            const { data: parentData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', parentSerial).limit(1).maybeSingle();
            if (parentData) sData = parentData;
        }

        if (!sData) return res.status(404).json({ success: false, message: 'Serial not found' });

        // --- UPDATED QUERY TO INCLUDE requirements ---
        const { data: sub } = await supabase.from('az_submissions')
            .select(`*, policy (policy_type, requirements), profiles (first_name, last_name)`)
            .eq('serial_id', sData.serial_id).limit(1).maybeSingle();

        if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

        const nameParts = (sub.client_name || '').split(' ');
        res.json({ 
            success: true, 
            data: { 
                clientFirstName: nameParts[0], 
                clientLastName: nameParts.slice(1).join(' '), 
                clientEmail: sub.client_email, 
                policyType: sub.policy?.policy_type, 
                modeOfPayment: sub.mode_of_payment, 
                policyDate: sub.issued_at,
                requirements: sub.policy?.requirements // Pass requirements to frontend
            } 
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 4. PREVIEW APPLICATION
router.post('/preview-application', async (req, res) => {
    try {
        const { formData, serialNumber } = req.body;
        const pdfBuffer = await generateApplicationPDF(formData, serialNumber);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. DOCUMENT SUBMISSIONS
router.get('/form-submissions', async (req, res) => {
    try {
        let query = supabase.from('az_submissions').select('*').order('issued_at', { ascending: false });
        if (req.query.profileId) query = query.eq('profile_id', req.query.profileId);
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// - Updated POST /form-submissions to fix Upload Error

router.post('/form-submissions', upload.any(), async (req, res) => {
    try {
        const { serialNumber, formData } = req.body;
        const parsedData = JSON.parse(formData || '{}');
        let serialIdToUse = null;
        let isMigration = false;

        let { data: serialData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', serialNumber).limit(1).maybeSingle();

        if (!serialData && serialNumber.length === 9) {
            const parentSerial = serialNumber.slice(0, 8);
            const { data: parentData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', parentSerial).limit(1).maybeSingle();
            if (parentData) {
                serialData = parentData;
                isMigration = true;
            }
        }

        if (!serialData) return res.status(404).json({ message: 'Serial not found' });
        serialIdToUse = serialData.serial_id;

        const { data: existing } = await supabase.from('az_submissions').select('*').eq('serial_id', serialIdToUse).limit(1).maybeSingle();
        if (!existing) return res.status(404).json({ message: 'Submission not found' });

        if (isMigration) {
            console.log(`Migrating Serial ID ${serialIdToUse}: 8-digits -> ${serialNumber}`);
            await supabase.from('serial_number').update({ serial_number: serialNumber }).eq('serial_id', serialIdToUse);
        }

        const newFilesForDB = [];
        const emailAttachments = [];

        // 1. Handle User Uploaded Files
        if (req.files) {
            for (const f of req.files) {
                try {
                    const fileData = await uploadFileToSupabase(f, existing.sub_id);
                    newFilesForDB.push(fileData);
                    emailAttachments.push({ filename: f.originalname, content: f.buffer });
                } catch (e) { console.error('Upload error', e); }
            }
        }

        // 2. Generate PDF
        const pdfBuffer = await generateApplicationPDF(parsedData, serialNumber);
        
        // --- FIX: SEPARATE FILENAMES ---
        
        // A. Safe Name for Database (No brackets, no commas)
        // Turns "Application [123, John].pdf" into "Application_123_John.pdf"
        const cleanName = existing.client_name.replace(/[^a-zA-Z0-9]/g, '_'); 
        const storageFilename = `Application_${serialNumber}_${cleanName}.pdf`;

        // B. Pretty Name for Email (Keeps your desired format)
        const emailFilename = `Application [${serialNumber}, ${existing.client_name}].pdf`;

        // Upload using SAFE name
        const pdfUpload = await uploadBufferToSupabase(pdfBuffer, storageFilename, existing.sub_id);
        newFilesForDB.push(pdfUpload);
        const generatedPdfUrl = pdfUpload.fileUrl;

        // Attach to email using PRETTY name
        emailAttachments.push({ filename: emailFilename, content: pdfBuffer });

        // -------------------------------

        const { data: updated, error } = await supabase.from('az_submissions').update({
            form_type: parsedData.formType, mode_of_payment: parsedData.modeOfPayment,
            attachments: [...(existing.attachments || []), ...newFilesForDB]
        }).eq('sub_id', existing.sub_id).select().single();

        if (error) throw error;

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: ALLIANZ_HO_EMAIL,
                subject: `Submission: ${serialNumber} - ${existing.client_name}`,
                text: `New Application Received.\n\nSerial: ${serialNumber}\nClient: ${existing.client_name}\n\nDocuments attached.`,
                attachments: emailAttachments
            });
        } catch (err) { console.error("❌ Email failed:", err); }

        res.json({ success: true, data: updated, generatedPdfUrl });
    } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// MONITORING & CUSTOMERS
router.get('/monitoring/all', async (req, res) => {
    let query = supabase.from('az_submissions').select(`*, policy (policy_type), serial_number (serial_number), profiles (first_name, last_name), agency (name)`).order('issued_at', { ascending: false });
    if (req.query.profileId) query = query.eq('profile_id', req.query.profileId);
    const { data } = await query;
    const flattened = (data || []).map(i => ({
        ...i, id: i.sub_id, policy_type: i.policy?.policy_type, serial_number: i.serial_number?.serial_number,
        intermediary_name: i.profiles ? `${i.profiles.first_name || ''} ${i.profiles.last_name || ''}`.trim() : 'Unknown',
        agency: i.agency?.name, created_at: i.issued_at
    }));
    res.json({ success: true, data: flattened });
});

router.get('/customers', async (req, res) => {
    try {
        if (!req.query.profileId) return res.json({ success: true, data: [] });
        const { data } = await supabase.from('az_submissions')
            .select(`*, policy (policy_type), serial_number (serial_number), agency(name), payment_history(*)`)
            .eq('profile_id', req.query.profileId);
        const map = {};
        (data || []).forEach(s => {
            if (s.client_email) {
                if (!map[s.client_email]) {
                    map[s.client_email] = {
                        id: s.sub_id, first_name: s.client_name.split(' ')[0], last_name: s.client_name.split(' ').slice(1).join(' '),
                        email: s.client_email, submissions: []
                    };
                }
                map[s.client_email].submissions.push({ ...s, policy_type: s.policy?.policy_type, serial_number: s.serial_number?.serial_number, agency: s.agency?.name, payment_history: s.payment_history || [] });
            }
        });
        res.json({ success: true, data: Object.values(map) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/submissions/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: policy } = await supabase.from('az_submissions').select('*').eq('sub_id', id).limit(1).maybeSingle();
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

        let totalPremium = policy.premium_paid;
        if (typeof totalPremium === 'string') totalPremium = parseFloat(totalPremium.replace(/,/g, ''));
        
        let installmentAmount = totalPremium;
        if (policy.mode_of_payment === 'Monthly') installmentAmount = totalPremium / 12;
        else if (policy.mode_of_payment === 'Quarterly') installmentAmount = totalPremium / 4;
        else if (policy.mode_of_payment === 'Semi-Annual') installmentAmount = totalPremium / 2;
        installmentAmount = Math.round(installmentAmount * 100) / 100;

        await supabase.from('payment_history').insert([{
            sub_id: id, amount: installmentAmount || 0, period_covered: policy.next_payment_date, payment_date: new Date().toISOString()
        }]);

        const newDueDate = calculateNextPaymentDate(policy.next_payment_date, policy.mode_of_payment);
        await supabase.from('az_submissions').update({ next_payment_date: newDueDate, is_paid: false, ...(policy.status === 'Issued' && !policy.date_issued ? { date_issued: new Date().toISOString() } : {}) }).eq('sub_id', id);

        res.json({ success: true, message: 'Payment recorded successfully', nextDate: newDueDate });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


// --- NEW VSP ENDPOINTS ---

// 6. SEND ATTESTATION EMAIL
router.post('/vsp/send-attestation', async (req, res) => {
    try {
        const inputSerial = String(req.body.serialNumber || '').trim();
        console.log(`[VSP] Processing Attestation for Serial: '${inputSerial}'`);

        if (!inputSerial) return res.status(400).json({ success: false, message: 'Serial Number is missing.' });

        // STEP 1: SMART LOOKUP (Exact or Parent)
        let { data: serialData } = await supabase.from('serial_number').select('serial_id, serial_number').eq('serial_number', inputSerial).maybeSingle();

        if (!serialData && inputSerial.length === 9) {
            const parentSerial = inputSerial.substring(0, 8);
            const { data: parentData } = await supabase.from('serial_number').select('serial_id, serial_number').eq('serial_number', parentSerial).maybeSingle();
            if (parentData) serialData = parentData;
        }

        if (!serialData) {
            return res.status(404).json({ success: false, message: `Serial Number '${inputSerial}' not found. Please submit Monitoring Data first.` });
        }

        // STEP 2: FIND SUBMISSION
        const { data: submission } = await supabase.from('az_submissions')
            .select(`*, profiles (first_name, last_name, email), policy (policy_type)`)
            .eq('serial_id', serialData.serial_id).maybeSingle();

        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found. Please submit Monitoring Data first.' });
        }

        const clientName = submission.client_name;
        const clientEmail = submission.client_email;
        const agentName = `${submission.profiles?.first_name || 'Agent'} ${submission.profiles?.last_name || ''}`.trim();

        if (!clientEmail) return res.status(400).json({ success: false, message: 'Client email missing.' });

        // STEP 3: SEND EMAIL
        // UPDATED: Checks for process.env.BASE_URL first
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000/api'; 
        
        const yesLink = `${baseUrl}/vsp/verify-attestation?serial=${inputSerial}&response=yes&client=${encodeURIComponent(clientName)}`;
        const noLink = `${baseUrl}/vsp/verify-attestation?serial=${inputSerial}&response=no&client=${encodeURIComponent(clientName)}`;

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border:1px solid #ddd; max-width:600px;">
                <h2 style="color:#0055b8;">VSP Transaction Attestation</h2>
                <p><strong>Ref:</strong> ${inputSerial}</p>
                <hr/>
                <div style="background:#f0f7ff; padding:15px; border-left:4px solid #0055b8; margin:20px 0;">
                    <p style="font-style:italic; margin:0;">"I, <strong>${clientName}</strong>, attest to this transaction with <strong>${agentName}</strong> (Financial Advisor) that this transaction is true and valid."</p>
                </div>
                <p>Do you agree?</p>
                <div style="margin:30px 0;">
                    <a href="${yesLink}" style="background:#28a745; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-right:10px;">YES, I ATTEST</a>
                    <a href="${noLink}" style="background:#dc3545; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold;">NO</a>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: clientEmail,
            cc: submission.profiles?.email,
            subject: `Action Required: Attestation for Transaction ${inputSerial}`,
            html: emailHtml
        });

        res.json({ success: true, message: `Attestation email sent to ${clientEmail}` });

    } catch (e) {
        console.error("[VSP] SERVER ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 7. VERIFY & DOWNLOAD PROOF
router.get('/vsp/verify-attestation', async (req, res) => {
    const { serial, response, client } = req.query;
    const timestamp = new Date().toLocaleString();

    if (response !== 'yes') {
        return res.send(`<div style="font-family:Arial; padding:50px; text-align:center; color:#dc3545;"><h1>DECLINED</h1><p>Attestation Declined for ${serial}.</p></div>`);
    }

    // --- EMBED LOGO 2.PNG ---
    let logoSrc = '';
    try {
        const imagePath = path.join(__dirname, '../../src/assets/2.png'); 
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            logoSrc = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        }
    } catch (e) {
        console.error("[VSP] Error loading logo:", e);
    }

    const proofHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Attestation Proof - ${serial}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f6f8; display: flex; flex-direction: column; align-items: center; padding-top: 50px; }
                .proof-container { background: white; width: 600px; padding: 40px; border: 1px solid #e0e0e0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); position: relative; border-radius: 8px; }
                .stamp { position: absolute; top: 20px; right: 20px; border: 3px solid #28a745; color: #28a745; font-weight: bold; font-size: 20px; padding: 10px 20px; transform: rotate(-10deg); border-radius: 8px; opacity: 0.8; z-index: 10; }
                .btn-download { margin-top: 20px; padding: 10px 20px; background: #0055b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; transition: background 0.3s; }
                .btn-download:hover { background: #004494; }
                .header-logo { max-height: 50px; margin-bottom: 20px; display: block; }
            </style>
        </head>
        <body>
            <div id="status" style="color:#28a745; font-weight:bold; margin-bottom:15px;">✅ Attestation Recorded! Downloading proof...</div>
            <div class="proof-container" id="capture-area">
                ${logoSrc ? `<img src="${logoSrc}" class="header-logo" alt="Logo" />` : ''}
                <div class="stamp">OFFICIALLY ATTESTED</div>
                <h2 style="color: #0055b8; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-top: 5px;">VSP Attestation Receipt</h2>
                <table style="width: 100%; margin-top: 20px; font-size: 14px; color: #555;">
                    <tr><td style="width: 140px; font-weight:bold;">Ref Number:</td><td>${serial}</td></tr>
                    <tr><td style="font-weight:bold;">Date Verified:</td><td>${timestamp}</td></tr>
                    <tr><td style="font-weight:bold;">Status:</td><td style="color:#28a745; font-weight:bold;">CONFIRMED</td></tr>
                </table>
                <div style="background-color: #f9f9f9; padding: 25px; border-left: 5px solid #28a745; margin: 30px 0; border-radius: 4px;">
                    <p style="font-size: 18px; font-style: italic; margin: 0; color: #333; line-height: 1.6;">
                        "I, <strong>${client}</strong>, attest to this transaction with the Financial Advisor that this transaction is true and valid."
                    </p>
                </div>
            </div>
            <button onclick="downloadScreenshot()" class="btn-download">Download Again</button>
            <script>
                function downloadScreenshot() {
                    const element = document.getElementById("capture-area");
                    html2canvas(element, { scale: 2 }).then(canvas => {
                        const link = document.createElement('a');
                        link.download = 'Attestation Proof [${serial}, ${client}].png';
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                        document.getElementById("status").innerText = "✅ Proof Downloaded!";
                    });
                }
                window.onload = function() { setTimeout(downloadScreenshot, 800); };
            </script>
        </body>
        </html>
    `;
    res.send(proofHtml);
});

module.exports = router;