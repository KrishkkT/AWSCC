/**
 * Logs an administrative action to the audit_logs table.
 * 
 * @param {object} supabase - The initialized Supabase client
 * @param {string} action - Short title of the action (e.g., 'Created Event')
 * @param {string} details - Detailed description of what happened
 * @param {string} level - Severity level: 'info', 'success', 'warning', 'error'
 */
export const logActivity = async (supabase, action, details, level = 'info') => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            console.warn('logActivity: No active session found. Logging as system/anonymous.');
        }

        const { error } = await supabase.from('audit_logs').insert([{
            user_id: userId || null,
            action,
            details,
            level
        }]);

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Exception in logActivity:', err);
    }
};
