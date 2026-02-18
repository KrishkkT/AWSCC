"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2, Edit2, Save, X, Loader2, Eye, FileText } from "lucide-react";
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

    useEffect(() => {
        fetchArticles();
    }, []);

    async function fetchArticles() {
        setLoading(true);
        const { data, error } = await supabase
            .from('knowledge_articles')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setArticles(data || []);
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        if (editingArticle) {
            const { error } = await supabase
                .from('knowledge_articles')
                .update(formData)
                .eq('id', editingArticle.id);

            if (!error) {
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
            const { error } = await supabase.from('knowledge_articles').delete().eq('id', id);
            if (!error) {
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
                    <p className="text-white/40 font-medium">Publish deep-dives and technical articles.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary px-8 py-4 flex items-center gap-3">
                    <Plus size={20} /> Write Article
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Indexing Knowledge...</div>
            ) : (
                <div className="space-y-4">
                    {articles.map((article, i) => (
                        <motion.div
                            key={article.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-6 border-white/5 hover:border-brand-cyan/20 transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-6 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-brand-cyan transition-colors">
                                    <BookOpen size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold truncate">{article.title}</h3>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${article.is_published ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                            {article.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                                        <span>{article.category}</span>
                                        <span>·</span>
                                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openModal(article)} className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(article.id)} className="p-3 rounded-xl bg-red-500/10 text-red-500/40 hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="glass-card w-full max-w-4xl p-10 relative z-10 border-white/10 overflow-y-auto max-h-[90vh] no-scrollbar">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-3xl font-black text-white">{editingArticle ? 'Refine' : 'Compose'} Article</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/20 hover:text-white transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Article Title</label>
                                        <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-xl outline-none focus:border-brand-cyan transition-all font-black" placeholder="Cloud Native Patterns..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Content (Markdown Supported)</label>
                                        <textarea required rows={12} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-cyan transition-all font-medium leading-relaxed no-scrollbar" placeholder="Writing something awesome..." />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Category</label>
                                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-cyan transition-all font-bold">
                                            <option value="Architecture" className="bg-brand-dark">Architecture</option>
                                            <option value="DevOps" className="bg-brand-dark">DevOps</option>
                                            <option value="Serverless" className="bg-brand-dark">Serverless</option>
                                            <option value="Security" className="bg-brand-dark">Security</option>
                                            <option value="Career" className="bg-brand-dark">Career Paths</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Short Excerpt</label>
                                        <textarea rows={4} value={formData.excerpt} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-brand-cyan transition-all font-medium" placeholder="Brief summary for the preview..." />
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-12 h-6 rounded-full transition-all relative ${formData.is_published ? 'bg-brand-cyan' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_published ? 'left-7' : 'left-1'}`} />
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.is_published} onChange={e => setFormData({ ...formData, is_published: e.target.checked })} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Published</span>
                                        </label>
                                    </div>
                                    <button type="submit" disabled={submitting} className="w-full btn-primary py-5 uppercase font-black tracking-[0.2em] text-xs flex items-center justify-center gap-3">
                                        {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        {submitting ? 'Syncing...' : 'Save Article'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
