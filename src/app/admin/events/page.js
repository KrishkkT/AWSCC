"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, Search, Edit2, Trash2, Clock, Users, MapPin, X, Check, Loader2, ArrowLeft, Upload, FileDown, ShieldCheck, Mail, Info, FileSpreadsheet } from "lucide-react";
import Toast from "@/components/Toast";
import { logActivity } from "@/utils/logger";

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
    
    // Bulk Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedEventForImport, setSelectedEventForImport] = useState(null);
    const [importData, setImportData] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Participant Management State
    const [eventParticipants, setEventParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [showParticipantsList, setShowParticipantsList] = useState(false);

    const supabase = createClient();

    const showFeedback = useCallback((message, type = 'success') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    }, []);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const { data: rawEvents, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) {
            console.error('Fetch events error:', error);
            showFeedback('Failed to load events', 'error');
        } else if (rawEvents) {
            const now = new Date();
            const toComplete = rawEvents.filter(e => 
                (e.status === 'upcoming' || e.status === 'active') && 
                e.end_time && 
                new Date(e.end_time) < now
            ).map(e => e.id);

            if (toComplete.length > 0) {
                await supabase
                    .from('events')
                    .update({ status: 'completed' })
                    .in('id', toComplete);
                
                const { data: updatedEvents } = await supabase
                    .from('events')
                    .select('*')
                    .order('date', { ascending: false });
                setEvents(updatedEvents || []);
            } else {
                setEvents(rawEvents);
            }
        }
        setLoading(false);
    }, [supabase, showFeedback]);

    const fetchParticipants = useCallback(async (eventId) => {
        setLoadingParticipants(true);
        const { data, error } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Fetch participants error:', error);
        } else {
            setEventParticipants(data || []);
        }
        setLoadingParticipants(false);
    }, [supabase]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

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
                await logActivity(supabase, 'Batch Issued Certificates', `Issued ${result.count} certificates for event ID ${eventId}`, 'success');
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

    const processFile = (file) => {
        if (!file) return;
        setImportFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            try {
                let parsed = [];
                if (file.name.endsWith('.json')) {
                    parsed = JSON.parse(content);
                } else {
                    const lines = content.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    parsed = lines.slice(1).filter(l => l.trim()).map(line => {
                        const values = line.split(',').map(v => v.trim());
                        const obj = {};
                        headers.forEach((h, i) => {
                            if (h.includes('name')) obj.name = values[i];
                            if (h.includes('email')) obj.email = values[i];
                        });
                        return obj;
                    });
                }
                setImportData(parsed.filter(p => p.email));
            } catch (err) {
                showFeedback('Failed to parse file', 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleFileSelect = (e) => {
        processFile(e.target.files?.[0]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFile(e.dataTransfer.files?.[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleBulkImport = async () => {
        if (!selectedEventForImport || importData.length === 0) return;
        setImporting(true);
        try {
            const response = await fetch('/api/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: selectedEventForImport.id,
                    participants: importData
                })
            });
            const result = await response.json();
            if (response.ok) {
                await logActivity(supabase, 'Bulk Imported Participants', `Imported ${importData.length} participants to event ID ${selectedEventForImport.id}`, 'success');
                showFeedback(result.message);
                setShowImportModal(false);
                setImportData([]);
                setImportFile(null);
            } else {
                showFeedback(result.error || 'Import failed', 'error');
            }
        } catch (err) {
            showFeedback('Server error during import', 'error');
        } finally {
            setImporting(false);
        }
    };

    async function handleIndividualIssue(participant) {
        if (!confirm(`Issue certificate to ${participant.full_name}?`)) return;
        setIssuing(participant.id);
        try {
            const { data: cert, error: certError } = await supabase
                .from('certificates')
                .insert([{
                    recipient_name: participant.full_name,
                    recipient_email: participant.email,
                    event_id: participant.event_id,
                    event_name: editingEvent?.title || 'Event',
                    certificate_type: 'participation',
                    status: 'verified'
                }])
                .select()
                .single();

            if (certError) throw certError;

            await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: participant.email,
                    type: 'certificateissued',
                    data: {
                        name: participant.full_name,
                        eventName: editingEvent?.title || 'Event',
                        certId: cert.id
                    }
                })
            });

            await supabase
                .from('event_registrations')
                .update({ certificate_issued: true })
                .eq('id', participant.id);

            await logActivity(supabase, 'Issued Certificate', `Issued certificate to ${participant.full_name} for event ${editingEvent?.title}`, 'success');
            showFeedback(`Certificate issued to ${participant.full_name}!`);
            fetchParticipants(participant.event_id);
        } catch (err) {
            console.error('Issuance error:', err);
            showFeedback('Failed to issue certificate', 'error');
        } finally {
            setIssuing(null);
        }
    }

    async function handleDeleteParticipant(participantId) {
        if (!confirm('Are you sure you want to remove this participant?')) return;
        const { error } = await supabase
            .from('event_registrations')
            .delete()
            .eq('id', participantId);
        
        if (error) {
            showFeedback('Failed to delete participant', 'error');
        } else {
            await logActivity(supabase, 'Removed Participant', `Removed participant ID ${participantId} from event`, 'warning');
            showFeedback('Participant removed.');
            fetchParticipants(editingEvent.id);
        }
    }

    async function handleDeleteAllParticipants(eventId) {
        if (!confirm('CRITICAL: This will remove ALL registered participants for this event. This action cannot be undone. Proceed?')) return;
        const { error } = await supabase
            .from('event_registrations')
            .delete()
            .eq('event_id', eventId);
        
        if (error) {
            showFeedback('Failed to clear participants', 'error');
        } else {
            showFeedback('All registrations cleared.');
            fetchParticipants(eventId);
        }
    }

    function resetForm() {
        setFormData({ title: '', description: '', date: '', start_time: '', end_time: '', location: '', max_participants: 50, status: 'upcoming', image_url: '', registration_link: '', is_visible: true });
        setEditingEvent(null);
        setShowParticipantsList(false);
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
            await logActivity(supabase, editingEvent ? 'Updated Event' : 'Created Event', `Event title: ${payload.title}`, 'success');
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
            await logActivity(supabase, 'Deleted Event', `Deleted event ID: ${id}`, 'warning');
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
        fetchParticipants(event.id);
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
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Event Image (Ratio: 16:9)</label>
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

                    {/* Participants Section in Edit Mode */}
                    {editingEvent && (
                        <div className="pt-4 space-y-4 border-t border-white/5">
                            <button 
                                type="button"
                                onClick={() => setShowParticipantsList(!showParticipantsList)}
                                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Users size={16} className="text-brand-cyan" />
                                    <span className="text-xs font-black uppercase tracking-widest text-white">
                                        Registered Participants ({eventParticipants.length})
                                    </span>
                                </div>
                                <motion.div animate={{ rotate: showParticipantsList ? 180 : 0 }}>
                                    <Plus size={16} className={`text-white/30 transform transition-transform ${showParticipantsList ? 'rotate-45' : ''}`} />
                                </motion.div>
                            </button>

                            {showParticipantsList && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                type="button" 
                                                onClick={() => fetchParticipants(editingEvent.id)} 
                                                className="text-[10px] text-brand-cyan font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                                            >
                                                <Loader2 size={10} className={loadingParticipants ? 'animate-spin' : ''} /> Refresh
                                            </button>
                                        </div>
                                        {eventParticipants.length > 0 && (
                                            <button 
                                                type="button" 
                                                onClick={() => handleDeleteAllParticipants(editingEvent.id)}
                                                className="text-[10px] text-red-400 font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                                            >
                                                <Trash2 size={10} /> Clear All
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="max-h-60 overflow-y-auto border border-white/10 rounded-xl overflow-hidden glass-card !bg-white/5">
                                        {loadingParticipants && eventParticipants.length === 0 ? (
                                            <div className="p-10 text-center"><Loader2 size={16} className="animate-spin text-white/20 mx-auto" /></div>
                                        ) : eventParticipants.length === 0 ? (
                                            <div className="p-10 text-center text-white/20 text-xs font-bold italic">No participants registered yet.</div>
                                        ) : (
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="sticky top-0 bg-brand-dark border-b border-white/10">
                                                    <tr>
                                                        <th className="px-4 py-2 text-white/40 font-black uppercase tracking-widest text-[10px]">Name</th>
                                                        <th className="px-4 py-2 text-white/40 font-black uppercase tracking-widest text-[10px]">Email</th>
                                                        <th className="px-4 py-2 text-white/40 font-black uppercase tracking-widest text-[10px]">Status</th>
                                                        <th className="px-4 py-2 text-white/40 font-black uppercase tracking-widest text-[10px] text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {eventParticipants.map((p, i) => (
                                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                                                            <td className="px-4 py-2.5 text-white font-medium">{p.full_name}</td>
                                                            <td className="px-4 py-2.5 text-white/40">{p.email}</td>
                                                            <td className="px-4 py-2.5">
                                                                {p.certificate_issued ? (
                                                                    <span className="text-green-400 flex items-center gap-1 font-bold">
                                                                        <Check size={10} /> Issued
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-white/20 italic">Pending</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {!p.certificate_issued && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => handleIndividualIssue(p)}
                                                                            disabled={issuing === p.id}
                                                                            className="px-2 py-1 rounded bg-brand-cyan/20 text-brand-cyan text-[9px] font-black uppercase tracking-widest hover:bg-brand-cyan hover:text-brand-dark transition-all disabled:opacity-50"
                                                                        >
                                                                            {issuing === p.id ? <Loader2 size={10} className="animate-spin" /> : 'Issue'}
                                                                        </button>
                                                                    )}
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleDeleteParticipant(p.id)}
                                                                        className="p-1.5 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
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
                                    {(event.status === 'completed' || event.status === 'active') && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setSelectedEventForImport(event); setShowImportModal(true); }}
                                                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
                                            >
                                                <Plus size={12} /> Import
                                            </button>
                                            {event.status === 'completed' && (
                                                <button
                                                    onClick={() => handleBatchIssue(event.id)}
                                                    disabled={issuing === event.id}
                                                    className="px-3 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-black uppercase tracking-widest hover:bg-brand-cyan hover:text-brand-dark transition-all disabled:opacity-50"
                                                >
                                                    {issuing === event.id ? <Loader2 size={12} className="animate-spin" /> : 'Issue All'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <button onClick={() => startEdit(event)} className="btn-crud-edit" title="Edit Event">
                                        <Edit2 size={15} />
                                    </button>
                                    <button
                                        disabled={processingId === event.id}
                                        onClick={() => handleDelete(event.id)}
                                        className="btn-crud-delete disabled:opacity-50"
                                        title="Delete Event"
                                    >
                                        {processingId === event.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
            {/* Bulk Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowImportModal(false)} className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-2xl bg-brand-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-white">Bulk <span className="text-brand-cyan">Import</span></h2>
                                <p className="text-xs text-white/40 mt-1">Import participants for {selectedEventForImport?.title}</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="text-white/30 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {/* Dropzone */}
                            <label 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`block border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${isDragging ? 'border-brand-cyan bg-brand-cyan/10 scale-[1.02]' : importFile ? 'border-brand-cyan/50 bg-brand-cyan/5' : 'border-white/10 hover:border-brand-cyan/30 hover:bg-white/5'}`}
                            >
                                <input type="file" accept=".csv,.json" onChange={handleFileSelect} className="hidden" />
                                <div className="space-y-2 pointer-events-none">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Plus size={24} className={importFile || isDragging ? 'text-brand-cyan' : 'text-white/20'} />
                                    </div>
                                    <p className="text-sm font-bold text-white">
                                        {importFile ? importFile.name : 'Click to select or drag CSV/JSON file'}
                                    </p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Expected format: Name, Email</p>
                                </div>
                            </label>

                            {/* Preview */}
                            {importData.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Preview ({importData.length} records)</h4>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto border border-white/10 rounded-xl">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="sticky top-0 bg-brand-dark border-b border-white/10">
                                                <tr>
                                                    <th className="px-4 py-2 text-white/40 font-black uppercase tracking-widest">Name</th>
                                                    <th className="px-4 py-2 text-white/40 font-black uppercase tracking-widest">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importData.slice(0, 10).map((p, i) => (
                                                    <tr key={i} className="border-b border-white/5">
                                                        <td className="px-4 py-2 text-white font-medium">{p.name || '-'}</td>
                                                        <td className="px-4 py-2 text-white/60">{p.email}</td>
                                                    </tr>
                                                ))}
                                                {importData.length > 10 && (
                                                    <tr>
                                                        <td colSpan={2} className="px-4 py-2 text-white/20 text-center italic">And {importData.length - 10} more...</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleBulkImport}
                                    disabled={importing || importData.length === 0}
                                    className="btn-primary flex-grow py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {importing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    {importing ? 'Importing...' : 'Confirm Import'}
                                </button>
                                <button onClick={() => setShowImportModal(false)} className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all">Cancel</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
