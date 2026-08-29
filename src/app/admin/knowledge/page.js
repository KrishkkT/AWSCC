"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2, Edit2, Save, X, Loader2, Eye, EyeOff } from "lucide-react";
import { logActivity } from "@/utils/logger";
import Toast from "@/components/Toast";

export default function AdminKnowledge() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        excerpt: '',
        category: 'Architecture',
        is_published: true
    });

    const supabase = createClient();

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('knowledge_articles')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setArticles(data || []);
        else console.error('Error fetching articles:', error);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        if (editingArticle) {
            const { error } = await supabase
                .from('knowledge_articles')
                .update(formData)
                .eq('id', editingArticle.id);

            if (!error) {
                await logActivity(supabase, 'Updated Knowledge Article', `Updated article: "${formData.title}" (${formData.category}, Published: ${formData.is_published ? 'YES' : 'NO'})`, 'info');
                setFeedback({ message: 'Article updated!', type: 'success' });
                setShowModal(false);
                fetchArticles();
            } else {
                setFeedback({ message: 'Error updating: ' + error.message, type: 'error' });
            }
        } else {
            const { error } = await supabase
                .from('knowledge_articles')
                .insert([formData]);

            if (!error) {
                await logActivity(supabase, 'Created Knowledge Article', `Created article: "${formData.title}" (${formData.category}, Published: ${formData.is_published ? 'YES' : 'NO'})`, 'success');
                setFeedback({ message: 'Article created!', type: 'success' });
                setShowModal(false);
                fetchArticles();
            } else {
                setFeedback({ message: 'Error creating: ' + error.message, type: 'error' });
            }
        }
        setSubmitting(false);
    }

    async function handleDelete(id) {
        if (confirm('Delete this article?')) {
            const articleToDelete = articles.find(a => a.id === id);
            const { error } = await supabase.from('knowledge_articles').delete().eq('id', id);
            if (!error) {
                await logActivity(supabase, 'Deleted Knowledge Article', `Deleted article: "${articleToDelete?.title || id}" (${articleToDelete?.category || 'General'})`, 'warning');
                setFeedback({ message: 'Article removed!', type: 'info' });
                fetchArticles();
            } else {
                setFeedback({ message: 'Delete failed: ' + error.message, type: 'error' });
            }
        }
    }

    const openModal = (article = null) => {
        if (article) {
            setEditingArticle(article);
            setFormData({ ...article });
        } else {
            setEditingArticle(null);
            setFormData({
                title: '',
                content: '',
                excerpt: '',
                category: 'Architecture',
                is_published: true
            });
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
                        Knowledge <span className="text-brand-cyan">Base</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Publish technical papers and engineering articles.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary px-8 py-4 flex items-center gap-3">
                    <Plus size={20} /> Publish Article
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Fetching Articles...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {articles.map((art, i) => (
                        <motion.div
                            key={art.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-6 border-white/5 hover:border-brand-cyan/20 transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-4 mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan bg-brand-cyan/5 border border-brand-cyan/10 px-3 py-1 rounded-md">
                                        {art.category}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/40">
                                        {art.is_published ? (
                                            <span className="flex items-center gap-1 text-green-400"><Eye size={14} /> Published</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-yellow-400"><EyeOff size={14} /> Draft</span>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-white font-bold text-xl mb-2">{art.title}</h3>
                                <p className="text-white/40 text-xs line-clamp-3 leading-relaxed mb-6">{art.excerpt || art.content}</p>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                                    {new Date(art.created_at).toLocaleDateString()}
                                </span>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => openModal(art)} className="btn-crud-edit" title="Edit Article">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(art.id)} className="btn-crud-delete" title="Delete Article">
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
                        className="glass-card w-full max-w-2xl p-10 relative z-10 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white">{editingArticle ? 'Edit Article' : 'Compose Article'}</h2>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Publish to Community Library</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="form-label">Article Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Modern Cloud Computing Paradigms"
                                    className="form-input"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Category</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="e.g. DevOps / Architecture"
                                        className="form-input"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Publication Status</label>
                                    <select
                                        value={formData.is_published ? 'true' : 'false'}
                                        onChange={e => setFormData({ ...formData, is_published: e.target.value === 'true' })}
                                        className="form-input"
                                    >
                                        <option value="true" className="bg-brand-dark">Live (Published)</option>
                                        <option value="false" className="bg-brand-dark">Draft Mode</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Short Excerpt</label>
                                <input
                                    type="text"
                                    value={formData.excerpt}
                                    onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                                    placeholder="Brief summary for list previews..."
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="form-label">Full Markdown Content</label>
                                <textarea
                                    rows={8}
                                    required
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="# Write article in Markdown format..."
                                    className="form-input font-mono text-xs resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-4">Cancel</button>
                                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-4 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {submitting ? 'Publishing...' : editingArticle ? 'Update Article' : 'Publish Article'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
