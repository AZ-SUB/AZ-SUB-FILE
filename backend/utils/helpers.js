const PDFDocument = require('pdfkit');
const { supabase } = require('../config/supabase');
const SUPABASE_BUCKET = 'policy-documents';

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
            .text(`Policy Date: ${data.policyDate}`)
            .text(`Virtual Selling Process (VSP): ${data.isVSP ? 'Yes' : 'No'}`)
            .text(`Underwriting Option: ${data.isGAE ? 'GAE' : 'Standard'}`)
            .moveDown();

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

const calculateMetrics = (amount, mode) => {
    const premium = parseFloat(amount) || 0;
    let multiplier = 1;

    if (mode) {
        const m = mode.toLowerCase();
        if (m.includes('monthly')) multiplier = 12;
        // Note: User mentioned "bi monthly" in prompt ("bi monthly") which usually means every 2 months?
        // Or did they mean "Semi-Annual"? User said: "monthly, bi monthly, semi annual then annual"
        // "Bi-monthly" in insurance usually means every 2 months? (6 payments/year) -> x6?
        // Or twice a month (24/year)? Usually it's every 2 months. 
        // Standard modes: Monthly(12), Quarterly(4), Semi-Annual(2), Annual(1).
        // Let's stick to standard map first, plus check for "bi" if it exists.
        // If user has "bi monthly" in DB, let's assume x6.
        else if (m.includes('quarterly')) multiplier = 4;
        else if (m.includes('semi') || m.includes('half')) multiplier = 2;
        else if (m.includes('annual') || m.includes('yearly')) multiplier = 1;
    }

    const anp = premium * multiplier;
    const monthlyEquivalent = anp / 12;

    return { anp, monthlyEquivalent };
};

module.exports = {
    calculateNextPaymentDate,
    uploadFileToSupabase,
    uploadBufferToSupabase,
    generateApplicationPDF,
    calculateMetrics
};
