'use client';

import React from 'react';
import Link from 'next/link';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { QrCode, ArrowRight, Shield, Zap, Sparkles, CheckCircle2, Users, Layers, Coffee, Award, BarChart3, Database } from 'lucide-react';

export default function OnePassLandingPage() {
    const { user, availableEvents, loading } = useOnePass();

    return (
        <div className="min-h-screen bg-[#0C111D] text-white flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Background Glow matching public website */}
            <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-[#0073BB]/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-[#FF9900]/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Top Navigation */}
            <header className="border-b border-[#1a2540] backdrop-blur-md sticky top-0 z-40 bg-[#0C111D]/90">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0073BB] to-[#4F8EF7] flex items-center justify-center shadow-lg shadow-[#0073BB]/20">
                            <QrCode className="w-5 h-5 text-white stroke-[2.5]" />
                        </div>
                        <div>
                            <span className="font-bold text-lg tracking-tight text-white">ONEPASS</span>
                            <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#0073BB]/10 text-[#4F8EF7] border border-[#0073BB]/30">
                                Operations Platform
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {loading ? (
                            <div className="w-20 h-8 bg-[#151c2e] animate-pulse rounded-lg" />
                        ) : user ? (
                            <div className="flex items-center space-x-3">
                                <span className="text-xs text-slate-400">
                                    Signed in as <strong className="text-white">{user.name}</strong> ({user.role})
                                </span>
                                <Link
                                    href="/onepass/dashboard"
                                    className="flex items-center space-x-1.5 px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-[#0073BB]/20"
                                >
                                    <span>Open Console</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        ) : (
                            <Link
                                href="/onepass/login"
                                className="flex items-center space-x-1.5 px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-[#0073BB]/20"
                            >
                                <span>Volunteer Login</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center items-center text-center">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#151c2e] border border-[#1a2540] text-slate-300 text-xs mb-8 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF9900]" />
                    <span>Reusable Event Operations & Access Control Engine</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight md:leading-none mb-6">
                    One QR. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0073BB] via-[#4F8EF7] to-[#FF9900]">Every interaction.</span>
                </h1>

                <p className="text-base md:text-lg text-slate-300 max-w-2xl mb-10 leading-relaxed">
                    A production-ready platform for check-in, real-time track capacity management, workshop eligibility, meal vouchers, swag kit distribution, and volunteer access control.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
                    {user ? (
                        <Link
                            href="/onepass/dashboard"
                            className="flex items-center space-x-2 px-8 py-3.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-[#0073BB]/25 hover:scale-[1.02]"
                        >
                            <span>Open Event Console</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    ) : (
                        <Link
                            href="/onepass/login"
                            className="flex items-center space-x-2 px-8 py-3.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-[#0073BB]/25 hover:scale-[1.02]"
                        >
                            <span>Volunteer Login</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>

                {/* Core Architecture Flow Visual */}
                <div className="w-full max-w-4xl p-6 bg-[#151c2e]/90 border border-[#1a2540] rounded-2xl backdrop-blur-sm shadow-xl">
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-6">
                        Unified QR Identity Workflow
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-center">
                        {[
                            { step: '01', title: 'KonfHub', desc: 'CSV/XLSX Import' },
                            { step: '02', title: 'OnePass ID', desc: 'Secure QR Token' },
                            { step: '03', title: 'Check-In', desc: 'Track Selection' },
                            { step: '04', title: 'Gate Access', desc: 'Track 1/2/3' },
                            { step: '05', title: 'Workshops', desc: 'Hands-on Labs' },
                            { step: '06', title: 'Food & Meals', desc: 'Breakfast/Lunch' },
                            { step: '07', title: 'Swag Kit', desc: '1-Click Claim' },
                        ].map((item, idx) => (
                            <div key={idx} className="p-3 bg-[#0C111D] border border-[#1a2540] rounded-xl flex flex-col justify-center items-center">
                                <span className="text-[10px] font-mono text-[#FF9900] font-bold">{item.step}</span>
                                <span className="text-xs font-semibold text-white mt-1">{item.title}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-12 text-left">
                    <div className="p-6 bg-[#151c2e]/70 border border-[#1a2540] rounded-2xl space-y-3 shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-[#0073BB]/10 text-[#4F8EF7] flex items-center justify-center">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-white text-base">Atomic Concurrency & Capacities</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Server-side mutex locking guarantees no track or workshop ever exceeds maximum capacity (e.g. 150/150), even when multiple volunteers scan simultaneously.
                        </p>
                    </div>

                    <div className="p-6 bg-[#151c2e]/70 border border-[#1a2540] rounded-2xl space-y-3 shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center">
                            <Coffee className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-white text-base">Duplicate-Safe Meal & Swag Claims</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Generic claim engine prevents duplicate meal collections or double swag claims. Instant audio and visual feedback for volunteers on mobile devices.
                        </p>
                    </div>

                    <div className="p-6 bg-[#151c2e]/70 border border-[#1a2540] rounded-2xl space-y-3 shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-white text-base">Granular Volunteer RBAC</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Restrict volunteer accounts to exact assigned modules (Check-in, Track Gate, Food, Swag). Backend API enforcement guarantees total event data isolation.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#1a2540] py-6 bg-[#0C111D]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 space-y-3 md:space-y-0">
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">ONEPASS</span>
                        <span>— Built for AWS Student Builder Group DDU</span>
                    </div>
                    <div>
                        <span>One QR. Every interaction.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
