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
        <header className="h-20 border-b border-white/5 bg-brand-dark/40 backdrop-blur-3xl flex items-center justify-between px-6 lg:px-12 sticky top-0 z-40">
            <div className="flex items-center gap-6">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('open-admin-mobile-menu'))}
                    className="lg:hidden w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-brand-aws hover:bg-white/10 transition-all active:scale-95"
                >
                    <div className="flex flex-col gap-1 items-center">
                        <div className="w-5 h-0.5 bg-current rounded-full" />
                        <div className="w-3 h-0.5 bg-current rounded-full" />
                    </div>
                </button>

                <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-4">
                    <h2 className="text-xl font-black text-white tracking-tighter leading-none">
                        {getTitle(pathname)}
                    </h2>
                    <div className="flex items-center gap-2">
                        {profile && (
                            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${roleColors[profile.role] || roleColors.member} shadow-inner`}>
                                {profile.role}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-md">
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* User Profile */}
                <Link href="/admin/settings" className="flex items-center gap-5 group py-2 pl-4 pr-2 rounded-2xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5">
                    <div className="text-right hidden sm:block group-hover:opacity-80 transition-opacity">
                        <div className="text-[13px] font-black text-white leading-none mb-1">
                            {profile?.full_name?.split(' ')[0] || 'Admin'}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            System Operative
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-aws/20 to-brand-blue/20 border border-white/10 flex items-center justify-center text-brand-aws shadow-xl shrink-0 group-hover:scale-105 group-hover:border-brand-aws/30 transition-all backdrop-blur-md">
                        <User size={22} className="group-hover:rotate-12 transition-transform" />
                    </div>
                </Link>
            </div>
        </header>
    );
}