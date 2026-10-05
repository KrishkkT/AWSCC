"use client";

import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ShieldCheck, Lock, Sparkles, Server, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Login() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error logging in:', error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060913] flex relative overflow-hidden text-white select-none">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-cyan/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute inset-0 bg-dot-grid opacity-15 pointer-events-none" />

            {/* Left Side - Visual Graphic (Desktop) */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden border-r border-white/5">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#060913]/40 to-[#060913] z-10" />

                {/* Animated Rotating Tech Rings */}
                <div className="relative z-0">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                        className="w-[680px] h-[680px] rounded-full border border-white/5 border-dashed relative flex items-center justify-center"
                    >
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                            className="w-[500px] h-[500px] rounded-full border border-brand-cyan/20 border-dashed flex items-center justify-center"
                        >
                            <div className="w-[340px] h-[340px] rounded-full border border-white/10" />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Left Side Content Overlay */}
                <div className="absolute z-20 max-w-lg px-8 text-center flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-4"
                    >
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
                            AWS SBG · DDU Chapter
                        </div>

                        <h2 className="text-5xl xl:text-6xl font-black tracking-tight text-white leading-tight">
                            Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-blue-400 to-cyan-200">Center</span>
                        </h2>

                        <p className="text-white/50 text-sm xl:text-base font-medium max-w-md mx-auto leading-relaxed">
                            Unified management console for events, on-chain certificates, verified badges, and member operations.
                        </p>

                        <div className="pt-6 grid grid-cols-2 gap-4 text-left">
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                                <div className="text-brand-cyan font-bold text-sm mb-1 flex items-center gap-1.5">
                                    <Server size={14} /> High Availability
                                </div>
                                <div className="text-white/40 text-xs">Fast, server-side cached API & automated pipelines</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                                <div className="text-brand-cyan font-bold text-sm mb-1 flex items-center gap-1.5">
                                    <Lock size={14} /> Zero Trust RBAC
                                </div>
                                <div className="text-white/40 text-xs">Granular authorization with role-based policies</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Login Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 relative z-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="max-w-md w-full"
                >
                    {/* Return Link Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-brand-cyan transition-colors"
                        >
                            <ArrowLeft size={14} /> Back to Public Site
                        </Link>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Systems Online
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="relative rounded-3xl p-8 sm:p-10 bg-[#0c1222]/80 border border-white/10 shadow-2xl backdrop-blur-2xl overflow-hidden group">
                        {/* Interactive Corner Glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-cyan/20 rounded-full blur-3xl group-hover:bg-brand-cyan/30 transition-all duration-700 pointer-events-none" />

                        {/* Brand Icon Header */}
                        <div className="mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-cyan/20 to-blue-500/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shadow-[0_0_25px_rgba(0,194,255,0.2)] mb-5">
                                <ShieldCheck size={28} />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-white mb-2">
                                Admin <span className="text-brand-cyan">Authentication</span>
                            </h1>
                            <p className="text-white/50 text-sm leading-relaxed">
                                Sign in with your registered AWS SBG Google account to access administrative controls.
                            </p>
                        </div>

                        {/* Sign In Button */}
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full py-4 px-6 bg-white text-[#060913] hover:bg-white/95 font-black text-sm rounded-2xl flex items-center justify-center gap-3 relative overflow-hidden transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_35px_rgba(0,194,255,0.3)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-[#060913]/30 border-t-[#060913] rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    <span className="tracking-tight">Sign in with Google</span>
                                    <ArrowRight size={16} className="text-black/50 ml-auto" />
                                </>
                            )}
                        </button>

                        {/* Security Footer Badge */}
                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[11px] text-white/30">
                            <span className="flex items-center gap-1.5">
                                <Lock size={12} className="text-brand-cyan" /> 256-bit Encrypted
                            </span>
                            <span>Authorized Personnel Only</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
