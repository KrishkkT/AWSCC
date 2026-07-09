"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, Search, Edit2, Trash2, Eye, EyeOff, X, Check, Loader2, Code2, Users, Award, Ticket, Clock, FileText, Laptop } from "lucide-react";
import Toast from "@/components/Toast";

const DEFAULT_AGENDA = [
  {
    type: "main",
    title: "Morning Sessions",
    tracks: [],
    sessions: [
      { time: "08:30", title: "Registrations", tracks: [] }
    ]
  }
];

const safeArray = (data, fallback = []) => Array.isArray(data) ? data : fallback;
const safeObject = (data, fallback = {}) => (typeof data === 'object' && data !== null && !Array.isArray(data)) ? data : fallback;

const normalizeAgendaData = (agendaData) => {
    return safeArray(agendaData).map(block => {
        if (block.type === 'parallel') {
            const isOldFormat = Array.isArray(block.tracks) && (block.tracks.length === 0 || typeof block.tracks[0] === 'string');
            if (isOldFormat) {
                const tracks = safeArray(block.tracks).map((trackName, tIdx) => {
                    const sessions = safeArray(block.sessions).map(session => {
                        const item = Array.isArray(session.tracks) ? session.tracks[tIdx] : null;
                        return {
                            time: session.time || '09:00 - 09:30',
                            title: item?.title || (typeof item === 'string' ? item : '') || '',
                            speaker: item?.speaker || '',
                            description: item?.description || ''
                        };
                    }).filter(s => s.title);
                    return {
                        name: trackName,
                        sessions
                    };
                });
                return {
                    ...block,
                    tracks,
                    sessions: []
                };
            }
        }
        return block;
    });
};

const TABS = [
    { id: 'general', label: 'General Info', icon: Calendar },
    { id: 'agenda', label: 'Agenda Blocks', icon: Clock },
    { id: 'speakers_sponsors', label: 'Speakers & Sponsors', icon: Users },
    { id: 'workshops', label: 'Workshops', icon: Laptop },
    { id: 'content', label: 'Page Content', icon: FileText }
];

