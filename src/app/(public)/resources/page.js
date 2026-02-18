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
                .order('created_at', { ascending: false });
            if (data) setResources(data);
            setLoading(false);
        }
        fetchResources();
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Video': return <Video size={32} />;
            case 'Tool': return <Wrench size={32} />;
            case 'Code': return <Code size={32} />;
            default: return <FileText size={32} />;
        }
    };

    return (
        <div className="pt-32 pb-20">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center mb-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight"
                    >
                        Cloud <span className="text-brand-cyan">Resources</span>
                    </motion.h1>
                    <p className="text-xl text-white/40 font-medium">
                        Everything you need to master the cloud, all in one place.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
                    </div>
                ) : resources.length === 0 ? (
                    <div className="text-center py-20 text-white/20 font-bold uppercase tracking-widest text-sm">
                        No resources found. Check back later!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {resources.map((resource, i) => (
                            <motion.div
                                key={resource.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card p-12 border-white/5 hover:border-brand-cyan/20 transition-all flex items-start gap-8 group"
                            >
                                <div className="w-20 h-20 shrink-0 rounded-3xl bg-white/5 flex items-center justify-center text-white/30 group-hover:text-brand-cyan group-hover:bg-brand-cyan/10 transition-all">
                                    {getTypeIcon(resource.type)}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">{resource.category}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">· {resource.type}</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-4 truncate group-hover:text-brand-cyan transition-colors">{resource.title}</h3>
                                    <p className="text-white/40 font-medium mb-8 leading-relaxed max-w-sm line-clamp-2">{resource.description}</p>
                                    <button
                                        onClick={() => window.open(resource.url, '_blank')}
                                        className="btn-secondary px-8 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                    >
                                        Access {resource.type} <ExternalLink size={12} />
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
