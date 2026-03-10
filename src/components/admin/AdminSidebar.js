"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Users, Calendar, Settings,
    LogOut, FileText, Activity, Award, Menu, X, Image as ImageIcon
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

// ─── Role Permission Map ───────────────────────────────────────
const ROLE_PERMISSIONS = {
    faculty: {
        sections: ['core', 'management', 'system'],
        features: ['analytics', 'reports', 'hod_export', 'certificates', 'manage_members', 'manage_roles', 'settings', 'manage_team', 'manage_resources', 'manage_knowledge', 'manage_gallery'],
    },
    captain: {
        sections: ['core', 'management', 'system'],
        features: ['analytics', 'reports', 'certificates', 'manage_members', 'manage_roles', 'settings', 'manage_team', 'manage_resources', 'manage_knowledge', 'manage_gallery'],
    },
    core: {
        sections: ['core', 'management'],
        features: ['analytics', 'manage_events', 'attendance', 'manage_resources', 'manage_knowledge', 'manage_gallery'],
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
                ...(perms.features.includes('reports') ? [{ name: "Reports", href: "/admin/reports", icon: FileText }] : []),
            ]
        },
    ];

    const sections = allSections.filter(
        s => perms.sections.includes(s.id) && s.items.length > 0
    );

    const expanded = hovered;
    const sidebarWidth = expanded ? 260 : 72;

    const roleColors = {
        captain: 'text-brand-cyan',
        faculty: 'text-brand-teal',
        core: 'text-white/60',
        member: 'text-white/30',
    };

    // Sidebar content (shared between desktop and mobile)
    const SidebarContent = ({ isMobile = false }) => (
        <div className={`h-full flex flex-col bg-brand-dark border-r border-white/5 ${isMobile ? 'w-72' : ''}`}>
            {/* Logo */}
            <div className={`h-20 flex items-center ${expanded || isMobile ? 'px-6' : 'justify-center'} border-b border-white/5 shrink-0`}>
                <div className="w-10 h-10 bg-brand-cyan rounded-xl flex items-center justify-center font-black text-brand-dark shadow-[0_0_20px_rgba(0,194,255,0.3)] shrink-0">
                    A
                </div>
                {(expanded || isMobile) && (
                    <div className="ml-3 overflow-hidden">
                        <span className="font-black text-white text-base tracking-tight block whitespace-nowrap">AWS CC</span>
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold whitespace-nowrap">Admin Portal</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-grow py-6 px-3 space-y-6 overflow-y-auto no-scrollbar">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                        {(expanded || isMobile) && (
                            <h4 className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/15 mb-3">
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
                                        ? 'bg-brand-cyan text-brand-dark shadow-[0_0_20px_rgba(0,194,255,0.15)]'
                                        : 'text-white/40 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <item.icon size={20} className={`shrink-0 ${isActive ? 'text-brand-dark' : 'text-white/40 group-hover:text-white'}`} />
                                    {(expanded || isMobile) && (
                                        <span className={`ml-3 font-bold text-sm whitespace-nowrap ${isActive ? 'text-brand-dark' : ''}`}>
                                            {item.name}
                                        </span>
                                    )}
                                    {/* Tooltip for collapsed state */}
                                    {!expanded && !isMobile && (
                                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-brand-dark border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[60] whitespace-nowrap pointer-events-none shadow-xl">
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
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-5 left-4 z-[60] w-10 h-10 bg-brand-dark border border-white/10 rounded-xl flex items-center justify-center text-white/60 hover:text-brand-cyan transition-all"
            >
                <Menu size={20} />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-[70]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="relative h-full w-72 shadow-2xl">
                        <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-4 z-10 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white">
                            <X size={20} />
                        </button>
                        <SidebarContent isMobile />
                    </div>
                </div>
            )}

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
