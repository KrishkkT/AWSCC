"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AdminTopBar() {
    const pathname = usePathname();
    const [profile, setProfile] = useState(null);
    const supabase = createClient();

    // Map path to title
    const getTitle = (path) => {
        const parts = path.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'admin') return 'Dashboard Overview';
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
    };

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
        }
        loadProfile();
    }, []);

    const roleColors = {
        captain: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
        faculty: 'bg-brand-teal/10 text-brand-teal border-brand-teal/20',
        core: 'bg-white/10 text-white/70 border-white/20',
        member: 'bg-white/5 text-white/40 border-white/10'
    };

    return (
        <header className="h-20 border-b border-white/5 bg-brand-dark/50 backdrop-blur-xl flex items-center justify-between px-6 lg:px-12 sticky top-0 z-40">
            <div className="flex items-center gap-4 ml-16 lg:ml-0">
                <h2 className="text-lg lg:text-xl font-black text-white tracking-tight truncate max-w-[150px] sm:max-w-none">
                    {getTitle(pathname)}
                </h2>
                {profile && (
                    <div className={`hidden sm:block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${roleColors[profile.role] || roleColors.member}`}>
                        {profile.role}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <Link href="/admin/settings" className="flex items-center gap-3 group">
                    <div className="text-right hidden sm:block group-hover:opacity-80 transition-opacity">
                        <div className="text-sm font-bold text-white leading-none mb-1">
                            {profile?.full_name || 'Admin User'}
                        </div>
                        <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                            {profile?.role || 'admin'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shadow-[0_0_20px_rgba(0,194,255,0.1)] group-hover:border-brand-cyan/50 group-hover:bg-brand-cyan/20 transition-all">
                        <User size={20} />
                    </div>
                </Link>
            </div>
        </header>
    );
}