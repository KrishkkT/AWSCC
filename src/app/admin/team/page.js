"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Edit2, Github, Linkedin, Twitter, Save, X, Loader2, Upload, Link as LinkIcon, Image as ImageIcon, Instagram } from "lucide-react";
import Toast from "@/components/Toast";

export default function AdminTeam() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageSource, setImageSource] = useState('url'); // 'url' or 'upload'
    const [editingMember, setEditingMember] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        role_title: '',
        category: 'Team',
        avatar_url: '',
        github_url: '',
        linkedin_url: '',
        instagram_url: '',
        display_order: 0
    });

    const supabase = createClient();

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    const fetchTeam = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .order('display_order', { ascending: true });
        if (!error) setTeam(data || []);
        setLoading(false);
    }, [supabase]);

    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `team/${fileName}`;

        try {
            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData({ ...formData, avatar_url: publicUrl });
            setFeedback({ message: 'Image uploaded successfully!', type: 'success' });
        } catch (error) {
            setFeedback({ message: 'Upload failed: ' + error.message, type: 'error' });
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        if (editingMember) {
            const { error } = await supabase
                .from('team_members')
                .update(formData)
                .eq('id', editingMember.id);

            if (!error) {
                setFeedback({ message: 'Member updated!', type: 'success' });
                setShowModal(false);
                fetchTeam();
            } else {
                setFeedback({ message: 'Error updating: ' + error.message, type: 'error' });
            }
        } else {
            const { error } = await supabase
                .from('team_members')
                .insert([formData]);

            if (!error) {
                setFeedback({ message: 'Member added!', type: 'success' });
                setShowModal(false);
                fetchTeam();
            } else {
                setFeedback({ message: 'Error adding: ' + error.message, type: 'error' });
            }
        }
        setSubmitting(false);
    }

    async function handleDelete(id) {
        if (confirm('Delete this team member?')) {
            const { error } = await supabase.from('team_members').delete().eq('id', id);
            if (!error) {
                setFeedback({ message: 'Member removed!', type: 'info' });
                fetchTeam();
            } else {
                setFeedback({ message: 'Delete failed: ' + error.message, type: 'error' });
            }
        }
    }

    const openModal = (member = null) => {
        if (member) {
            setEditingMember(member);
            setFormData({ ...member });
            setImageSource('url');
        } else {
            setEditingMember(null);
            setFormData({
                full_name: '',
                role_title: '',
                category: 'Team',
                avatar_url: '',
                github_url: '',
                linkedin_url: '',
                instagram_url: '',
                display_order: team?.length || 0
            });
            setImageSource('url');
        }
        setShowModal(true);
    };

    return (
        <div className="space-y-10">
            {feedback && (
                <Toast message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-white mb-2 tracking-tight">
                        Team <span className="text-brand-cyan">Command</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Manage core members and faculty advisors.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary px-8 py-4 flex items-center gap-3">
                    <Plus size={20} /> Add Member
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Syncing Roster...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {team.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-6 border-white/5 flex items-start gap-5 hover:border-brand-cyan/20 transition-all group"
                        >
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 shrink-0 border border-white/10 group-hover:border-brand-cyan/30 transition-all">
                                <img src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=0D0D0D&color=fff`} className="w-full h-full object-cover" alt={member.full_name} />
                            </div>
                            <div className="flex-grow min-w-0">
                                <h3 className="text-white font-black truncate">{member.full_name}</h3>
                                <p className="text-xs text-brand-cyan font-bold mb-3">{member.role_title}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => openModal(member)} className="btn-crud-edit" title="Edit Member"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(member.id)} className="btn-crud-delete" title="Remove Member"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-2xl p-8 relative z-10 border-white/10 overflow-y-auto max-h-[90vh] no-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-white">{editingMember ? 'Edit' : 'Add'} Team Member</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/20 hover:text-white transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Full Name</label>
                                    <input required type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Role Title</label>
                                    <input required type="text" value={formData.role_title} onChange={e => setFormData({ ...formData, role_title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all" placeholder="e.g. Lead Developer" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all font-bold">
                                        <option value="Mentor" className="bg-brand-dark">Mentor</option>
                                        <option value="Captain" className="bg-brand-dark">Captain</option>
                                        <option value="Team" className="bg-brand-dark">Team Member</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Display Order</label>
                                    <input type="number" value={formData.display_order ?? 0} onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all" />
                                </div>
                            </div>

                            <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Profile Image</label>
                                    <div className="flex bg-white/5 rounded-lg p-1">
                                        <button type="button" onClick={() => setImageSource('url')} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${imageSource === 'url' ? 'bg-brand-cyan text-brand-dark' : 'text-white/40 hover:text-white'}`}>
                                            <LinkIcon size={10} /> URL
                                        </button>
                                        <button type="button" onClick={() => setImageSource('upload')} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${imageSource === 'upload' ? 'bg-brand-cyan text-brand-dark' : 'text-white/40 hover:text-white'}`}>
                                            <Upload size={10} /> Device
                                        </button>
                                    </div>
                                </div>

                                {imageSource === 'url' ? (
                                    <div className="relative group">
                                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-cyan transition-colors" size={16} />
                                        <input type="text" value={formData.avatar_url} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm outline-none focus:border-brand-cyan transition-all" placeholder="https://..." />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                                            {formData.avatar_url ? (
                                                <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Preview" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/10"><ImageIcon size={24} /></div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <label className="relative group cursor-pointer block">
                                                <div className="w-full border-2 border-dashed border-white/10 group-hover:border-brand-cyan/50 rounded-xl p-4 transition-all text-center">
                                                    {uploading ? (
                                                        <Loader2 className="animate-spin mx-auto text-brand-cyan" size={20} />
                                                    ) : (
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Choose Image</div>
                                                    )}
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4 font-bold">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 ml-1"><Github size={12} /> GitHub</label>
                                    <input type="text" value={formData.github_url} onChange={e => setFormData({ ...formData, github_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-brand-cyan transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 ml-1"><Linkedin size={12} /> LinkedIn</label>
                                    <input type="text" value={formData.linkedin_url} onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-brand-cyan transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 ml-1"><Instagram size={12} /> Instagram</label>
                                    <input type="text" value={formData.instagram_url} onChange={e => setFormData({ ...formData, instagram_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-brand-cyan transition-all" />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-grow btn-secondary py-4 uppercase font-black tracking-widest text-xs">Cancel</button>
                                <button type="submit" disabled={submitting || uploading} className="flex-grow btn-primary py-4 uppercase font-black tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,194,255,0.1)]">
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {submitting ? 'Saving...' : 'Save Member'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
