"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ExternalLink, Clock, Check } from "lucide-react";

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [regFormData, setRegFormData] = useState({ full_name: '', email: '' });
    const [regSubmitting, setRegSubmitting] = useState(false);
    const [regSuccess, setRegSuccess] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchEvents();
    }, [filter]);

    async function fetchEvents() {
        setLoading(true);
        let query = supabase.from('events').select('*');

        if (filter === 'upcoming') {
            query = query.gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true });
        } else {
            query = query.lt('date', new Date().toISOString().split('T')[0]).order('date', { ascending: false });
        }

        const { data, error } = await query;
        if (!error) setEvents(data || []);
        setLoading(false);
    }

    async function handleRegister(e) {
        e.preventDefault();
        setRegSubmitting(true);
        const { error } = await supabase
            .from('event_registrations')
            .insert([{
                event_id: selectedEvent.id,
                full_name: regFormData.full_name,
                email: regFormData.email
            }]);

        if (!error) {
            setRegSuccess(true);
            setTimeout(() => {
                setSelectedEvent(null);
                setRegSuccess(false);
                setRegFormData({ full_name: '', email: '' });
            }, 2000);
        } else {
            alert("Registration failed: " + error.message);
        }
        setRegSubmitting(false);
    }

    return (
        <div className="min-h-screen bg-brand-dark pt-28 pb-20 relative">
            <div className="fixed inset-0 bg-dot-grid opacity-30 pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-black mb-6">
                        Community <span className="text-brand-cyan">Events</span>
                    </h1>
                    <div className="inline-flex bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'upcoming' ? 'bg-brand-cyan text-brand-dark' : 'text-white/60 hover:text-white'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setFilter('past')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'past' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            Past Events
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin"></div>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                        <Calendar size={48} className="mx-auto text-white/20 mb-4" />
                        <h3 className="text-xl font-bold text-white/50">No {filter} events found.</h3>
                        <p className="text-white/30 text-sm mt-2">Check back soon for updates!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.map((event, i) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card group flex flex-col overflow-hidden border-white/5 hover:border-brand-cyan/30 transition-all duration-300"
                            >
                                <div className="h-48 relative overflow-hidden bg-brand-deep">
                                    {event.image_url ? (
                                        <img
                                            src={event.image_url}
                                            alt={event.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                            <Calendar size={48} className="text-white/5" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-brand-dark/90 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-bold uppercase tracking-wider text-brand-cyan">
                                        {new Date(event.start_time || event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                <div className="p-8 flex-grow flex flex-col">
                                    <h3 className="text-2xl font-bold mb-4 leading-tight group-hover:text-brand-cyan transition-colors">{event.title}</h3>
                                    <p className="text-white/60 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                                        {event.description}
                                    </p>

                                    <div className="space-y-3 mb-8">
                                        {event.is_visible !== false && (
                                            <div className="flex items-center gap-3 text-xs font-medium text-white/50">
                                                <Clock size={14} className="text-brand-teal" />
                                                <span>
                                                    {event.start_time ? new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBA'}
                                                    {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                                                </span>
                                            </div>
                                        )}
                                        {event.location && event.is_visible !== false && (
                                            <div className="flex items-center gap-3 text-xs font-medium text-white/50">
                                                <MapPin size={14} className="text-brand-orange" />
                                                <span>{event.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    {filter === 'upcoming' && event.is_visible !== false && (
                                        <button
                                            onClick={() => setSelectedEvent(event)}
                                            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
                                        >
                                            Join Event
                                            <ExternalLink size={14} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-xl" onClick={() => setSelectedEvent(null)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="glass-card w-full max-w-lg p-10 relative z-10 border-white/10"
                    >
                        {regSuccess ? (
                            <div className="text-center py-10">
                                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check size={40} />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Registration Confirmed!</h2>
                                <p className="text-white/40 font-medium">We'll see you at {selectedEvent.title}.</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Join <span className="text-brand-cyan">Event</span></h2>
                                <p className="text-white/40 font-medium mb-8">Ready to level up? Register for {selectedEvent.title} below.</p>

                                <form onSubmit={handleRegister} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Full Name</label>
                                        <input
                                            required type="text"
                                            value={regFormData.full_name}
                                            onChange={e => setRegFormData({ ...regFormData, full_name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold placeholder-white/20"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Email Address</label>
                                        <input
                                            required type="email"
                                            value={regFormData.email}
                                            onChange={e => setRegFormData({ ...regFormData, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold placeholder-white/20"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={() => setSelectedEvent(null)} className="flex-grow btn-secondary py-4 font-black uppercase tracking-widest text-xs">Cancel</button>
                                        <button type="submit" disabled={regSubmitting} className="flex-grow btn-primary py-4 font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(0,194,255,0.2)]">
                                            {regSubmitting ? 'Registering...' : 'Confirm Join'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
