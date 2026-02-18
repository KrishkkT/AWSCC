"use client";

import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
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
        <div className="min-h-screen bg-brand-dark flex relative overflow-hidden">
            {/* Left Side - Visual */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-dot-grid opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/0 to-brand-dark z-10"></div>

                {/* Animated Orb/Globe Effect */}
                <div className="relative z-0">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                        className="w-[800px] h-[800px] rounded-full border border-white/5 border-dashed relative flex items-center justify-center"
                    >
                        <div className="w-[600px] h-[600px] rounded-full border border-white/5 border-dashed opacity-50"></div>
                        <div className="w-[400px] h-[400px] rounded-full border border-brand-cyan/20 border-dashed opacity-50"></div>
                    </motion.div>
                </div>

                <div className="absolute z-20 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-6xl font-black text-white mb-4 tracking-tighter">
                            System <span className="text-brand-cyan">Access</span>
                        </h2>
                        <p className="text-white/40 font-medium text-lg uppercase tracking-widest">
                            Authorized Personnel Only
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-20">
                {/* Mobile Background */}
                <div className="absolute inset-0 bg-dot-grid opacity-10 lg:hidden"></div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-md w-full"
                >
                    <div className="glass-card p-10 border-white/10 relative overflow-hidden group">
                        {/* Glow Effect */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-cyan/20 rounded-full blur-[80px] group-hover:bg-brand-cyan/30 transition-colors duration-500"></div>

                        <div className="mb-10">
                            <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mb-6 border border-white/10 text-brand-cyan">
                                <ShieldCheck size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-white mb-2">Welcome Back.</h1>
                            <p className="text-white/50">Log in to manage the platform.</p>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full py-4 bg-white text-brand-dark font-black rounded-xl flex items-center justify-center gap-3 relative overflow-hidden group/btn hover:scale-[1.02] transition-transform active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-brand-cyan opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                                    <ArrowRight size={16} className="opacity-40" />
                                </>
                            )}
                        </button>

                        <div className="mt-8 text-center">
                            <Link href="/" className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors">
                                Return to Homepage
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
