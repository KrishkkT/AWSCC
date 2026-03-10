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
        <div className="pt-32 pb-20">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
                    <div className="max-w-2xl">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-6xl font-black text-white mb-6 tracking-tight"
                        >
                            Knowledge <span className="text-brand-cyan">Center</span>
                        </motion.h1>
                        <p className="text-xl text-white/40 font-medium">
                            Explore articles, deep-dives, and insights into the future of cloud computing.
                        </p>
                    </div>
                    <div className="w-full md:w-96 relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-cyan transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white outline-none focus:border-brand-cyan/50 transition-all font-bold"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 text-brand-cyan animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {filteredArticles.length === 0 ? (
                                <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest">No articles found</div>
                            ) : (
                                filteredArticles.map((article, i) => (
                                    <motion.div
                                        key={article.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="glass-card p-10 border-white/5 group border-l-4 border-l-brand-cyan/20 hover:border-l-brand-cyan transition-all"
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-cyan bg-brand-cyan/10 px-3 py-1 rounded-full">{article.category}</span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                                                {new Date(article.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-4 group-hover:text-brand-cyan transition-colors">{article.title}</h2>
                                        <p className="text-white/40 font-medium mb-8 leading-relaxed max-w-xl">{article.excerpt || article.content.substring(0, 150) + "..."}</p>
                                        <button className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs">
                                            Read Article <ArrowRight size={16} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="glass-card p-8 border-white/5">
                                <BookOpen className="text-white/20 mb-6" size={24} />
                                <h3 className="text-xl font-black text-white mb-6">Trending Topics</h3>
                                <ul className="space-y-4">
                                    {(trending.length > 0 ? trending : ["AWS Cloud", "Serverless", "DevOps", "AI/ML"]).map(topic => (
                                        <li key={topic} className="flex items-center justify-between group cursor-pointer">
                                            <span className="text-sm text-white/50 group-hover:text-white transition-colors">{topic}</span>
                                            <ArrowRight size={14} className="text-white/10 group-hover:text-brand-cyan transition-all" />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
