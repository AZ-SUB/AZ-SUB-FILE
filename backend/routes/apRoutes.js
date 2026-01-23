const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../config/supabase');
const { transporter, ALLIANZ_HO_EMAIL, createUserTransporter } = require('../config/mailer');
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

// --- ENDPOINTS ---

router.get('/health', (req, res) => res.status(200).json({ success: true, status: 'ok' }));

// GET ACTIVE POLICIES
router.get('/policies/active', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('policy')
            .select('policy_id, policy_name, policy_type, form_type, request_type, agency')
            .eq('active_status', true)
            .order('policy_name', { ascending: true });

        if (error) throw error;

        res.json({ success: true, data: data || [] });
    } catch (e) {
        console.error('Error fetching active policies:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 1. CHECK SERIAL (System Only)
router.get('/serial-numbers/available/:policyType', async (req, res) => {
    try {
        const { policyType } = req.params;
        const typeToSearch = policyType === 'Allianz Well' ? 'Allianz Well' : 'Default';

        // Safety check: Use limit(1) to avoid crashes on duplicates
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

// 2. SUBMIT MONITORING (WITH ACTIVE STATUS TRACKING)
router.post('/monitoring/submit', async (req, res) => {
    try {
        const body = req.body;
        console.log(`Processing Submission: ${body.policyType} | Serial: ${body.serialNumber}`);

        const MANUAL_POLICIES = ['Eazy Health', 'Allianz Fundamental Cover', 'Allianz Secure Pro'];
        const isManual = MANUAL_POLICIES.includes(body.policyType);

        // --- POLICY LOOKUP ---
        let finalPolicyId = null;
        const { data: exactMatch } = await supabase.from('policy').select('policy_id').eq('policy_type', body.policyType).maybeSingle();
        if (exactMatch) finalPolicyId = exactMatch.policy_id;
        else {
            const { data: all } = await supabase.from('policy').select('policy_id, policy_type');
            const match = all?.find(p => p.policy_type.trim().toLowerCase() === body.policyType.trim().toLowerCase());
            if (match) finalPolicyId = match.policy_id;
        }
        if (!finalPolicyId) throw new Error(`Policy Type '${body.policyType}' not found.`);

        // --- PROFILE LOOKUP (CRITICAL FIX) ---
        let profileId = body.profileId || null;

        if (!profileId && body.intermediaryEmail) {
            // Case-insensitive lookup by email
            const { data: profileData } = await supabase.from('profiles')
                .select('id')
                .ilike('email', body.intermediaryEmail.trim())
                .maybeSingle();

            if (profileData) {
                profileId = profileData.id;
                console.log(`Agent Profile Found: ${profileId}`);
            } else {
                console.warn(`Warning: Agent email '${body.intermediaryEmail}' not found in profiles.`);
            }
        }

        // --- UPDATE AGENT ACTIVE STATUS ---
        if (profileId) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ last_submission_at: new Date().toISOString() })
                .eq('id', profileId);

            if (updateError) console.error("Failed to update active status:", updateError.message);
            else console.log("Agent Status Updated to Active");
        }

        // --- SERIAL LOGIC (FIXED) ---
        let serialId = null;
        if (isManual) {
            // Manual: Check exists, if not create
            const { data: existingSerial } = await supabase.from('serial_number').select('serial_id').eq('serial_number', body.serialNumber).limit(1).maybeSingle();
            if (existingSerial) {
                serialId = existingSerial.serial_id;
                await supabase.from('serial_number').update({ is_issued: true }).eq('serial_id', serialId);
            } else {
                // FIX: Ensure insert creates required fields (like date if needed) and captures errors
                const { data: newSerial, error: createError } = await supabase.from('serial_number')
                    .insert([{
                        serial_number: body.serialNumber,
                        serial_type: 'Manual',
                        is_issued: true,
                        date: new Date().toISOString() // Ensure date is present just in case
                    }])
                    .select('serial_id')
                    .single();

                if (createError) {
                    console.error("Manual Serial Creation Failed:", createError);
                    throw new Error("Failed to register manual serial number: " + createError.message);
                }
                serialId = newSerial.serial_id;
            }
        } else {
            // System: Must exist. Using limit(1).maybeSingle() to prevent crash on duplicates
            const { data: sysSerial } = await supabase.from('serial_number')
                .select('serial_id')
                .eq('serial_number', body.serialNumber)
                .limit(1)
                .maybeSingle();

            if (!sysSerial) throw new Error(`System Serial ${body.serialNumber} not found/valid in database.`);
            serialId = sysSerial.serial_id;
        }

        // --- INSERT SUBMISSION ---
        // FIX: ParseFloat safety to avoid NaN crashes
        const safePremium = parseFloat(body.premiumPaid) || 0;
        const safeANP = parseFloat(body.anp) || 0;

        const { data, error } = await supabase.from('az_submissions').insert([{
            profile_id: profileId, // Added profile_id for user visibility linkage
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

        if (error) {
            console.error("Submission Insert Failed:", error);
            throw error;
        }

        if (!isManual && body.serialNumber) await supabase.from('serial_number').update({ is_issued: true }).eq('serial_number', body.serialNumber);

        res.status(201).json({ success: true, data: { ...data, serial_number: body.serialNumber } });
    } catch (e) {
        console.error("SERVER ERROR:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 3. GET DETAILS (Strict 8->9 Digit Check)
router.get('/submissions/details/:serialNumber', async (req, res) => {
    try {
        const { serialNumber } = req.params;

        // A. Exact Match
        let { data: sData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', serialNumber).limit(1).maybeSingle();

        // B. Strict Check (9-digit -> 8-digit)
        if (!sData && serialNumber.length === 9) {
            const parentSerial = serialNumber.slice(0, 8);
            const { data: parentData } = await supabase.from('serial_number')
                .select('serial_id')
                .eq('serial_number', parentSerial)
                .limit(1)
                .maybeSingle();

            if (parentData) sData = parentData; // Found parent
        }

        if (!sData) return res.status(404).json({ success: false, message: 'Serial not found' });

        const { data: sub } = await supabase.from('az_submissions').select(`*, policy (policy_type), profiles (first_name, last_name)`).eq('serial_id', sData.serial_id).limit(1).maybeSingle();

        if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

        const nameParts = (sub.client_name || '').split(' ');
        res.json({ success: true, data: { clientFirstName: nameParts[0], clientLastName: nameParts.slice(1).join(' '), clientEmail: sub.client_email, policyType: sub.policy?.policy_type, modeOfPayment: sub.mode_of_payment, policyDate: sub.issued_at } });
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

// 5. DOCUMENT SUBMISSION
router.get('/form-submissions', async (req, res) => {
    try {
        let query = supabase.from('az_submissions').select('*').order('issued_at', { ascending: false });
        if (req.query.profileId) {
            query = query.eq('profile_id', req.query.profileId);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/form-submissions', upload.any(), async (req, res) => {
    try {
        const { serialNumber, formData } = req.body;
        const parsedData = JSON.parse(formData || '{}');
        let serialIdToUse = null;
        let isMigration = false;

        // A. Check Exact Match
        let { data: serialData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', serialNumber).limit(1).maybeSingle();

        // B. Check Parent Match (Migration)
        if (!serialData && serialNumber.length === 9) {
            const parentSerial = serialNumber.slice(0, 8);
            const { data: parentData } = await supabase.from('serial_number')
                .select('serial_id')
                .eq('serial_number', parentSerial)
                .limit(1)
                .maybeSingle();

            if (parentData) {
                serialData = parentData;
                isMigration = true;
            }
        }

        if (!serialData) return res.status(404).json({ message: 'Serial not found' });
        serialIdToUse = serialData.serial_id;

        const { data: existing } = await supabase.from('az_submissions').select('*').eq('serial_id', serialIdToUse).limit(1).maybeSingle();
        if (!existing) return res.status(404).json({ message: 'Submission not found' });

        // C. Perform Migration if needed
        if (isMigration) {
            console.log(`Migrating Serial ID ${serialIdToUse}: 8-digits -> ${serialNumber}`);
            await supabase.from('serial_number').update({ serial_number: serialNumber }).eq('serial_id', serialIdToUse);
        }

        const newFilesForDB = [];
        const emailAttachments = [];

        // User Files
        if (req.files) {
            for (const f of req.files) {
                try {
                    const fileData = await uploadFileToSupabase(f, existing.sub_id);
                    newFilesForDB.push(fileData);
                    emailAttachments.push({ filename: f.originalname, content: f.buffer });
                } catch (e) { console.error('Upload error', e); }
            }
        }

        // Generated PDF
        let generatedPdfUrl = null;
        const pdfBuffer = await generateApplicationPDF(parsedData, serialNumber);
        const pdfFilename = `Application_${serialNumber}.pdf`;

        const pdfUpload = await uploadBufferToSupabase(pdfBuffer, pdfFilename, existing.sub_id);
        newFilesForDB.push(pdfUpload);
        generatedPdfUrl = pdfUpload.fileUrl;
        emailAttachments.push({ filename: pdfFilename, content: pdfBuffer });

        // Update DB
        const { data: updated, error } = await supabase.from('az_submissions').update({
            form_type: parsedData.formType, mode_of_payment: parsedData.modeOfPayment,
            attachments: [...(existing.attachments || []), ...newFilesForDB]
        }).eq('sub_id', existing.sub_id).select().single();

        if (error) throw error;

        // Email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: ALLIANZ_HO_EMAIL,
                subject: `Submission: ${serialNumber} - ${existing.client_name}`,
                text: `New Application Received.\n\nSerial: ${serialNumber}\nClient: ${existing.client_name}\n\nDocuments attached.`,
                attachments: emailAttachments
            });
            console.log("✅ Email Sent!");
        } catch (err) { console.error("❌ Email failed:", err); }

        res.json({ success: true, data: updated, generatedPdfUrl });
    } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// --- UPDATED MONITORING ENDPOINTS ---

router.get('/monitoring/all', async (req, res) => {
    // FIX: select(..., agency(name)) based on SCHEMA
    let query = supabase
        .from('az_submissions')
        .select(`*, policy (policy_type), serial_number (serial_number), profiles (first_name, last_name), agency (name)`)
        .order('issued_at', { ascending: false });

    if (req.query.profileId) {
        query = query.eq('profile_id', req.query.profileId);
    }

    const { data } = await query;

    const flattened = (data || []).map(i => ({
        ...i,
        id: i.sub_id,
        policy_type: i.policy?.policy_type,
        serial_number: i.serial_number?.serial_number,
        intermediary_name: i.profiles ? `${i.profiles.first_name || ''} ${i.profiles.last_name || ''}`.trim() : 'Unknown',
        agency: i.agency?.name, // Direct link
        created_at: i.issued_at
    }));

    res.json({ success: true, data: flattened });
});

// --- UPDATED CUSTOMERS ENDPOINT (SECURITY FIX) ---
router.get('/customers', async (req, res) => {
    try {
        // [SECURITY FIX] If no profileId is provided, do NOT return all data.
        // Return empty array to prevent data leakage/flashing other agents' clients.
        if (!req.query.profileId) {
            return res.json({ success: true, data: [] });
        }

        let query = supabase.from('az_submissions')
            .select(`*, policy (policy_type), serial_number (serial_number), agency(name), payment_history(*)`);

        // The filter is applied here
        query = query.eq('profile_id', req.query.profileId);

        const { data } = await query;

        const map = {};
        (data || []).forEach(s => {
            if (s.client_email) {
                if (!map[s.client_email]) {
                    map[s.client_email] = {
                        id: s.sub_id,
                        first_name: s.client_name.split(' ')[0],
                        last_name: s.client_name.split(' ').slice(1).join(' '),
                        email: s.client_email,
                        submissions: []
                    };
                }
                const flatSubmission = {
                    ...s,
                    policy_type: s.policy?.policy_type,
                    serial_number: s.serial_number?.serial_number,
                    agency: s.agency?.name,
                    payment_history: s.payment_history || []
                };
                map[s.client_email].submissions.push(flatSubmission);
            }
        });
        res.json({ success: true, data: Object.values(map) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/submissions/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id) {
            return res.status(400).json({ success: false, message: 'Invalid submission ID' });
        }

        const { data: policy, error: fetchError } = await supabase.from('az_submissions').select('*').eq('sub_id', id).limit(1).maybeSingle();

        if (fetchError) {
            console.error('Error fetching policy:', fetchError);
            return res.status(500).json({ success: false, message: 'Database error: ' + fetchError.message });
        }

        if (!policy) {
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }

        // 1. Record in History
        // Parse amount to ensure numeric (remove commas if string, etc)
        let totalPremium = 0;
        if (policy.premium_paid) {
            totalPremium = typeof policy.premium_paid === 'string'
                ? parseFloat(policy.premium_paid.replace(/,/g, ''))
                : parseFloat(policy.premium_paid);
        }

        // Calculate Installment Amount based on Mode
        let installmentAmount = totalPremium;
        switch (policy.mode_of_payment) {
            case 'Monthly': installmentAmount = totalPremium / 12; break;
            case 'Quarterly': installmentAmount = totalPremium / 4; break;
            case 'Semi-Annual': installmentAmount = totalPremium / 2; break;
            default: installmentAmount = totalPremium; break; // Annual or others
        }

        // Round to 2 decimals
        installmentAmount = Math.round(installmentAmount * 100) / 100;

        const historyPayload = {
            sub_id: id,
            amount: installmentAmount || 0,
            period_covered: policy.next_payment_date,
            payment_date: new Date().toISOString()
        };
        console.log('Inserting History:', historyPayload);

        const { error: histError } = await supabase.from('payment_history').insert([historyPayload]);

        if (histError) {
            console.error('History Insert Error:', histError);
            return res.status(500).json({ success: false, message: 'Failed to record payment history: ' + histError.message });
        }
        console.log('History Insert Success');

        // 2. Rollover Date
        const newDueDate = calculateNextPaymentDate(policy.next_payment_date, policy.mode_of_payment);

        // 3. Update Submission (Reset is_paid to false for next cycle, update date_issued if not set)
        const updatePayload = {
            next_payment_date: newDueDate,
            is_paid: false
        };

        // Set date_issued if this is the first payment and status is Issued
        if (policy.status === 'Issued' && !policy.date_issued) {
            updatePayload.date_issued = new Date().toISOString();
        }

        const { error: updateError } = await supabase.from('az_submissions').update(updatePayload).eq('sub_id', id);

        if (updateError) {
            console.error('Update Error:', updateError);
            return res.status(500).json({ success: false, message: 'Failed to update payment: ' + updateError.message });
        }

        res.json({ success: true, message: 'Payment recorded successfully', nextDate: newDueDate });
    } catch (e) {
        console.error('PAY ENDPOINT ERROR:', e);
        res.status(500).json({ success: false, message: e.message || 'Internal server error' });
    }
});

module.exports = router;
