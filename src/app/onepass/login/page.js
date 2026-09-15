'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnePass } from '@/components/onepass/OnePassContext';
import { QrCode, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function OnePassLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { fetchSession } = useOnePass();
    const router = useRouter();

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/onepass/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            await fetchSession();
            router.push('/onepass/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0C111D] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#0073BB]/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md space-y-6 relative z-10">
                {/* Brand Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0073BB] to-[#4F8EF7] items-center justify-center shadow-xl shadow-[#0073BB]/20">
                        <QrCode className="w-6 h-6 text-white stroke-[2.5]" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">ONEPASS</h1>
                    <p className="text-xs text-slate-400">One QR. Every interaction.</p>
                </div>

                {/* Login Form Card */}
                <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-sm">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-white">Volunteer Sign In</h2>
                        <p className="text-xs text-slate-400">Sign in with your assigned volunteer credentials</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB] transition"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB] transition"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center space-x-2 py-3 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-[#0073BB]/20 mt-2"
                        >
                            {loading ? (
                                <span>Authenticating...</span>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
