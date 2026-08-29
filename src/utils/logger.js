/**
 * Logs an administrative action to the audit_logs table.
 * 
 * @param {object} supabase - The initialized Supabase client
 * @param {string} action - Short title of the action (e.g., 'Created Event', 'Deleted Member')
 * @param {string} details - Detailed description of what happened (e.g., 'Event title: Cloud Workshop 2026')
 * @param {string} level - Severity level: 'info', 'success', 'warning', 'error'
 * @param {object} [metadata] - Optional additional structured context
 */
export const logActivity = async (supabase, action, details, level = 'info', metadata = null) => {
    try {
        if (!supabase) return;

        // Try getting session first, then fallback to user
        let userId = null;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
            if (!userId) {
                const { data: { user } } = await supabase.auth.getUser();
                userId = user?.id;
            }
        } catch (authErr) {
            console.warn('[Logger] Auth lookup warning:', authErr?.message);
        }

        const payload = {
            user_id: userId || null,
            action: action || 'Administrative Action',
            details: typeof details === 'string' ? details : JSON.stringify(details),
            level: level || 'info'
        };

        const { error } = await supabase.from('audit_logs').insert([payload]);

        if (error) {
            console.error('[Logger] Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('[Logger] Exception in logActivity:', err);
    }
};
