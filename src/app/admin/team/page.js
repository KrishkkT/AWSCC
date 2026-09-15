"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Edit2, Save, X, Loader2, Github, Linkedin, Instagram, Globe, Upload, Filter } from "lucide-react";
import { logActivity } from "@/utils/logger";
import Toast from "@/components/Toast";
import { uploadFile, deleteFile } from "@/lib/storage";

const CATEGORY_OPTIONS = [
    { value: 'Advisory', label: 'Advisory Committee', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'Mentor', label: 'Academic Mentors / Faculty', badge: 'bg-brand-teal/10 text-brand-teal border-brand-teal/20' },
    { value: 'Leader', label: 'Cloud Club Leaders / Captains', badge: 'bg-brand-aws/10 text-brand-aws border-brand-aws/20' },
    { value: 'Team', label: 'Core Team Members', badge: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' },
    { value: 'Founding', label: 'Founding Leaders', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
];

export default function AdminTeam() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [imageSource, setImageSource] = useState('url'); // 'url' or 'upload'
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

    const [formData, setFormData] = useState({
        full_name: '',
        role_title: '',
        category: 'Advisory',
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
        try {
            const oldUrl = formData.avatar_url || editingMember?.avatar_url;
            const result = await uploadFile(file, {
                folder: '/team',
                tags: ['team-avatar'],
                oldFileUrl: oldUrl
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to upload avatar');
            }

            setFormData({ ...formData, avatar_url: result.url });
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
                if (memberToDelete?.avatar_url) {
                    deleteFile(memberToDelete.avatar_url).catch(() => {});
                }
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
                category: selectedCategoryFilter !== 'all' ? selectedCategoryFilter : 'Advisory',
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

    const getCategoryBadgeClass = (category) => {
        const found = CATEGORY_OPTIONS.find(c => c.value.toLowerCase() === (category || '').toLowerCase());
        if (found) return found.badge;
        if (category === 'Captain' || category === 'Leader') return 'bg-brand-aws/10 text-brand-aws border-brand-aws/20';
        if (category === 'Faculty' || category === 'Mentor') return 'bg-brand-teal/10 text-brand-teal border-brand-teal/20';
        if (category === 'Advisor' || category === 'Advisory') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        return 'bg-white/5 text-white/60 border-white/5';
    };

    const getCategoryDisplayLabel = (category) => {
        switch (category) {
            case 'Advisory':
            case 'Advisor':
                return 'Advisory Committee';
            case 'Mentor':
            case 'Faculty':
                return 'Academic Mentor';
            case 'Captain':
            case 'Leader':
                return 'Club Leader / Captain';
            case 'Team':
            case 'Core':
                return 'Core Team';
            case 'Founding':
                return 'Founding Leader';
            default:
                return category;
        }
    };

    const filteredTeam = team.filter(member => {
        if (selectedCategoryFilter === 'all') return true;
        if (selectedCategoryFilter === 'Advisory') return member.category === 'Advisory' || member.category === 'Advisor';
        if (selectedCategoryFilter === 'Mentor') return member.category === 'Mentor' || member.category === 'Faculty';
        if (selectedCategoryFilter === 'Leader') return member.category === 'Leader' || member.category === 'Captain';
        if (selectedCategoryFilter === 'Team') return member.category === 'Team' || member.category === 'Core';
        if (selectedCategoryFilter === 'Founding') return member.category === 'Founding';
        return member.category === selectedCategoryFilter;
    });

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
                    <p className="text-white/40 font-medium">Manage advisory committee, academic mentors, club leaders, and core team.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary px-8 py-4 flex items-center gap-3">
                    <Plus size={20} /> Add Member
                </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5">
                <button
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        selectedCategoryFilter === 'all'
                            ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-brand-cyan/20'
                            : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                >
                    All ({team.length})
                </button>
                {CATEGORY_OPTIONS.map(cat => {
                    const count = team.filter(m => {
                        if (cat.value === 'Advisory') return m.category === 'Advisory' || m.category === 'Advisor';
                        if (cat.value === 'Mentor') return m.category === 'Mentor' || m.category === 'Faculty';
                        if (cat.value === 'Leader') return m.category === 'Leader' || m.category === 'Captain';
                        if (cat.value === 'Team') return m.category === 'Team' || m.category === 'Core';
                        if (cat.value === 'Founding') return m.category === 'Founding';
                        return m.category === cat.value;
                    }).length;

                    return (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategoryFilter(cat.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                                selectedCategoryFilter === cat.value
                                    ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-brand-cyan/20'
                                    : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <span>{cat.label.split('/')[0].trim()}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                selectedCategoryFilter === cat.value ? 'bg-brand-dark/20 text-brand-dark font-black' : 'bg-white/10 text-white/60'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Loading Roster...</div>
            ) : filteredTeam.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                    <Users size={48} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/40 font-bold text-sm">No members found in this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeam.map((member, i) => (
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
                                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCategoryBadgeClass(member.category)}`}>
                                        {getCategoryDisplayLabel(member.category)}
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
                                        <Edit2 size={20} />
                                    </button>
                                    <button onClick={() => handleDelete(member.id)} className="btn-crud-delete" title="Delete Member">
                                        <Trash2 size={20} />
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
                        className="glass-card w-full max-w-xl p-5 sm:p-8 md:p-10 relative z-10 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[92vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6 sm:mb-8">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">{editingMember ? 'Edit Profile' : 'Add Team Member'}</h2>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Personnel Directory</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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
                                        placeholder="e.g. Advisory Board Member / Patron"
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
                                        {CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value} className="bg-brand-dark">
                                                {opt.label}
                                            </option>
                                        ))}
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
                                            Image URL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setImageSource('file')}
                                            className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all ${imageSource === 'file' ? 'bg-brand-cyan text-brand-dark' : 'text-white/40'}`}
                                        >
                                            Upload File
                                        </button>
                                    </div>
                                </div>

                                {imageSource === 'url' ? (
                                    <input
                                        type="url"
                                        required={!formData.avatar_url}
                                        value={formData.avatar_url}
                                        onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
                                        placeholder="https://..."
                                        className="form-input"
                                    />
                                ) : (
                                    <label className="flex items-center justify-center gap-2 p-6 border border-dashed border-white/10 rounded-xl hover:border-brand-cyan/40 cursor-pointer transition-all bg-white/[0.02]">
                                        <Upload size={18} className="text-brand-cyan" />
                                        <span className="text-xs font-bold text-white/60">
                                            {uploading ? 'Uploading avatar...' : 'Choose image file'}
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

                            {formData.avatar_url && (
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <img src={formData.avatar_url} alt="Preview" className="w-12 h-12 rounded-xl object-cover" />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-white truncate">{formData.full_name || 'Member'}</p>
                                        <p className="text-[10px] text-white/40 truncate">{formData.role_title || 'Role'}</p>
                                    </div>
                                </div>
                            )}

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

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary w-full sm:flex-1 py-3.5 sm:py-4">Cancel</button>
                                <button type="submit" disabled={submitting || uploading} className="btn-primary w-full sm:flex-1 py-3.5 sm:py-4 flex items-center justify-center gap-2">
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
