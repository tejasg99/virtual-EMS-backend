import nodemailer from "nodemailer";
import { config } from "../config/index.js"; 

// Create a Nodemailer transporter instance
// We create it once and reuse it for sending multiple emails
const createTransporter = () => {
    // Basic validation for essential email config
    if (!config.email.host || !config.email.port || !config.email.user || !config.email.pass) {
        console.error('!!! Email Service Error: Missing required configuration (host, port, user, pass) in .env file. Emails will not be sent. !!!');
        // Return a dummy transporter or throw an error to prevent app crash but highlight the issue
        // For now, let's return null to indicate failure clearly
        return null;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: config.email.host,
            port: parseInt(config.email.port, 10), // Ensure port is a number
            secure: parseInt(config.email.port, 10) === 465, // true for 465, false for other ports like 587
            auth: {
                user: config.email.user,
                pass: config.email.pass,
            },
        });

        // Verify transporter connection (useful for debugging setup)
        transporter.verify((error, success) => {
            if (error) {
                console.error('!!! Email Transporter Verification Failed: ', error.message);
                 // Indicate failure but don't crash app necessarily
            } else {
                console.log('Email Transporter is ready to send messages.');
            }
        });


        return transporter;

    } catch (error) {
        console.error('!!! Failed to create Email Transporter:', error.message);
        return null; // Indicate failure
    }
};

// Initialize the transporter
const transporter = createTransporter();

/**
 * Sends an email using the pre-configured transporter.
 * @param {object} options - Email options.
 * @param {string} options.to - Recipient's email address.
 * @param {string} options.subject - Subject line of the email.
 * @param {string} [options.text] - Plain text body of the email.
 * @param {string} [options.html] - HTML body of the email (if provided, text might be ignored by some clients).
 * @returns {Promise<object>} - Promise resolving with the info object returned by Nodemailer on success.
 * @throws {Error} - Throws error if email sending fails or transporter is not configured.
 */
const sendEmail = async ({ to, subject, text, html }) => {
    // Check if transporter was created successfully
    if (!transporter) {
        console.error('Email Service Error: Transporter not available. Email not sent.');
        throw new Error('Email service is not configured properly.');
    }

    // 1. Define Email Options
    const mailOptions = {
        from: config.email.from, // Sender address (must be verified with email provider)
        to: to, // List of receivers
        subject: subject, // Subject line
        text: text, // Plain text body (optional)
        html: html, // HTML body (optional)
    };

    // Basic validation
    if (!to || !subject || (!text && !html)) {
         throw new Error('Missing required email options (to, subject, text/html)');
    }


    // 2. Send Email
    try {
        console.log(`Attempting to send email to: ${to} with subject: ${subject}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return info; // Return info object on success
    } catch (error) {
        console.error(`Error sending email to ${to}: `, error);
        // Rethrow the error so the calling function knows sending failed
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Export the sendEmail function for use in controllers/services
export default sendEmail;