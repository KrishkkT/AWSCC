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
        <div className="flex flex-col pt-20">
            <section className="py-24 bg-brand-deep relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="inline-block px-4 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-black uppercase tracking-widest mb-8"
                    >
                        Memories in the Cloud
                    </motion.div>
                    <h1 className="text-5xl lg:text-8xl font-black mb-6 tracking-tighter">
                        Visual <span className="text-brand-cyan text-glow-cyan">Gallery</span>
                    </h1>
                    <p className="text-white/50 text-xl max-w-2xl mx-auto">
                        Capturing the journey of AWS Cloud Club DDU - from lines of code to large-scale deployments.
                    </p>
                </div>
            </section>

            <section className="sticky top-20 z-40 bg-brand-dark/80 backdrop-blur-xl border-y border-white/5 py-4">
                <div className="container mx-auto px-6">
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`whitespace-nowrap px-8 py-3 rounded-2xl text-sm font-black transition-all border ${filter === cat ? "bg-brand-cyan border-brand-cyan text-brand-dark shadow-[0_0_20px_rgba(0,194,255,0.2)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 min-h-[60vh] relative z-10">
                <div className="container mx-auto px-6 text-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-white/20">
                            <Loader2 size={48} className="animate-spin mb-4" />
                            <p className="font-black uppercase tracking-[0.3em]">Developing Photos...</p>
                        </div>
                    ) : filteredPhotos.length === 0 ? (
                        <p className="text-white/20 font-black uppercase tracking-[0.2em]">No photos found in this category.</p>
                    ) : (
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8 text-left">
                            <AnimatePresence mode="popLayout">
                                {filteredPhotos.map((photo) => (
                                    <motion.div
                                        layout
                                        key={photo.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="relative group rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/5 hover:border-brand-cyan/30 transition-all duration-500 hover:shadow-[0_0_50px_rgba(0,194,255,0.1)]"
                                        onClick={() => setSelectedImage(photo)}
                                    >
                                        <img
                                            src={photo.url}
                                            alt={photo.title}
                                            className="w-full h-auto object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-10">
                                            <div className="flex items-center gap-3 text-brand-cyan text-[10px] font-black uppercase tracking-widest mb-2">
                                                <ImageIcon size={14} />
                                                {photo.event}
                                            </div>
                                            <p className="text-white text-2xl font-black tracking-tight mb-4">{photo.title}</p>
                                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 self-end scale-0 group-hover:scale-100 transition-transform duration-500">
                                                <Maximize2 className="text-white" size={20} />
                                            </div>
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
                        className="fixed inset-0 z-[100] bg-brand-dark/95 backdrop-blur-2xl flex items-center justify-center p-6 md:p-12"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors group">
                            <X size={48} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="relative max-w-6xl w-full flex flex-col items-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={selectedImage.url}
                                alt={selectedImage.title}
                                className="max-w-full max-h-[75vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5"
                            />
                            <div className="mt-12 text-center">
                                <div className="text-brand-cyan text-xs font-black uppercase tracking-[0.3em] mb-4">{selectedImage.event}</div>
                                <h3 className="text-4xl lg:text-6xl font-black text-white tracking-tighter">{selectedImage.title}</h3>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
