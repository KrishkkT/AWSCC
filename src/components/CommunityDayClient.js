"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, Clock, Users, Target, Zap, ChevronDown, CheckCircle2, Ticket } from "lucide-react";

const FadeUp = ({ children, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
        {children}
    </motion.div>
);

const ExtraordinaryBackground = () => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    
    if (!mounted) return <div className="fixed inset-0 bg-background z-0 pointer-events-none" />;
    
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-background">
            {/* Very dense static starfield */}
            <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjMwIiByPSIxIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iOTAiIHI9IjAuNSIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjUwIiByPSIxIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzUwIiBjeT0iMTIwIiByPSIwLjUiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjIyMCIgcj0iMSIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjI4MCIgcj0iMSIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjMzMCIgcj0iMC41IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzIwIiBjeT0iMzIwIiByPSIxIiBmaWxsPSIjZmZmIi8+PC9zdmc+')] bg-repeat" />

            {/* Glowing Deep Space nebulas */}
            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-cyan/10 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow"></div>
            <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-brand-aws/10 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

            {/* Twinkling prominent stars */}
            {[...Array(50)].map((_, i) => (
                <motion.div
                    key={`star-${i}`}
                    className="absolute bg-foreground rounded-full drop-shadow-[0_0_8px_var(--foreground)]"
                    style={{
                        width: Math.random() * 2 + 1 + 'px',
                        height: Math.random() * 2 + 1 + 'px',
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 5 }}
                />
            ))}


            {/* Gentle upward floating particles (Space Dust) */}
            {[...Array(40)].map((_, i) => (
                <motion.div
                    key={`dust-${i}`}
                    className={`absolute rounded-full ${i % 2 === 0 ? 'bg-brand-cyan/40' : 'bg-brand-aws/40'}`}
                    style={{
                        width: Math.random() * 6 + 2 + 'px',
                        height: Math.random() * 6 + 2 + 'px',
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        filter: 'blur(1px)'
                    }}
                    animate={{ y: [0, -Math.random() * 300 - 100], x: [0, (Math.random() - 0.5) * 100], opacity: [0, 0.6, 0] }}
                    transition={{ duration: Math.random() * 15 + 10, repeat: Infinity, ease: "linear", delay: Math.random() * 5 }}
                />
            ))}
        </div>
    );
};

