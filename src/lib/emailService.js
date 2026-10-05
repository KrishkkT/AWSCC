import nodemailer from 'nodemailer';

// Configure pooled transporter for secure, high-throughput batch sending
const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 3, // Safe concurrent connection count for SMTP servers (Gmail/SES/SendGrid)
    maxMessages: 100,  // Recycle connection after 100 messages
    rateDelta: 1000,   // 1 second rate limit window
    rateLimit: 5,      // Max 5 emails per second to prevent rate limit blocks
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
});

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send a single email with error handling
 */
export const sendEmail = async ({ to, subject, html }) => {
    try {
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const info = await transporter.sendMail({
            from: `"AWS Cloud Club DDU" <${fromEmail}>`,
            to,
            subject,
            html,
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        return { success: false, error: error.message || error };
    }
};

/**
 * Send batch certificate emails with controlled pacing/intervals to prevent rate limiting
 * @param {Array<{name: string, email: string, eventName: string, certId: string}>} items
 * @param {number} delayMs Interval between sending individual emails (default 250ms)
 */
export const sendBatchCertificateEmails = async (items, delayMs = 250) => {
    const results = {
        total: items.length,
        sent: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
            const template = emailTemplates.certificateIssued(item.name, item.eventName, item.certId);
            const res = await sendEmail({
                to: item.email,
                subject: template.subject,
                html: template.html,
            });

            if (res.success) {
                results.sent++;
            } else {
                results.failed++;
                results.errors.push({ email: item.email, error: res.error });
            }
        } catch (err) {
            results.failed++;
            results.errors.push({ email: item.email, error: err.message });
        }

        // Controlled delay between dispatches
        if (i < items.length - 1 && delayMs > 0) {
            await delay(delayMs);
        }
    }

    return results;
};

export const emailTemplates = {
    memberActivation: (name) => ({
        subject: "Welcome to AWS Cloud Club DDU | Account Activated!",
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 32px 24px; background: #070b12; color: #ffffff; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;">
                <div style="margin-bottom: 24px;">
                    <span style="font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #00C2FF;">AWS CLOUD CLUB</span>
                    <span style="font-size: 14px; color: #8892b0; margin-left: 8px;">DDU Chapter</span>
                </div>
                <h2 style="color: #ffffff; font-size: 22px; margin-top: 0;">Hello ${name}! 👋</h2>
                <p style="color: #a0aec0; line-height: 1.6;">Your membership at <strong>AWS Cloud Club - DDU</strong> has been approved and activated.</p>
                <p style="color: #a0aec0; line-height: 1.6;">You can now access the member portal to register for upcoming workshops, track cloud certifications, and participate in community events.</p>
                <div style="margin: 28px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://awsccddu.in'}/auth/login" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #00C2FF, #0077FF); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px;">Login to Portal</a>
                </div>
                <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #718096;">If you didn't request this membership, please disregard this email.</p>
            </div>
        `
    }),
    rolePromotion: (name, role) => ({
        subject: `AWS Cloud Club | New Role Assigned: ${role.toUpperCase()}`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 32px 24px; background: #070b12; color: #ffffff; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;">
                <div style="margin-bottom: 24px;">
                    <span style="font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #00C2FF;">AWS CLOUD CLUB</span>
                </div>
                <h2 style="color: #ffffff; font-size: 22px; margin-top: 0;">Congratulations, ${name}! 🎉</h2>
                <p style="color: #a0aec0; line-height: 1.6;">You have been promoted to the role of <strong style="color: #00C2FF;">${role.toUpperCase()}</strong> at AWS Cloud Club - DDU.</p>
                <p style="color: #a0aec0; line-height: 1.6;">Your administrative privileges and dashboard permissions are now updated.</p>
                <div style="margin: 28px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://awsccddu.in'}/dashboard" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #00C2FF, #0077FF); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px;">Go to Dashboard</a>
                </div>
            </div>
        `
    }),
    certificateIssued: (name, eventName, certId) => ({
        subject: `Your Certificate for ${eventName} is Ready! 🎓`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 32px 24px; background: #070b12; color: #ffffff; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;">
                <div style="margin-bottom: 24px; display: flex; align-items: center;">
                    <span style="font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #00C2FF;">AWS CLOUD CLUB</span>
                    <span style="font-size: 13px; color: #8892b0; margin-left: 8px;">· DDU Chapter</span>
                </div>
                <h2 style="color: #ffffff; font-size: 22px; margin-top: 0;">Great job, ${name}! 🏅</h2>
                <p style="color: #a0aec0; line-height: 1.6;">Thank you for attending <strong style="color: #ffffff;">${eventName}</strong>. Your official digital certificate of participation has been generated and verified on-chain / digitally.</p>
                <div style="background: rgba(0, 194, 255, 0.05); border: 1px solid rgba(0, 194, 255, 0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #00C2FF; font-weight: bold;">Certificate Details</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>Recipient:</strong> ${name}</p>
                    <p style="margin: 4px 0 0 0; color: #ffffff; font-size: 14px;"><strong>Event:</strong> ${eventName}</p>
                    <p style="margin: 4px 0 0 0; color: #a0aec0; font-size: 12px; font-family: monospace;"><strong>Credential ID:</strong> ${certId}</p>
                </div>
                <div style="margin: 28px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://awsccddu.in'}/verify/certs/${certId}" style="display: inline-block; padding: 13px 30px; background: linear-gradient(135deg, #00C2FF, #0077FF); color: #ffffff; text-decoration: none; font-weight: 800; border-radius: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">View & Download Certificate</a>
                </div>
                <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #718096; line-height: 1.5;">
                    This certificate can be permanently verified at any time using your credential link.
                </p>
            </div>
        `
    }),
};
