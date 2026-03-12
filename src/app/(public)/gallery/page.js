"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, Cloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";

export default function Gallery() {
    const [allPhotos, setAllPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [selectedImage, setSelectedImage] = useState(null);
    const supabase = createClient();

    useEffect(() => {
        async function fetchGallery() {
            setLoading(true);
            const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                setAllPhotos(data);
            } else if (error) {
                console.error("Fetch error:", error);
                setAllPhotos([]);
            }
            setLoading(false);
        }
        fetchGallery();
    }, []);

    const categories = ["All", ...Array.from(new Set(allPhotos.map(p => p.event)))];
    const filteredPhotos = filter === "All" ? allPhotos : allPhotos.filter(p => p.event === filter);

    return (
        <div className="flex flex-col pt-32 bg-brand-deep min-h-screen relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            <section className="py-20 relative z-10 text-center">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-block px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-8"
                    >
                        Visual Archive
                    </motion.div>
                    <h1 className="text-5xl lg:text-7xl font-display font-bold mb-8 tracking-tight text-white">
                        Cloud <span className="text-brand-aws">Gallery</span>
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        Capturing moments of innovation, collaboration, and community growth at AWS Cloud Club DDU.
                    </p>
                </div>
            </section>

            <section className="sticky top-16 z-40 backdrop-blur-xl border-y border-slate-800/50 py-6 bg-brand-deep/80">
                <div className="container mx-auto px-6">
                    <div className="flex flex-wrap justify-center gap-3">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all border ${filter === cat
                                    ? "bg-brand-aws border-brand-aws text-brand-deep shadow-lg shadow-brand-aws/20"
                                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 relative z-10">
                <div className="container mx-auto px-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Loader2 size={48} className="animate-spin text-brand-aws" />
                            <p className="text-slate-500 font-medium animate-pulse">Synchronizing assets...</p>
                        </div>
                    ) : filteredPhotos.length === 0 ? (
                        <div className="text-center py-32 bg-brand-navy/30 rounded-[2.5rem] border border-slate-800 border-dashed">
                            <ImageIcon size={64} className="mx-auto text-slate-700 mb-6" />
                            <p className="text-slate-500 font-medium">No snapshots found in this cluster.</p>
                        </div>
                    ) : (
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
                            <AnimatePresence mode="popLayout">
                                {filteredPhotos.map((photo, i) => (
                                    <motion.div
                                        layout
                                        key={photo.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="card-professional p-0 overflow-hidden cursor-zoom-in group border-slate-800/50"
                                        onClick={() => setSelectedImage(photo)}
                                    >
                                        <div className="relative overflow-hidden aspect-auto">
                                            <img
                                                src={photo.url}
                                                alt={photo.title}
                                                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-brand-deep via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
                                                <div className="flex items-center gap-2 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-2">
                                                    <Maximize2 size={12} />
                                                    View Fullscale
                                                </div>
                                                <p className="text-white text-xl font-display font-bold tracking-tight">{photo.title}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-900/50 flex items-center justify-between border-t border-slate-800/50">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{photo.event}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </section>

            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-brand-deep/98 backdrop-blur-2xl flex items-center justify-center p-6"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.button
                            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                            whileHover={{ rotate: 90 }}
                        >
                            <X size={40} />
                        </motion.button>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative max-w-5xl w-full flex flex-col items-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={selectedImage.url}
                                alt={selectedImage.title}
                                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-3xl border border-slate-800"
                            />
                            <div className="mt-10 text-center">
                                <div className="text-brand-aws text-[10px] font-bold uppercase tracking-[0.3em] mb-4">{selectedImage.event}</div>
                                <h3 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">{selectedImage.title}</h3>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
