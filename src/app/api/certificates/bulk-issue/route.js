import { createClient } from "@/utils/supabase/server";
import { sendBatchCertificateEmails } from "@/lib/emailService";

export const maxDuration = 300; // Allow sufficient execution time for large batches on Vercel/Node

export async function POST(req) {
    try {
        const supabase = await createClient();
        const { eventId, recipients } = await req.json();

        if (!eventId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return new Response(JSON.stringify({ error: "Invalid request. eventId and non-empty recipients array are required." }), { status: 400 });
        }

        // 1. Verify Authorization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['admin', 'Leader', 'faculty', 'captain', 'core'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden: Admin or Lead privileges required." }), { status: 403 });
        }

        // 2. Fetch Event Title
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, title')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return new Response(JSON.stringify({ error: "Selected event was not found." }), { status: 404 });
        }

        const eventName = event.title;

        // 3. Prepare Data for Insertion
        const allCertData = recipients.map(item => ({
            recipient_name: item.recipient_name || item.name || 'Participant',
            recipient_email: (item.recipient_email || item.email || '').toLowerCase().trim(),
            event_id: eventId,
            event_name: eventName,
            certificate_type: item.certificate_type || 'participation',
            template: 'blue',
            status: 'verified'
        })).filter(c => c.recipient_email.length > 0);

        // 4. Batch Insert into Database in Chunks of 100 (Safe for 500+ attendees)
        const insertedCertificates = [];
        const CHUNK_SIZE = 100;

        for (let i = 0; i < allCertData.length; i += CHUNK_SIZE) {
            const chunk = allCertData.slice(i, i + CHUNK_SIZE);
            const { data: insertedChunk, error: insertError } = await supabase
                .from('certificates')
                .insert(chunk)
                .select('id, recipient_name, recipient_email');

            if (insertError) {
                console.error(`Error inserting certificate chunk [${i}-${i + chunk.length}]:`, insertError);
                throw new Error(`Database batch insert failed: ${insertError.message}`);
            }

            if (insertedChunk) {
                insertedCertificates.push(...insertedChunk);
            }
        }

        // 5. Dispatch Nodemailer Batch with 250ms interval between sends (pooled)
        const emailItems = insertedCertificates.map(cert => ({
            name: cert.recipient_name,
            email: cert.recipient_email,
            eventName: eventName,
            certId: cert.id
        }));

        const emailResults = await sendBatchCertificateEmails(emailItems, 200);

        return new Response(JSON.stringify({
            success: true,
            totalRequested: recipients.length,
            issuedCount: insertedCertificates.length,
            emailsSent: emailResults.sent,
            emailsFailed: emailResults.failed,
            errors: emailResults.errors
        }), { status: 200 });

    } catch (error) {
        console.error("Bulk Certificate Issuance API Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}
