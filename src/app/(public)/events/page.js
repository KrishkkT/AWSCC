"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Calendar, MapPin, ExternalLink, Clock, Check, ArrowRight, Cloud, Zap } from "lucide-react";

export default function Events() {
    const supabase = createClient();
    
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [regFormData, setRegFormData] = useState({ full_name: '', email: '' });
    const [regSubmitting, setRegSubmitting] = useState(false);
    const [regSuccess, setRegSuccess] = useState(false);
    const [communityEvent, setCommunityEvent] = useState(null);

    const fetchCommunityEvent = useCallback(async () => {
        const { data, error } = await supabase
            .from('community_events')
            .select('*')
            .eq('is_active', true)
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!error && data) {
            setCommunityEvent(data);
        }
    }, [supabase]);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date().toISOString();
            
            // 1. First, check if any upcoming/active events should be completed
            const { data: overdue } = await supabase
                .from('events')
                .select('id')
                .or('status.eq.upcoming,status.eq.active')
                .lt('end_time', now);
            
            if (overdue && overdue.length > 0) {
                await supabase
                    .from('events')
                    .update({ status: 'completed' })
                    .in('id', overdue.map(e => e.id));
            }

            // 2. Now fetch based on filter
            let query = supabase.from('events').select('*');

            if (filter === 'upcoming') {
                query = query.gte('end_time', now).order('start_time', { ascending: true });
            } else {
                query = query.lt('end_time', now).order('end_time', { ascending: false });
            }

            const { data, error } = await query;
            if (!error) setEvents(data || []);
        } catch (err) {
            console.error("Error fetching events:", err);
        } finally {
            setLoading(false);
        }
    }, [supabase, filter]);

    useEffect(() => {
        const fetchAll = async () => {
            await Promise.all([
                fetchEvents(),
                fetchCommunityEvent()
            ]);
        };
        fetchAll();
    }, [fetchEvents, fetchCommunityEvent]);

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
        <div className="min-h-screen bg-background pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        Community Hub
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground mb-8 tracking-tight">
                        Our <span className="text-brand-aws">Events</span>
                    </h1>
                    <div className="inline-flex bg-secondary/80 p-1.5 rounded-2xl border border-border backdrop-blur-md">
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'upcoming' ? 'bg-brand-aws text-white shadow-lg shadow-brand-aws/20' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setFilter('past')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'past' ? 'bg-secondary-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Past Gallery
                        </button>
                    </div>
                </div>

                {filter === 'upcoming' && communityEvent && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-16 relative overflow-hidden rounded-3xl border border-brand-cyan/20 bg-[#0a0f18] shadow-2xl group flex flex-col md:flex-row"
                    >
                        {/* Interactive Background */}
                        <div className="absolute inset-0 bg-slate-grid pointer-events-none opacity-50 mix-blend-overlay"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl bg-brand-cyan/10 blur-[100px] pointer-events-none rounded-full"></div>

                        <div className="flex-1 p-8 md:p-12 relative z-10 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                                    Flagship Event
                                </div>
                            </div>
                            
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                                {communityEvent.title}
                            </h2>
                            <p className="text-white/60 mb-8 font-medium max-w-xl text-lg">
                                Our largest annual multi-track cloud computing event. Join us for a full day of expert sessions, hands-on workshops, and massive networking opportunities at {communityEvent.venue || 'Dharmsinh Desai University'}.
                            </p>
                            
                            <div className="flex items-center gap-4">
                                <Link href={`/community-day/${communityEvent.year}`}>
                                    <button className="btn-primary py-3.5 px-8 flex items-center gap-3 shadow-[0_0_30px_rgba(0,194,255,0.3)]">
                                        View Entire Schedule & Details <ArrowRight size={18} />
                                    </button>
                                </Link>
                            </div>
                        </div>

                        {/* Visual graphic on the right */}
                        <div className="w-full md:w-2/5 p-8 relative flex items-center justify-center bg-brand-dark/50 border-l border-white/5 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-brand-aws/5" />
                            <Cloud className="w-32 h-32 text-brand-cyan/20 absolute top-10 left-10" strokeWidth={1} />
                            <Zap className="w-24 h-24 text-brand-aws/20 absolute bottom-10 right-10" strokeWidth={1} />
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="relative z-10 font-display font-black text-7xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-transparent"
                            >
                                {communityEvent.year}
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-secondary border-t-brand-aws rounded-full animate-spin"></div>
                        <p className="text-muted-foreground font-medium animate-pulse">Syncing events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-24 bg-secondary/30 rounded-[2.5rem] border border-border border-dashed max-w-2xl mx-auto"
                    >
                        <Calendar size={64} className="mx-auto text-muted-foreground/20 mb-6" />
                        <h3 className="text-2xl font-display font-bold text-muted-foreground mb-2">No {filter} events found</h3>
                        <p className="text-muted-foreground/60">We&apos;re cooking up something amazing. Join our Meetup to get notified!</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.map((event, i) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="card-professional flex flex-col p-0 overflow-hidden group border-border"
                            >
                                <div className="aspect-[16/9] relative overflow-hidden bg-secondary">
                                    {event.image_url ? (
                                        <img
                                            src={event.image_url}
                                            alt={event.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-card">
                                            <Calendar size={64} className="text-muted-foreground/20" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <div className="bg-background/80 backdrop-blur-md px-4 py-1.5 rounded-lg border border-brand-aws/20 text-[10px] font-bold uppercase tracking-widest text-brand-aws">
                                            {new Date(event.start_time || event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 flex-grow flex flex-col">
                                    <h3 className="text-2xl font-display font-bold mb-4 leading-tight group-hover:text-brand-aws transition-colors text-foreground">{event.title}</h3>
                                    <p className="text-muted-foreground text-sm mb-8 line-clamp-3 leading-relaxed flex-grow">
                                        {event.description || `Join us for an immersive session on ${event.title.toLowerCase()}.`}
                                    </p>

                                    <div className="grid grid-cols-1 gap-4 mb-8">
                                        {event.is_visible !== false && (
                                            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground px-4 py-2 bg-secondary/50 rounded-xl border border-border/50">
                                                <Clock size={16} className="text-brand-aws" />
                                                <span className="truncate">
                                                    {event.start_time ? new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBA'}
                                                    {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                                                </span>
                                            </div>
                                        )}
                                        {event.location && event.is_visible !== false && (
                                            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground px-4 py-2 bg-secondary/50 rounded-xl border border-border/50">
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
                                        <Link href="/gallery" className="btn-outline w-full py-4 !border-border hover:!border-foreground/30 flex items-center justify-center">
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
                            className="absolute inset-0 bg-background/95 backdrop-blur-xl"
                            onClick={() => setSelectedEvent(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="card-professional w-full max-w-lg p-12 relative z-10 border-border shadow-3xl"
                        >
                            {regSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="w-20 h-20 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                        <Check size={40} strokeWidth={3} />
                                    </div>
                                    <h2 className="text-3xl font-display font-bold text-foreground mb-3">Seat Reserved!</h2>
                                    <p className="text-muted-foreground">Confirmation has been sent to your email.</p>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-display font-bold text-foreground mb-3">Join <span className="text-brand-aws">Event</span></h2>
                                        <p className="text-muted-foreground text-sm leading-relaxed">Register for <span className="text-foreground font-semibold uppercase">{selectedEvent.title}</span>. We&apos;ll send you all the event details via email.</p>
                                    </div>

                                    <form onSubmit={handleRegister} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                            <input
                                                required type="text"
                                                value={regFormData.full_name}
                                                onChange={e => setRegFormData({ ...regFormData, full_name: e.target.value })}
                                                className="w-full bg-secondary"
                                                placeholder="Enter your legal name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Academic Email</label>
                                            <input
                                                required type="email"
                                                value={regFormData.email}
                                                onChange={e => setRegFormData({ ...regFormData, email: e.target.value })}
                                                className="w-full bg-secondary"
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
