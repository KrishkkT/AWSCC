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
    ChevronDown,
    Globe,
    Laptop,
    Github,
    Linkedin,
    Instagram,
    Coffee,
    Camera
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
                    <p className="text-slate-600 dark:text-slate-300 mb-8 text-sm leading-relaxed font-sans">
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

    const desktopImage = event.hero_data?.popup_image || event.hero_data?.image || null;
    const mobileImage = event.hero_data?.mobile_image || desktopImage;

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
    const workshops = safeArray(event.workshops_data);
    const tickets = safeArray(safeObject(event.ticket_data).tickets);
    const registrationUrl = safeObject(event.ticket_data).konfhub_url || "";

    const totalTracks = Math.max(...agendaBlocks.filter(b => b.type === 'parallel').map(b => safeArray(b.tracks).length), 0);
    const totalSessions = agendaBlocks.reduce((acc, block) => acc + (block.type === 'parallel' ? safeArray(block.tracks).reduce((tAcc, t) => tAcc + safeArray(t.sessions).length, 0) : safeArray(block.sessions).length), 0);

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

    const hasMobileImage = !!event.hero_data?.mobile_image;

    return (
        <div className="min-h-screen bg-background text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-500">
            {/* Cinematic Floating Cloud Background */}
            <CloudBackground />

            {/* Glowing Accent Orbs - low opacity to prevent overlaying white screen */}
            <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-aws/5 dark:bg-brand-aws/10 blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-cyan/5 dark:bg-brand-cyan/10 blur-[150px] pointer-events-none" />

            <div className="relative z-10">
                {/* Hero Section */}
                <section className="relative min-h-[80vh] flex flex-col justify-center items-center pt-20 pb-16 px-6 lg:px-8 overflow-hidden">
                    {/* Unique Background Setup */}
                    {desktopImage && (
                        <div className="absolute inset-0 z-0">
                            {/* The actual image with low opacity and blend mode for a dark, immersive look */}
                            <img src={desktopImage} className="w-full h-full object-cover opacity-20 dark:opacity-20 mix-blend-luminosity object-center scale-105" alt="Background" />
                            {/* Gradients to fade out the edges into the background color */}
                            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/30" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-transparent opacity-80" />
                        </div>
                    )}

                    <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-7xl relative z-10">
                        {/* Left Column: Text & Buttons */}
                        <div className="flex flex-col space-y-8 text-left">
                            <div className="inline-flex items-center gap-2">
                                <span className="font-display font-black text-xl tracking-tight text-brand-aws">
                                    #SCD{event.year?.toString().substring(2)}
                                </span>
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2 border-l border-border">
                                    AWS Students Community Day
                                </span>
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] font-display tracking-tight drop-shadow-sm">
                                A full day of AWS, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-aws to-brand-cyan">built by students</span>
                            </h1>

                            <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 font-medium max-w-xl leading-relaxed">
                                Deep-dives, real-world stories, and the hallway-track conversations you&apos;ll remember for years. The AWS Student Builder Group is back for the most awaited edition yet.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                {registrationUrl ? (
                                    <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="btn-aws !px-10 !py-4 text-base shadow-[0_0_20px_rgba(0,194,255,0.2)] flex items-center justify-center gap-2 group w-fit hover:shadow-[0_0_30px_rgba(0,194,255,0.4)] transition-all">
                                        Register Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </a>
                                ) : (
                                    <button disabled className="btn-outline !px-10 !py-4 text-base opacity-50 cursor-not-allowed w-fit">
                                        Registrations Closed
                                    </button>
                                )}
                                <a href="#agenda" className="btn-outline !px-10 !py-4 text-base w-fit hover:bg-white/5 transition-colors">
                                    View Schedule
                                </a>
                            </div>
                        </div>

                        {/* Right Column: Stacked Cards */}
                        <div className="flex flex-col space-y-4 relative">
                            {/* Unique glowing backplate for cards */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-cyan/5 blur-[100px] rounded-full pointer-events-none" />

                            {/* Date Card */}
                            <div className="glass-card relative z-10 p-6 flex justify-between items-center bg-card/60 backdrop-blur-xl border-border/50 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-brand-aws w-5 h-5" />
                                    <span className="font-bold text-sm tracking-wider uppercase text-slate-900 dark:text-white drop-shadow-sm">
                                        {event.date ? new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'COMING SOON'}
                                    </span>
                                </div>
                                <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                                    {event.venue?.split(',')[0] || "Dharmsinh Desai University"}
                                </div>
                            </div>

                            {/* Workshops Card */}
                            <a href="#workshops" className="glass-card relative z-10 p-6 group hover:border-brand-cyan/50 hover:bg-card/80 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,194,255,0.15)] hover:-translate-y-1 cursor-pointer flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="text-5xl font-black text-slate-900 dark:text-white font-display group-hover:text-brand-cyan transition-colors drop-shadow-sm">
                                        {workshops.length}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-brand-aws uppercase tracking-widest flex items-center gap-1.5">
                                            <Zap size={12} /> LEARN & BUILD
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white drop-shadow-sm">Interactive Workshops</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hands-on sessions to level up your cloud skills.</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-slate-400 group-hover:text-brand-cyan group-hover:translate-x-1 transition-all" size={20} />
                            </a>

                            {/* Talks Card */}
                            <a href="#agenda" className="glass-card relative z-10 p-6 group hover:border-brand-cyan/50 hover:bg-card/80 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,194,255,0.15)] hover:-translate-y-1 cursor-pointer flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="text-5xl font-black text-slate-900 dark:text-white font-display group-hover:text-brand-cyan transition-colors drop-shadow-sm">
                                        {totalSessions}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-brand-aws uppercase tracking-widest flex items-center gap-1.5">
                                            <Globe size={12} /> EXPERT SESSIONS
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white drop-shadow-sm">{totalTracks > 0 ? `${totalTracks} parallel tracks` : 'Insightful Talks'}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Deep-dives into architecture, GenAI, and more.</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-slate-400 group-hover:text-brand-cyan group-hover:translate-x-1 transition-all" size={20} />
                            </a>

                            {/* Speakers Card */}
                            <a href="#speakers" className="glass-card relative z-10 p-6 group hover:border-brand-cyan/50 hover:bg-card/80 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,194,255,0.15)] hover:-translate-y-1 cursor-pointer flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="text-5xl font-black text-slate-900 dark:text-white font-display group-hover:text-brand-cyan transition-colors drop-shadow-sm">
                                        {speakers.length}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-brand-aws uppercase tracking-widest flex items-center gap-1.5">
                                            <Users size={12} /> INDUSTRY LEADERS
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white drop-shadow-sm">Expert Speakers</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Learn from AWS heroes and community pros.</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-slate-400 group-hover:text-brand-cyan group-hover:translate-x-1 transition-all" size={20} />
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
                                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-sans font-medium">
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

                {/* Benefits Section */}
                <section className="py-24 border-t border-border bg-card/10">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Event <span className="text-brand-cyan">Benefits</span></h2>
                            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm font-sans font-medium leading-relaxed">
                                Join the event and unlock opportunities to learn, connect, and grow. From gaining new insights to meeting like-minded people, this experience is designed to support your journey in tech.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                {
                                    title: "E-Certificate",
                                    desc: "Receive an official digital participation certificate to recognize your attendance and learning.",
                                    icon: <Award className="w-8 h-8 text-brand-cyan" />,
                                    color: "from-brand-cyan/20 to-brand-blue/5"
                                },
                                {
                                    title: "Networking",
                                    desc: "Connect with industry leaders, expert speakers, and like-minded peers to expand your professional network.",
                                    icon: <Users className="w-8 h-8 text-brand-aws" />,
                                    color: "from-brand-aws/20 to-brand-blue/5"
                                },
                                {
                                    title: "Prizes & Swag",
                                    desc: "Participate in quizzes, hands-on labs, and activities to win exclusive AWS goodies, swags, and prizes.",
                                    icon: <Zap className="w-8 h-8 text-yellow-500" />,
                                    color: "from-yellow-500/20 to-amber-500/5"
                                },
                                {
                                    title: "Complimentary Catering",
                                    desc: "Enjoy delicious complimentary lunch, refreshments, and snacks provided during the event.",
                                    icon: <Coffee className="w-8 h-8 text-emerald-500" />,
                                    color: "from-emerald-500/20 to-teal-500/5"
                                },
                                {
                                    title: "Photo Booth",
                                    desc: "Capture memorable moments at the event with our custom-themed photo experiences and backdrops.",
                                    icon: <Camera className="w-8 h-8 text-pink-500" />,
                                    color: "from-pink-500/20 to-rose-500/5"
                                },
                                {
                                    title: "Hands-on Labs",
                                    desc: "Gain practical cloud experience with guided workshops and labs led by AWS experts.",
                                    icon: <Laptop className="w-8 h-8 text-purple-500" />,
                                    color: "from-purple-500/20 to-indigo-500/5"
                                }
                            ].map((benefit, idx) => (
                                <div
                                    key={idx}
                                    className="glass-card p-8 flex flex-col justify-between border-border hover:border-brand-cyan/30 hover:shadow-[0_0_30px_rgba(0,194,255,0.1)] transition-all duration-300 relative group bg-card/40 backdrop-blur-md"
                                >
                                    <div className="space-y-6">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.color} border border-white/5 dark:border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                            {benefit.icon}
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                                                {benefit.title}
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium">
                                                {benefit.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Workshops Section */}
                {workshops.length > 0 && (
                    <section id="workshops" className="py-24 border-t border-border">
                        <div className="container mx-auto px-6 max-w-5xl">
                            <div className="text-center space-y-6 mb-12">
                                <span className="px-4 py-1.5 rounded-full border border-border bg-card/50 text-[10px] font-black uppercase tracking-widest text-brand-aws shadow-sm inline-block">
                                    Workshops
                                </span>
                                <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                                    Roll up your sleeves the day before
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-base font-medium leading-relaxed font-sans">
                                    Hands-on, builder-led and held the day before the conference. Tap a card for the full details and prerequisites. More workshops land here as the lineup locks in.
                                </p>
                                <div className="pt-4 flex flex-col items-center gap-2">
                                    <span className="text-xs text-slate-500 font-medium">Get your workshop tickets</span>
                                    <a href={registrationUrl || "#"} target="_blank" rel="noopener noreferrer" className="btn-aws !px-6 !py-3 flex items-center gap-2 shadow-[0_0_20px_rgba(255,153,0,0.2)]">
                                        <ChevronDown className="rotate-90" size={18} /> Workshop Ticket
                                    </a>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {workshops.map((ws, wsIdx) => (
                                    <div key={wsIdx} className="bg-card/40 backdrop-blur-md border border-border hover:border-brand-cyan/30 transition-all rounded-2xl overflow-hidden flex flex-col group shadow-md hover:shadow-lg">
                                        {ws.image && (
                                            <div className="w-full h-56 md:h-64 relative overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-border">
                                                <img src={ws.image} alt={ws.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            </div>
                                        )}
                                        <div className="p-6 md:p-8 space-y-4 flex flex-col justify-between flex-grow">
                                            <div>
                                                {!ws.image && (
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-brand-cyan text-xs font-black flex items-center gap-1.5 font-sans bg-brand-cyan/10 px-3 py-1 rounded-full">
                                                            <Clock size={12} /> {ws.time}
                                                        </span>
                                                    </div>
                                                )}
                                                <h5 className="text-xl font-black text-slate-900 dark:text-white font-display mb-3">{ws.title}</h5>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium font-sans">{ws.description}</p>
                                            </div>
                                            
                                            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                                                {ws.speaker ? (
                                                    <div className="text-[11px] font-black uppercase tracking-wider text-brand-aws flex items-center gap-2 font-sans">
                                                        <Users size={14} /> {ws.speaker}
                                                    </div>
                                                ) : <div></div>}
                                                {ws.image && ws.time && (
                                                    <span className="text-brand-cyan text-xs font-black flex items-center gap-1.5 font-sans bg-brand-cyan/10 px-3 py-1 rounded-full border border-brand-cyan/20">
                                                        <Clock size={12} /> {ws.time}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

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
                                <>
                                    {(() => {
                                        const tracks = safeArray(agendaBlocks[activeBlockIdx]?.tracks);
                                        if (tracks.length === 0) return <div className="text-center text-slate-500 py-8">No tracks available</div>;

                                        const allTimeSlots = [];
                                        tracks.forEach(track => {
                                            safeArray(track.sessions).forEach(session => {
                                                if (!allTimeSlots.includes(session.time)) {
                                                    allTimeSlots.push(session.time);
                                                }
                                            });
                                        });
                                        allTimeSlots.sort();

                                        return (
                                            <div className="w-full overflow-x-auto no-scrollbar pb-6">
                                                <div className="min-w-[800px] border border-border/50 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md shadow-xl">
                                                    {/* Header Row */}
                                                    <div className="grid bg-slate-900 text-white divide-x divide-white/10 border-b border-white/10"
                                                        style={{ gridTemplateColumns: `150px repeat(${tracks.length}, minmax(0, 1fr))` }}
                                                    >
                                                        <div className="p-4 font-black uppercase tracking-wider text-brand-cyan text-sm flex items-center justify-center text-center">TIME</div>
                                                        {tracks.map((track, tIdx) => (
                                                            <div key={tIdx} className="p-4 font-black uppercase tracking-wider text-brand-aws text-sm flex items-center justify-center text-center">
                                                                {track.name || `Track ${tIdx + 1}`}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Data Rows */}
                                                    <div className="divide-y divide-border/50">
                                                        {allTimeSlots.map((time, rowIdx) => {
                                                            const trackSessions = tracks.map(track =>
                                                                safeArray(track.sessions).find(s => s.time === time)
                                                            );

                                                            const nonNullSessions = trackSessions.filter(s => s != null);
                                                            const uniqueTitles = new Set(nonNullSessions.map(s => s.title.trim()));
                                                            const isCommonSession = nonNullSessions.length > 0 && uniqueTitles.size === 1;

                                                            return (
                                                                <div
                                                                    key={rowIdx}
                                                                    className="grid divide-x divide-border/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                                                                    style={{ gridTemplateColumns: `150px repeat(${tracks.length}, minmax(0, 1fr))` }}
                                                                >
                                                                    {/* Time Column */}
                                                                    <div className="p-4 flex items-center justify-center border-r border-border/50 bg-slate-50/30 dark:bg-slate-900/20">
                                                                        <div className="text-brand-cyan text-xs font-black font-sans whitespace-nowrap text-center">
                                                                            {time}
                                                                        </div>
                                                                    </div>

                                                                    {/* Session Columns */}
                                                                    {isCommonSession ? (
                                                                        <div className="p-4 md:p-6 flex flex-col justify-center text-center items-center bg-brand-cyan/5 dark:bg-brand-cyan/10" style={{ gridColumn: `span ${tracks.length}` }}>
                                                                            <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug font-display">
                                                                                {nonNullSessions[0].title}
                                                                            </h4>
                                                                            {nonNullSessions[0].speaker && (
                                                                                <div className="mt-2 text-xs font-black uppercase tracking-wider text-brand-aws flex items-center justify-center gap-1.5 font-sans">
                                                                                    <Users size={12} className="shrink-0" /> {nonNullSessions[0].speaker}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        trackSessions.map((session, colIdx) => (
                                                                            <div key={colIdx} className="p-4 md:p-5 flex flex-col justify-start">
                                                                                {session ? (
                                                                                    <div className="space-y-2">
                                                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug font-display">
                                                                                            {session.title}
                                                                                        </h4>
                                                                                        {session.speaker && (
                                                                                            <div className="text-[10px] font-black uppercase tracking-wider text-brand-aws flex items-center gap-1.5 font-sans">
                                                                                                <Users size={12} className="shrink-0" /> {session.speaker}
                                                                                            </div>
                                                                                        )}
                                                                                        {session.description && (
                                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans pt-1">
                                                                                                {session.description}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs italic opacity-50">
                                                                                        No Session
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                </>
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
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-sans">{speaker.company}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Workshops Section */}
                {workshops.length > 0 && (
                    <section className="py-24 border-t border-border">
                        <div className="container mx-auto px-6 max-w-5xl">
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Hands-on <span className="text-brand-cyan">Workshops</span></h2>
                                <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm font-sans font-medium">
                                    Deep-dive technical sessions. Please check the prerequisites and prepare your environment before attending.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                                {workshops.map((ws, idx) => (
                                    <div key={idx} className="glass-card p-8 md:p-10 flex flex-col justify-between border-border hover:border-brand-cyan/40 transition-colors shadow-lg animate-float">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase tracking-wider text-brand-cyan flex items-center gap-1.5 font-sans">
                                                        <Clock size={12} /> {ws.time}
                                                    </span>
                                                    {ws.venue && (
                                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold font-sans">
                                                            {ws.venue}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">{ws.title}</h3>
                                                {ws.speaker && (
                                                    <p className="text-xs font-black uppercase tracking-wider text-brand-aws flex items-center gap-1.5 font-sans">
                                                        <Users size={12} /> {ws.speaker}
                                                    </p>
                                                )}
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium pt-2">
                                                    {ws.description}
                                                </p>
                                            </div>

                                            {/* Prerequisites / Notes */}
                                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-border/60 space-y-4">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 font-display">
                                                    Prerequisites & Prep
                                                </h4>
                                                <ul className="space-y-3">
                                                    <li className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed font-sans">
                                                        <Laptop size={14} className="text-brand-cyan shrink-0 mt-0.5" />
                                                        <span>Bring your own laptop & charger</span>
                                                    </li>
                                                    <li className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed font-sans">
                                                        <Check size={14} className="text-brand-cyan shrink-0 mt-0.5" />
                                                        <span>
                                                            Create an AWS account beforehand
                                                            {ws.guide_url && (
                                                                <>
                                                                    {" "}
                                                                    (<a href={ws.guide_url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline inline-flex items-center gap-0.5 font-bold">
                                                                        Setup Guide <ExternalLink size={10} />
                                                                    </a>)
                                                                </>
                                                            )}
                                                        </span>
                                                    </li>
                                                    {ws.requirements && ws.requirements.split(',').map((req, rIdx) => (
                                                        <li key={rIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed font-sans">
                                                            <Check size={14} className="text-brand-cyan shrink-0 mt-0.5" />
                                                            <span>{req.trim()}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
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
                                <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm font-sans">
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

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {team.map((member, idx) => (
                                    <div key={idx} className="flex flex-col group">
                                        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-sm mb-3">
                                            {member.image ? (
                                                <img src={member.image} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                                                    <Users className="w-12 h-12 text-slate-400/50" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                                            <div className="absolute bottom-0 left-0 p-4 w-full flex flex-col">
                                                <h4 className="font-display font-bold text-white text-sm md:text-base truncate w-full drop-shadow-md">
                                                    {member.name}
                                                </h4>
                                                <span className="text-[10px] md:text-xs text-slate-300 truncate w-full drop-shadow-md">
                                                    {member.role}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Social Links Row */}
                                        <div className="flex items-center justify-center gap-5 w-full text-slate-500 dark:text-slate-400 px-2 mt-1">
                                            {member.github_url && (
                                                <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors" title="GitHub">
                                                    <Github size={15} />
                                                </a>
                                            )}
                                            {member.linkedin_url && (
                                                <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue transition-colors" title="LinkedIn">
                                                    <Linkedin size={15} />
                                                </a>
                                            )}
                                            {member.instagram_url && (
                                                <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-aws transition-colors" title="Instagram">
                                                    <Instagram size={15} />
                                                </a>
                                            )}
                                            {member.portfolio_url && (
                                                <a href={member.portfolio_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-cyan transition-colors" title="Portfolio Website">
                                                    <Globe size={15} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Venue Section */}
                <section className="py-24 border-t border-border bg-card/10" id="venue">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">The <span className="text-brand-cyan">Venue</span></h2>
                            <p className="text-slate-600 dark:text-slate-500 max-w-xl mx-auto text-sm font-sans">
                                Join us at the campus of Dharmsinh Desai University.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col">
                            {/* Map Image/Iframe */}
                            <div className="h-64 md:h-80 w-full bg-slate-200 dark:bg-slate-800 relative">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3683.473550873177!2d72.85966371496013!3d22.684128585125345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e5b0005a764d1%3A0xc6eb1e34e56926ed!2sDharmsinh%20Desai%20University!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>

                            <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-card">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                            VENUE
                                        </span>
                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                            {event.date ? new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'COMING SOON'}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display mb-2">
                                            {event.venue || "Dharmsinh Desai University (DDU)"}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 text-lg">
                                            College Road, Nadiad, Gujarat
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 pt-2">
                                        Limited seats — exact check-in details emailed to registered attendees.
                                    </p>
                                </div>
                                <a
                                    href="https://maps.app.goo.gl/3Q8xXjJ6Y1q2hP4p8"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 border border-border rounded-full flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap shadow-sm"
                                >
                                    <MapPin size={18} />
                                    Get directions
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-24 border-t border-border bg-card/10">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-slate-900 dark:text-white">Frequently Asked <span className="text-brand-cyan">Questions</span></h2>
                            <p className="text-slate-600 dark:text-slate-500 max-w-xl mx-auto text-sm font-sans">
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
                                            <p className="px-6 py-5 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium bg-slate-50/50 dark:bg-white/[0.005]">
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
