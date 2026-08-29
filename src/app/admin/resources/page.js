"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Edit2, Save, X, Loader2, ExternalLink, Video, Wrench } from "lucide-react";
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

    const fetchResources = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setResources(data || []);
        else console.error('Error fetching resources:', error);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        if (editingResource) {
            const { error } = await supabase
                .from('resources')
                .update(formData)
                .eq('id', editingResource.id);

            if (!error) {
                await logActivity(supabase, 'Updated Resource', `Updated resource: "${formData.title}" (${formData.category}, ${formData.type})`, 'info');
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
                await logActivity(supabase, 'Added Resource', `Added resource: "${formData.title}" (${formData.category}, ${formData.type})`, 'success');
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
            const resToDelete = resources.find(r => r.id === id);
            const { error } = await supabase.from('resources').delete().eq('id', id);
            if (!error) {
                await logActivity(supabase, 'Deleted Resource', `Deleted resource: "${resToDelete?.title || id}" (${resToDelete?.category || 'General'})`, 'warning');
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
                        Learning <span className="text-brand-cyan">Vault</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Curate learning material and essential cloud assets.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary px-8 py-4 flex items-center gap-3">
                    <Plus size={20} /> Add Resource
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Fetching Curations...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map((res, i) => (
                        <motion.div
                            key={res.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-6 border-white/5 hover:border-brand-cyan/20 transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-brand-cyan text-xs font-black uppercase tracking-widest bg-brand-cyan/5 px-3 py-1.5 rounded-lg border border-brand-cyan/10">
                                        {getTypeIcon(res.type)}
                                        <span>{res.type}</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 border border-white/5 px-2 py-1 rounded-md">
                                        {res.category}
                                    </span>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-2">{res.title}</h3>
                                <p className="text-white/40 text-xs line-clamp-3 leading-relaxed mb-6">{res.description}</p>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                                <a
                                    href={res.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-white/60 hover:text-brand-cyan flex items-center gap-1.5 transition-colors"
                                >
                                    <span>Access Asset</span>
                                    <ExternalLink size={12} />
                                </a>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => openModal(res)} className="btn-crud-edit" title="Edit Resource">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(res.id)} className="btn-crud-delete" title="Delete Resource">
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
                        className="glass-card w-full max-w-xl p-10 relative z-10 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white">{editingResource ? 'Edit Resource' : 'Add Resource'}</h2>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Knowledge Ecosystem</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="form-label">Asset Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. AWS Lambda Deep Dive"
                                    className="form-input"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Asset Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="Article" className="bg-brand-dark">Documentation / Article</option>
                                        <option value="Video" className="bg-brand-dark">Video / Lecture</option>
                                        <option value="Tool" className="bg-brand-dark">Tool / Repository</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="form-label">Category</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="e.g. Serverless / DevOps"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Destination URL</label>
                                <input
                                    type="url"
                                    required
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://..."
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="form-label">Description / Summary</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief overview of the resource..."
                                    className="form-input resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-4">Cancel</button>
                                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-4 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {submitting ? 'Saving...' : editingResource ? 'Update Asset' : 'Save Asset'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
