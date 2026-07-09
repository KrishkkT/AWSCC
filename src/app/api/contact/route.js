import { sendEmail } from "@/lib/emailService";

export async function POST(req) {
    try {
        const { name, email, subject, message } = await req.json();

        // 1. Prepare email template
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #FF9900; border-bottom: 2px solid #FF9900; padding-bottom: 10px;">New Contact Form Submission</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr>
                        <td style="padding: 8px; font-weight: bold; width: 120px;">Name:</td>
                        <td style="padding: 8px;">${name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Email:</td>
                        <td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Subject:</td>
                        <td style="padding: 8px;">${subject || 'No Subject'}</td>
                    </tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; border-left: 4px solid #FF9900;">
                    <p style="margin: 0; font-weight: bold; margin-bottom: 10px;">Message:</p>
                    <p style="margin: 0; white-space: pre-wrap; line-height: 1.6; color: #333;">${message}</p>
                </div>
            </div>
        `;

        // 2. Send email to awsddit@gmail.com
        const result = await sendEmail({
            to: 'awsddit@gmail.com',
            subject: `[Contact Form] ${subject || 'New Message'} - from ${name}`,
            html: emailHtml
        });

        if (result.success) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ error: result.error }), { status: 500 });
        }
    } catch (error) {
        console.error("Contact Email API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
