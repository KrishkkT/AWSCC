"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, ArrowRight, Zap, Loader2 } from "lucide-react";

export default function KnowledgeCenter() {
    const [articles, setArticles] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const { data: articlesData } = await supabase
                .from('knowledge_articles')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (articlesData) {
                setArticles(articlesData);
                // Simple logic for trending: first 4 categories
                const categories = [...new Set(articlesData.map(a => a.category))].slice(0, 4);
                setTrending(categories);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-brand-deep pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20 border-b border-slate-800/50 pb-16">
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-block px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-6"
                        >
                            Documentation & Insights
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl md:text-7xl font-display font-bold text-white mb-8 tracking-tight"
                        >
                            Knowledge <span className="text-brand-aws">Vault</span>
                        </motion.h1>
                        <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
                            Deep-dives, architecture reviews, and technical perspectives from the edge of cloud technology.
                        </p>
                    </div>
                    <div className="w-full md:w-96 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-aws transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Index search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-8 py-5"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-brand-aws animate-spin" />
                        <p className="text-slate-500 font-medium">Indexing archives...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-10">
                            {filteredArticles.length === 0 ? (
                                <div className="text-center py-20 bg-brand-navy/30 rounded-[2.5rem] border border-slate-800 border-dashed">
                                    <BookOpen size={64} className="mx-auto text-slate-700 mb-6" />
                                    <p className="text-slate-500 font-medium">No manuscript matches your query.</p>
                                </div>
                            ) : (
                                filteredArticles.map((article, i) => (
                                    <motion.div
                                        key={article.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="card-professional p-12 group border-slate-800/50 hover:border-brand-aws/20"
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-aws bg-brand-aws/10 px-4 py-1.5 rounded-lg border border-brand-aws/20">{article.category}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                                {new Date(article.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-display font-bold text-white mb-6 group-hover:text-brand-aws transition-colors leading-tight">{article.title}</h2>
                                        <p className="text-slate-400 font-medium mb-10 leading-relaxed max-w-2xl line-clamp-3">
                                            {article.excerpt || article.content.substring(0, 180) + "..."}
                                        </p>
                                        <button className="flex items-center gap-3 text-white font-bold uppercase tracking-widest text-[10px] group/btn">
                                            Read Manuscript
                                            <ArrowRight size={18} className="text-brand-aws group-hover/btn:translate-x-2 transition-transform" />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className="space-y-10 lg:sticky lg:top-36 h-fit">
                            <div className="card-professional p-10 border-slate-800/50 bg-brand-navy/20">
                                <div className="flex items-center gap-3 mb-8">
                                    <Zap className="text-brand-aws" size={24} />
                                    <h3 className="text-xl font-display font-bold text-white">Trending Specs</h3>
                                </div>
                                <ul className="space-y-6">
                                    {(trending.length > 0 ? trending : ["AWS CDK v2", "Serverless LLMs", "Edge Networking", "IAM Security"]).map(topic => (
                                        <li key={topic} className="flex items-center justify-between group cursor-pointer border-b border-slate-800/50 pb-4 last:border-0 last:pb-0">
                                            <span className="text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">{topic}</span>
                                            <ArrowRight size={16} className="text-slate-800 group-hover:text-brand-aws transition-all transform group-hover:translate-x-1" />
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="card-professional p-10 bg-brand-aws shadow-2xl shadow-brand-aws/20">
                                <h3 className="text-xl font-display font-bold text-brand-deep mb-4">Interested in contributing?</h3>
                                <p className="text-brand-deep/70 text-sm font-medium mb-8 leading-relaxed">
                                    Our knowledge vault is community-driven. Share your insights with the club.
                                </p>
                                <button className="w-full py-4 bg-brand-deep text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-colors shadow-lg">
                                    Submit Article
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
