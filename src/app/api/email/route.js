import { sendEmail, emailTemplates } from "@/lib/emailService";
import { createClient } from "@/utils/supabase/server";

export async function POST(req) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['admin', 'captain', 'faculty', 'core'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }

        const { to, type, data } = await req.json();
        const normalizedType = (type || '').toLowerCase();

        let template;
        switch (normalizedType) {
            case 'memberactivation':
                template = emailTemplates.memberActivation(data.name);
                break;
            case 'rolepromotion':
                template = emailTemplates.rolePromotion(data.name, data.role);
                break;
            case 'certificateissued':
                template = emailTemplates.certificateIssued(data.name, data.eventName, data.certId);
                break;
            default:
                console.error("Unknown Email Type:", type);
                return new Response(JSON.stringify({ error: `Invalid email type: ${type}` }), { status: 400 });
        }

        const result = await sendEmail({
            to,
            subject: template.subject,
            html: template.html,
        });

        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        console.error("Email API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
