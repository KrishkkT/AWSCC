"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Users, Calendar, Award, FileText, Bookmark, Plus, Trash2, Edit2, Save, X, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import Toast from "@/components/Toast";
import { uploadFile } from "@/lib/storage";

export default function AdminDashboard() {
    const [profile, setProfile] = useState(null);
    const supabase = createClient();
    
    // Home Gallery States
    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [formData, setFormData] = useState({ title: '', url: '' });
    const [globalSettings, setGlobalSettings] = useState(null);

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data || { full_name: user.email, role: 'member' });
            }
        }
        loadProfile();
    }, []);

    const [stats, setStats] = useState([
        { label: "Active Events", value: "...", icon: <Calendar size={20} />, color: "cyan", link: "/admin/events" },
        { label: "Total Certificates", value: "...", icon: <Award size={20} />, color: "teal", link: "/admin/certificates" },
        { label: "System Health", value: "Optimal", icon: <Zap size={20} />, color: "white", link: "/admin/logs" },
    ]);

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(data || { full_name: user.email, role: 'member' });
            }

            // Fetch real stats
            const [eventsCount, certsCount, { data: globalData }] = await Promise.all([
                supabase.from('events').select('*', { count: 'exact', head: true }).neq('status', 'past'),
                supabase.from('certificates').select('*', { count: 'exact', head: true }),
                supabase.from('global_settings').select('*').single()
            ]);

            if (globalData) {
                setGlobalSettings(globalData);
            }

            setStats([
                { label: "Active Events", value: eventsCount.count || 0, icon: <Calendar size={20} />, color: "cyan", link: "/admin/events" },
                { label: "Total Certificates", value: certsCount.count || 0, icon: <Award size={20} />, color: "teal", link: "/admin/certificates" },
                { label: "System Health", value: "Optimal", icon: <Zap size={20} />, color: "white", link: "/admin/logs" },
            ]);
        }
        loadData();
    }, []);

    // Home Gallery Logic
    const fetchPhotos = useCallback(async () => {
        setLoadingPhotos(true);
        const { data, error } = await supabase
            .from('home_gallery')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setPhotos(data || []);
        else {
            console.error('Error fetching home gallery:', error);
            // Ignore error if table is missing initially
        }
        setLoadingPhotos(false);
    }, [supabase]);

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showFeedback('Please upload an image file', 'error');
            return;
        }

        setUploading(true);
        try {
            const result = await uploadFile(file, {
                folder: '/gallery',
                tags: ['home-glimpse']
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to upload image');
            }

            setFormData({ ...formData, url: result.url });
            showFeedback('Image uploaded!');
        } catch (error) {
            console.error('Upload error:', error);
            showFeedback(`Upload failed: ${error.message || 'Check storage configuration'}`, 'error');
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        if (editingPhoto) {
            const { error } = await supabase
                .from('home_gallery')
                .update(formData)
                .eq('id', editingPhoto.id);

            if (!error) {
                showFeedback('Photo updated!');
                setShowModal(false);
                fetchPhotos();
            } else {
                showFeedback('Error: ' + error.message, 'error');
            }
        } else {
            const { error } = await supabase
                .from('home_gallery')
                .insert([formData]);

            if (!error) {
                showFeedback('Photo added to glimpse gallery!');
                setShowModal(false);
                fetchPhotos();
            } else {
                showFeedback('Error: ' + error.message, 'error');
            }
        }
        setSubmitting(false);
    }

    async function handleDelete(id) {
        if (confirm('Remove this photo from the home glimpse gallery?')) {
            const { error } = await supabase.from('home_gallery').delete().eq('id', id);
            if (!error) {
                showFeedback('Photo removed!', 'info');
                fetchPhotos();
            } else {
                showFeedback('Delete failed', 'error');
            }
        }
    }

    function showFeedback(message, type = 'success') {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    }

    async function toggleGlimpseGallery() {
        if (!globalSettings) return;
        const newValue = !globalSettings.show_glimpse_gallery;
        const { error } = await supabase
            .from('global_settings')
            .upsert([{ ...globalSettings, show_glimpse_gallery: newValue, id: '1', updated_at: new Date().toISOString() }]);
        
        if (!error) {
            setGlobalSettings({ ...globalSettings, show_glimpse_gallery: newValue });
            showFeedback(`Home Gallery is now ${newValue ? 'Visible' : 'Hidden'}`, 'success');
        } else {
            console.error('Toggle error:', error);
            showFeedback('Error: ' + error.message, 'error');
        }
    }

    return (
        <div className="space-y-10">
            {feedback && (
                <Toast message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />
            )}

            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <div className="w-10 h-10 rounded-xl bg-brand-aws/10 flex items-center justify-center text-brand-aws border border-brand-aws/20 shadow-lg shadow-brand-aws/5 ring-1 ring-white/5">
                            <Shield size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-aws/80 leading-none mb-1">
                                Secure Protocol
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                v2.4.0-Stable
                            </span>
                        </div>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-3 tracking-tighter leading-tight"
                    >
                        Operations <span className="text-aws-gradient">Control</span>
                    </motion.h1>
                    <p className="text-slate-400 font-medium text-sm sm:text-base max-w-xl leading-relaxed">
                        Authorized access for {profile?.full_name || 'Administrator'}.
                        Monitoring real-time metrics and system integrity for the AWS Student Builder Group DDU deployment.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-1 pb-1 pr-6 flex items-center gap-6 bg-slate-900/40 border-white/5 shadow-2xl"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-aws to-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-aws/20 ring-1 ring-white/20 shrink-0">
                        <Shield size={28} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Access Level</div>
                        <div className="text-white font-black uppercase tracking-tight text-lg text-aws-gradient truncate leading-none">
                            {profile?.role || 'member'}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Metrics Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                        className="group relative"
                        onClick={() => window.location.href = stat.link}
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-aws/20 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl blur-sm transition duration-500"></div>
                        <div className="glass-card p-8 bg-slate-900/60 border-white/5 hover:border-brand-aws/30 transition-all duration-500 cursor-pointer relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-aws group-hover:bg-brand-aws group-hover:text-brand-deep transition-all duration-500 shadow-inner">
                                    {stat.icon}
                                </div>
                                <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-aws animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                </div>
                            </div>
                            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{stat.label}</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-white tracking-tighter">{stat.value}</span>
                                <span className="text-[10px] font-bold text-brand-aws/60 uppercase tracking-widest">Global Status</span>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telemetry Active</span>
                                <Zap size={12} className="text-brand-aws" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Secondary Command Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* System Integrity (3 cols) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-3 glass-card p-10 bg-slate-900/40 border-white/5 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brand-aws/10 flex items-center justify-center text-brand-aws border border-brand-aws/20">
                                <Zap size={20} />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight">System <span className="text-brand-aws">Sync</span></h3>
                        </div>
                        <button onClick={() => window.location.href = '/admin/logs'} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:bg-brand-aws hover:text-brand-deep transition-all duration-300">
                            Audit Protocol
                        </button>
                    </div>

                    <div className="flex-grow space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest">
                            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center gap-3 text-green-400">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                Database Cluster Online
                            </div>
                            <div className="p-4 rounded-xl bg-brand-aws/5 border border-brand-aws/10 flex items-center gap-3 text-brand-aws">
                                <div className="w-2 h-2 rounded-full bg-brand-aws shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                API Gateway Optimized
                            </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-brand-aws animate-spin shrink-0"></div>
                            <div>
                                <div className="text-white font-bold mb-2">Supabase High Availability Active</div>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                    Real-time socket connection established. All administrative changes are synchronized
                                    across edge nodes with sub-50ms latency.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Control Grid (2 cols) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-2 glass-card p-10 bg-slate-900/40 border-white/5"
                >
                    <div className="mb-10">
                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">Control <span className="text-brand-aws">Center</span></h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resource Management Modules</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { name: "Events", icon: Calendar, link: "/admin/events" },
                            { name: "Team", icon: Users, link: "/admin/team" },
                            { name: "Docs", icon: FileText, link: "/admin/resources" },
                            { name: "Guides", icon: Bookmark, link: "/admin/knowledge" },
                            { name: "Certs", icon: Award, link: "/admin/certificates" },
                            { name: "Config", icon: Shield, link: "/admin/settings" },
                        ].map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => window.location.href = item.link}
                                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center gap-3 transition-all duration-300 hover:bg-brand-aws/10 hover:border-brand-aws/30"
                            >
                                <item.icon size={24} className="text-slate-400 group-hover:text-brand-aws group-hover:scale-110 transition-all" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
                                    {item.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Home Glimpse Gallery Management Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card p-10 bg-slate-900/40 border-white/5 mt-10"
            >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                                <ImageIcon size={20} />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Home <span className="text-brand-cyan">Glimpse</span> Gallery</h3>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manage the scattered photos for the homepage</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {globalSettings && (
                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {globalSettings.show_glimpse_gallery ? 'Visible' : 'Hidden'}
                                </span>
                                <button onClick={toggleGlimpseGallery} className={`w-10 h-6 rounded-full transition-colors duration-300 relative ${globalSettings.show_glimpse_gallery ? 'bg-green-500' : 'bg-gray-500'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${globalSettings.show_glimpse_gallery ? 'left-5' : 'left-1'}`}></div>
                                </button>
                            </div>
                        )}
                        <button onClick={() => { setEditingPhoto(null); setFormData({ title: '', url: '' }); setShowModal(true); }} className="btn-primary px-6 py-3 flex items-center gap-2 text-xs">
                            <Plus size={16} /> Add Photo
                        </button>
                    </div>
                </div>

                {loadingPhotos ? (
                    <div className="text-center py-10 animate-pulse text-white/20 font-black tracking-widest uppercase">Fetching Memories...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {photos.map((photo, i) => (
                            <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass-card overflow-hidden group border-white/5 hover:border-brand-cyan/20 transition-all flex flex-col"
                            >
                                <div className="aspect-square relative overflow-hidden">
                                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <div className="p-3 flex items-center justify-between">
                                    <h3 className="text-white text-sm font-bold truncate max-w-[60%]">{photo.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setEditingPhoto(photo); setFormData(photo); setShowModal(true); }} className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 transition-colors" title="Edit Photo">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(photo.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Delete Photo">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {photos.length === 0 && (
                            <div className="col-span-full text-center py-12 text-white/30 border border-dashed border-white/10 rounded-2xl">
                                No photos yet. Add up to 20 photos for the homepage glimpse section.
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="glass-card w-full max-w-xl p-10 relative z-10 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-white leading-tight">
                                    {editingPhoto ? 'Edit' : 'Add'} <span className="text-brand-cyan">Photo</span>
                                </h2>
                                <p className="text-white/30 text-xs font-medium mt-1">Fill in the details to update the homepage gallery.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                                title="Close"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brand-cyan ml-1">Photo Title</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-cyan transition-all font-bold placeholder-white/10"
                                    placeholder="e.g. Hackathon 2024"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brand-cyan ml-1">Photo Source (Ratio: 3:4 or 4:3 Recommended)</label>
                                <div className="flex gap-3 items-stretch">
                                    <input
                                        required
                                        type="text"
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        className="flex-grow bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-cyan transition-all font-bold placeholder-white/10"
                                        placeholder="Paste image URL..."
                                    />
                                    <label className="cursor-pointer shrink-0">
                                        <div className={`px-6 py-4 rounded-2xl border border-dashed border-white/20 hover:border-brand-cyan/50 hover:bg-brand-cyan/5 flex items-center justify-center transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {uploading ? <Loader2 size={18} className="animate-spin text-brand-cyan" /> : <Upload size={18} className="text-white/40 group-hover:text-brand-cyan" />}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || uploading}
                                className="w-full btn-primary py-5 rounded-2xl uppercase font-black tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,194,255,0.2)] disabled:opacity-50 transition-all hover:scale-[1.02]"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {submitting ? 'Updating Database...' : (editingPhoto ? 'Update Photo' : 'Confirm & Save Photo')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
