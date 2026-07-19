"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Plus, Trash2, Edit2, Link as LinkIcon, FileText, Video, Wrench, Save, Loader2 } from "lucide-react";
import { logActivity } from "@/utils/logger";
import Toast from "@/components/Toast";

export default function AdminResources() {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Cloud',
        url: '',
        type: 'Article'
    });

    const supabase = createClient();

    useEffect(() => {
        fetchResources();
    }, []);

    async function fetchResources() {
        setLoading(true);
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setResources(data || []);
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        if (editingResource) {
            const { error } = await supabase
                .from('resources')
                .update(formData)
                .eq('id', editingResource.id);

            if (!error) {
                setFeedback({ message: 'Resource updated!', type: 'success' });
                setShowModal(false);
                fetchResources();
            } else {
                setFeedback({ message: 'Error updating: ' + error.message, type: 'error' });
            }
        } else {
            const { error } = await supabase
                .from('resources')
                .insert([formData]);

            if (!error) {
                setFeedback({ message: 'Resource added!', type: 'success' });
                setShowModal(false);
                fetchResources();
            } else {
                setFeedback({ message: 'Error adding: ' + error.message, type: 'error' });
            }
        }
        setSubmitting(false);
    }

    async function handleDelete(id) {
        if (confirm('Delete this resource?')) {
            const { error } = await supabase.from('resources').delete().eq('id', id);
            if (!error) {
                setFeedback({ message: 'Resource deleted!', type: 'info' });
                fetchResources();
            } else {
                setFeedback({ message: 'Delete failed: ' + error.message, type: 'error' });
            }
        }
    }

    const openModal = (resource = null) => {
        if (resource) {
            setEditingResource(resource);
            setFormData({ ...resource });
        } else {
            setEditingResource(null);
            setFormData({
                title: '',
                description: '',
                category: 'Cloud',
                url: '',
                type: 'Article'
            });
        }
        setShowModal(true);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Video': return <Video size={16} />;
            case 'Tool': return <Wrench size={16} />;
            default: return <FileText size={16} />;
        }
    };

    return (
        <div className="space-y-10">
            {feedback && (
                <Toast message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-white mb-2 tracking-tight">
                        Resource <span className="text-brand-cyan">Vault</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Curate DevOps and Cloud learning materials.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary px-8 py-4 flex items-center gap-3">
                    <Plus size={20} /> Add Resource
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Indexing Archives...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {resources.map((res, i) => (
                        <motion.div
                            key={res.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-8 border-white/5 hover:border-white/10 transition-all flex items-start gap-6 group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-brand-cyan group-hover:bg-brand-cyan/10 transition-all shrink-0">
                                {getTypeIcon(res.type)}
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">{res.category}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">· {res.type}</span>
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 truncate group-hover:text-brand-cyan transition-colors">{res.title}</h3>
                                <p className="text-sm text-white/40 font-medium mb-6 line-clamp-2">{res.description}</p>
                                <div className="flex gap-3">
                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="btn-crud hover:bg-white/10 hover:border-white/20 text-white/40 hover:text-white" title="Open Resource"><LinkIcon size={14} /></a>
                                    <button onClick={() => openModal(res)} className="btn-crud-edit" title="Edit Resource"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(res.id)} className="btn-crud-delete" title="Delete Resource"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-xl p-8 relative z-10 border-white/10">
                        <h2 className="text-2xl font-black text-white mb-8">{editingResource ? 'Edit' : 'Add'} Resource</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/30 ml-1">Title</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all font-bold" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/30 ml-1">Description</label>
                                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all font-medium text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all font-bold">
                                        <option value="Cloud" className="bg-brand-dark">Cloud</option>
                                        <option value="DevOps" className="bg-brand-dark">DevOps</option>
                                        <option value="AI/ML" className="bg-brand-dark">AI/ML</option>
                                        <option value="Security" className="bg-brand-dark">Security</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all font-bold">
                                        <option value="Article" className="bg-brand-dark">Article</option>
                                        <option value="Video" className="bg-brand-dark">Video</option>
                                        <option value="Tool" className="bg-brand-dark">Tool</option>
                                        <option value="Course" className="bg-brand-dark">Course</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/30 ml-1">Access URL</label>
                                <input required type="url" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-all font-bold" placeholder="https://..." />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-grow btn-secondary py-4 uppercase font-black tracking-widest text-xs">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-grow btn-primary py-4 uppercase font-black tracking-widest text-xs flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {submitting ? 'Saving...' : 'Save Resource'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
