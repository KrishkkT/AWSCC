"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Edit2, Save, X, Loader2, Github, Linkedin, Instagram, Globe, Upload } from "lucide-react";
import { logActivity } from "@/utils/logger";
import Toast from "@/components/Toast";

export default function AdminTeam() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [imageSource, setImageSource] = useState('url'); // 'url' or 'upload'

    const [formData, setFormData] = useState({
        full_name: '',
        role_title: '',
        category: 'Team',
        avatar_url: '',
        github_url: '',
        linkedin_url: '',
        instagram_url: '',
        portfolio_url: '',
        display_order: 0
    });

    const supabase = createClient();

    const fetchTeam = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (!error) setTeam(data || []);
        else console.error('Error fetching team:', error);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `team/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
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
                await logActivity(supabase, 'Updated Team Member', `Updated member: ${formData.full_name} (${formData.role_title}, ${formData.category})`, 'info');
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
                await logActivity(supabase, 'Added Team Member', `Added member: ${formData.full_name} (${formData.role_title}, ${formData.category})`, 'success');
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
            const memberToDelete = team.find(m => m.id === id);
            const { error } = await supabase.from('team_members').delete().eq('id', id);
            if (!error) {
                await logActivity(supabase, 'Deleted Team Member', `Deleted member: ${memberToDelete?.full_name || id} (${memberToDelete?.role_title || 'Role'})`, 'warning');
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
            setFormData({
                portfolio_url: '',
                ...member
            });
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
                portfolio_url: '',
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
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Loading Roster...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {team.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-6 border-white/5 hover:border-brand-cyan/20 transition-all flex flex-col justify-between"
                        >
                            <div className="flex items-start gap-4">
                                <img
                                    src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`}
                                    alt={member.full_name}
                                    className="w-16 h-16 rounded-2xl object-cover border border-white/10 shrink-0 bg-white/5"
                                />
                                <div className="overflow-hidden">
                                    <h3 className="text-white font-bold truncate text-lg">{member.full_name}</h3>
                                    <p className="text-brand-cyan text-xs font-medium tracking-wide uppercase mt-0.5">{member.role_title}</p>
                                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/40 border border-white/5">
                                        {member.category}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                                <div className="flex items-center gap-3 text-white/40">
                                    {member.github_url && <a href={member.github_url} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Github size={16} /></a>}
                                    {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Linkedin size={16} /></a>}
                                    {member.instagram_url && <a href={member.instagram_url} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Instagram size={16} /></a>}
                                    {member.portfolio_url && <a href={member.portfolio_url} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Globe size={16} /></a>}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => openModal(member)} className="btn-crud-edit" title="Edit Member">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(member.id)} className="btn-crud-delete" title="Delete Member">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="glass-card w-full max-w-xl p-10 relative z-10 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white">{editingMember ? 'Edit Profile' : 'Add Team Member'}</h2>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Personnel Directory</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="e.g. Dr. John Doe"
                                        className="form-input"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Role Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.role_title}
                                        onChange={e => setFormData({ ...formData, role_title: e.target.value })}
                                        placeholder="e.g. Cloud Architect / Lead"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="Team" className="bg-brand-dark">Core Team</option>
                                        <option value="Faculty" className="bg-brand-dark">Faculty Advisor</option>
                                        <option value="Speaker" className="bg-brand-dark">Speaker / Mentor</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="form-label">Display Order</label>
                                    <input
                                        type="number"
                                        value={formData.display_order}
                                        onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="form-label mb-0">Avatar Media</label>
                                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setImageSource('url')}
                                            className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all ${imageSource === 'url' ? 'bg-brand-cyan text-brand-dark' : 'text-white/40'}`}
                                        >
                                            URL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setImageSource('upload')}
                                            className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all ${imageSource === 'upload' ? 'bg-brand-cyan text-brand-dark' : 'text-white/40'}`}
                                        >
                                            Upload
                                        </button>
                                    </div>
                                </div>

                                {imageSource === 'url' ? (
                                    <input
                                        type="url"
                                        value={formData.avatar_url}
                                        onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
                                        placeholder="https://..."
                                        className="form-input"
                                    />
                                ) : (
                                    <label className="flex items-center justify-center gap-2 p-4 border border-dashed border-white/10 rounded-xl hover:border-brand-cyan/40 cursor-pointer transition-all bg-white/[0.02]">
                                        <Upload size={18} className="text-brand-cyan" />
                                        <span className="text-xs font-bold text-white/60">
                                            {uploading ? 'Uploading Image...' : 'Choose Image File'}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="space-y-4 pt-2">
                                <p className="text-xs font-black uppercase tracking-widest text-white/40">Social Channels</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="url"
                                        value={formData.github_url}
                                        onChange={e => setFormData({ ...formData, github_url: e.target.value })}
                                        placeholder="GitHub URL..."
                                        className="form-input text-xs"
                                    />
                                    <input
                                        type="url"
                                        value={formData.linkedin_url}
                                        onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                        placeholder="LinkedIn URL..."
                                        className="form-input text-xs"
                                    />
                                    <input
                                        type="url"
                                        value={formData.instagram_url}
                                        onChange={e => setFormData({ ...formData, instagram_url: e.target.value })}
                                        placeholder="Instagram URL..."
                                        className="form-input text-xs"
                                    />
                                    <input
                                        type="url"
                                        value={formData.portfolio_url}
                                        onChange={e => setFormData({ ...formData, portfolio_url: e.target.value })}
                                        placeholder="Portfolio / Website URL..."
                                        className="form-input text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-4">Cancel</button>
                                <button type="submit" disabled={submitting || uploading} className="btn-primary flex-1 py-4 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {submitting ? 'Saving...' : editingMember ? 'Update Member' : 'Save Member'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
