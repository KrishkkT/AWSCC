import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Add timeout to avoid hanging
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
});

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"AWS Cloud Club" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log("Email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
};

export const emailTemplates = {
    memberActivation: (name) => ({
        subject: "Welcome to AWS Cloud Club | Account Activated!",
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #00C2FF;">Hello ${name}!</h2>
                <p>Your membership at <strong>AWS Cloud Club - DDU</strong> has been activated.</p>
                <p>You can now access the member portal and register for upcoming events.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" style="display: inline-block; padding: 10px 20px; background-color: #00C2FF; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Login to Portal</a>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    }),
    rolePromotion: (name, role) => ({
        subject: `New Role Assigned: ${role.toUpperCase()}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #00C2FF;">Congratulations ${name}!</h2>
                <p>You have been promoted to the role of <strong>${role.toUpperCase()}</strong> at AWS Cloud Club - DDU.</p>
                <p>Your new permissions are now active. Please log in to see the changes.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #00C2FF; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Go to Dashboard</a>
            </div>
        `
    }),
    certificateIssued: (name, eventName, certId) => ({
        subject: `Your Certificate for ${eventName} is Ready!`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #00C2FF;">Great job, ${name}!</h2>
                <p>We are pleased to inform you that your certificate for <strong>${eventName}</strong> has been issued.</p>
                <p>You can view, download, and verify your certificate using the link below:</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify/certs/${certId}" style="display: inline-block; padding: 10px 20px; background-color: #00C2FF; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Certificate</a>
                <p style="margin-top: 30px; font-size: 11px; color: #999;">Unique Certificate ID: ${certId}</p>
            </div>
        `
    }),
};
