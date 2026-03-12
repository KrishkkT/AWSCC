import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import Maintenance from "@/components/Maintenance";

export default async function PublicLayout({ children }) {
    const supabase = createClient();

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
        isAdmin = ['captain', 'faculty', 'core', 'admin'].includes(profile?.role);
    }

    if (settings?.maintenance_mode && !isAdmin) {
        return <Maintenance />;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow pt-16">
                {children}
            </main>
            <Footer />
        </div>
    );
}
