'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useOnePass } from '@/components/onepass/OnePassContext';
import {
    LayoutDashboard, Users, FileUp, QrCode, Layers, BookOpen, Coffee,
    Award, ShieldAlert, FileSpreadsheet, ScrollText, Settings, ArrowLeft,
    ChevronDown, Menu, X, LogOut, Sparkles, MapPin, Calendar, Mail, UserCheck
} from 'lucide-react';

export default function EventShellLayout({ children }) {
    const params = useParams();
    const eventId = params?.eventId;
    const pathname = usePathname();
    const router = useRouter();
    const { user, hasPermission, logout, loading: authLoading } = useOnePass();

    const [event, setEvent] = useState(null);
    const [allEvents, setAllEvents] = useState([]);
    const [loadingEvent, setLoadingEvent] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [switcherOpen, setSwitcherOpen] = useState(false);

    useEffect(() => {
        if (!eventId) return;

        const loadEvent = async () => {
            try {
                const res = await fetch(`/api/onepass/events/${eventId}`);
                if (res.status === 401) {
                    router.push('/onepass/login');
                    return;
                }
                const data = await res.json();
                if (data.event) {
                    setEvent(data.event);
                }

                // Fetch all events for switcher
                const allRes = await fetch('/api/onepass/events');
                const allData = await allRes.json();
                setAllEvents(allData.events || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingEvent(false);
            }
        };

        loadEvent();
    }, [eventId]);

    const isAdmin = user?.role === 'ADMIN';

    // Build navigation items according to user permissions
    const navItems = [];

    // Dashboard
    if (isAdmin || hasPermission(eventId, 'VIEW_DASHBOARD')) {
        navItems.push({
            name: 'Live Dashboard',
            href: `/onepass/events/${eventId}/overview`,
            icon: LayoutDashboard
        });
    }

    // Attendees & Directory (Admin)
    if (isAdmin) {
        navItems.push({
            name: 'Attendees Directory',
            href: `/onepass/events/${eventId}/attendees`,
            icon: Users
        });
        navItems.push({
            name: 'KonfHub Import',
            href: `/onepass/events/${eventId}/import`,
            icon: FileUp
        });
    }

    // Main Check-in Station
    if (isAdmin || hasPermission(eventId, 'CHECK_IN')) {
        navItems.push({
            name: 'Check-In Station',
            href: `/onepass/events/${eventId}/checkin`,
            icon: QrCode,
            badge: 'Scan'
        });
    }

    // Tracks & Track Access Gate
    if (isAdmin || hasPermission(eventId, 'TRACK_ACCESS')) {
        navItems.push({
            name: 'General Sessions',
            href: `/onepass/events/${eventId}/tracks`,
            icon: Layers
        });
    }

    // Workshops & Workshop Access
    if (isAdmin || hasPermission(eventId, 'WORKSHOP_ACCESS')) {
        navItems.push({
            name: 'Workshops',
            href: `/onepass/events/${eventId}/workshops`,
            icon: BookOpen
        });
    }

    // Food & Meals
    if (isAdmin || hasPermission(eventId, 'FOOD')) {
        navItems.push({
            name: 'Food & Meals',
            href: `/onepass/events/${eventId}/food`,
            icon: Coffee
        });
    }

    // Swag Kits
    if (isAdmin || hasPermission(eventId, 'SWAG')) {
        navItems.push({
            name: 'Swag Distribution',
            href: `/onepass/events/${eventId}/swag`,
            icon: Award
        });
    }

    // Admin-only modules
    if (isAdmin) {
        navItems.push({
            name: 'Who Checked-in Whom',
            href: `/onepass/events/${eventId}/attribution`,
            icon: UserCheck
        });
        navItems.push({
            name: 'Email Campaigns',
            href: `/onepass/events/${eventId}/broadcast`,
            icon: Mail
        });
        navItems.push({
            name: 'Volunteers & RBAC',
            href: `/onepass/events/${eventId}/volunteers`,
            icon: ShieldAlert
        });
        navItems.push({
            name: 'Export Reports',
            href: `/onepass/events/${eventId}/reports`,
            icon: FileSpreadsheet
        });
        navItems.push({
            name: 'Audit Logs',
            href: `/onepass/events/${eventId}/audit`,
            icon: ScrollText
        });
    }

    const statusBadgeColors = {
        LIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        DRAFT: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        PUBLISHED: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        COMPLETED: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
        ARCHIVED: 'bg-[#0C111D] text-slate-500 border-[#1a2540]'
    };

    return (
        <div className="min-h-screen bg-[#0C111D] text-white flex flex-col">
            {/* Top Navigation */}
            <header className="border-b border-[#1a2540] bg-[#0C111D]/90 backdrop-blur-md sticky top-0 z-40">
                <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Left: Brand + Active Event Switcher */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#151c2e]"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <Link href="/onepass/dashboard" className="flex items-center space-x-2 text-slate-400 hover:text-white transition">
                            <div className="w-8 h-8 rounded-lg bg-[#0073BB]/15 text-[#4F8EF7] flex items-center justify-center border border-[#0073BB]/30">
                                <QrCode className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sm tracking-tight text-white hidden md:inline">ONEPASS</span>
                        </Link>

                        <span className="text-[#1a2540] hidden sm:inline">/</span>

                        {/* Event Switcher Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setSwitcherOpen(!switcherOpen)}
                                className="flex items-center space-x-2 px-3 py-1.5 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] rounded-xl text-xs transition"
                            >
                                <span className="font-semibold text-white max-w-[140px] sm:max-w-[240px] truncate">
                                    {event?.name || 'Loading event...'}
                                </span>
                                {event?.status && (
                                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${statusBadgeColors[event.status] || ''}`}>
                                        {event.status}
                                    </span>
                                )}
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {switcherOpen && (
                                <div className="absolute left-0 mt-2 w-72 bg-[#151c2e] border border-[#1a2540] rounded-xl shadow-2xl z-50 p-2 space-y-1">
                                    <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">Switch Event</div>
                                    {allEvents.map(e => (
                                        <button
                                            key={e.id}
                                            onClick={() => {
                                                setSwitcherOpen(false);
                                                router.push(`/onepass/events/${e.id}/overview`);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${e.id === eventId ? 'bg-[#0073BB]/15 text-[#4F8EF7] font-semibold' : 'text-slate-300 hover:bg-[#1a2540]'}`}
                                        >
                                            <span className="truncate">{e.name}</span>
                                            <span className="text-[9px] font-mono text-slate-400">{e.year}</span>
                                        </button>
                                    ))}
                                    {isAdmin && (
                                        <Link
                                            href="/onepass/dashboard"
                                            className="block text-center text-xs text-[#4F8EF7] hover:underline pt-2 border-t border-[#1a2540] mt-1"
                                        >
                                            + Manage All Events
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: User Profile */}
                    <div className="flex items-center space-x-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-semibold text-white">{user?.name}</div>
                            <div className="text-[10px] text-[#4F8EF7] font-mono uppercase">{user?.role}</div>
                        </div>

                        <button
                            onClick={logout}
                            title="Sign out"
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-[#151c2e] rounded-lg transition"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Shell Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar (Desktop) */}
                <aside className="w-64 border-r border-[#1a2540] bg-[#0C111D] hidden lg:flex flex-col justify-between p-4 space-y-4">
                    <div className="space-y-1">
                        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                            {isAdmin ? 'Administration' : 'Volunteer Modules'}
                        </div>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== `/onepass/events/${eventId}` && pathname.startsWith(item.href));
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${isActive
                                            ? 'bg-[#0073BB] text-white font-bold shadow-md shadow-[#0073BB]/20'
                                            : 'text-slate-300 hover:bg-[#151c2e] hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2.5">
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                        <span>{item.name}</span>
                                    </div>
                                    {item.badge && (
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-[#151c2e] text-[#4F8EF7]' : 'bg-[#0073BB]/20 text-[#4F8EF7]'}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Bottom Event Metadata */}
                    <div className="p-3 bg-[#151c2e] border border-[#1a2540] rounded-xl text-[11px] text-slate-400 space-y-1.5">
                        <div className="font-semibold text-white truncate">{event?.venue}</div>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span>{event?.date}</span>
                        </div>
                    </div>
                </aside>

                {/* Mobile Drawer */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden flex">
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                        <div className="relative w-72 bg-[#0C111D] border-r border-[#1a2540] p-6 flex flex-col justify-between z-10 space-y-4">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-4 border-b border-[#1a2540]">
                                    <span className="font-bold text-white text-sm">Event Navigation</span>
                                    <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {navItems.map((item) => {
                                        const isActive = pathname === item.href || (item.href !== `/onepass/events/${eventId}` && pathname.startsWith(item.href));
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition ${isActive
                                                        ? 'bg-[#0073BB] text-white font-bold'
                                                        : 'text-slate-300 hover:bg-[#151c2e] hover:text-white'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Icon className="w-4 h-4" />
                                                    <span>{item.name}</span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#151c2e] hover:bg-[#1a2540] text-red-400 text-xs rounded-xl transition"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0C111D]">
                    {children}
                </main>
            </div>
        </div>
    );
}
