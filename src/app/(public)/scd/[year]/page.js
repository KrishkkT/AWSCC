"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Calendar,
    MapPin,
    ExternalLink,
    Clock,
    Check,
    ArrowRight,
    Cloud,
    Zap,
    Users,
    Award,
    Cpu,
    Rocket,
    Info,
    ChevronDown
} from "lucide-react";
import CloudBackground from "@/components/CloudBackground";

export default function SCDYearPage({ params }) {
    const { year } = use(params);
    const supabase = createClient();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeBlockIdx, setActiveBlockIdx] = useState(0);
    const [activeFaqIdx, setActiveFaqIdx] = useState(null);

    useEffect(() => {
        async function fetchEventDetails() {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("community_events")
                    .select("*")
                    .eq("year", parseInt(year))
                    .maybeSingle();

                if (!error && data) {
                    setEvent(data);
                }
            } catch (err) {
                console.error("Error fetching community day event details:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchEventDetails();
    }, [year, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
                <CloudBackground />
                <div className="relative z-10 flex flex-col items-center space-y-4">
                    <div className="w-14 h-14 border-4 border-muted border-t-brand-cyan rounded-full animate-spin"></div>
                    <p className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-[0.3em] text-xs animate-pulse">Syncing Event Details...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
                <CloudBackground />
                <div className="relative z-10 max-w-md bg-card/90 dark:bg-card/40 backdrop-blur-md border border-border rounded-3xl p-10 flex flex-col items-center shadow-xl">
                    <Award size={64} className="text-brand-cyan/60 mb-6 animate-float" />
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 font-display">Event Not Found</h2>
                    <p className="text-slate-600 dark:text-slate-350 mb-8 text-sm leading-relaxed font-sans">
                        We couldn&apos;t find the AWS Students Community Day details for the year {year}. It might still be in draft mode or being set up.
                    </p>
                    <Link href="/" className="btn-aws shadow-lg shadow-brand-aws/20 w-full py-3.5">
                        Back to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    // Helper functions for safe database arrays and objects
    const safeArray = (data) => Array.isArray(data) ? data : [];
    const safeObject = (data) => (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};

    const heroImage = event.hero_data?.popup_image || event.hero_data?.image || null;

    // Normalize agenda data for parallel blocks to support the new structure with backward compatibility
    const rawAgendaBlocks = safeArray(event.agenda_data);
    const agendaBlocks = rawAgendaBlocks.map(block => {
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

    const speakers = safeArray(event.speakers_data);
    const sponsors = safeArray(event.sponsors_data);
    const team = safeArray(event.team_data);
    const tickets = safeArray(safeObject(event.ticket_data).tickets);
    const registrationUrl = safeObject(event.ticket_data).konfhub_url || "";

    const faqs = [
        {
            q: `What is AWS Students Community Day ${event?.year || year}?`,
            a: `AWS Students Community Day is a flagship annual event organized by the AWS Student Builder Group at Dharmsinh Desai University. It is a peer-to-peer learning environment designed by students, for students, to explore cloud computing, GenAI, serverless technology, DevOps, and more.`
        },
        {
            q: "Who can attend this event?",
            a: "Students, fresh graduates, developers, academicians, and anyone interested in learning about cloud technology are welcome to register and attend. No prior knowledge of AWS is required!"
        },
        {
            q: "Is there any registration fee for the event?",
            a: "No, registrations are completely free. However, seats are limited, and entry is based on registration approval. Please register early to secure your spot."
        },
        {
            q: "Will I receive a certificate of participation?",
            a: "Yes, all approved attendees who participate in the event sessions will receive an official digital participation certificate from the AWS Student Builder Group."
        },
        {
            q: "What should I bring to the event?",
            a: "Please bring a laptop if you plan to participate in hands-on workshops, along with a charger and your college ID card. Ensure you have an active AWS account (the free tier is perfect) set up beforehand."
        }
    ];

    return (
        <div className="min-h-screen bg-background text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-500">
            {/* Cinematic Floating Cloud Background */}
            <CloudBackground />

            {/* Glowing Accent Orbs - low opacity to prevent overlaying white screen */}
            <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-aws/5 dark:bg-brand-aws/10 blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-cyan/5 dark:bg-brand-cyan/10 blur-[150px] pointer-events-none" />

            <div className="relative z-10">
                {/* Hero Section */}
                <section className="relative min-h-[80vh] flex flex-col justify-center items-center pt-20 pb-16">
                    <div className="container mx-w-full px-6 flex flex-col items-center max-w-5xl text-center space-y-10 relative z-10">
                        {/* Poster Image Container */}
                        <div className="relative w-full max-w-5xl -mt-4 h-[500px] md:h-[500px] lg:h-[550px] rounded-[2rem] overflow-hidden border border-border bg-card shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(0,194,255,0.15)]">
                            {heroImage ? (
                                <img src={heroImage} alt="Event Poster" className="w-full h-full object-fill" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-brand-aws/20 to-brand-blue/20 backdrop-blur-md flex flex-col items-center justify-center p-8">
                                    <Cloud className="w-24 h-24 text-brand-cyan/20 mb-4 animate-float" />
                                    <span className="text-3xl font-black text-slate-900 dark:text-white mb-2 font-display text-center">AWS STUDENTS COMMUNITY DAY</span>
                                    <span className="text-7xl font-black text-brand-cyan/25">{event.year}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
                        </div>

                        {/* Centered Buttons Directly Under the Image */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                            {registrationUrl ? (
                                <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="btn-aws !px-12 !py-4.5 text-base shadow-[0_0_20px_rgba(0,194,255,0.2)] flex items-center justify-center gap-2 group">
                                    Register Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </a>
                            ) : (
                                <button disabled className="btn-outline !px-12 !py-4.5 text-base opacity-50 cursor-not-allowed">
                                    Registrations Closed
                                </button>
                            )}
                            <a href="#agenda" className="btn-outline !px-12 !py-4.5 text-base">
                                View Schedule
                            </a>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section className="py-24 border-t border-border bg-card/10">
                    <div className="container mx-auto px-6 max-w-5xl">
                        {/* About Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
                            <div className="md:col-span-4 space-y-4">
                                <h3 className="text-2xl md:text-3xl font-black tracking-tight font-display text-slate-900 dark:text-white">About The <span className="text-brand-cyan">Event</span></h3>
                                <div className="w-12 h-1.5 bg-brand-cyan rounded-full" />
                            </div>
                            <div className="md:col-span-8 space-y-6">
                                <p className="text-slate-600 dark:text-slate-350 text-lg leading-relaxed font-sans font-medium">
                                    {event.about_data?.text || "AWS Students Community Day is a flagship annual event conceptualized and hosted by the AWS Student Builder Group at Dharmsinh Desai University. Crafted exclusively by students, for students, it gathers industry leaders, technology evangelists, developers, and aspiring cloud builders to discuss advancements in modern architecture, containerization, serverless compute, DevOps, and Artificial Intelligence."}
                                </p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
                                    {[
                                        { count: "10+", label: "Expert Sessions", icon: <Cpu size={18} className="text-brand-cyan" /> },
                                        { count: "3+", label: "Tracks", icon: <Rocket size={18} className="text-brand-aws" /> },
                                        { count: "12+", label: "Industry Speakers", icon: <Users size={18} className="text-brand-cyan" /> },
                                        { count: "500+", label: "Builders Expected", icon: <Award size={18} className="text-brand-aws" /> }
                                    ].map((stat, idx) => (
                                        <div key={idx} className="bg-card border border-border rounded-2xl p-4 text-center hover:border-border/80 transition-colors shadow-sm">
                                            <div className="flex justify-center mb-2">{stat.icon}</div>
                                            <div className="text-2xl font-black text-slate-900 dark:text-white font-display">{stat.count}</div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Agenda Section */}
                {agendaBlocks.length > 0 && (
                    <section id="agenda" className="py-24 border-t border-border">
                        <div className="container mx-auto px-6 max-w-5xl">
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Event <span className="text-brand-cyan">Schedule</span></h2>
                                <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm font-sans">
                                    Curate your learning journey. Swap between sessions, workshops, and multi-track panels.
                                </p>
                            </div>

                            {/* Block Tabs Selector */}
                            {agendaBlocks.length > 1 && (
                                <div className="flex justify-center gap-2 mb-12 overflow-x-auto no-scrollbar pb-2">
                                    {agendaBlocks.map((block, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveBlockIdx(idx)}
                                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeBlockIdx === idx ? 'bg-brand-cyan text-white shadow-[0_0_15px_rgba(0,194,255,0.2)]' : 'bg-card border border-border text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-secondary/40'}`}
                                        >
                                            {block.title || `Block ${idx + 1}`}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Display current block sessions (Table for parallel tracks, Timeline for single track) */}
                            {agendaBlocks[activeBlockIdx]?.type === 'parallel' ? (
                                <div
                                    className="grid grid-cols-1 gap-8 w-full"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '100%'
                                    }}
                                    ref={el => {
                                        if (el) {
                                            const tracksCount = safeArray(agendaBlocks[activeBlockIdx]?.tracks).length;
                                            if (window.innerWidth >= 1024) {
                                                el.style.gridTemplateColumns = `repeat(${tracksCount}, minmax(0, 1fr))`;
                                            } else if (window.innerWidth >= 768) {
                                                el.style.gridTemplateColumns = `repeat(${Math.min(2, tracksCount)}, minmax(0, 1fr))`;
                                            } else {
                                                el.style.gridTemplateColumns = '100%';
                                            }
                                        }
                                    }}
                                >
                                    {safeArray(agendaBlocks[activeBlockIdx]?.tracks).map((track, tIdx) => (
                                        <div key={tIdx} className="space-y-6 flex flex-col">
                                            {/* Track Header Card */}
                                            <div className="bg-gradient-to-r from-brand-cyan/20 to-brand-blue/20 backdrop-blur-md border border-brand-cyan/30 rounded-2xl p-4 text-center shadow-lg">
                                                <h3 className="text-lg font-black uppercase tracking-wider text-brand-cyan font-sans">{track.name || `Track ${tIdx + 1}`}</h3>
                                            </div>

                                            {/* Track Sessions List */}
                                            <div className="space-y-4 flex-1">
                                                {safeArray(track.sessions).length > 0 ? (
                                                    safeArray(track.sessions).map((session, sIdx) => (
                                                        <div key={sIdx} className="glass-card p-6 hover:border-brand-cyan/30 transition-all flex flex-col space-y-3">
                                                            <div className="text-brand-cyan text-xs font-black flex items-center gap-1.5 font-sans">
                                                                <Clock size={12} /> {session.time}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug font-display">
                                                                    {session.title}
                                                                </h4>
                                                                {session.speaker && (
                                                                    <div className="text-xs font-black uppercase tracking-wider text-brand-aws flex items-center gap-1.5 font-sans">
                                                                        <Users size={12} className="shrink-0" /> {session.speaker}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {session.description && (
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans pt-1">
                                                                    {session.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="glass-card p-8 text-center text-slate-450 dark:text-slate-500 italic font-sans flex items-center justify-center h-24">
                                                        No Sessions Scheduled
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Timeline display for single track */
                                <div className="relative border-l border-border ml-4 md:ml-32 space-y-8 pl-8 py-2">
                                    {safeArray(agendaBlocks[activeBlockIdx]?.sessions).map((session, sIdx) => (
                                        <div key={sIdx} className="relative group">
                                            {/* Left timeline dot */}
                                            <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-background border-2 border-brand-cyan flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span className="w-2 h-2 rounded-full bg-brand-cyan"></span>
                                            </div>

                                            {/* Time label on the left (Desktop) */}
                                            <div className="hidden md:block absolute -left-40 top-1.5 text-right w-28 text-brand-cyan text-sm font-black tracking-tight">
                                                {session.time}
                                            </div>

                                            <div className="glass-card p-6 md:p-8 hover:border-brand-cyan/30 transition-all flex flex-col space-y-4">
                                                {/* Time label for mobile */}
                                                <div className="md:hidden text-brand-cyan text-xs font-black flex items-center gap-1.5">
                                                    <Clock size={12} /> {session.time}
                                                </div>

                                                <div className="space-y-2">
                                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-snug group-hover:text-brand-cyan transition-colors font-display">
                                                        {session.title}
                                                    </h4>
                                                    {session.speaker && (
                                                        <div className="text-xs font-black uppercase tracking-wider text-brand-aws flex items-center gap-1.5 font-sans">
                                                            <Users size={12} className="shrink-0" /> {session.speaker}
                                                        </div>
                                                    )}
                                                    {session.description && (
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans max-w-3xl">
                                                            {session.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Speakers Section */}
                {speakers.length > 0 && (
                    <section className="py-24 border-t border-border bg-card/10">
                        <div className="container mx-auto px-6 max-w-6xl">
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Distinguished <span className="text-brand-cyan">Speakers</span></h2>
                                <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm font-sans">
                                    Learn from engineers, community leaders, and advocates representing global technology organizations.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                {speakers.map((speaker, idx) => (
                                    <div key={idx} className="card-professional p-0 group flex flex-col overflow-hidden border border-border shadow-md">
                                        <div className="aspect-square bg-secondary relative overflow-hidden">
                                            {speaker.image ? (
                                                <img src={speaker.image} alt={speaker.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-card">
                                                    <Users className="w-16 h-16 text-slate-400/30 dark:text-slate-600/30" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 space-y-2 flex-grow flex flex-col justify-end">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight font-display">{speaker.name}</h3>
                                            <p className="text-xs text-brand-cyan font-bold leading-tight font-sans">{speaker.role}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-45500 font-bold uppercase tracking-wider font-sans">{speaker.company}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Tickets Section */}
                {tickets.length > 0 && (
                    <section className="py-24 border-t border-border">
                        <div className="container mx-auto px-6 max-w-5xl">
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Secure Your <span className="text-brand-cyan">Seat</span></h2>
                                <p className="text-slate-600 dark:text-slate-40500 max-w-xl mx-auto text-sm font-sans">
                                    Tickets are highly limited to verify credentials. Choose your tier and register early.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                                {tickets.map((ticket, idx) => {
                                    const perks = ticket.points ? ticket.points.split(',').map(p => p.trim()) : [];
                                    return (
                                        <div key={idx} className="glass-card p-8 md:p-10 flex flex-col justify-between border-border relative hover:border-brand-cyan/40 transition-colors shadow-lg">
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">{ticket.name}</h3>
                                                    <div className="text-3xl font-black text-brand-cyan font-display">{ticket.price}</div>
                                                </div>

                                                {perks.length > 0 && (
                                                    <ul className="space-y-3">
                                                        {perks.map((perk, pIdx) => (
                                                            <li key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed font-sans">
                                                                <Check size={14} className="text-brand-cyan shrink-0 mt-0.5" />
                                                                <span>{perk}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            <div className="mt-8 pt-4">
                                                {registrationUrl ? (
                                                    <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="btn-aws w-full text-center py-3 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,194,255,0.1)]">
                                                        Get Ticket <ExternalLink size={14} />
                                                    </a>
                                                ) : (
                                                    <button disabled className="btn-outline w-full py-3 opacity-50 cursor-not-allowed text-xs uppercase font-bold">
                                                        Unavailable
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* Sponsors Section */}
                {sponsors.length > 0 && (
                    <section className="py-24 border-t border-border bg-card/10">
                        <div className="container mx-auto px-6 max-w-5xl">
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 font-display">Supported By</h2>
                                <div className="w-12 h-1 bg-border mx-auto rounded-full" />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 items-center justify-center">
                                {sponsors.map((sponsor, idx) => (
                                    <div key={idx} className="bg-card border border-border hover:border-border/80 transition-all p-6 rounded-2xl flex items-center justify-center aspect-[2/1] group shadow-sm">
                                        {sponsor.logo ? (
                                            <img src={sponsor.logo} alt={sponsor.name} className="max-h-12 max-w-full object-contain filter dark:brightness-90 dark:group-hover:brightness-100 group-hover:scale-105 transition-all duration-300" />
                                        ) : (
                                            <span className="font-bold text-sm text-slate-500 dark:text-slate-400">{sponsor.name}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Team Section */}
                {team.length > 0 && (
                    <section className="py-24 border-t border-border">
                        <div className="container mx-auto px-6 max-w-5xl">
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Organizing <span className="text-brand-cyan">Team</span></h2>
                                <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm font-sans">
                                    The students behind the design, architecture, logistics, and planning of AWS SCD {event.year}.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {team.map((member, idx) => (
                                    <div key={idx} className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center space-y-4 hover:border-border/85 transition-all shadow-sm">
                                        <div className="w-20 h-20 rounded-full border border-border bg-secondary overflow-hidden relative shadow-inner">
                                            {member.image ? (
                                                <img src={member.image} alt={member.name} className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-card">
                                                    <Users className="w-8 h-8 text-slate-500/30 dark:text-slate-700/30" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm font-sans">{member.name}</h4>
                                            <p className="text-[10px] text-brand-cyan font-bold uppercase tracking-wider font-sans">{member.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* FAQ Section */}
                <section className="py-24 border-t border-border bg-card/10">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Frequently Asked <span className="text-brand-cyan">Questions</span></h2>
                            <p className="text-slate-600 dark:text-slate-450 max-w-xl mx-auto text-sm font-sans">
                                Find answers to common questions about AWS Students Community Day.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {faqs.map((faq, idx) => {
                                const isOpen = activeFaqIdx === idx;
                                return (
                                    <div
                                        key={idx}
                                        className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setActiveFaqIdx(isOpen ? null : idx)}
                                            className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-slate-900 dark:text-white font-sans text-base md:text-lg hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all"
                                        >
                                            <span>{faq.q}</span>
                                            <ChevronDown
                                                size={18}
                                                className={`text-brand-cyan shrink-0 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
                                            />
                                        </button>

                                        <div
                                            className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100 border-t border-border/50' : 'max-h-0 opacity-0'
                                                }`}
                                        >
                                            <p className="px-6 py-5 text-sm md:text-base text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-medium bg-slate-50/50 dark:bg-white/[0.005]">
                                                {faq.a}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
