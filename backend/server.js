const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Bypass SSL issues in dev
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// --- CONNECTION ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ibbjsjvjfeymglpsvgap.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYmpzanZqZmV5bWdscHN2Z2FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwODM1OCwiZXhwIjoyMDgwODg0MzU4fQ._gIdqP80fwN_6Qu_Pgqi3ecYJHEYuZmJjboBnfs9zv0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
});

const ALLIANZ_HO_EMAIL = process.env.ALLIANZ_HO_EMAIL;
const SUPABASE_BUCKET = 'policy-documents';

// Check Email Connection
transporter.verify((error) => {
  if (error) console.log("Email Connection Error:", error);
  else console.log("Email Server is Ready");
});

// --- HELPER FUNCTIONS ---
function calculateNextPaymentDate(policyDate, mode) {
  const date = new Date(policyDate);
  if (isNaN(date.getTime())) return null;
  switch (mode) {
    case 'Monthly': date.setMonth(date.getMonth() + 1); break;
    case 'Quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'Semi-Annual': date.setMonth(date.getMonth() + 6); break;
    case 'Annual': date.setFullYear(date.getFullYear() + 1); break;
    default: break;
  }
  return date.toISOString().split('T')[0];
}

async function uploadFileToSupabase(file, subId) {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${subId}/${timestamp}_${sanitizedName}`;
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw error;
    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    return { fileName: file.originalname, filePath: path, fileUrl: data.publicUrl, fileSize: file.size, mimeType: file.mimetype };
  } catch (err) { console.error('Upload failed:', err); throw err; }
}

async function uploadBufferToSupabase(buffer, filename, subId) {
  try {
    const timestamp = Date.now();
    const path = `${subId}/${timestamp}_${filename}`;
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, { contentType: 'application/pdf' });
    if (error) throw error;
    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    return { fileName: filename, filePath: path, fileUrl: data.publicUrl, fileSize: buffer.length, mimeType: 'application/pdf' };
  } catch (err) { console.error('Buffer Upload failed:', err); throw err; }
}

// --- PDF GENERATOR ---
function generateApplicationPDF(data, serialNumber) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(20).text('Application Summary', { align: 'center' }).moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }).moveDown();

    doc.fontSize(14).text('Client Information', { underline: true }).moveDown(0.5);
    doc.fontSize(10)
      .text(`Serial Number: ${serialNumber}`)
      .text(`Name: ${data.clientFirstName} ${data.clientLastName}`)
      .text(`Email: ${data.clientEmail || 'N/A'}`).moveDown();

    doc.fontSize(14).text('Policy Details', { underline: true }).moveDown(0.5);
    doc.fontSize(10)
      .text(`Policy Type: ${data.policyType}`)
      .text(`Form Category: ${data.formType}`)
      .text(`Mode of Payment: ${data.modeOfPayment}`)
      .text(`Policy Date: ${data.policyDate}`).moveDown();

    if (data.medical) {
      doc.fontSize(14).text('Medical & Personal Declaration', { underline: true }).moveDown(0.5);
      doc.fontSize(10)
        .text(`Height: ${data.medical.height || 'N/A'}`)
        .text(`Weight: ${data.medical.weight || 'N/A'}`)
        .text(`Diagnosed with Critical Illness: ${data.medical.diagnosed || 'No'}`)
        .text(`Hospitalized (Last 2 Years): ${data.medical.hospitalized || 'No'}`)
        .text(`Smoker: ${data.medical.smoker || 'No'}`)
        .text(`Alcohol Consumer: ${data.medical.alcohol || 'No'}`).moveDown();
    }
    doc.text('--- End of Summary ---', { align: 'center' });
    doc.end();
  });
}

// --- ENDPOINTS ---

app.get('/api/health', (req, res) => res.status(200).json({ success: true, status: 'ok' }));

// GET ACTIVE POLICIES (RESTORED - Fixes 404 Error)
app.get('/api/policies/active', async (req, res) => {
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
app.get('/api/serial-numbers/available/:policyType', async (req, res) => {
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

// 2. SUBMIT MONITORING (WITH FIX FOR ACTIVE STATUS)
app.post('/api/monitoring/submit', async (req, res) => {
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

    // --- MANUALLY UPDATE AGENT STATUS ---
    // Update timestamp to NOW.
    if (profileId) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_submission_at: new Date().toISOString() })
        .eq('id', profileId);

      if (updateError) console.error("Failed to update active status:", updateError.message);
      else console.log("Agent Status Updated to Active");
    }

    // --- SERIAL LOGIC ---
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

        if (createError) throw new Error("Serial Creation Failed: " + createError.message);
        serialId = newSerial.serial_id;
      }
    } else {
      const { data: sysSerial } = await supabase.from('serial_number')
        .select('serial_id')
        .eq('serial_number', body.serialNumber)
        .limit(1)
        .maybeSingle();

      if (!sysSerial) throw new Error(`System Serial ${body.serialNumber} not found.`);
      serialId = sysSerial.serial_id;
    }

    // --- INSERT SUBMISSION ---
    const { data, error } = await supabase.from('az_submissions').insert([{
      profile_id: profileId,
      client_name: `${body.clientFirstName} ${body.clientLastName}`,
      client_email: body.clientEmail,
      policy_id: finalPolicyId,
      premium_paid: parseFloat(body.premiumPaid) || 0,
      anp: parseFloat(body.anp) || 0,
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

// 3. GET DETAILS
app.get('/api/submissions/details/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    let { data: sData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', serialNumber).limit(1).maybeSingle();

    if (!sData && serialNumber.length === 9) {
      const parentSerial = serialNumber.slice(0, 8);
      const { data: parentData } = await supabase.from('serial_number')
        .select('serial_id')
        .eq('serial_number', parentSerial)
        .limit(1)
        .maybeSingle();
      if (parentData) sData = parentData;
    }

    if (!sData) return res.status(404).json({ success: false, message: 'Serial not found' });

    const { data: sub } = await supabase.from('az_submissions').select(`*, policy (policy_type), profiles (first_name, last_name)`).eq('serial_id', sData.serial_id).limit(1).maybeSingle();

    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    const nameParts = (sub.client_name || '').split(' ');
    res.json({ success: true, data: { clientFirstName: nameParts[0], clientLastName: nameParts.slice(1).join(' '), clientEmail: sub.client_email, policyType: sub.policy?.policy_type, modeOfPayment: sub.mode_of_payment, policyDate: sub.issued_at } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 4. PREVIEW APPLICATION
app.post('/api/preview-application', async (req, res) => {
  try {
    const { formData, serialNumber } = req.body;
    const pdfBuffer = await generateApplicationPDF(formData, serialNumber);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. DOCUMENT SUBMISSION
app.get('/api/form-submissions', async (req, res) => {
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

app.post('/api/form-submissions', upload.any(), async (req, res) => {
  try {
    const { serialNumber, formData } = req.body;
    const parsedData = JSON.parse(formData || '{}');
    let serialIdToUse = null;
    let isMigration = false;

    let { data: serialData } = await supabase.from('serial_number').select('serial_id').eq('serial_number', serialNumber).limit(1).maybeSingle();

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

    if (isMigration) {
      await supabase.from('serial_number').update({ serial_number: serialNumber }).eq('serial_id', serialIdToUse);
    }

    const newFilesForDB = [];
    const emailAttachments = [];

    if (req.files) {
      for (const f of req.files) {
        try {
          const fileData = await uploadFileToSupabase(f, existing.sub_id);
          newFilesForDB.push(fileData);
          emailAttachments.push({ filename: f.originalname, content: f.buffer });
        } catch (e) { console.error('Upload error', e); }
      }
    }

    const pdfBuffer = await generateApplicationPDF(parsedData, serialNumber);
    const pdfFilename = `Application_${serialNumber}.pdf`;
    const pdfUpload = await uploadBufferToSupabase(pdfBuffer, pdfFilename, existing.sub_id);
    newFilesForDB.push(pdfUpload);
    emailAttachments.push({ filename: pdfFilename, content: pdfBuffer });

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
      console.log("Email Sent!");
    } catch (err) { console.error("Email failed:", err); }

    res.json({ success: true, data: updated, generatedPdfUrl: pdfUpload.fileUrl });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// --- UPDATED MONITORING ENDPOINTS ---

app.get('/api/monitoring/all', async (req, res) => {
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
    agency: i.agency?.name,
    created_at: i.issued_at
  }));

  res.json({ success: true, data: flattened });
});

app.get('/api/customers', async (req, res) => {
  let query = supabase.from('az_submissions')
    .select(`*, policy (policy_type), serial_number (serial_number), agency(name), payment_history(*)`);

  if (req.query.profileId) {
    query = query.eq('profile_id', req.query.profileId);
  }

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
});

app.patch('/api/form-submissions/:id/status', async (req, res) => {
  const { id } = req.params; const { status } = req.body;
  const updateData = { status };
  if (status === 'Issued') {
    updateData.date_issued = new Date().toISOString();
  }
  await supabase.from('az_submissions').update(updateData).eq('sub_id', id);
  res.json({ success: true });
});

app.post('/api/submissions/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Invalid submission ID' });

    const { data: policy, error: fetchError } = await supabase.from('az_submissions').select('*').eq('sub_id', id).limit(1).maybeSingle();
    if (fetchError || !policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    let totalPremium = typeof policy.premium_paid === 'string'
        ? parseFloat(policy.premium_paid.replace(/,/g, ''))
        : parseFloat(policy.premium_paid);

    let installmentAmount = totalPremium;
    switch (policy.mode_of_payment) {
      case 'Monthly': installmentAmount = totalPremium / 12; break;
      case 'Quarterly': installmentAmount = totalPremium / 4; break;
      case 'Semi-Annual': installmentAmount = totalPremium / 2; break;
      default: break;
    }
    installmentAmount = Math.round(installmentAmount * 100) / 100;

    const historyPayload = {
      sub_id: id,
      amount: installmentAmount || 0,
      period_covered: policy.next_payment_date,
      payment_date: new Date().toISOString()
    };

    const { error: histError } = await supabase.from('payment_history').insert([historyPayload]);
    if (histError) throw histError;

    const newDueDate = calculateNextPaymentDate(policy.next_payment_date, policy.mode_of_payment);
    const updatePayload = { next_payment_date: newDueDate, is_paid: false };

    if (policy.status === 'Issued' && !policy.date_issued) {
      updatePayload.date_issued = new Date().toISOString();
    }

    const { error: updateError } = await supabase.from('az_submissions').update(updatePayload).eq('sub_id', id);
    if (updateError) throw updateError;

    res.json({ success: true, message: 'Payment recorded successfully', nextDate: newDueDate });
  } catch (e) {
    console.error('PAY ENDPOINT ERROR:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// --- UPDATED PERFORMANCE ENDPOINT (ACTIVE = 1 HOUR) ---
app.get('/api/performance/all', async (req, res) => {
  try {
    const { profileId } = req.query;
    let subordinateIds = [];

    // 1. If explicit profileId (AL/Leader), fetch their team
    if (profileId) {
      const { data: team, error: teamError } = await supabase
        .from('user_hierarchy')
        .select('user_id')
        .eq('report_to_id', profileId)
        .eq('is_active', true);

      if (teamError) throw teamError;

      if (team && team.length > 0) {
        subordinateIds = team.map(t => t.user_id);
      } else {
        return res.json({
          success: true,
          data: {
            performanceByAP: [],
            teamStats: {
              totalTeamANP: 0, totalMonthlyANP: 0, totalSubmissions: 0,
              totalIssued: 0, totalPending: 0, totalDeclined: 0, averageConversionRate: 0
            }
          }
        });
      }
    }

    // 2. Query Submissions - Include last_submission_at in join
    let query = supabase
      .from('az_submissions')
      .select('*, profiles (first_name, last_name, last_submission_at)')
      .order('issued_at', { ascending: false });

    if (subordinateIds.length > 0) {
      query = query.in('profile_id', subordinateIds);
    } else if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data: submissions, error } = await query;
    if (error) throw error;

    const performanceByAP = {};
    const teamStats = {
      totalTeamANP: 0, totalMonthlyANP: 0, totalSubmissions: 0,
      totalIssued: 0, totalPending: 0, totalDeclined: 0, averageConversionRate: 0
    };

    let totalConversionRates = 0;
    let apCountForConversion = 0;

    // --- 1 HOUR WINDOW (3600000 milliseconds) ---
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const now = new Date();

    submissions.forEach(sub => {
      let apName = 'Unknown Agent';
      let isActive = false;

      if (sub.profiles) {
        apName = `${sub.profiles.first_name} ${sub.profiles.last_name}`.trim();

        // Check if Last Submission was within 1 hour
        if (sub.profiles.last_submission_at) {
          const lastActive = new Date(sub.profiles.last_submission_at);
          const diff = now - lastActive;
          if (diff < ONE_HOUR_MS) {
            isActive = true;
          }
        }
      } else if (sub.submission_type) {
        apName = sub.submission_type;
      }

      if (!performanceByAP[apName]) {
        performanceByAP[apName] = {
          apName,
          status: isActive ? 'Active' : 'Inactive',
          totalANP: 0,
          monthlyANP: 0,
          totalSubmissions: 0,
          issued: 0,
          pending: 0,
          declined: 0,
          conversionRate: 0,
          submissions: []
        };
      } else {
        // Update status if we encounter the agent again and they are now calculated as active
        if (isActive) performanceByAP[apName].status = 'Active';
      }

      const totalPremium = parseFloat(sub.premium_paid) || 0;
      let modalPremium = totalPremium;
      const mode = (sub.mode_of_payment || '').trim();

      if (mode === 'Monthly') modalPremium = totalPremium / 12;
      else if (mode === 'Quarterly') modalPremium = totalPremium / 4;
      else if (mode === 'Semi-Annual') modalPremium = totalPremium / 2;

      performanceByAP[apName].totalSubmissions++;
      performanceByAP[apName].submissions.push(sub);
      teamStats.totalSubmissions++;

      if (sub.status === 'Issued') {
        performanceByAP[apName].totalANP += totalPremium;
        performanceByAP[apName].issued++;
        teamStats.totalTeamANP += totalPremium;
        teamStats.totalIssued++;

        const subDate = new Date(sub.issued_at);
        if (subDate.getMonth() === now.getMonth() && subDate.getFullYear() === now.getFullYear()) {
          performanceByAP[apName].monthlyANP += modalPremium;
          teamStats.totalMonthlyANP += modalPremium;
        }
      } else if (sub.status === 'Declined') {
        performanceByAP[apName].declined++;
        teamStats.totalDeclined++;
      } else {
        performanceByAP[apName].pending++;
        teamStats.totalPending++;
      }
    });

    const performanceList = Object.values(performanceByAP);
    performanceList.forEach(ap => {
      if (ap.totalSubmissions > 0) {
        ap.conversionRate = ((ap.issued / ap.totalSubmissions) * 100).toFixed(1);
        totalConversionRates += parseFloat(ap.conversionRate);
        apCountForConversion++;
      }
    });

    if (apCountForConversion > 0) {
      teamStats.averageConversionRate = (totalConversionRates / apCountForConversion).toFixed(1);
    }

    res.json({ success: true, data: { performanceByAP: performanceList, teamStats } });
  } catch (e) {
    console.error('Performance endpoint error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));