import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import Maintenance from "@/components/Maintenance";
import CommunityDayWidget from "@/components/CommunityDayWidget";
import CommunityDayPopup from "@/components/CommunityDayPopup";

export default async function PublicLayout({ children }) {
    const supabase = await createClient();

    // Check maintenance mode
    const { data: settings } = await supabase
        .from('global_settings')
        .select('maintenance_mode')
        .eq('id', '1')
        .single();

    // Check if user is admin (to bypass maintenance)
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        isAdmin = ['Leader', 'faculty', 'core', 'admin', 'captain'].includes(profile?.role);
    }

    if (settings?.maintenance_mode && !isAdmin) {
        return <Maintenance />;
    }

    // Check for active community event for global floaters
    // Suppressing 42P01 error if migration hasn't run yet using try/catch wrapper logic handled by supabase client safely mostly, but we'll conditionally catch
    const { data: activeEvent, error } = await supabase
        .from('community_events')
        .select('year, title, is_active, date')
        .eq('visibility_toggled', true)
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();

    const validEvent = error ? null : activeEvent;

    return (
        <div className="flex flex-col min-h-screen relative">
            <Navbar />
            <main className="flex-grow pt-16 relative z-10">
                {children}
            </main>
            <Footer />

            {/* Global Event Injections */}
            <CommunityDayWidget event={validEvent} />
            <CommunityDayPopup event={validEvent} />
        </div>
    );
}
