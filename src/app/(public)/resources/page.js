"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Code, Video, Wrench, ExternalLink } from "lucide-react";

export default function ResourcesPage() {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchResources() {
            setLoading(true);
            const { data } = await supabase
                .from('resources')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true });
            if (data && data.length > 0) {
                setResources(data);
            } else {
                // Fallback / Initial sample data
                setResources([
                    { id: 'f1', title: 'AWS Architect Learning Plan', type: 'Path', category: 'Training', description: 'Comprehensive guide to becoming a certified AWS Solutions Architect.', url: 'https://aws.amazon.com/training/learning-paths/architect/' },
                    { id: 'f2', title: 'Terraform Best Practices', type: 'Code', category: 'IaC', description: 'Mastering infrastructure as code with professional Terraform patterns.', url: 'https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html' },
                    { id: 'f3', title: 'Cloud Security Fundamentals', type: 'Video', category: 'Security', description: 'Essential security concepts for modern cloud environments.', url: '#' },
                    { id: 'f4', title: 'DDU Cloud Labs', type: 'Tool', category: 'Internal', description: 'Hands-on laboratory environments specifically for DDU students.', url: '#' }
                ]);
            }
            setLoading(false);
        }
        fetchResources();
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Video': return <Video size={28} />;
            case 'Tool': return <Wrench size={28} />;
            case 'Code': return <Code size={28} />;
            default: return <FileText size={28} />;
        }
    };

    return (
        <div className="min-h-screen bg-brand-deep pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        Builder Assets
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-display font-bold text-white mb-8 tracking-tight"
                    >
                        Technical <span className="text-brand-aws">Resources</span>
                    </motion.h1>
                    <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                        A curated collection of documentation, scripts, and learning paths to accelerate your cloud journey.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-slate-800 border-t-brand-aws rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium animate-pulse">Fetching resources...</p>
                    </div>
                ) : resources.length === 0 ? (
                    <div className="text-center py-20 bg-brand-navy/30 rounded-[2.5rem] border border-slate-800 border-dashed max-w-2xl mx-auto">
                        <FileText size={64} className="mx-auto text-slate-700 mb-6" />
                        <p className="text-slate-500 font-medium">Vault is currently empty.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {resources.map((resource, i) => (
                            <motion.div
                                key={resource.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="card-professional p-10 flex flex-col sm:flex-row items-start gap-10 group"
                            >
                                <div className="w-20 h-20 shrink-0 rounded-3xl bg-slate-800/50 flex items-center justify-center text-slate-500 group-hover:text-brand-aws group-hover:bg-brand-aws/10 border border-slate-700/50 shadow-inner transition-all duration-300">
                                    {getTypeIcon(resource.type)}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 rounded-lg bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-700/50">{resource.category}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600"> {resource.type}</span>
                                    </div>
                                    <h3 className="text-2xl font-display font-bold text-white mb-4 truncate group-hover:text-brand-aws transition-colors leading-tight">{resource.title}</h3>
                                    <p className="text-slate-400 font-medium mb-8 leading-relaxed line-clamp-2">{resource.description}</p>
                                    <button
                                        onClick={() => window.open(resource.url, '_blank')}
                                        className="btn-outline w-full sm:w-auto px-10 py-3.5 text-xs font-bold border-slate-800 hover:border-brand-aws flex items-center justify-center gap-2"
                                    >
                                        Inspect {resource.type} <ExternalLink size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
