"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Plus, Trash2, Edit2, Save, X, Loader2, Eye, Upload } from "lucide-react";
import { logActivity } from "@/utils/logger";
import Toast from "@/components/Toast";
import { uploadFile } from "@/lib/storage";

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

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showFeedback('Please upload an image file', 'error');
            return;
        }

        setUploading(true);
        try {
            const result = await uploadFile(file, {
                folder: '/gallery',
                tags: ['gallery-photo']
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to upload image');
            }

            setFormData({ ...formData, url: result.url });
            showFeedback('Image uploaded!');
        } catch (error) {
            console.error('Upload error:', error);
            showFeedback(`Upload failed: ${error.message || 'Check storage configuration'}`, 'error');
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
                await logActivity(supabase, 'Updated Gallery Photo', `Updated photo: "${formData.title || 'Untitled'}" (Event: ${formData.event})`, 'info');
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
                await logActivity(supabase, 'Added Gallery Photo', `Added photo: "${formData.title || 'Untitled'}" (Event: ${formData.event})`, 'success');
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
            const photoToDelete = photos.find(p => p.id === id);
            const { error } = await supabase.from('gallery').delete().eq('id', id);
            if (!error) {
                await logActivity(supabase, 'Deleted Gallery Photo', `Deleted photo: "${photoToDelete?.title || id}" (Event: ${photoToDelete?.event || 'Unknown'})`, 'warning');
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
                                <h2 className="text-2xl font-black text-white">{editingPhoto ? 'Edit Photo' : 'Add to Gallery'}</h2>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">AWS Cloud Club Vault</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="form-label">Photo Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. AWS Community Day Keynote"
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="form-label">Associated Event</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.event}
                                    onChange={e => setFormData({ ...formData, event: e.target.value })}
                                    placeholder="e.g. AWS Roots 2026"
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="form-label">Photo Media</label>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <label className="flex-1 flex items-center justify-center gap-2 p-4 border border-dashed border-white/10 rounded-xl hover:border-brand-cyan/40 cursor-pointer transition-all bg-white/[0.02]">
                                            <Upload size={18} className="text-brand-cyan" />
                                            <span className="text-xs font-bold text-white/60">
                                                {uploading ? 'Uploading...' : 'Upload File'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <input
                                        type="url"
                                        required
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="Or paste Direct Image URL..."
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {formData.url && (
                                <div className="aspect-video relative rounded-xl overflow-hidden border border-white/10">
                                    <img src={formData.url} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-4">Cancel</button>
                                <button type="submit" disabled={submitting || uploading} className="btn-primary flex-1 py-4 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {submitting ? 'Saving...' : editingPhoto ? 'Update Photo' : 'Save to Gallery'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