export default function AdminCommunityDay() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [saving, setSaving] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [popupImageFile, setPopupImageFile] = useState(null);
    const [mobileImageFile, setMobileImageFile] = useState(null);

    const [formData, setFormData] = useState({
        year: new Date().getFullYear(),
        title: 'AWS Students Community Day',
        date: '',
        venue: 'Dharmsinh Desai University',
        visibility_toggled: false,
        is_active: true,
        hero_data: { popup_image: '', mobile_image: '' },
        about_data: { text: '' },
        agenda_data: DEFAULT_AGENDA,
        speakers_data: [],
        sponsors_data: [],
        team_data: [],
        workshops_data: [],
        ticket_data: { konfhub_url: '', tickets: [] },
        popup_image_url: '',
        mobile_image_url: ''
    });

    const supabase = createClient();

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('community_events').select('*').order('year', { ascending: false });
        if (error && error.code !== '42P01') {
            showFeedback('Failed to load events', 'error');
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    function showFeedback(message, type = 'success') {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    }

    function resetForm() {
        setFormData({
            year: new Date().getFullYear(),
            title: 'AWS Students Community Day',
            date: '',
            venue: 'Dharmsinh Desai University',
            visibility_toggled: false,
            is_active: true,
            hero_data: { popup_image: '', mobile_image: '' },
            about_data: { text: '' },
            agenda_data: DEFAULT_AGENDA,
            speakers_data: [],
            sponsors_data: [],
            team_data: [],
            workshops_data: [],
            ticket_data: { konfhub_url: '', tickets: [] },
            popup_image_url: '',
            mobile_image_url: ''
        });
        setPopupImageFile(null);
        setMobileImageFile(null);
        setEditingEvent(null);
        setShowForm(false);
        setActiveTab('general');
    }


    function startEdit(event) {
        setEditingEvent(event);
        setFormData({
            year: event.year,
            title: event.title || '',
            date: event.date ? event.date.slice(0, 16) : '',
            venue: event.venue || '',
            visibility_toggled: event.visibility_toggled,
            is_active: event.is_active,
            hero_data: safeObject(event.hero_data, {}),
            about_data: safeObject(event.about_data, { text: '' }),
            agenda_data: normalizeAgendaData(safeArray(event.agenda_data, DEFAULT_AGENDA)),
            speakers_data: safeArray(event.speakers_data, []),
            sponsors_data: safeArray(event.sponsors_data, []),
            team_data: safeArray(event.team_data, []),
            workshops_data: safeArray(event.workshops_data, []),
            ticket_data: { 
                konfhub_url: safeObject(event.ticket_data, {}).konfhub_url || '', 
                tickets: Array.isArray(safeObject(event.ticket_data, {}).tickets) ? safeObject(event.ticket_data, {}).tickets : [] 
            },
            popup_image_url: event.hero_data?.popup_image || '',
            mobile_image_url: event.hero_data?.mobile_image || ''
        });
        setActiveTab('general');
        setShowForm(true);
        setPopupImageFile(null);
        setMobileImageFile(null);
    }

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `community_day/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(filePath);
        return publicUrl;
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);

        let finalPopupImageUrl = formData.popup_image_url;
        if (popupImageFile) {
            try {
                finalPopupImageUrl = await uploadImage(popupImageFile);
            } catch (err) {
                showFeedback(`Image Upload Error: ${err.message}`, 'error');
                setSaving(false);
                return;
            }
        }

        let finalMobileImageUrl = formData.mobile_image_url;
        if (mobileImageFile) {
            try {
                finalMobileImageUrl = await uploadImage(mobileImageFile);
            } catch (err) {
                showFeedback(`Mobile Image Upload Error: ${err.message}`, 'error');
                setSaving(false);
                return;
            }
        }

        const heroDataObj = { ...formData.hero_data };
        if (finalPopupImageUrl) heroDataObj.popup_image = finalPopupImageUrl;
        else delete heroDataObj.popup_image;

        if (finalMobileImageUrl) heroDataObj.mobile_image = finalMobileImageUrl;
        else delete heroDataObj.mobile_image;

        const processArrayImages = async (arr, fileField, urlField) => {
            return await Promise.all(arr.map(async (item) => {
                if (item[fileField]) {
                    const url = await uploadImage(item[fileField]);
                    const newItem = { ...item };
                    newItem[urlField] = url;
                    delete newItem[fileField];
                    return newItem;
                }
                return item;
            }));
        };

        let processedSpeakers, processedSponsors, processedTeam;

        try {
            processedSpeakers = await processArrayImages(formData.speakers_data, 'imageFile', 'image');
            processedSponsors = await processArrayImages(formData.sponsors_data, 'logoFile', 'logo');
            processedTeam = await processArrayImages(formData.team_data, 'imageFile', 'image');
        } catch (err) {
            showFeedback(`Array Image Upload Error: ${err.message}`, 'error');
            setSaving(false);
            return;
        }

        const payload = {
            year: parseInt(formData.year),
            title: formData.title,
            date: formData.date || null,
            venue: formData.venue || null,
            visibility_toggled: formData.visibility_toggled,
            is_active: formData.is_active,
            agenda_data: safeArray(formData.agenda_data).map(block => {
                const { _tracksRaw, ...rest } = block;
                return rest;
            }),
            speakers_data: processedSpeakers,
            sponsors_data: processedSponsors,
            team_data: processedTeam,
            workshops_data: formData.workshops_data || [],
            hero_data: heroDataObj,
            about_data: formData.about_data,
            ticket_data: formData.ticket_data
        };

        const result = editingEvent 
            ? await supabase.from('community_events').update(payload).eq('id', editingEvent.id)
            : await supabase.from('community_events').insert([payload]);

        if (result.error) showFeedback(`Save failed: ${result.error.message}`, 'error');
        else {
            showFeedback(editingEvent ? 'Event updated!' : 'Event created!');
            resetForm();
            fetchEvents();
        }
        setSaving(false);
    }

    async function handleDelete(id) {
        if (!confirm('Are you absolutely sure you want to delete this Community Day event?')) return;
        setProcessingId(id);
        const { error } = await supabase.from('community_events').delete().eq('id', id);
        if (error) showFeedback(`Delete failed: ${error.message}`, 'error');
        else { showFeedback('Event deleted forever.'); fetchEvents(); }
        setProcessingId(null);
    }


    // Graphical Array Helpers
    const updateArrayItem = (key, idx, field, value) => {
        const arr = [...formData[key]];
        arr[idx][field] = value;
        setFormData({ ...formData, [key]: arr });
    };
    const handleArrayImageChange = (key, idx, file, field) => {
        if (!file) return;
        const arr = [...formData[key]];
        arr[idx][`${field}File`] = file;
        arr[idx][field] = URL.createObjectURL(file);
        setFormData({ ...formData, [key]: arr });
    };
    const addArrayItem = (key, template) => {
        setFormData({ ...formData, [key]: [...formData[key], template] });
    };
    const removeArrayItem = (key, idx) => {
        setFormData({ ...formData, [key]: formData[key].filter((_, i) => i !== idx) });
    };

    return (
        <div className="space-y-8">
            {feedback && <Toast message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
                        Community <span className="text-brand-cyan">Day</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Manage the massive annual AWS Community Day dynamic site.</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }} className="btn-primary px-6 py-3 flex items-center gap-2 text-sm">
                    <Plus size={18} /> New Community Day
                </button>
            </div>

            {showForm && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="glass-card p-0 !rounded-2xl border-brand-cyan/20 overflow-hidden flex flex-col">
                    <div className="bg-white/[0.02] border-b border-white/10 px-8 py-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white">{editingEvent ? `Editing ${editingEvent.year} Event` : 'Create New Event'}</h3>
                            <button type="button" onClick={resetForm} className="text-white/30 hover:text-white transition-colors p-2"><X size={20} /></button>
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-brand-cyan text-white shadow-[0_0_15px_rgba(0,194,255,0.2)]' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                                >
                                    <tab.icon size={14} /> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Edition Year *</label>
                                    <input type="number" required value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Event Title *</label>
                                    <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Event Date *</label>
                                    <input type="datetime-local" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Venue</label>
                                    <input type="text" value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                                </div>
                                
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Landing Popup Image (Desktop - Landscape)</label>
                                    <div className="flex gap-4 items-start">
                                        <label className="shrink-0 flex flex-col justify-center items-center w-32 h-32 border-2 border-dashed border-white/20 rounded-xl hover:border-brand-cyan/50 hover:bg-brand-cyan/5 transition-all cursor-pointer relative overflow-hidden group">
                                            {popupImageFile ? (
                                                <img src={URL.createObjectURL(popupImageFile)} alt="Popup Preview" className="w-full h-full object-cover" />
                                            ) : formData.popup_image_url ? (
                                                <img src={formData.popup_image_url} alt="Current Popup" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-white/60 group-hover:text-brand-cyan transition-colors"><Plus size={16} /></div>
                                                    <span className="text-[10px] uppercase font-bold text-white/60 tracking-widest group-hover:text-brand-cyan">Upload</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) setPopupImageFile(e.target.files[0]); }} className="hidden" />
                                        </label>
                                        <div className="flex-1 space-y-2">
                                            <input type="text" value={formData.popup_image_url} onChange={e => { setFormData({ ...formData, popup_image_url: e.target.value }); setPopupImageFile(null); }} placeholder="Or paste image URL" className="w-full bg-[#05080f] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                                            <p className="text-xs text-white/50 max-w-sm">Upload a landscape banner/poster to be featured on desktop devices.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Landing Popup Image (Mobile - Portrait)</label>
                                    <div className="flex gap-4 items-start">
                                        <label className="shrink-0 flex flex-col justify-center items-center w-32 h-32 border-2 border-dashed border-white/20 rounded-xl hover:border-brand-cyan/50 hover:bg-brand-cyan/5 transition-all cursor-pointer relative overflow-hidden group">
                                            {mobileImageFile ? (
                                                <img src={URL.createObjectURL(mobileImageFile)} alt="Mobile Preview" className="w-full h-full object-cover" />
                                            ) : formData.mobile_image_url ? (
                                                <img src={formData.mobile_image_url} alt="Current Mobile Popup" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-white/60 group-hover:text-brand-cyan transition-colors"><Plus size={16} /></div>
                                                    <span className="text-[10px] uppercase font-bold text-white/60 tracking-widest group-hover:text-brand-cyan">Upload</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) setMobileImageFile(e.target.files[0]); }} className="hidden" />
                                        </label>
                                        <div className="flex-1 space-y-2">
                                            <input type="text" value={formData.mobile_image_url} onChange={e => { setFormData({ ...formData, mobile_image_url: e.target.value }); setMobileImageFile(null); }} placeholder="Or paste mobile image URL" className="w-full bg-[#05080f] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                                            <p className="text-xs text-white/50 max-w-sm">Upload a portrait poster to be featured on mobile devices (recommended ratio 4:5 or 9:16).</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-4 bg-[#05080f] border border-white/10 rounded-xl px-5 py-4 cursor-pointer hover:bg-white/5 transition-all group" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                                        <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-white/10'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_active ? 'right-1' : 'left-1'}`} />
                                        </div>
                                        <div><div className="text-sm font-bold text-white group-hover:text-green-400">Event is Active</div></div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-[#05080f] border border-green-500/20 rounded-xl px-5 py-4 cursor-pointer hover:bg-green-500/5 transition-all group" onClick={() => setFormData({ ...formData, visibility_toggled: !formData.visibility_toggled })}>
                                        <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.visibility_toggled ? 'bg-green-500' : 'bg-white/10'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.visibility_toggled ? 'right-1' : 'left-1'}`} />
                                        </div>
                                        <div><div className="text-sm font-bold text-white group-hover:text-green-500">Global Visibility Enabled</div></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'agenda' && (
                            <div className="space-y-6">
                                {formData.agenda_data.map((block, bIdx) => (
                                    <div key={bIdx} className="bg-[#05080f] border border-white/10 rounded-2xl p-6 relative">
                                        <button type="button" onClick={() => { const a = [...formData.agenda_data]; a.splice(bIdx, 1); setFormData({...formData, agenda_data: a}); }} className="absolute top-4 right-4 text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pr-8">
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-xs font-black uppercase text-white/70">Block Title</label>
                                                <input type="text" value={block.title} onChange={e => { const a = [...formData.agenda_data]; a[bIdx].title = e.target.value; setFormData({...formData, agenda_data: a}); }} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none" placeholder="e.g. Morning Sessions" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase text-white/70">Type</label>
                                                <select value={block.type} onChange={e => { const a = [...formData.agenda_data]; a[bIdx].type = e.target.value; setFormData({...formData, agenda_data: a}); }} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none">
                                                    <option value="main" className="bg-[#05080f] text-white">Main (Single Track)</option>
                                                    <option value="parallel" className="bg-[#05080f] text-white">Parallel (Multiple Tracks)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {block.type === 'parallel' && (
                                            <div className="space-y-2 mb-6">
                                                <label className="text-xs font-black uppercase text-brand-cyan">Tracks (Comma Separated)</label>
                                                <input 
                                                    type="text" 
                                                    value={block._tracksRaw !== undefined ? block._tracksRaw : (safeArray(block.tracks).map(t => typeof t === 'string' ? t : (t.name || '')).join(', ') || '')} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const a = [...formData.agenda_data];
                                                        a[bIdx]._tracksRaw = val;
                                                        const names = val.split(',');
                                                        const currentTracks = safeArray(a[bIdx].tracks);
                                                        a[bIdx].tracks = names.map((n, idx) => {
                                                            const trimmedName = n.trim();
                                                            const existing = currentTracks[idx] || currentTracks.find(t => (typeof t === 'string' ? t : t.name) === trimmedName);
                                                            return {
                                                                name: trimmedName,
                                                                sessions: (typeof existing === 'object' && existing !== null) ? (existing.sessions || []) : []
                                                            };
                                                        });
                                                        setFormData({...formData, agenda_data: a});
                                                    }} 
                                                    className="w-full bg-white/5 border border-brand-cyan/20 rounded-xl px-4 py-2 text-white text-sm outline-none font-sans" 
                                                    placeholder="Track A, Track B, Track C" 
                                                />
                                            </div>
                                        )}

                                        {block.type === 'main' ? (
                                            <div className="space-y-4">
                                                <label className="text-xs font-black uppercase text-white/70">Sessions</label>
                                                {safeArray(block.sessions).map((session, sIdx) => (
                                                    <div key={sIdx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 relative">
                                                        <button type="button" onClick={() => { const a = [...formData.agenda_data]; a[bIdx].sessions.splice(sIdx, 1); setFormData({...formData, agenda_data: a}); }} className="absolute top-4 right-4 text-red-500 hover:text-red-400 p-1 hover:bg-white/5 rounded-lg transition-all"><X size={16} /></button>
                                                        
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full max-w-sm">
                                                            <span className="text-[10px] font-black uppercase text-brand-cyan tracking-wider flex items-center gap-1.5 shrink-0">
                                                                <Clock size={12} /> Time Slot
                                                            </span>
                                                            <input type="text" value={session.time} onChange={e => { const a = [...formData.agenda_data]; a[bIdx].sessions[sIdx].time = e.target.value; setFormData({...formData, agenda_data: a}); }} className="bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold w-full" placeholder="e.g. 09:00 - 09:30" />
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black uppercase text-white/40">Session Title</label>
                                                                <input type="text" value={session.title || ''} onChange={e => { const a = [...formData.agenda_data]; a[bIdx].sessions[sIdx].title = e.target.value; setFormData({...formData, agenda_data: a}); }} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-white text-xs" placeholder="e.g. Opening Keynote" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black uppercase text-white/40">Speaker(s)</label>
                                                                <input type="text" value={session.speaker || ''} onChange={e => { const a = [...formData.agenda_data]; a[bIdx].sessions[sIdx].speaker = e.target.value; setFormData({...formData, agenda_data: a}); }} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-white text-xs" placeholder="e.g. John Doe" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black uppercase text-white/40">Description</label>
                                                                <input type="text" value={session.description || ''} onChange={e => { const a = [...formData.agenda_data]; a[bIdx].sessions[sIdx].description = e.target.value; setFormData({...formData, agenda_data: a}); }} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-white text-xs" placeholder="e.g. Brief description of the session..." />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => { const a = [...formData.agenda_data]; a[bIdx].sessions.push({ time: "00:00 - 00:00", title: "", speaker: "", description: "" }); setFormData({...formData, agenda_data: a}); }} className="text-xs font-bold text-brand-cyan flex items-center gap-1 hover:text-white transition-colors mt-2">
                                                    <Plus size={14} /> Add Session Slot
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                {safeArray(block.tracks).map((track, tIdx) => {
                                                    const trackObj = typeof track === 'string' ? { name: track, sessions: [] } : track;
                                                    return (
                                                        <div key={tIdx} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-4">
                                                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                                <span className="text-xs font-black uppercase text-brand-cyan tracking-wider">{trackObj.name || `Track ${tIdx + 1}`}</span>
                                                            </div>
                                                            
                                                            <div className="space-y-4">
                                                                {safeArray(trackObj.sessions).map((session, sIdx) => (
                                                                    <div key={sIdx} className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-3 relative">
                                                                        <button type="button" onClick={() => {
                                                                            const a = [...formData.agenda_data];
                                                                            a[bIdx].tracks[tIdx].sessions.splice(sIdx, 1);
                                                                            setFormData({...formData, agenda_data: a});
                                                                        }} className="absolute top-3 right-3 text-red-500 hover:text-red-400 p-1 hover:bg-white/5 rounded-lg transition-all">
                                                                            <X size={14} />
                                                                        </button>

                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Clock size={12} className="text-brand-cyan shrink-0" />
                                                                                <input type="text" value={session.time || ''} onChange={e => {
                                                                                    const a = [...formData.agenda_data];
                                                                                    a[bIdx].tracks[tIdx].sessions[sIdx].time = e.target.value;
                                                                                    setFormData({...formData, agenda_data: a});
                                                                                }} className="bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs font-bold w-full" placeholder="e.g. 09:00 - 09:30" />
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <label className="text-[9px] font-black uppercase text-white/40">Title</label>
                                                                                <input type="text" value={session.title || ''} onChange={e => {
                                                                                    const a = [...formData.agenda_data];
                                                                                    a[bIdx].tracks[tIdx].sessions[sIdx].title = e.target.value;
                                                                                    setFormData({...formData, agenda_data: a});
                                                                                }} className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold" placeholder="Session Title" />
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <label className="text-[9px] font-black uppercase text-white/40">Speaker</label>
                                                                                <input type="text" value={session.speaker || ''} onChange={e => {
                                                                                    const a = [...formData.agenda_data];
                                                                                    a[bIdx].tracks[tIdx].sessions[sIdx].speaker = e.target.value;
                                                                                    setFormData({...formData, agenda_data: a});
                                                                                }} className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs" placeholder="Speaker" />
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <label className="text-[9px] font-black uppercase text-white/40">Description</label>
                                                                                <textarea value={session.description || ''} onChange={e => {
                                                                                    const a = [...formData.agenda_data];
                                                                                    a[bIdx].tracks[tIdx].sessions[sIdx].description = e.target.value;
                                                                                    setFormData({...formData, agenda_data: a});
                                                                                }} className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs h-16 resize-none" placeholder="Description" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <button type="button" onClick={() => {
                                                                const a = [...formData.agenda_data];
                                                                if (!a[bIdx].tracks[tIdx]) a[bIdx].tracks[tIdx] = { name: typeof track === 'string' ? track : '', sessions: [] };
                                                                if (!Array.isArray(a[bIdx].tracks[tIdx].sessions)) {
                                                                    a[bIdx].tracks[tIdx].sessions = [];
                                                                }
                                                                a[bIdx].tracks[tIdx].sessions.push({ time: "09:00 - 09:30", title: "", speaker: "", description: "" });
                                                                setFormData({...formData, agenda_data: a});
                                                            }} className="text-xs font-bold text-brand-cyan flex items-center gap-1 hover:text-white transition-colors w-full justify-center py-2 border border-dashed border-brand-cyan/20 rounded-xl hover:border-brand-cyan/40 mt-2">
                                                                <Plus size={14} /> Add Session to {trackObj.name || `Track ${tIdx + 1}`}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setFormData({ ...formData, agenda_data: [...formData.agenda_data, { type: 'main', title: 'New Block', sessions: [] }] })} className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-white/50 hover:border-brand-cyan/30 hover:text-brand-cyan transition-colors flex items-center justify-center gap-2 font-bold text-sm">
                                    <Plus size={18} /> Add Agenda Block
                                </button>
                            </div>
                        )}

                        {activeTab === 'speakers_sponsors' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Speakers Section */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black text-brand-cyan border-b border-brand-cyan/20 pb-2">Speakers List</h4>
                                    {formData.speakers_data.map((speaker, idx) => (
                                        <div key={idx} className="bg-[#05080f] border border-white/10 rounded-xl p-4 md:p-5 relative flex flex-col sm:flex-row gap-5 items-start">
                                            <button type="button" onClick={() => removeArrayItem('speakers_data', idx)} className="absolute top-2 right-2 text-white/30 hover:text-red-400 p-1 bg-black/50 rounded-full sm:bg-transparent"><X size={14}/></button>
                                            <label className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl border-2 border-dashed border-white/20 hover:border-brand-cyan/50 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group bg-white/5 mx-auto sm:mx-0">
                                                {speaker.image ? <img src={speaker.image} alt={speaker.name || "Speaker"} className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-white/40 group-hover:text-brand-cyan transition-colors"><Plus size={24}/></div>}
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleArrayImageChange('speakers_data', idx, e.target.files[0], 'image')} />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm">
                                                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Upload</span>
                                                </div>
                                            </label>
                                            <div className="space-y-3 flex-1 w-full relative sm:pr-4">
                                                <input type="text" value={speaker.name} onChange={e => updateArrayItem('speakers_data', idx, 'name', e.target.value)} placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-white/30" />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <input type="text" value={speaker.role} onChange={e => updateArrayItem('speakers_data', idx, 'role', e.target.value)} placeholder="Job Role" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-white/30" />
                                                    <input type="text" value={speaker.company} onChange={e => updateArrayItem('speakers_data', idx, 'company', e.target.value)} placeholder="Company" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-white/30" />
                                                </div>
                                                <input type="text" value={speaker.image} onChange={e => updateArrayItem('speakers_data', idx, 'image', e.target.value)} placeholder="Or paste exact Image URL here..." className="w-full bg-brand-cyan/5 border border-brand-cyan/20 rounded-lg px-4 py-2 text-brand-cyan/90 text-xs outline-none focus:border-brand-cyan focus:bg-brand-cyan/10 transition-all font-mono" />
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addArrayItem('speakers_data', { name: '', role: '', company: '', image: '' })} className="w-full py-3 border border-dashed border-white/10 rounded-xl text-white/50 hover:border-brand-cyan/30 flex justify-center text-sm font-bold"><Plus size={16} /> Add Speaker</button>
                                </div>

                                {/* Sponsors Section */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-black text-[#fde047] border-b border-[#fde047]/20 pb-2">Sponsors List</h4>
                                    {formData.sponsors_data.map((sponsor, idx) => (
                                        <div key={idx} className="bg-[#05080f] border border-white/10 rounded-xl p-4 md:p-5 relative flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                                            <button type="button" onClick={() => removeArrayItem('sponsors_data', idx)} className="absolute top-2 right-2 text-white/30 hover:text-red-400 p-1 bg-black/50 rounded-full sm:bg-transparent"><X size={14}/></button>
                                            <label className="w-20 h-20 shrink-0 bg-white/5 rounded-xl overflow-hidden border-2 border-dashed border-white/20 hover:border-[#fde047]/50 flex flex-col items-center justify-center cursor-pointer relative group">
                                                {sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name || "Sponsor"} className="w-full h-full object-contain p-2" /> : <div className="text-white/20 group-hover:text-[#fde047] transition-colors"><Award size={24}/></div>}
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleArrayImageChange('sponsors_data', idx, e.target.files[0], 'logo')} />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm">
                                                    <span className="text-[9px] font-black uppercase text-white tracking-widest mt-1">Logo</span>
                                                </div>
                                            </label>
                                            <div className="space-y-3 flex-1 w-full sm:pr-6">
                                                <input type="text" value={sponsor.name} onChange={e => updateArrayItem('sponsors_data', idx, 'name', e.target.value)} placeholder="Sponsor Name" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-[#fde047] focus:ring-1 focus:ring-[#fde047] transition-all placeholder:text-white/30" />
                                                <input type="text" value={sponsor.logo} onChange={e => updateArrayItem('sponsors_data', idx, 'logo', e.target.value)} placeholder="Or paste actual Logo URL here..." className="w-full bg-[#fde047]/5 border border-[#fde047]/20 rounded-lg px-4 py-2 text-[#fde047]/90 text-xs outline-none focus:border-[#fde047] focus:bg-[#fde047]/10 transition-all font-mono" />
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addArrayItem('sponsors_data', { name: '', logo: '' })} className="w-full py-3 border border-dashed border-white/10 rounded-xl text-white/50 hover:border-[#fde047]/30 flex justify-center text-sm font-bold"><Plus size={16} /> Add Sponsor</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'workshops' && (
                            <div className="space-y-4">
                                <h4 className="text-lg font-black text-brand-cyan border-b border-brand-cyan/20 pb-2 flex items-center justify-between">
                                    Workshops List
                                    <button type="button" onClick={() => addArrayItem('workshops_data', { title: '', speaker: '', time: '', venue: '', description: '', requirements: '', guide_url: '' })} className="text-xs text-brand-cyan hover:underline flex items-center gap-1"><Plus size={14} /> Add Workshop</button>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(formData.workshops_data || []).map((ws, idx) => (
                                        <div key={idx} className="bg-[#05080f] border border-white/10 rounded-xl p-6 relative space-y-4">
                                            <button type="button" onClick={() => removeArrayItem('workshops_data', idx)} className="absolute top-2 right-2 text-white/30 hover:text-red-400 p-1 bg-black/50 rounded-full sm:bg-transparent"><X size={14}/></button>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-1">Workshop Title</label>
                                                <input type="text" value={ws.title} onChange={e => updateArrayItem('workshops_data', idx, 'title', e.target.value)} placeholder="e.g. AWS Serverless Hands-on" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan font-bold transition-all placeholder:text-white/30 placeholder:font-normal" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Speaker(s)</label>
                                                    <input type="text" value={ws.speaker} onChange={e => updateArrayItem('workshops_data', idx, 'speaker', e.target.value)} placeholder="e.g. Jane Doe" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Time / Slot</label>
                                                    <input type="text" value={ws.time} onChange={e => updateArrayItem('workshops_data', idx, 'time', e.target.value)} placeholder="e.g. 14:00 - 16:00" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Venue / Lab</label>
                                                    <input type="text" value={ws.venue} onChange={e => updateArrayItem('workshops_data', idx, 'venue', e.target.value)} placeholder="e.g. Lab 3, Ground Floor" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">AWS Guide Link</label>
                                                    <input type="url" value={ws.guide_url} onChange={e => updateArrayItem('workshops_data', idx, 'guide_url', e.target.value)} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-1">Description</label>
                                                <textarea rows={3} value={ws.description} onChange={e => updateArrayItem('workshops_data', idx, 'description', e.target.value)} placeholder="Enter workshop description..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan resize-none transition-all"></textarea>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-1">Additional Requirements (comma-separated)</label>
                                                <input type="text" value={ws.requirements} onChange={e => updateArrayItem('workshops_data', idx, 'requirements', e.target.value)} placeholder="e.g. Git installed, AWS CLI configured" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'content' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">About Description</label>
                                    <textarea rows={4} value={formData.about_data.text} onChange={e => setFormData({ ...formData, about_data: { ...formData.about_data, text: e.target.value } })} className="w-full bg-[#05080f] border border-white/20 rounded-xl p-4 text-white text-sm focus:border-brand-cyan outline-none resize-y placeholder-white/20" placeholder="Type the main descriptive paragraph here..."></textarea>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Konfhub Registration URL</label>
                                    <input type="url" value={formData.ticket_data.konfhub_url} onChange={e => setFormData({ ...formData, ticket_data: { ...formData.ticket_data, konfhub_url: e.target.value } })} className="w-full bg-[#05080f] border border-brand-cyan/30 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" placeholder="https://konfhub.com/..." />
                                </div>
                                <div className="space-y-4 md:col-span-2 mt-4">
                                    <h4 className="text-lg font-black text-brand-cyan border-b border-white/10 pb-2 flex items-center justify-between">
                                        Ticket Pricing Tiers
                                        <button type="button" onClick={() => setFormData({...formData, ticket_data: {...formData.ticket_data, tickets: [...formData.ticket_data.tickets, { name: '', price: '', points: '' }]}})} className="text-xs text-brand-cyan hover:underline flex items-center gap-1"><Plus size={14} /> Add Ticket</button>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(formData.ticket_data.tickets || []).map((ticket, idx) => (
                                            <div key={idx} className="bg-[#05080f] border border-white/10 rounded-xl p-4 md:p-5 relative">
                                                <button type="button" onClick={() => { const t = [...formData.ticket_data.tickets]; t.splice(idx,1); setFormData({...formData, ticket_data: {...formData.ticket_data, tickets: t}}); }} className="absolute top-2 right-2 text-white/30 hover:text-red-400 p-1 bg-black/50 rounded-full sm:bg-transparent"><X size={14}/></button>
                                                <input type="text" value={ticket.name} onChange={e => { const t = [...formData.ticket_data.tickets]; t[idx].name = e.target.value; setFormData({...formData, ticket_data: {...formData.ticket_data, tickets: t}}); }} placeholder="Ticket Tier Name (e.g. VIP)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 mb-3 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan font-bold transition-all placeholder:text-white/30 placeholder:font-normal" />
                                                <input type="text" value={ticket.price} onChange={e => { const t = [...formData.ticket_data.tickets]; t[idx].price = e.target.value; setFormData({...formData, ticket_data: {...formData.ticket_data, tickets: t}}); }} placeholder="Price (e.g. Free, ₹299)" className="w-full bg-white/5 border border-brand-cyan/20 rounded-lg px-3 py-2.5 mb-4 text-brand-cyan outline-none focus:border-brand-cyan focus:bg-brand-cyan/5 transition-all placeholder:text-brand-cyan/50 font-medium" />
                                                <textarea rows={3} value={ticket.points} onChange={e => { const t = [...formData.ticket_data.tickets]; t[idx].points = e.target.value; setFormData({...formData, ticket_data: {...formData.ticket_data, tickets: t}}); }} placeholder="Perks & Benefits (comma separated)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white/70 text-sm outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan resize-none transition-all placeholder:text-white/30 leading-relaxed"></textarea>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-4 md:col-span-2 mt-4">
                                    <h4 className="text-lg font-black text-white border-b border-white/10 pb-2 flex items-center justify-between">
                                        Organizing Team
                                        <button type="button" onClick={() => addArrayItem('team_data', { name: '', role: '', image: '', portfolio_url: '', github_url: '', linkedin_url: '', instagram_url: '' })} className="text-xs text-brand-cyan hover:underline flex items-center gap-1"><Plus size={14} /> Add Member</button>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {formData.team_data.map((member, idx) => (
                                            <div key={idx} className="bg-[#05080f] border border-white/10 rounded-xl p-4 relative text-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                                <button type="button" onClick={() => removeArrayItem('team_data', idx)} className="absolute top-2 right-2 text-white/30 hover:text-red-400 p-1 bg-black/50 rounded-full sm:bg-transparent"><X size={14}/></button>
                                                <label className="w-20 h-20 shrink-0 mx-auto sm:mx-0 rounded-full bg-white/5 border-2 border-dashed border-white/20 hover:border-brand-cyan/50 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group">
                                                    {member.image ? <img src={member.image} alt={member.name || "Member"} className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-white/40 group-hover:text-brand-cyan transition-colors"><Users size={20}/></div>}
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleArrayImageChange('team_data', idx, e.target.files[0], 'image')} />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm">
                                                        <span className="text-[9px] font-black uppercase text-white tracking-widest">Image</span>
                                                    </div>
                                                </label>
                                                <div className="flex-grow w-full space-y-2 sm:pr-2">
                                                    <input type="text" value={member.name} onChange={e => updateArrayItem('team_data', idx, 'name', e.target.value)} placeholder="Member Name" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan font-bold transition-all placeholder:text-white/30 placeholder:font-normal" />
                                                    <input type="text" value={member.role} onChange={e => updateArrayItem('team_data', idx, 'role', e.target.value)} placeholder="Role (e.g. Lead Organizer)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-brand-cyan outline-none focus:border-brand-cyan transition-all placeholder:text-white/30" />
                                                    <input type="text" value={member.image} onChange={e => updateArrayItem('team_data', idx, 'image', e.target.value)} placeholder="Or paste Avatar URL" className="w-full bg-brand-cyan/5 border border-brand-cyan/20 rounded-lg px-3 py-1.5 text-brand-cyan/70 text-xs outline-none focus:border-brand-cyan focus:bg-brand-cyan/10 transition-all font-mono" />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="text" value={member.portfolio_url || ''} onChange={e => updateArrayItem('team_data', idx, 'portfolio_url', e.target.value)} placeholder="Portfolio Website URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-white/30" />
                                                        <input type="text" value={member.github_url || ''} onChange={e => updateArrayItem('team_data', idx, 'github_url', e.target.value)} placeholder="GitHub URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-white/30" />
                                                        <input type="text" value={member.linkedin_url || ''} onChange={e => updateArrayItem('team_data', idx, 'linkedin_url', e.target.value)} placeholder="LinkedIn URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-white/30" />
                                                        <input type="text" value={member.instagram_url || ''} onChange={e => updateArrayItem('team_data', idx, 'instagram_url', e.target.value)} placeholder="Instagram URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all placeholder:text-white/30" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#05080f] border-t border-brand-cyan/20 px-8 py-4 flex gap-3">
                        <button type="submit" disabled={saving} className="btn-primary px-8 py-3 text-sm flex items-center gap-2 disabled:opacity-50 font-bold">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                            {editingEvent ? 'Save Event Configuration' : 'Create Community Day'}
                        </button>
                        <button type="button" onClick={resetForm} className="btn-secondary px-6 py-3 text-sm !rounded-xl font-bold">Cancel</button>
                    </div>
                </motion.form>
            )}

            {loading ? (
                <div className="text-brand-cyan font-black uppercase tracking-[0.5em] animate-pulse py-20 text-center">Loading Events...</div>
            ) : events.length === 0 && !showForm ? (
                <div className="glass-card p-16 text-center border-white/5 !rounded-2xl flex flex-col items-center">
                    <Award size={64} className="text-brand-cyan/40 mb-6" />
                    <h3 className="text-2xl font-black text-white mb-2">Configure Your First Community Day</h3>
                    <p className="text-white/60 mb-8 max-w-sm">Launch the biggest dynamic website infrastructure for your flagship event.</p>
                    <button onClick={() => setShowForm(true)} className="btn-primary px-8 py-4 text-sm inline-flex items-center gap-2 font-bold shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                        Initialize Event Environment
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.map((event, i) => (
                        <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-[#05080f] rounded-3xl p-6 md:p-8 border border-white/10 hover:border-brand-cyan/30 transition-all group shadow-xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-3xl font-black text-white">{event.year}</h3>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0 ${event.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                            {event.is_active ? 'Live' : 'Draft'}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-bold text-brand-cyan leading-tight pr-4">{event.title}</h4>
                                </div>
                                <div className="flex gap-3 shrink-0">
                                    <button onClick={() => startEdit(event)} className="btn-crud-edit p-4" title="Edit Community Day">
                                        <Edit2 size={18} />
                                    </button>
                                    <button disabled={processingId === event.id} onClick={() => handleDelete(event.id)} className="btn-crud-delete p-4 disabled:opacity-50" title="Delete Community Day">
                                        {processingId === event.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white/5 text-white/60 rounded-xl p-4 border border-white/5 space-y-3 mb-4">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span>Global Visibility</span>
                                    <div className={`px-2 py-0.5 rounded flex items-center gap-1.5 ${event.visibility_toggled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${event.visibility_toggled ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`}></div>
                                        {event.visibility_toggled ? 'TRANSMITTING' : 'OFFLINE'}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium">
                                    <span>Date & Time</span>
                                    <span className="text-white/80">{event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium">
                                    <span>Venue</span>
                                    <span className="text-white/80">{event.venue || 'TBD'}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-center border-t border-white/10 pt-4 mt-2">
                                <div className="space-y-1">
                                    <div className="text-xl font-black text-brand-aws">{safeArray(event.agenda_data).reduce((acc, b)=>acc+safeArray(b.sessions).length, 0)}</div>
                                    <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Sessions</div>
                                </div>
                                <div className="space-y-1 border-x border-white/10">
                                    <div className="text-xl font-black text-[#bae6fd]">{safeArray(event.speakers_data).length}</div>
                                    <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Speakers</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xl font-black text-[#fde047]">{safeArray(event.sponsors_data).length}</div>
                                    <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Sponsors</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
