"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Users, Calendar, Settings,
    LogOut, FileText, Activity, Award, Menu, X, Image as ImageIcon
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Role Permission Map ───────────────────────────────────────
const ROLE_PERMISSIONS = {
    faculty: {
        sections: ['core', 'management', 'system'],
        features: ['analytics', 'hod_export', 'certificates', 'manage_members', 'manage_roles', 'settings', 'manage_team', 'manage_resources', 'manage_knowledge', 'manage_gallery', 'manage_community_day'],
    },
    Leader: {
        sections: ['core', 'management', 'system'],
        features: ['analytics', 'certificates', 'manage_members', 'manage_roles', 'settings', 'manage_team', 'manage_resources', 'manage_knowledge', 'manage_gallery', 'manage_community_day'],
    },
    captain: {
        sections: ['core', 'management', 'system'],
        features: ['analytics', 'certificates', 'manage_members', 'manage_roles', 'settings', 'manage_team', 'manage_resources', 'manage_knowledge', 'manage_gallery', 'manage_community_day'],
    },
    core: {
        sections: ['core', 'management'],
        features: ['analytics', 'manage_events', 'attendance', 'manage_resources', 'manage_knowledge', 'manage_gallery', 'manage_community_day'],
    },
    member: {
        sections: ['core', 'management'],
        features: ['manage_gallery'],
    },
};

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [profile, setProfile] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hovered, setHovered] = useState(false);

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

    // Close mobile menu on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    // Handle mobile menu via custom event for AdminTopBar integration
    useEffect(() => {
        const handleOpen = () => setMobileOpen(true);
        document.addEventListener('open-admin-mobile-menu', handleOpen);
        return () => document.removeEventListener('open-admin-mobile-menu', handleOpen);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    const role = profile?.role || 'member';
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member;

    const allSections = [
        {
            id: 'core',
            title: "Core",
            items: [
                { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
            ]
        },
        {
            id: 'management',
            title: "Management",
            items: [
                { name: "Events", href: "/admin/events", icon: Calendar },
                ...(perms.features.includes('manage_community_day') ? [{ name: "Community Day", href: "/admin/community-day", icon: Award }] : []),
                { name: "Team", href: "/admin/team", icon: Users },
                { name: "Resources", href: "/admin/resources", icon: FileText },
                { name: "Knowledge", href: "/admin/knowledge", icon: FileText },
                { name: "Gallery", href: "/admin/gallery", icon: ImageIcon },
                ...(perms.features.includes('certificates') ? [{ name: "Certificates", href: "/admin/certificates", icon: Award }] : []),
            ]
        },
        {
            id: 'system',
            title: "System",
            items: [
                ...(perms.features.includes('settings') ? [{ name: "Settings", href: "/admin/settings", icon: Settings }] : []),
                ...(perms.features.includes('analytics') ? [{ name: "Audit Logs", href: "/admin/logs", icon: Activity }] : []),
            ]
        },
    ];

    const sections = allSections.filter(
        s => perms.sections.includes(s.id) && s.items.length > 0
    );

    const expanded = hovered;
    const sidebarWidth = expanded ? 260 : 72;

    const roleColors = {
        Leader: 'text-brand-cyan',
        captain: 'text-brand-cyan',
        faculty: 'text-brand-teal',
        core: 'text-white/60',
        member: 'text-white/30',
    };

    // Sidebar content (shared between desktop and mobile)
    const SidebarContent = ({ isMobile = false }) => (
        <div className={`h-full flex flex-col bg-[#05080f] shadow-[10px_0_30px_rgba(0,0,0,0.5)] border-r border-white/10 ${isMobile ? 'w-full max-w-[280px]' : ''}`}>
            {/* Logo Section */}
            <div className={`h-24 flex items-center ${expanded || isMobile ? 'px-8' : 'justify-center'} shrink-0 relative overflow-hidden border-b border-white/5`}>
                <div className="absolute inset-0 bg-gradient-to-b from-brand-aws/10 to-transparent pointer-events-none"></div>
                <div className="w-10 h-10 bg-gradient-to-br from-brand-aws to-brand-blue rounded-xl flex items-center justify-center font-black text-white shadow-xl shadow-brand-aws/20 shrink-0 ring-1 ring-white/20">
                    A
                </div>
                {(expanded || isMobile) && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-4 overflow-hidden"
                    >
                        <span className="font-black text-white text-lg tracking-tighter block whitespace-nowrap leading-none mb-1">AWS CC</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-aws animate-pulse"></div>
                            <span className="text-[10px] text-white/60 uppercase tracking-[0.2em] font-black whitespace-nowrap">Control Node</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-grow py-6 px-3 space-y-6 overflow-y-auto no-scrollbar">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                        {(expanded || isMobile) && (
                            <h4 className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
                                {section.title}
                            </h4>
                        )}
                        {section.items.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center ${expanded || isMobile ? 'px-3' : 'justify-center'} py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                                        ? 'bg-brand-cyan text-white shadow-[0_0_20px_rgba(0,194,255,0.15)]'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <item.icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`} />
                                    {(expanded || isMobile) && (
                                        <span className={`ml-3 font-bold text-sm whitespace-nowrap ${isActive ? 'text-white' : ''}`}>
                                            {item.name}
                                        </span>
                                    )}
                                    {/* Tooltip for collapsed state */}
                                    {!expanded && !isMobile && (
                                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#05080f] border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[60] whitespace-nowrap pointer-events-none shadow-xl">
                                            {item.name}
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Bottom: User + Logout */}
            <div className="border-t border-white/5 p-3 shrink-0">
                {(expanded || isMobile) && profile && (
                    <div className="px-3 py-3 mb-2 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/15 mb-1">Signed in</div>
                        <div className="text-sm font-bold text-white truncate">{profile.full_name || profile.email}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${roleColors[role]}`}>{role}</div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={`flex items-center ${expanded || isMobile ? 'px-3' : 'justify-center'} py-2.5 w-full rounded-xl text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition-all`}
                >
                    <LogOut size={20} />
                    {(expanded || isMobile) && <span className="ml-3 font-bold text-sm">Sign Out</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <div className="lg:hidden fixed inset-0 z-[70]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative h-full w-[280px] shadow-2xl"
                        >
                            <button onClick={() => setMobileOpen(false)} className="absolute top-6 right-[-48px] z-10 w-10 h-10 flex items-center justify-center bg-brand-dark border border-white/10 rounded-xl text-white/40 hover:text-white">
                                <X size={24} />
                            </button>
                            <SidebarContent isMobile />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ width: sidebarWidth }}
                className="hidden lg:block h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out overflow-hidden"
            >
                <SidebarContent />
            </aside>
        </>
    );
}
