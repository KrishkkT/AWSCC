import { createClient } from "@/utils/supabase/server";
import { sendBatchCertificateEmails } from "@/lib/emailService";

export const maxDuration = 300;

export async function POST(req) {
    try {
        const supabase = await createClient();
        const { eventId } = await req.json();

        // 1. Verify Authorization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['admin', 'Leader', 'faculty', 'captain', 'core'].includes(profile.role)) {
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

        // 4. Batch Insert Certificates in chunks of 100
        const CHUNK_SIZE = 100;
        const certsToInsert = registrations.map(reg => ({
            recipient_name: reg.full_name || 'Participant',
            recipient_email: reg.email,
            event_id: eventId,
            event_name: event.title,
            certificate_type: 'participation',
            template: 'blue',
            status: 'verified'
        }));

        const insertedCerts = [];
        for (let i = 0; i < certsToInsert.length; i += CHUNK_SIZE) {
            const chunk = certsToInsert.slice(i, i + CHUNK_SIZE);
            const { data: insertedChunk, error: insertError } = await supabase
                .from('certificates')
                .insert(chunk)
                .select('id, recipient_name, recipient_email');

            if (insertError) {
                console.error(`Chunk insert error:`, insertError);
                throw new Error(`Failed to insert certificates: ${insertError.message}`);
            }

            if (insertedChunk) {
                insertedCerts.push(...insertedChunk);
            }
        }

        // Mark registrations as issued in batches
        const regIds = registrations.map(r => r.id);
        for (let i = 0; i < regIds.length; i += CHUNK_SIZE) {
            const idChunk = regIds.slice(i, i + CHUNK_SIZE);
            await supabase
                .from('event_registrations')
                .update({ certificate_issued: true })
                .in('id', idChunk);
        }

        // 5. Send Batch Emails with controlled interval
        const emailItems = insertedCerts.map(cert => ({
            name: cert.recipient_name,
            email: cert.recipient_email,
            eventName: event.title,
            certId: cert.id
        }));

        const emailResults = await sendBatchCertificateEmails(emailItems, 200);

        return new Response(JSON.stringify({
            message: `Successfully issued ${insertedCerts.length} certificates.`,
            count: insertedCerts.length,
            emailsSent: emailResults.sent,
            emailsFailed: emailResults.failed
        }), { status: 200 });

    } catch (error) {
        console.error("Automate Issuance API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
