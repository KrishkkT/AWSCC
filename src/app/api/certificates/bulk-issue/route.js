import { createClient } from "@/utils/supabase/server";
import { sendBatchCertificateEmails } from "@/lib/emailService";

export const maxDuration = 300; // Allow sufficient execution time for large batches on Vercel/Node

export async function POST(req) {
    try {
        const supabase = await createClient();
        const { eventId, customEventTitle, introText, recipients } = await req.json();

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return new Response(JSON.stringify({ error: "Invalid request. Non-empty recipients array is required." }), { status: 400 });
        }

        // 1. Verify Authorization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['admin', 'Leader', 'faculty', 'captain', 'core'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden: Admin or Lead privileges required." }), { status: 403 });
        }

        // 2. Resolve Event Name (From Selected Event or Custom Text)
        let eventName = customEventTitle ? customEventTitle.trim() : '';
        let validEventId = null;

        if (eventId && eventId !== '__custom__' && eventId !== 'custom') {
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('id, title')
                .eq('id', eventId)
                .single();

            if (!eventError && event) {
                validEventId = event.id;
                if (!eventName) {
                    eventName = event.title;
                }
            }
        }

        if (!eventName) {
            return new Response(JSON.stringify({ error: "Please provide a valid Event or Custom Event Title." }), { status: 400 });
        }

        const defaultIntro = (introText && introText.trim()) || "for successfully attending the";

        // 3. Prepare Data for Insertion
        const allCertData = recipients.map(item => ({
            recipient_name: item.recipient_name || item.name || 'Participant',
            recipient_email: (item.recipient_email || item.email || '').toLowerCase().trim(),
            event_id: validEventId,
            event_name: eventName,
            certificate_type: item.certificate_type || 'participation',
            template: 'blue',
            status: 'verified',
            intro_text: defaultIntro
        })).filter(c => c.recipient_email.length > 0);

        // 4. Batch Insert into Database in Chunks of 100 (Safe for 500+ attendees)
        const insertedCertificates = [];
        const CHUNK_SIZE = 100;

        for (let i = 0; i < allCertData.length; i += CHUNK_SIZE) {
            const chunk = allCertData.slice(i, i + CHUNK_SIZE);
            let { data: insertedChunk, error: insertError } = await supabase
                .from('certificates')
                .insert(chunk)
                .select('id, recipient_name, recipient_email');

            // If intro_text column does not exist in the database table, retry without it
            if (insertError && insertError.message?.includes('intro_text')) {
                const chunkWithoutIntro = chunk.map(({ intro_text, ...rest }) => rest);
                const retry = await supabase
                    .from('certificates')
                    .insert(chunkWithoutIntro)
                    .select('id, recipient_name, recipient_email');
                insertedChunk = retry.data;
                insertError = retry.error;
            }

            if (insertError) {
                console.error(`Error inserting certificate chunk [${i}-${i + chunk.length}]:`, insertError);
                throw new Error(`Database batch insert failed: ${insertError.message}`);
            }

            if (insertedChunk) {
                insertedCertificates.push(...insertedChunk);
            }
        }

        // 5. Dispatch Nodemailer Batch with 200ms interval between sends (pooled)
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
            eventName,
            emailsSent: emailResults.sent,
            emailsFailed: emailResults.failed,
            errors: emailResults.errors
        }), { status: 200 });

    } catch (error) {
        console.error("Bulk Certificate Issuance API Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}
