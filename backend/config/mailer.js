const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
});

const ALLIANZ_HO_EMAIL = process.env.ALLIANZ_HO_EMAIL;

// Email Connection Verification
transporter.verify((error) => {
    if (error) console.log("Email Connection Error (Global):", error);
    else console.log("Email Server is Ready (Global)");
});

// Helper: Create User-Specific Transporter (For App Password)
function createUserTransporter(userEmail, appPassword) {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: userEmail, pass: appPassword }
    });
}

module.exports = { transporter, ALLIANZ_HO_EMAIL, createUserTransporter };
