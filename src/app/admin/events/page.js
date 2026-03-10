"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, Search, Edit2, Trash2, Clock, Users, MapPin, X, Check, Loader2 } from "lucide-react";
import Toast from "@/components/Toast";

export default function AdminEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', date: '', start_time: '', end_time: '', location: '',
        max_participants: 50, status: 'upcoming', image_url: '', registration_link: '',
        is_visible: true
    });
    const [issuing, setIssuing] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const supabase = createClient();

    useEffect(() => { fetchEvents(); }, []);

    async function fetchEvents() {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: false });
        if (error) {
            console.error('Fetch events error:', error);
            showFeedback('Failed to load events', 'error');
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    }

    function showFeedback(message, type = 'success') {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    }

    async function handleBatchIssue(eventId) {
        if (!confirm('This will issue certificates to all registered participants for this event. Proceed?')) return;
        setIssuing(eventId);
        try {
            const response = await fetch('/api/automate-issuance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            const result = await response.json();
            if (response.ok) {
                showFeedback(`Successfully issued ${result.count} certificates!`);
            } else {
                showFeedback(`Issuance failed: ${result.error}`, 'error');
            }
        } catch (err) {
            showFeedback('Server error during issuance', 'error');
        } finally {
            setIssuing(null);
            fetchEvents();
        }
    }

    function resetForm() {
        setFormData({ title: '', description: '', date: '', start_time: '', end_time: '', location: '', max_participants: 50, status: 'upcoming', image_url: '', registration_link: '', is_visible: true });
        setEditingEvent(null);
        setShowForm(false);
        setUploading(false);
    }

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            showFeedback('Please upload an image file', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showFeedback('Image must be under 2MB', 'error');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `event-banners/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('event-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('event-images')
                .getPublicUrl(filePath);

            setFormData({ ...formData, image_url: publicUrl });
            showFeedback('Image uploaded successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            showFeedback(`Upload failed: ${error.message || 'Check storage permissions'}`, 'error');
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);

        const payload = {
            title: formData.title,
            description: formData.description || null,
            date: formData.start_time || null, // Derive date from start_time
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            location: formData.location || null,
            max_participants: formData.max_participants || 50,
            status: formData.status || 'draft',
            image_url: formData.image_url || null,
            registration_link: formData.registration_link || null,
            is_visible: formData.is_visible
        };

        let result;
        if (editingEvent) {
            result = await supabase.from('events').update(payload).eq('id', editingEvent.id);
        } else {
            result = await supabase.from('events').insert([payload]);
        }

        if (result.error) {
            console.error('Save event error:', result.error);
            showFeedback(`Error: ${result.error.message}`, 'error');
        } else {
            showFeedback(editingEvent ? 'Event updated!' : 'Event created!');
            resetForm();
            fetchEvents();
        }
        setSaving(false);
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this event?')) return;
        setProcessingId(id);
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) {
            console.error('Delete event error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        } else {
            showFeedback('Event deleted.');
            fetchEvents();
        }
        setProcessingId(null);
    }

    function startEdit(event) {
        setEditingEvent(event);
        setFormData({
            title: event.title || '',
            description: event.description || '',
            date: event.date ? event.date.slice(0, 16) : '',
            start_time: event.start_time ? event.start_time.slice(0, 16) : '',
            end_time: event.end_time ? event.end_time.slice(0, 16) : '',
            location: event.location || '',
            max_participants: event.max_participants || 50,
            status: event.status || 'draft',
            image_url: event.image_url || '',
            registration_link: event.registration_link || '',
            is_visible: event.is_visible !== false
        });
        setShowForm(true);
    }

    const statusColors = {
        draft: 'bg-white/10 text-white/50 border-white/10',
        upcoming: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
        active: 'bg-green-500/10 text-green-400 border-green-500/20',
        completed: 'bg-brand-teal/10 text-brand-teal border-brand-teal/20',
        past: 'bg-white/5 text-white/30 border-white/10',
    };

    const filtered = events.filter(e =>
        e.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Feedback Toast */}
            {feedback && (
                <Toast
                    message={feedback.message}
                    type={feedback.type}
                    onClose={() => setFeedback(null)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
                        Event <span className="text-brand-cyan">Manager</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Create, edit, and manage all club events.</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); resetForm(); setShowForm(true); }} className="btn-primary px-6 py-3 flex items-center gap-2 text-sm">
                    <Plus size={18} /> New Event
                </button>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="glass-card p-8 !rounded-2xl border-brand-cyan/10 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
                        <button type="button" onClick={resetForm} className="text-white/30 hover:text-white"><X size={20} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Title *</label>
                            <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. AWS Cloud Workshop" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold placeholder-white/15" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Status</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold cursor-pointer">
                                <option value="draft">Draft</option>
                                <option value="upcoming">Upcoming</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Start Time *</label>
                            <input type="datetime-local" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">End Time *</label>
                            <input type="datetime-local" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Location</label>
                            <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Auditorium A" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold placeholder-white/15" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Max Participants</label>
                            <input type="number" min="1" value={formData.max_participants} onChange={e => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 50 })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Registration Link</label>
                            <input type="url" value={formData.registration_link} onChange={e => setFormData({ ...formData, registration_link: e.target.value })} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold placeholder-white/15" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Event Image</label>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.image_url}
                                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                        placeholder="Paste image URL..."
                                        className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold placeholder-white/15"
                                    />
                                    <label className="cursor-pointer shrink-0">
                                        <div className={`px-5 py-3 rounded-xl border border-dashed border-white/20 hover:border-brand-cyan/50 hover:bg-brand-cyan/5 flex items-center justify-center transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {uploading ? <Loader2 size={16} className="animate-spin text-brand-cyan" /> : <Plus size={16} className="text-white/40" />}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                                {formData.image_url && (
                                    <div className="relative group w-32 aspect-video rounded-lg overflow-hidden border border-white/10">
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, image_url: '' })}
                                            className="absolute inset-0 bg-brand-dark/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} className="text-white" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="md:col-span-2 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer select-none hover:bg-white/10 transition-all" onClick={() => setFormData({ ...formData, is_visible: !formData.is_visible })}>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.is_visible ? 'bg-brand-cyan' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.is_visible ? 'right-1' : 'left-1'}`} />
                            </div>
                            <span className="text-xs font-bold text-white/50">Show venue and registration publicly</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Description</label>
                        <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="What's this event about?" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold resize-none placeholder-white/15" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving} className="btn-primary px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-50">
                            {saving ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
                        </button>
                        <button type="button" onClick={resetForm} className="btn-secondary px-6 py-3 text-sm !rounded-xl">Cancel</button>
                    </div>
                </motion.form>
            )}

            {/* Search */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 max-w-sm group focus-within:border-brand-cyan/50 transition-all">
                <Search size={16} className="text-white/20 group-focus-within:text-brand-cyan" />
                <input type="text" placeholder="Search events..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white placeholder-white/20 w-full font-bold" />
            </div>

            {/* Events List */}
            {loading ? (
                <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse py-20 text-center">Loading Events...</div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-16 text-center border-white/5 !rounded-2xl">
                    <Calendar size={48} className="text-white/10 mx-auto mb-6" />
                    <p className="text-white/30 font-bold">No events found. Create your first event!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((event, i) => (
                        <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card !rounded-2xl p-5 !py-4 border-white/5 hover:border-white/10 transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <h3 className="text-base font-black text-white truncate">{event.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border shrink-0 ${statusColors[event.status] || statusColors.draft}`}>
                                            {event.status || 'draft'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs text-white/30">
                                        {event.date && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                                        {event.location && <span className="flex items-center gap-1"><MapPin size={12} /> {event.location}</span>}
                                        <span className="flex items-center gap-1"><Users size={12} /> {event.max_participants || '–'} seats</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                                    {event.status === 'completed' && (
                                        <button
                                            onClick={() => handleBatchIssue(event.id)}
                                            disabled={issuing === event.id}
                                            className="px-3 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-black uppercase tracking-widest hover:bg-brand-cyan hover:text-brand-dark transition-all disabled:opacity-50"
                                        >
                                            {issuing === event.id ? <Loader2 size={12} className="animate-spin" /> : 'Issue All'}
                                        </button>
                                    )}
                                    <button onClick={() => startEdit(event)} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-brand-cyan hover:border-brand-cyan/50 transition-all" title="Edit">
                                        <Edit2 size={15} />
                                    </button>
                                    <button
                                        disabled={processingId === event.id}
                                        onClick={() => handleDelete(event.id)}
                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/50 transition-all disabled:opacity-50"
                                        title="Delete"
                                    >
                                        {processingId === event.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
