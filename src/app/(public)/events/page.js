"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
        <div className="min-h-screen bg-brand-deep pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        Community Hub
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-display font-bold text-white mb-8 tracking-tight">
                        Our <span className="text-brand-aws">Events</span>
                    </h1>
                    <div className="inline-flex bg-brand-navy/60 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'upcoming' ? 'bg-brand-aws text-brand-deep shadow-lg shadow-brand-aws/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setFilter('past')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'past' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Past Gallery
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-slate-800 border-t-brand-aws rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium animate-pulse">Syncing events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-24 bg-brand-navy/30 rounded-[2.5rem] border border-slate-800 border-dashed max-w-2xl mx-auto"
                    >
                        <Calendar size={64} className="mx-auto text-slate-700 mb-6" />
                        <h3 className="text-2xl font-display font-bold text-slate-400 mb-2">No {filter} events found</h3>
                        <p className="text-slate-500">We're cooking up something amazing. Join our Meetup to get notified!</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.map((event, i) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="card-professional flex flex-col p-0 overflow-hidden group border-slate-800/50"
                            >
                                <div className="aspect-[16/9] relative overflow-hidden bg-slate-900">
                                    {event.image_url ? (
                                        <img
                                            src={event.image_url}
                                            alt={event.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-brand-navy/50">
                                            <Calendar size={64} className="text-slate-800" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <div className="bg-brand-deep/80 backdrop-blur-md px-4 py-1.5 rounded-lg border border-brand-aws/20 text-[10px] font-bold uppercase tracking-widest text-brand-aws">
                                            {new Date(event.start_time || event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 flex-grow flex flex-col">
                                    <h3 className="text-2xl font-display font-bold mb-4 leading-tight group-hover:text-brand-aws transition-colors">{event.title}</h3>
                                    <p className="text-slate-400 text-sm mb-8 line-clamp-3 leading-relaxed flex-grow">
                                        {event.description || `Join us for an immersive session on ${event.title.toLowerCase()}.`}
                                    </p>

                                    <div className="grid grid-cols-1 gap-4 mb-8">
                                        {event.is_visible !== false && (
                                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 px-4 py-2 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                                <Clock size={16} className="text-brand-aws" />
                                                <span className="truncate">
                                                    {event.start_time ? new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBA'}
                                                    {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                                                </span>
                                            </div>
                                        )}
                                        {event.location && event.is_visible !== false && (
                                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 px-4 py-2 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                                <MapPin size={16} className="text-brand-aws" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    {filter === 'upcoming' && event.is_visible !== false && (
                                        <button
                                            onClick={() => setSelectedEvent(event)}
                                            className="btn-aws w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-brand-aws/10"
                                        >
                                            Reserve Seat
                                            <ExternalLink size={16} />
                                        </button>
                                    )}
                                    {filter === 'past' && (
                                        <Link href="/gallery" className="btn-outline w-full py-4 !border-slate-800 hover:!border-slate-600 flex items-center justify-center">
                                            View Recap
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-brand-deep/95 backdrop-blur-xl"
                            onClick={() => setSelectedEvent(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="card-professional w-full max-w-lg p-12 relative z-10 border-slate-700 shadow-3xl"
                        >
                            {regSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                        <Check size={40} strokeWidth={3} />
                                    </div>
                                    <h2 className="text-3xl font-display font-bold text-white mb-3">Seat Reserved!</h2>
                                    <p className="text-slate-400">Confirmation has been sent to your email.</p>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-display font-bold text-white mb-3">Join <span className="text-brand-aws">Event</span></h2>
                                        <p className="text-slate-400 text-sm leading-relaxed">Register for <span className="text-white font-semibold">{selectedEvent.title}</span>. We'll send you all the event details via email.</p>
                                    </div>

                                    <form onSubmit={handleRegister} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                                            <input
                                                required type="text"
                                                value={regFormData.full_name}
                                                onChange={e => setRegFormData({ ...regFormData, full_name: e.target.value })}
                                                className="w-full"
                                                placeholder="Enter your legal name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Academic Email</label>
                                            <input
                                                required type="email"
                                                value={regFormData.email}
                                                onChange={e => setRegFormData({ ...regFormData, email: e.target.value })}
                                                className="w-full"
                                                placeholder="e.g. rollno@ddu.ac.in"
                                            />
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedEvent(null)}
                                                className="flex-grow btn-outline py-4"
                                            >
                                                Go Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={regSubmitting}
                                                className="flex-grow btn-aws py-4 font-bold"
                                            >
                                                {regSubmitting ? 'Confirming...' : 'Register Now'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
