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
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;500;600;700;800;900&family=Dancing+Script:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
            </head>
            <Navbar />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    );
}
