"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Shield, Bell, Save, Check, X, Loader2 } from "lucide-react";
import Toast from "@/components/Toast";

export default function Settings() {
    const [profile, setProfile] = useState({ full_name: '', email: '', role: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const supabase = createClient();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data || { full_name: user.email, role: 'member', email: user.email });
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    async function handleSave() {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({ full_name: profile.full_name })
            .eq('id', user.id);

        if (error) {
            setFeedback({ type: 'error', message: error.message });
        } else {
            setFeedback({ type: 'success', message: 'Profile updated successfully!' });
        }
        setSaving(false);
        setTimeout(() => setFeedback(null), 3000);
    }

    if (loading) return <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">Loading System Config...</div>;

    return (
        <div className="space-y-12 max-w-4xl">
            {/* Feedback Toast */}
            {feedback && (
                <Toast
                    message={feedback.message}
                    type={feedback.type}
                    onClose={() => setFeedback(null)}
                />
            )}

            <div>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-black text-white mb-4 tracking-tight"
                >
                    System <span className="text-brand-cyan">Settings</span>
                </motion.h1>
                <p className="text-white/40 font-medium text-lg tracking-tight">Configure your administrative profile and system preferences.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-10 border-white/5"
                >
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                        <div className="w-12 h-12 bg-brand-cyan/10 rounded-2xl flex items-center justify-center text-brand-cyan">
                            <User size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">Administrative Profile</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Full Name</label>
                            <input
                                type="text"
                                value={profile.full_name}
                                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Email Identifier</label>
                            <input
                                type="email"
                                disabled
                                value={profile.email}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white/50 cursor-not-allowed font-bold"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Role Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-10 border-white/5"
                >
                    <div className="flex items-center gap-4 mb-4 pb-0 border-none">
                        <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                            <Shield size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">Security & Permissions</h3>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 mt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-lg font-black text-white mb-1 uppercase tracking-tight">Access Role: <span className="text-brand-cyan">{profile.role}</span></div>
                                <p className="text-sm text-white/40 font-medium">Your role defines your access levels across the platform.</p>
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-black uppercase tracking-widest">
                                Managed by Captain
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary px-10 py-5 flex items-center gap-3 shadow-[0_0_40px_rgba(0,194,255,0.2)] disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

        </div>
    );
}
