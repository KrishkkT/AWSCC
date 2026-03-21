"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Plus, Trash2, Edit2, Save, X, Loader2, Eye, Upload } from "lucide-react";
import Toast from "@/components/Toast";

export default function AdminGallery() {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        event: 'AWS Roots',
        url: '',
    });

    const supabase = createClient();

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    const fetchPhotos = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('gallery')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setPhotos(data || []);
        else console.error('Error fetching gallery:', error);
        setLoading(false);
    }, [supabase]);

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showFeedback('Please upload an image file', 'error');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `gallery/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            setFormData({ ...formData, url: publicUrl });
            showFeedback('Image uploaded!');
        } catch (error) {
            console.error('Upload error:', error);
            showFeedback('Upload failed. Ensure "gallery" bucket exists.', 'error');
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);

        if (editingPhoto) {
            const { error } = await supabase
                .from('gallery')
                .update(formData)
                .eq('id', editingPhoto.id);

            if (!error) {
                showFeedback('Photo updated!');
                setShowModal(false);
                fetchPhotos();
            } else {
                showFeedback('Error: ' + error.message, 'error');
            }
        } else {
            const { error } = await supabase
                .from('gallery')
                .insert([formData]);

            if (!error) {
                showFeedback('Photo added to gallery!');
                setShowModal(false);
                fetchPhotos();
            } else {
                showFeedback('Error: ' + error.message, 'error');
            }
        }
        setSubmitting(false);
    }

    async function handleDelete(id) {
        if (confirm('Remove this photo from gallery?')) {
            const { error } = await supabase.from('gallery').delete().eq('id', id);
            if (!error) {
                showFeedback('Photo removed!', 'info');
                fetchPhotos();
            } else {
                showFeedback('Delete failed', 'error');
            }
        }
    }

    function showFeedback(message, type = 'success') {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    }

    return (
        <div className="space-y-10">
            {feedback && (
                <Toast message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-white mb-2 tracking-tight">
                        Visual <span className="text-brand-cyan">Gallery</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Manage memories and event highlights.</p>
                </div>
                <button onClick={() => { setEditingPhoto(null); setFormData({ title: '', event: 'AWS Roots', url: '' }); setShowModal(true); }} className="btn-primary px-8 py-4 flex items-center gap-3">
                    <Plus size={20} /> Add Photo
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse text-white/20 font-black tracking-widest uppercase">Fetching Memories...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {photos.map((photo, i) => (
                        <motion.div
                            key={photo.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card overflow-hidden group border-white/5 hover:border-brand-cyan/20 transition-all flex flex-col"
                        >
                            <div className="aspect-video relative overflow-hidden">
                                <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button onClick={() => { setEditingPhoto(photo); setFormData(photo); setShowModal(true); }} className="btn-crud-edit" title="Edit Photo">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(photo.id)} className="btn-crud-delete" title="Delete Photo">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-white font-bold truncate">{photo.title}</h3>
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-cyan mt-1">{photo.event}</div>
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
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-white leading-tight">
                                    {editingPhoto ? 'Edit' : 'Add'} <span className="text-brand-cyan">Photo</span>
                                </h2>
                                <p className="text-white/30 text-xs font-medium mt-1">Fill in the details to update your gallery.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                                title="Close"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brand-cyan ml-1">Photo Title</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-cyan transition-all font-bold placeholder-white/10"
                                    placeholder="e.g. Workshop Highlights"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brand-cyan ml-1">Event Reference</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.event}
                                    onChange={e => setFormData({ ...formData, event: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-cyan transition-all font-bold placeholder-white/10"
                                    placeholder="e.g. AWS Roots 2024"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brand-cyan ml-1">Photo Source</label>
                                <div className="flex gap-3 items-stretch">
                                    <input
                                        required
                                        type="text"
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        className="flex-grow bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-cyan transition-all font-bold placeholder-white/10"
                                        placeholder="Paste image URL..."
                                    />
                                    <label className="cursor-pointer shrink-0">
                                        <div className={`px-6 py-4 rounded-2xl border border-dashed border-white/20 hover:border-brand-cyan/50 hover:bg-brand-cyan/5 flex items-center justify-center transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {uploading ? <Loader2 size={18} className="animate-spin text-brand-cyan" /> : <Upload size={18} className="text-white/40 group-hover:text-brand-cyan" />}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || uploading}
                                className="w-full btn-primary py-5 rounded-2xl uppercase font-black tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,194,255,0.2)] disabled:opacity-50 transition-all hover:scale-[1.02]"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {submitting ? 'Updating Database...' : (editingPhoto ? 'Update Photo' : 'Confirm & Save Photo')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