export default function CommunityDayClient({ event }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!event.date) return;
        const targetDate = new Date(event.date).getTime();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
            } else {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [event.date]);

    // Format helpers
    const eventDateStr = event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';

    return (
        <div className="min-h-screen bg-background overflow-hidden selection:bg-brand-cyan/30">
            {/* Spectacular Animated Background */}
            <ExtraordinaryBackground />

            {/* 1. Hero Section */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-20 px-6 z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
                    <div className="absolute top-0 right-[20%] w-px h-[300px] bg-gradient-to-b from-transparent via-brand-cyan to-transparent"></div>
                    <div className="absolute bottom-10 left-[20%] w-px h-[200px] bg-gradient-to-b from-transparent via-brand-aws to-transparent"></div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="max-w-5xl mx-auto text-center"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/60 text-xs font-black uppercase tracking-[0.2em] mb-8">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Official Flagship Event
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground leading-[1.1] mb-6 tracking-tight drop-shadow-2xl">
                        AWS Community Day
                        <br />{event.year} Nadiad
                    </h1>

                    <p className="text-lg md:text-xl text-foreground/50 max-w-2xl mx-auto mb-12 font-medium">
                        Join hundreds of developers, students, and cloud enthusiasts for the largest AWS community-led event at Dharmsinh Desai University.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 mb-20 text-foreground/60 font-bold text-sm">
                        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-foreground/5 border border-foreground/10">
                            <Calendar size={18} className="text-brand-cyan" /> {eventDateStr}
                        </div>
                        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-foreground/5 border border-foreground/10">
                            <MapPin size={18} className="text-brand-aws" /> {event.venue || 'TBD'}
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
                        {Object.entries(timeLeft).map(([unit, value]) => (
                            <div key={unit} className="glass-card p-6 !rounded-3xl border-foreground/5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="text-4xl md:text-6xl font-black text-foreground mb-2 font-display">{value.toString().padStart(2, '0')}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">{unit}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
                
                <motion.div 
                    animate={{ y: [0, 10, 0] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute bottom-10 text-foreground/20"
                >
                    <ChevronDown size={32} />
                </motion.div>
            </section>

            {/* 2. About & Why Join */}
            <section className="py-24 relative z-10 bg-background border-y border-foreground/5">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <FadeUp>
                            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-tight">
                                What is <span className="text-brand-cyan">Community Day?</span>
                            </h2>
                            <p className="text-foreground/60 mb-6 leading-relaxed text-lg">
                                AWS Community Days are community-led conferences where event logistics and content are planned, sourced, and delivered by community leaders. 
                            </p>
                            <p className="text-foreground/60 mb-8 leading-relaxed text-lg">
                                Expect a day full of deep-dive technical sessions, hands-on workshops, and immense networking opportunities with highly experienced industry professionals and AWS Heroes.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="text-3xl font-black text-foreground">10+</div>
                                    <div className="text-xs font-black uppercase tracking-widest text-brand-aws">Expert Speakers</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-3xl font-black text-foreground">400+</div>
                                    <div className="text-xs font-black uppercase tracking-widest text-brand-cyan">Attendees</div>
                                </div>
                            </div>
                        </FadeUp>
                        <FadeUp delay={0.2}>
                            <div className="glass-card p-8 md:p-12 !rounded-[2rem] border-foreground/5 space-y-8 relative overflow-hidden">
                                <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-aws/10 rounded-full blur-[80px]" />
                                <h3 className="text-2xl font-black text-foreground mb-8 relative z-10">Why You Should Join</h3>
                                
                                <div className="space-y-6 relative z-10">
                                    {[
                                        { title: "Learn from Experts", desc: "Gain insights from AWS experts and community heroes who have been building scalable architectures for years.", icon: Zap },
                                        { title: "Hands-on Workshops", desc: "Participate in practical workshops to build your first AWS architecture directly.", icon: Target },
                                        { title: "Networking Focus", desc: "Connect with like-minded students, potential mentors, and tech recruiters looking for talent.", icon: Users },
                                    ].map((item, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="shrink-0 w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center">
                                                <item.icon className="text-brand-cyan" size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-foreground font-bold mb-1">{item.title}</h4>
                                                <p className="text-foreground/50 text-sm leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </FadeUp>
                    </div>
                </div>
            </section>

            {/* 3. Event Agenda (Dynamic Tables) */}
            {event.agenda_data && event.agenda_data.length > 0 && (
                <section className="py-32 relative z-10">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <FadeUp>
                            <div className="text-center mb-16">
                                <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">Event <span className="text-brand-aws">Agenda</span></h2>
                                <p className="text-foreground/40 text-lg">Plan your day across our multiple tracks.</p>
                            </div>
                        </FadeUp>

                        <div className="space-y-12">
                            {event.agenda_data.map((block, idx) => (
                                <FadeUp key={idx} delay={idx * 0.1}>
                                    <div className="glass-card !rounded-[2rem] border-foreground/5 overflow-hidden">
                                        <div className="bg-white/[0.02] border-b border-foreground/5 p-6 md:px-8">
                                            <h3 className="text-xl font-black text-foreground tracking-widest">{block.title}</h3>
                                        </div>
                                        
                                        <div className="p-0">
                                            {/* Column Headers for Parallel Tracks */}
                                            {block.type === 'parallel' && block.tracks && (
                                                <div className="hidden md:flex border-b border-foreground/5 bg-white/[0.01]">
                                                    <div className="w-48 shrink-0 border-r border-foreground/5"></div>
                                                    {block.tracks.map((trackName, i) => (
                                                        <div key={i} className={`flex-1 p-4 font-black uppercase text-xs tracking-widest text-center ${i === 0 ? 'text-brand-aws' : i === 1 ? 'text-brand-cyan' : 'text-purple-400'}`}>
                                                            {trackName}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Sessions */}
                                            <div className="divide-y divide-white/5">
                                                {block.sessions.map((session, sIdx) => (
                                                    <div key={sIdx} className="flex flex-col md:flex-row hover:bg-white/[0.02] transition-colors">
                                                        {/* Time Column */}
                                                        <div className="w-full md:w-48 shrink-0 p-6 md:p-8 md:border-r border-foreground/5 flex items-center md:justify-center border-b md:border-b-0">
                                                            <div className="flex items-center gap-2 text-foreground/60 font-mono text-sm font-bold">
                                                                <Clock size={14} className="text-brand-cyan" />
                                                                {session.time}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Single Session Column */}
                                                        {block.type === 'main' && (
                                                            <div className="flex-1 p-6 md:p-8 flex items-center">
                                                                <h4 className="text-lg font-bold text-foreground leading-tight">{session.title}</h4>
                                                            </div>
                                                        )}

                                                        {/* Parallel Session Columns */}
                                                        {block.type === 'parallel' && session.tracks && (
                                                            <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5">
                                                                {session.tracks.map((content, tIdx) => (
                                                                    <div key={tIdx} className="flex-1 p-6 flex flex-col justify-center text-center">
                                                                        {content ? (
                                                                            <h4 className="text-sm font-bold text-foreground leading-relaxed">{content}</h4>
                                                                        ) : (
                                                                            <span className="text-foreground/20 text-xs">—</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </FadeUp>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 4. Speakers */}
            {event.speakers_data && event.speakers_data.length > 0 && (
                <section className="py-24 relative z-10 bg-background border-y border-foreground/5">
                    <div className="container mx-auto px-6 max-w-6xl">
                        <FadeUp>
                            <div className="text-center mb-16">
                                <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">Awesome <span className="text-brand-cyan">Speakers</span></h2>
                                <p className="text-foreground/40 text-lg">Learn from the very best in the industry.</p>
                            </div>
                        </FadeUp>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {event.speakers_data.map((speaker, idx) => (
                                <FadeUp key={idx} delay={idx * 0.1}>
                                    <div className="glass-card p-6 !rounded-3xl border-foreground/5 group hover:border-brand-cyan/30 transition-all text-center">
                                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 border-2 border-foreground/10 group-hover:border-brand-cyan transition-colors">
                                            <img src={speaker.image || '/avatars/default.png'} alt={speaker.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                        </div>
                                        <h3 className="text-xl font-black text-foreground mb-1">{speaker.name}</h3>
                                        <p className="text-brand-cyan text-xs font-bold uppercase tracking-widest mb-3">{speaker.role}</p>
                                        <p className="text-foreground/40 text-sm">{speaker.company}</p>
                                    </div>
                                </FadeUp>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 5. Sponsors */}
            {event.sponsors_data && event.sponsors_data.length > 0 && (
                <section className="py-24 relative z-10">
                    <div className="container mx-auto px-6 max-w-5xl text-center">
                        <FadeUp>
                            <h2 className="text-4xl font-black text-foreground mb-16">Our <span className="text-brand-aws">Sponsors</span></h2>
                        </FadeUp>
                        
                        <div className="flex flex-wrap justify-center gap-12 items-center opacity-60 hover:opacity-100 transition-opacity duration-500">
                            {event.sponsors_data.map((sponsor, idx) => (
                                <FadeUp key={idx} delay={idx * 0.1}>
                                    <img src={sponsor.logo} alt={sponsor.name} className="h-12 md:h-16 object-contain filter grayscale hover:grayscale-0 transition-all" />
                                </FadeUp>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 6. Tickets & Konfhub Integration */}
            <section id="tickets" className="py-24 relative z-10 bg-brand-cyan/5 border-y border-brand-cyan/20">
                <div className="absolute inset-0 bg-slate-grid opacity-10 pointer-events-none"></div>
                <div className="container mx-auto px-6 max-w-6xl text-center relative z-10">
                    <FadeUp>
                        <Ticket size={48} className="text-brand-cyan mx-auto mb-6" />
                        <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6">Get Your Tickets</h2>
                        <p className="text-foreground/60 mb-10 max-w-2xl mx-auto text-lg leading-relaxed">
                            Registrations are handled securely via Konfhub. Choose the best ticket matching your requirements!
                        </p>
                        
                        {event.ticket_data?.tickets && event.ticket_data.tickets.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 text-left max-w-5xl mx-auto">
                                {event.ticket_data.tickets.map((ticket, idx) => (
                                    <div key={idx} className="glass-card p-10 !rounded-3xl border-brand-cyan/20 hover:border-brand-cyan transition-all group relative overflow-hidden flex flex-col shadow-xl">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full blur-3xl group-hover:bg-brand-cyan/20 transition-all pointer-events-none"></div>
                                        <h3 className="text-2xl font-black text-foreground mb-2">{ticket.name}</h3>
                                        <div className="text-4xl font-display text-brand-cyan mb-6">{ticket.price}</div>
                                        <ul className="space-y-3 mb-8 flex-1">
                                            {ticket.points?.split(',').map((point, i) => point.trim() ? (
                                                <li key={i} className="flex items-start gap-3 text-sm text-foreground/70">
                                                    <CheckCircle2 size={16} className="text-brand-cyan shrink-0 mt-0.5" />
                                                    {point.trim()}
                                                </li>
                                            ) : null)}
                                        </ul>
                                        {event.ticket_data?.konfhub_url && (
                                            <a href={event.ticket_data.konfhub_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                                                <button className="w-full py-3 rounded-xl border border-brand-cyan/40 text-brand-cyan font-bold hover:bg-brand-cyan hover:text-background transition-all">Select Ticket</button>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {event.ticket_data?.konfhub_url ? (
                            <a href={event.ticket_data.konfhub_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                                <button className="btn-primary py-4 px-12 text-lg flex items-center gap-3 shadow-[0_0_40px_rgba(0,194,255,0.4)] hover:shadow-[0_0_60px_rgba(0,194,255,0.6)]">
                                    Register on Konfhub <ArrowRight size={20} />
                                </button>
                            </a>
                        ) : (
                            <div className="inline-block bg-foreground/5 border border-foreground/10 rounded-2xl px-12 py-6">
                                <span className="text-foreground/40 font-black uppercase tracking-[0.2em]">Registrations Opening Soon</span>
                            </div>
                        )}
                        
                        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-foreground/40 font-medium">
                            <CheckCircle2 size={14} className="text-green-500" /> Secure Payments Powered by Konfhub
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* 7. Location & Map */}
            <section className="py-24 relative z-10">
                <div className="container mx-auto px-6 max-w-6xl">
                    <FadeUp>
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-black text-foreground mb-4">The <span className="text-brand-aws">Venue</span></h2>
                            <p className="text-foreground/40 text-lg">{event.venue || 'Dharmsinh Desai University'}</p>
                        </div>
                        
                        <div className="glass-card p-2 !rounded-[2rem] border-foreground/10 overflow-hidden shadow-2xl h-[400px] relative">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3683.00332306786!2d72.86827037583689!3d22.684126328325983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e5b4ee68b6555%3A0xe5452f0d9bbba5ab!2sDharmsinh%20Desai%20University!5e0!3m2!1sen!2sin!4v1710924976456!5m2!1sen!2sin" 
                                className="w-full h-full rounded-[1.8rem] filter invert-[90%] hue-rotate-180 contrast-125 hover:filter-none transition-all duration-700" 
                                style={{ border: 0 }} 
                                allowFullScreen="" 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </FadeUp>
                </div>
            </section>
        </div>
    );
}
