"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Shield, Bell, Save, Loader2 } from "lucide-react";
import Toast from "@/components/Toast";

export default function Settings() {
    const [profile, setProfile] = useState({ full_name: '', email: '', role: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [globalSettings, setGlobalSettings] = useState({
        maintenance_mode: false,
        announcement_banner: '',
        join_link: '',
        instagram_url: '',
        linkedin_url: ''
    });
    const supabase = createClient();

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(prof || { full_name: user.email, role: 'member', email: user.email });

                if (prof?.role === 'captain') {
                    const { data: global } = await supabase
                        .from('global_settings')
                        .select('*')
                        .single();
                    if (global) setGlobalSettings(global);
                }
            }
            setLoading(false);
        }
        loadData();
    }, []);

    async function handleSave() {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error: pError } = await supabase
            .from('profiles')
            .update({ full_name: profile.full_name })
            .eq('id', user.id);

        if (profile.role === 'captain') {
            await supabase
                .from('global_settings')
                .upsert([globalSettings]);
        }

        if (pError) {
            setFeedback({ type: 'error', message: pError.message });
        } else {
            setFeedback({ type: 'success', message: 'Configuration updated successfully!' });
        }
        setSaving(false);
        setTimeout(() => setFeedback(null), 3000);
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">Reading System Config...</div>
        </div>
    );

    return (
        <div className="space-y-12 max-w-5xl">
            {feedback && <Toast message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
                        System <span className="text-brand-cyan">Command</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium text-lg tracking-tight">Manage your administrative profile and global platform parameters.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleSave} disabled={saving} className="btn-primary px-10 py-5 flex items-center gap-3 shadow-[0_0_40px_rgba(0,194,255,0.2)]">
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {saving ? 'Synchronizing...' : 'Apply Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-10 border-white/5">
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                            <div className="w-12 h-12 bg-brand-cyan/10 rounded-2xl flex items-center justify-center text-brand-cyan"><User size={24} /></div>
                            <h3 className="text-xl font-black text-white tracking-tight">Administrative Profile</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Full Name</label>
                                <input type="text" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Email Identifier</label>
                                <input type="email" disabled value={profile.email} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white/50 cursor-not-allowed font-bold" />
                            </div>
                        </div>
                    </motion.div>

                    {profile.role === 'captain' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-10 border-brand-cyan/20 bg-brand-cyan/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4"><Shield className="text-brand-cyan/20" size={80} /></div>
                            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-brand-cyan/10 relative z-10">
                                <div className="w-12 h-12 bg-brand-cyan/20 rounded-2xl flex items-center justify-center text-brand-cyan"><SettingsIcon size={24} /></div>
                                <h3 className="text-xl font-black text-white tracking-tight">Captain Intelligence <span className="text-xs ml-2 text-brand-cyan/60 uppercase tracking-widest font-black">Global Control</span></h3>
                            </div>
                            <div className="space-y-8 relative z-10">
                                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <div className="text-white font-black uppercase text-xs tracking-widest mb-1">Maintenance Mode</div>
                                        <div className="text-white/40 text-xs text-xs">Instantly disable all public-facing features for maintenance.</div>
                                    </div>
                                    <button onClick={() => setGlobalSettings({ ...globalSettings, maintenance_mode: !globalSettings.maintenance_mode })} className={`w-14 h-8 rounded-full transition-all relative ${globalSettings.maintenance_mode ? 'bg-brand-cyan' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${globalSettings.maintenance_mode ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Universal Announcement</label>
                                    <input type="text" value={globalSettings.announcement_banner} onChange={e => setGlobalSettings({ ...globalSettings, announcement_banner: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Instagram Link</label>
                                        <input type="text" value={globalSettings.instagram_url} onChange={e => setGlobalSettings({ ...globalSettings, instagram_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">LinkedIn Link</label>
                                        <input type="text" value={globalSettings.linkedin_url} onChange={e => setGlobalSettings({ ...globalSettings, linkedin_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="space-y-8">
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card p-8 border-white/5">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 mb-6"><Shield size={24} /></div>
                        <h4 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-4">Access Level</h4>
                        <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-xl">
                            <div className="text-brand-cyan font-black text-xl uppercase tracking-tighter mb-1">{profile.role}</div>
                            <p className="text-white/40 text-[10px] leading-relaxed">
                                {profile.role === 'captain' ? 'You have complete control over the system.' : 'You have standard administrative access.'}
                            </p>
                        </div>
                    </motion.div>
                    <div className="p-8 border border-white/5 rounded-[2rem] bg-white/[0.02]">
                        <div className="flex items-center gap-3 text-white/30 mb-6">
                            <Bell size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">System Alerts</span>
                        </div>
                        <div className="space-y-4 text-xs text-white/40">
                            <div className="flex gap-4"><div className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-1.5"></div>All systems operational.</div>
                            <div className="flex gap-4"><div className="w-1.5 h-1.5 rounded-full bg-white/10 mt-1.5"></div>Activity logs synchronized.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
