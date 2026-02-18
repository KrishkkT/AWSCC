"use client";

import { motion } from "framer-motion";
import { User, Bell, Search, ShieldCheck } from "lucide-react";
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
        <header className="h-20 border-b border-white/5 bg-brand-dark/50 backdrop-blur-xl flex items-center justify-between px-8 lg:px-12 sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-white tracking-tight">
                    {getTitle(pathname)}
                </h2>
                {profile && (
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${roleColors[profile.role] || roleColors.member}`}>
                        {profile.role}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-6">
                {/* Search Placeholder */}
                <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-64 group focus-within:border-brand-cyan/50 transition-all">
                    <Search size={16} className="text-white/20 group-focus-within:text-brand-cyan" />
                    <input
                        type="text"
                        placeholder="Search system..."
                        className="bg-transparent border-none outline-none text-sm text-white placeholder-white/20 w-full"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-brand-cyan hover:border-brand-cyan/50 transition-all">
                        <Bell size={20} />
                    </button>

                    <div className="h-10 w-[1px] bg-white/5 mx-2"></div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-white leading-none mb-1">
                                {profile?.full_name || 'Admin User'}
                            </div>
                            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                {profile?.email?.split('@')[0] || 'admin'}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shadow-[0_0_20px_rgba(0,194,255,0.1)]">
                            <User size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
