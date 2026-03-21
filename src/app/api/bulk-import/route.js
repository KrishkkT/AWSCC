import { createClient } from "@/utils/supabase/server";

export async function POST(req) {
    try {
        const supabase = await createClient();
        const { eventId, participants } = await req.json();

        if (!eventId || !participants || !Array.isArray(participants)) {
            return new Response(JSON.stringify({ error: "Invalid data provided" }), { status: 400 });
        }

        // 1. Verify Authorization (Admin/Captain/Faculty)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['admin', 'captain', 'faculty'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }

        // 2. Fetch Existing Registrations for this event to avoid duplicates
        const { data: existingRegs, error: fetchError } = await supabase
            .from('event_registrations')
            .select('email')
            .eq('event_id', eventId);

        if (fetchError) throw fetchError;
        const existingEmails = new Set(existingRegs.map(r => r.email.toLowerCase()));

        // 3. Filter New Participants
        const newParticipants = participants.filter(p => p.email && !existingEmails.has(p.email.toLowerCase()));

        if (newParticipants.length === 0) {
            return new Response(JSON.stringify({ 
                message: "No new participants to import. All emails are already registered.",
                count: 0 
            }), { status: 200 });
        }

        // 4. Batch Insert
        const insertData = newParticipants.map(p => ({
            event_id: eventId,
            full_name: p.name || p.full_name || "Participant",
            email: p.email.toLowerCase(),
            certificate_issued: false
        }));

        const { error: insertError } = await supabase
            .from('event_registrations')
            .insert(insertData);

        if (insertError) throw insertError;

        return new Response(JSON.stringify({
            message: `Successfully imported ${insertData.length} participants.`,
            count: insertData.length
        }), { status: 200 });

    } catch (error) {
        console.error("Bulk Import API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
