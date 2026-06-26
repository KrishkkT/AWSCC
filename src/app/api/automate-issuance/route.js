import { createClient } from "@/utils/supabase/server";
import { sendEmail, emailTemplates } from "@/lib/emailService";

export async function POST(req) {
    try {
        const supabase = await createClient();
        const { eventId } = await req.json();

        // 1. Verify Authorization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['admin', 'Leader', 'faculty', 'captain'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }

        // 2. Fetch Event Data
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

        if (eventError || !event) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404 });

        // 3. Fetch Registrations that haven't received certificates yet
        const { data: registrations, error: regError } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', eventId)
            .eq('certificate_issued', false);

        if (regError) throw regError;
        if (!registrations || registrations.length === 0) {
            return new Response(JSON.stringify({ message: "No pending registrations found", count: 0 }), { status: 200 });
        }

        let issuedCount = 0;

        // 4. Process each registration
        for (const reg of registrations) {
            // Create certificate record
            const { data: cert, error: certError } = await supabase
                .from('certificates')
                .insert([{
                    recipient_name: reg.full_name,
                    recipient_email: reg.email,
                    event_id: eventId,
                    event_name: event.title,
                    certificate_type: 'participation',
                    status: 'verified'
                }])
                .select()
                .single();

            if (!certError && cert) {
                // Send email
                try {
                    const template = emailTemplates.certificateIssued(reg.full_name, event.title, cert.id);
                    await sendEmail({
                        to: reg.email,
                        subject: template.subject,
                        html: template.html,
                    });

                    // Mark as issued
                    await supabase
                        .from('event_registrations')
                        .update({ certificate_issued: true })
                        .eq('id', reg.id);

                    issuedCount++;
                } catch (emailErr) {
                    console.error(`Email failed for ${reg.email}:`, emailErr);
                    // We don't stop the whole process if one email fails
                }
            }
        }

        return new Response(JSON.stringify({
            message: `Successfully issued ${issuedCount} certificates.`,
            count: issuedCount
        }), { status: 200 });

    } catch (error) {
        console.error("Automate Issuance API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
