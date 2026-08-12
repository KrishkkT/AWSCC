"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import {
    MapPin,
    Check,
    ArrowRight,
    Zap,
    Users,
    Award,
    ChevronDown,
    Laptop,
    Linkedin,
    Github,
    Instagram,
    Globe,
    Coffee,
    Camera,
    X
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   KONFHUB WIDGET
───────────────────────────────────────────────────────────── */
const KonfhubWidget = ({ buttonId }) => {
    const containerRef = useRef(null);
    useEffect(() => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = '';
        const script = document.createElement('script');
        script.src = 'https://widget.konfhub.com/widget.js';
        script.setAttribute('button_id', buttonId);
        script.async = true;
        containerRef.current.appendChild(script);
        return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
    }, [buttonId]);
    return <div ref={containerRef} className="w-full flex justify-center p-0 m-0" />;
};

/* ─────────────────────────────────────────────────────────────
   ANIMATED COUNTER COMPONENT
───────────────────────────────────────────────────────────── */
const AnimatedCounter = ({ target }) => {
    const [count, setCount] = useState(0);
    const numericPart = parseInt(target) || 0;
    const suffix = target.replace(/^[0-9]+/, '');

    useEffect(() => {
        let start = 0;
        const duration = 1200;
        const stepTime = 30;
        const steps = duration / stepTime;
        const increment = numericPart / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= numericPart) {
                setCount(numericPart);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [numericPart]);

    return <span>{count}{suffix}</span>;
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */


export default function SCDYearPage({ params }) {
    const { year } = use(params);
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Event',
                name: `AWS Students Community Day – DDU Nadiad ${year}`,
                description: 'A student-led cloud technology conference organized by the AWS Student Builder Group at Dharmsinh Desai University, Nadiad. Featuring tracks on Agentic AI, Cloud/DevOps, and Security/SecOps.',
                startDate: `${year}-09-26T09:00:00+05:30`,
                endDate: `${year}-09-26T18:00:00+05:30`,
                eventStatus: 'https://schema.org/EventScheduled',
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                location: {
                    '@type': 'Place',
                    name: 'Dharmsinh Desai University',
                    address: {
                        '@type': 'PostalAddress',
                        streetAddress: 'College Road',
                        addressLocality: 'Nadiad',
                        addressRegion: 'Gujarat',
                        postalCode: '387001',
                        addressCountry: 'IN',
                    },
                },
                image: 'https://aws.ddu.ac.in/images/scd-2026-og.jpg',
                url: `https://aws.ddu.ac.in/scd/${year}`,
                organizer: {
                    '@type': 'Organization',
                    name: 'AWS Student Builder Group DDU',
                    url: 'https://aws.ddu.ac.in',
                },
                performer: [
                    { '@type': 'Person', name: 'Nilesh Vaghela' },
                    { '@type': 'Person', name: 'Dhaval Nagar' },
                    { '@type': 'Person', name: 'Dimple Vaghela' },
                ],
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'INR',
                    availability: 'https://schema.org/InStock',
                    url: `https://aws.ddu.ac.in/scd/${year}`,
                    validFrom: `${year}-07-01`,
                },
                keywords: 'AWS, Cloud Computing, DevOps, AI, Community Day, Student Event, Nadiad, Gujarat',
            },
            {
                '@type': 'Organization',
                name: 'AWS Student Builder Group DDU',
                alternateName: ['AWS SBG DDU', 'AWS DDU', 'AWS DDIT'],
                url: 'https://aws.ddu.ac.in',
                logo: 'https://aws.ddu.ac.in/images/ddu-aws-combined.png',
                foundingDate: '2023',
                description: 'Official AWS Student Builder Group at Dharmsinh Desai University (DDU), Nadiad, Gujarat. Student-led cloud computing community.',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'College Road',
                    addressLocality: 'Nadiad',
                    addressRegion: 'Gujarat',
                    postalCode: '387001',
                    addressCountry: 'IN',
                },
                sameAs: [
                    'https://www.linkedin.com/company/aws-sbg-ddit/',
                    'https://www.instagram.com/aws_sbg_ddit',
                    'https://www.meetup.com/aws-sbg-ddit/',
                ],
                parentOrganization: {
                    '@type': 'EducationalOrganization',
                    name: 'Dharmsinh Desai University',
                    url: 'https://www.ddu.ac.in',
                },
            },
        ],
    };
    const supabase = createClient();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeBlockIdx, setActiveBlockIdx] = useState(0);
    const [activeFaqIdx, setActiveFaqIdx] = useState(null);
    const [activeWorkshop, setActiveWorkshop] = useState(null);
    const [activeSpeakerIdx, setActiveSpeakerIdx] = useState(0);
    const [activeTicketBtnId, setActiveTicketBtnId] = useState(null);
    const [teamMembersState, setTeamMembersState] = useState([]);

    // Dragging state for tickets section
    const ticketScrollRef = useRef(null);
    const [isTicketDragging, setIsTicketDragging] = useState(false);
    const [ticketStartX, setTicketStartX] = useState(0);
    const [ticketScrollLeft, setTicketScrollLeft] = useState(0);

    const handleTicketMouseDown = (e) => {
        if (!ticketScrollRef.current) return;
        setIsTicketDragging(true);
        setTicketStartX(e.pageX - ticketScrollRef.current.offsetLeft);
        setTicketScrollLeft(ticketScrollRef.current.scrollLeft);
    };

    const handleTicketMouseLeave = () => {
        setIsTicketDragging(false);
    };

    const handleTicketMouseUp = () => {
        setIsTicketDragging(false);
    };

    const handleTicketMouseMove = (e) => {
        if (!isTicketDragging || !ticketScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - ticketScrollRef.current.offsetLeft;
        const walk = (x - ticketStartX) * 1.5;
        ticketScrollRef.current.scrollLeft = ticketScrollLeft - walk;
    };

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
                    const embedded = (Array.isArray(data.team_data) && data.team_data.length > 0)
                        ? data.team_data
                        : (Array.isArray(data.organizers_data) && data.organizers_data.length > 0 ? data.organizers_data : []);
                    if (embedded.length > 0) {
                        setTeamMembersState(embedded);
                    } else {
                        const { data: dbTeam } = await supabase
                            .from('team_members')
                            .select('*')
                            .order('display_order', { ascending: true });
                        if (dbTeam) setTeamMembersState(dbTeam);
                    }
                }
            } catch (err) {
                console.error("Error fetching event details:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchEventDetails();
    }, [year, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#EFF0F3] flex flex-col items-center justify-center">
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
                <div className="sr-only">
                    <h1>AWS Students Community Day – DDU Nadiad {year}</h1>
                    <p>
                        AWS Students Community Day DDU Nadiad {year} is a student-led technology conference
                        organized by the AWS Student Builder Group at Dharmsinh Desai University, Nadiad, Gujarat.
                        Scheduled for 26 September {year}, the event features keynote talks, technical sessions,
                        hands-on workshops, and networking opportunities across three tracks:
                        Agentic AI, Cloud/DevOps, and Security/SecOps.
                    </p>
                    <ul>
                        <li>Date: 26 September {year}</li>
                        <li>Venue: Dharmsinh Desai University, Nadiad, Gujarat</li>
                        <li>Time: 9:00 AM – 6:00 PM</li>
                        <li>Expected Attendance: 200–250 students and professionals</li>
                    </ul>
                </div>
                <div className="w-12 h-12 border-4 border-[#23303E]/10 border-t-[#4F8EF7] animate-spin mb-4 rounded-full" />
                <p className="text-[#23303E]/50 font-mono text-xs font-bold uppercase tracking-widest">Loading Event...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-[#EFF0F3] flex flex-col items-center justify-center text-center px-6">
                <div className="max-w-md bg-white border-2 border-[#23303E] p-10 flex flex-col items-center rounded-3xl shadow-xl">
                    <Award size={64} className="text-[#4F8EF7] mb-6" />
                    <h2 className="text-3xl font-black text-[#23303E] mb-2 uppercase">Event Not Found</h2>
                    <p className="text-slate-600 mb-8 text-sm leading-relaxed font-mono">
                        We couldn&apos;t find AWS Students Community Day {year}.
                    </p>
                    <Link href="/" className="bg-[#23303E] rounded-xl text-white font-bold px-8 py-4 uppercase font-mono text-sm tracking-wider w-full text-center hover:bg-[#4F8EF7] transition-colors">
                        Back to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    const safeArray = (data) => Array.isArray(data) ? data : [];
    const safeObject = (data) => (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};

    const rawAgendaBlocks = safeArray(event.agenda_data);
    const agendaBlocks = rawAgendaBlocks.map(block => {
        if (block.type === 'parallel') {
            const isOldFormat = Array.isArray(block.tracks) && (block.tracks.length === 0 || typeof block.tracks[0] === 'string');
            if (isOldFormat) {
                const tracks = safeArray(block.tracks).map((trackName, tIdx) => {
                    const sessions = safeArray(block.sessions).map(session => {
                        const item = Array.isArray(session.tracks) ? session.tracks[tIdx] : null;
                        return {
                            time: session.time || '',
                            title: item?.title || (typeof item === 'string' ? item : '') || '',
                            speaker: item?.speaker || '',
                            description: item?.description || ''
                        };
                    }).filter(s => s.title);
                    return { name: trackName, sessions };
                });
                return { ...block, tracks, sessions: [] };
            }
        }
        return block;
    });

    const speakers = safeArray(event.speakers_data);
    const sponsors = safeArray(event.sponsors_data);
    const workshops = safeArray(event.workshops_data);
    const teamMembers = teamMembersState.length > 0
        ? teamMembersState
        : (safeArray(event.team_data).length > 0 ? safeArray(event.team_data) : safeArray(event.organizers_data));
    const tickets = safeArray(safeObject(event.ticket_data).tickets);
    const registrationUrl = safeObject(event.ticket_data).konfhub_url || "";

    // Retrieve original hero image
    const desktopImage = event.hero_data?.desktop_image || event.hero_data?.popup_image || event.hero_data?.image || event.hero_data?.mobile_image || event.hero_data?.url;

    const isExpertSession = (title) => {
        if (!title) return false;
        const t = title.toLowerCase();
        const exclusions = ['registration', 'check', 'lunch', 'break', 'tea', 'networking', 'concluding', 'swag', 'breakfast', 'dinner', 'opening', 'closing'];
        return !exclusions.some(kw => t.includes(kw));
    };

    let totalSessions = 0;
    agendaBlocks.forEach(block => {
        if (block.type === 'parallel') {
            const tracks = safeArray(block.tracks);
            const allTimeSlots = [];
            tracks.forEach(track => safeArray(track.sessions).forEach(s => { if (!allTimeSlots.includes(s.time)) allTimeSlots.push(s.time); }));
            allTimeSlots.forEach(time => {
                const trackSessions = tracks.map(track => safeArray(track.sessions).find(s => s.time === time));
                const nonNullSessions = trackSessions.filter(s => s != null);
                if (!nonNullSessions.length) return;
                const uniqueSessions = new Set(nonNullSessions.map(s => ((s.title || '').trim().toLowerCase() + '|' + (s.description || '').trim().toLowerCase())));
                const titleStr = nonNullSessions[0].title.trim();
                const isPlaceholder = /^Session \d+/i.test(titleStr) || titleStr.toUpperCase() === 'TBA';
                const isCommon = uniqueSessions.size === 1 && !isPlaceholder;
                if (isCommon) { if (isExpertSession(nonNullSessions[0].title)) totalSessions++; }
                else nonNullSessions.forEach(s => { if (isExpertSession(s.title)) totalSessions++; });
            });
        } else {
            safeArray(block.sessions).forEach(s => { if (isExpertSession(s.title)) totalSessions++; });
        }
    });

    const showTimeslot = event.about_data?.show_timeslot !== false;

    const faqs = [
        { q: `What is AWS Students Community Day ${event?.year || year}?`, a: `AWS Students Community Day is a flagship annual event organized by the AWS Student Builder Group at Dharmsinh Desai University. It is a peer-to-peer learning environment designed by students, for students, to explore cloud computing, GenAI, serverless technology, DevOps, and more.` },
        { q: "Who can attend this event?", a: "Students, fresh graduates, developers, academicians, and anyone interested in learning about cloud technology are welcome to register and attend. No prior knowledge of AWS is required!" },
        { q: "Will I receive a certificate of participation?", a: "Yes, all approved attendees who participate in the event sessions will receive an official digital participation certificate from the AWS Student Builder Group." },
        { q: "What should I bring to the event?", a: "Please bring a laptop if you plan to participate in hands-on workshops, along with a charger and your college ID card. Ensure you have an active AWS account (the free tier is perfect) set up beforehand." }
    ];
    const eventDate = event.date
        ? new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : null;

    const perkItems = [
        { label: 'E-Certificate', icon: <Award size={15} /> },
        { label: 'Networking', icon: <Users size={15} /> },
        { label: 'AWS Swag', icon: <Zap size={15} /> },
        { label: 'Free Meals', icon: <Coffee size={15} /> },
        { label: 'Photo Booth', icon: <Camera size={15} /> },
        { label: 'Workshops', icon: <Laptop size={15} /> },
    ];

    return (
        <div className="min-h-screen bg-[#EFF0F3] text-[#23303E] selection:bg-[#4F8EF7]/30">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            {/* ══════════════════════════════════════
                HERO — Dark Cinematic & Network Graphic
            ══════════════════════════════════════ */}
            <section
                className="relative min-h-screen flex flex-col justify-center pb-20 pt-40 -mt-16 overflow-hidden bg-[#081018] text-white"
            >
                {/* Ambient Glowing Orbs & Network Background */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-[#4F8EF7]/15 rounded-full blur-[140px]" />
                    <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-[#FF9900]/10 rounded-full blur-[130px]" />
                    <img
                        src="/images/hero_network.png"
                        alt="Hero Network Pattern"
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-30 mix-blend-screen pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#081018] via-transparent to-transparent opacity-80" />
                </div>

                {/* Subtle Grain Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />


                {/* Content */}
                <div className="relative z-10 container mx-auto px-6 lg:px-12 max-w-6xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 mb-16">
                        <div className="flex-1 max-w-3xl">
                            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-[#EFF0F3] leading-[1.02] tracking-tight mb-8">
                                <br className="hidden sm:block" /> A full day of AWS,<br className="hidden sm:block" /> built by Students
                            </h1>
                            <p className="text-1xl sm:text-2xl lg:text-2xl text-[#EFF0F3] leading-[1.02] tracking-tight mb-8">AWS Students Community Day Nadiad 2026 is a student-led technology conference organized by the AWS Student Builder Group at Dharmsinh Desai University.</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-t border-slate-300 pt-8">
                        <div className="flex flex-col sm:flex-row gap-8">
                            <div>
                                <p className="text-slate-400 font-mono text-xs font-bold uppercase tracking-widest mb-1">Location</p>
                                <p className="font-mono font-bold text-[#EFF0F3] text-sm uppercase tracking-wider">NADIAD, GUJARAT, INDIA</p>
                            </div>
                            {eventDate && (
                                <div>
                                    <p className="text-slate-400 font-mono text-xs font-bold uppercase tracking-widest mb-1">Date</p>
                                    <p className="font-mono font-bold text-[#EFF0F3] text-sm uppercase tracking-wider">{eventDate.toUpperCase()}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-slate-400 font-mono text-xs font-bold uppercase tracking-widest mb-1">Edition</p>
                                <p className="font-mono font-bold text-[#EFF0F3] text-sm uppercase tracking-wider">SCD {event.year}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            {registrationUrl ? (
                                <a href="#tickets"
                                    className="inline-flex items-center gap-3 bg-[#4F8EF7] hover:bg-[#3b7ad6] text-white shadow-lg shadow-[#4F8EF7]/20 rounded-2xl font-bold font-mono uppercase tracking-wider text-xs sm:text-sm px-7 py-4 transition-all duration-300 active:scale-95">
                                    GET TICKETS <ArrowRight size={15} />
                                </a>
                            ) : (
                                <div className="inline-flex items-center gap-3 bg-slate-200 text-slate-500 rounded-2xl font-bold font-mono uppercase tracking-wider text-xs sm:text-sm px-7 py-4 cursor-not-allowed">
                                    REGISTRATIONS CLOSED
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    const rootBtn = document.querySelector('#workshops-konfhub-root button, #workshops-konfhub-root iframe, #workshops-konfhub-root a, #workshops-konfhub-root [class*="konfhub"]');
                                    if (rootBtn) rootBtn.click();
                                    else {
                                        const el = document.getElementById('workshops');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                                className="inline-flex items-center gap-3 bg-[#FF9900] hover:bg-[#e68a00] text-slate-950 shadow-lg shadow-[#FF9900]/20 rounded-2xl font-black font-mono uppercase tracking-wider text-xs sm:text-sm px-7 py-4 transition-all duration-300 active:scale-95 cursor-pointer">
                                <Laptop size={16} /> GET WORKSHOP TICKET <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                STATS STRIP - White background with Animated Counter
            ══════════════════════════════════════ */}
            <section className="bg-white border-b border-slate-200 relative z-10 py-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 divide-y sm:divide-y-0">
                        {[
                            { value: speakers.length > 0 ? `${speakers.length}+` : '10+', label: 'Expert Speakers' },
                            { value: totalSessions > 0 ? `${totalSessions}+` : '9+', label: 'Tech Sessions' },
                            { value: workshops.length > 0 ? `${workshops.length}` : '3', label: 'Workshops' },
                            { value: '500+', label: 'Builders Expected' },
                        ].map((stat, idx) => (
                            <div key={idx} className="px-8 py-8 group hover:bg-slate-50/80 transition-colors">
                                <div className="text-4xl sm:text-5xl font-black font-mono text-[#23303E] tracking-tight flex items-center gap-1 group-hover:text-[#4F8EF7] transition-colors">
                                    <AnimatedCounter target={stat.value} />
                                </div>
                                <div className="label-teal mt-2 font-mono text-xs font-bold uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                ABOUT — swipeable perks instead of marquee
            ══════════════════════════════════════ */}
            <section id="about" className="py-24 bg-[#EFF0F3]">
                <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start mb-12">
                        <div className="lg:col-span-4">
                            <p className="label-teal mb-5">ABOUT THE EVENT</p>
                            <h2 className="text-4xl sm:text-5xl font-black text-[#23303E] leading-tight tracking-tight">
                                Built by<br />students,<br />for students.
                            </h2>
                        </div>
                        <div className="lg:col-span-8">
                            <p className="text-lg text-[#23303E]/70 leading-relaxed font-medium">
                                {event.about_data?.text || "AWS Students Community Day is a flagship annual conference conceptualized and hosted by the AWS Student Builder Group at Dharmsinh Desai University. Crafted exclusively by students, for students, it gathers tech leaders, developers, and cloud enthusiasts to explore cloud architecture, serverless systems, DevOps, and Artificial Intelligence."}
                            </p>
                        </div>
                    </div>
                    {/* Wrap flex instead of marquee */}
                    <div className="flex flex-wrap gap-4 mt-8">
                        {perkItems.map((item, idx) => (
                            <div key={idx}
                                className="bg-white border border-slate-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#4F8EF7]/40 transition-all duration-300 px-6 py-4 rounded-2xl flex items-center gap-3 cursor-default">
                                <span className="text-[#4F8EF7]">{item.icon}</span>
                                <span className="font-mono text-xs font-bold uppercase tracking-wide text-[#23303E]">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                SPEAKERS — Light theme
            ══════════════════════════════════════ */}
            {speakers.length > 0 && (
                <section id="speakers" className="bg-white py-24 border-t border-slate-200">
                    <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                        <div className="mb-12">
                            <p className="label-teal mb-4">KEYNOTE & TECH SPEAKERS</p>
                            <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight">Speakers</h2>
                        </div>
                        <div className="flex flex-col lg:flex-row border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
                            <div className="flex-1 divide-y divide-slate-100">
                                {speakers.map((speaker, idx) => (
                                    <button key={idx} onClick={() => setActiveSpeakerIdx(idx)}
                                        className={`w-full text-left px-8 py-6 flex items-center justify-between transition-colors cursor-pointer ${activeSpeakerIdx === idx ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-bold text-[#23303E] mb-1">{speaker.name}</h3>
                                            {(speaker.role || speaker.company) && (
                                                <p className="label-teal opacity-90">
                                                    {speaker.role}{speaker.role && speaker.company ? ' \u00b7 ' : ''}{speaker.company}
                                                </p>
                                            )}
                                        </div>
                                        {speaker.linkedin && (
                                            <a href={speaker.linkedin} target="_blank" rel="noopener noreferrer"
                                                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#4F8EF7] hover:border-[#4F8EF7] bg-white transition-all shrink-0 ml-4 hover:shadow-md"
                                                onClick={e => e.stopPropagation()}>
                                                <Linkedin size={16} />
                                            </a>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-100 flex items-center justify-center min-h-[320px] relative overflow-hidden">
                                {speakers[activeSpeakerIdx]?.image ? (
                                    <img src={speakers[activeSpeakerIdx].image} alt={speakers[activeSpeakerIdx].name}
                                        className="w-full h-full object-cover object-top absolute inset-0" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Users size={64} className="text-slate-300" />
                                        <p className="font-mono text-xs uppercase tracking-wider text-slate-400">Photo TBA</p>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#23303E]/90 to-transparent pointer-events-none">
                                    <p className="font-bold text-white text-xl mb-1">{speakers[activeSpeakerIdx]?.name}</p>
                                    {speakers[activeSpeakerIdx]?.role && <p className="font-mono text-xs font-bold text-white/80 uppercase tracking-widest">{speakers[activeSpeakerIdx].role}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════
                TICKETS — Swipeable row
            ══════════════════════════════════════ */}
            {tickets.length > 0 && (
                <section id="tickets" className="py-24 bg-[#EFF0F3] border-t border-slate-200 overflow-hidden">
                    <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                        <div className="mb-12">
                            <p className="label-teal mb-4">REGISTRATION TIERS</p>
                            <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight mb-3">
                                Tickets for every builder
                            </h2>
                            <p className="text-[#23303E]/60 text-lg font-medium mb-4">
                                Join AWS Students Community Day {event.year}.
                            </p>
                            <div className="inline-flex items-center gap-2.5 bg-[#4F8EF7]/10 border border-[#4F8EF7]/30 text-[#23303E] rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm">
                                <span className="text-base">💡</span>
                                <span>
                                    <strong>Note:</strong> We offer both <strong>General Conference Entry Passes</strong> (Super Early Bird, Early Bird, Regular) and <strong>Dedicated Workshop Passes</strong>! Swipe right to explore all 4 ticket options below.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Swipeable container */}
                    <div className="w-full px-6 lg:px-12 mx-auto max-w-6xl">
                        <div
                            ref={ticketScrollRef}
                            onMouseDown={handleTicketMouseDown}
                            onMouseLeave={handleTicketMouseLeave}
                            onMouseUp={handleTicketMouseUp}
                            onMouseMove={handleTicketMouseMove}
                            className={`flex flex-col md:flex-row md:overflow-x-auto md:snap-x md:snap-mandatory gap-6 pb-12 pt-4 no-scrollbar items-center md:items-stretch justify-start md:justify-start ${isTicketDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                        >
                            {tickets.map((ticket, idx) => {
                                const perks = ticket.points ? ticket.points.split(',').map(p => p.trim()) : [];
                                const tName = (ticket.name || '').toLowerCase();
                                const isSoldOut = ticket.status === 'sold_out' || ticket.is_sold_out === true;
                                const ticketsLeft = ticket.tickets_left ? String(ticket.tickets_left).trim() : null;
                                const discountText = ticket.discount ? String(ticket.discount).trim() : null;
                                const originalPrice = ticket.original_price ? String(ticket.original_price).trim() : null;

                                let btnId = ticket.button_id || '';
                                if (!btnId) {
                                    if (tName.includes('super early bird')) btnId = 'btn_bc19856f20d1';
                                    else if (tName.includes('early bird')) btnId = 'btn_168ec82c90c2';
                                    else if (tName.includes('regular')) btnId = 'btn_9be3f420f671';
                                    else if (tName.includes('workshop')) btnId = 'btn_f340f876fc8c';
                                }

                                const isWorkshopPass = tName.includes('workshop');

                                return (
                                    <div key={idx}
                                        className={`w-full max-w-[340px] md:w-[320px] md:flex-none flex flex-col bg-white border ${isSoldOut ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'} rounded-3xl md:snap-center hover:shadow-2xl hover:border-[#4F8EF7]/30 transition-all duration-300 relative overflow-hidden`}>
                                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                <span className={`font-mono text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 ${isWorkshopPass ? 'bg-[#FF9900]/20 text-[#d47f00] border border-[#FF9900]/30' : 'bg-[#4F8EF7]/10 text-[#4F8EF7]'}`}>
                                                    {isWorkshopPass ? 'WORKSHOP PASS' : 'CONFERENCE PASS'}
                                                </span>
                                                {isSoldOut && (
                                                    <span className="font-mono text-[9px] font-black uppercase tracking-widest text-white bg-rose-500 rounded-full px-2.5 py-0.5 shadow-sm">
                                                        SOLD OUT
                                                    </span>
                                                )}
                                                {!isSoldOut && discountText && (
                                                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full px-2.5 py-0.5">
                                                        🏷️ {discountText}
                                                    </span>
                                                )}
                                                {!isSoldOut && ticketsLeft && (
                                                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2.5 py-0.5">
                                                        🔥 {ticketsLeft.toLowerCase().includes('left') ? ticketsLeft : `Only ${ticketsLeft} left`}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-sm font-bold text-[#23303E] font-mono uppercase tracking-wide leading-tight mb-2">
                                                {ticket.name}
                                            </h3>

                                            <div className="flex items-baseline gap-2">
                                                {originalPrice && (
                                                    <span className="text-lg font-bold text-slate-400 line-through font-mono">
                                                        {originalPrice}
                                                    </span>
                                                )}
                                                <div className="text-4xl font-black text-[#23303E] font-mono tracking-tight">
                                                    {ticket.price}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 flex-grow">
                                            {perks.length > 0 && (
                                                <ul className="space-y-3">
                                                    {perks.slice(0, 5).map((perk, pIdx) => (
                                                        <li key={pIdx} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                                                            <div className="w-5 h-5 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center shrink-0 mt-0.5">
                                                                <Check size={10} className="text-[#4F8EF7]" />
                                                            </div>
                                                            <span className="leading-relaxed">{perk}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        <div className="px-8 pb-8">
                                            {isSoldOut ? (
                                                <div className="w-full flex items-center justify-center bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl font-bold font-mono uppercase tracking-wider text-xs px-6 py-4 cursor-not-allowed">
                                                    SOLD OUT
                                                </div>
                                            ) : btnId ? (
                                                <KonfhubWidget buttonId={btnId} />
                                            ) : registrationUrl ? (
                                                <a href={registrationUrl} target="_blank" rel="noopener noreferrer"
                                                    className="w-full flex items-center justify-center gap-2 bg-[#23303E] text-white rounded-2xl font-bold font-mono uppercase tracking-wider text-xs px-6 py-4 hover:bg-[#4F8EF7] shadow-md transition-all duration-300 active:scale-95">
                                                    Buy Now <ArrowRight size={14} />
                                                </a>
                                            ) : (
                                                <div className="w-full flex items-center justify-center bg-slate-100 text-slate-400 rounded-2xl font-bold font-mono uppercase tracking-wider text-xs px-6 py-4 cursor-not-allowed">
                                                    Unavailable
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="hidden md:flex justify-center mt-[-10px]">
                            <p className="label-teal opacity-50">&larr; Swipe to view more &rarr;</p>
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════
                WORKSHOPS - With image
            ══════════════════════════════════════ */}
            {workshops.length > 0 && (
                <section id="workshops" className="py-24 bg-[#EFF0F3] border-t border-slate-200">
                    <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <p className="label-teal mb-4">HANDS-ON BOOTCAMPS</p>
                                <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight">Workshops</h2>
                                <p className="text-slate-500 text-base font-medium mt-3 max-w-xl">Practical, mentor-guided cloud labs held prior to the main talks.</p>
                            </div>
                            <div id="workshops-konfhub-root" className="shrink-0">
                                <KonfhubWidget buttonId="btn_f340f876fc8c" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {workshops.map((ws, wsIdx) => (
                                <div key={wsIdx} className="bg-white rounded-3xl border border-slate-200 shadow-sm group hover:-translate-y-1 hover:shadow-lg hover:border-[#4F8EF7]/30 transition-all duration-300">
                                    <div className="flex flex-col-reverse md:flex-row">
                                        <div className="flex-1 flex flex-col justify-between p-8">
                                            <div>
                                                {ws.time && <span className="label-teal inline-block mb-4">&#9200; {ws.time}</span>}
                                                <h5 onClick={() => setActiveWorkshop(ws)} className="text-xl md:text-2xl font-bold text-[#23303E] mb-3 group-hover:text-[#4F8EF7] transition-colors cursor-pointer">{ws.title}</h5>
                                                <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-3">{ws.description}</p>
                                            </div>
                                            <div>
                                                {ws.speaker && <p className="font-mono text-xs font-bold text-[#23303E]/50 uppercase tracking-wider mb-4">&#128100; {ws.speaker}</p>}
                                                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                                    <button type="button" onClick={() => setActiveWorkshop(ws)} className="flex items-center gap-2 label-teal group-hover:gap-3 transition-all cursor-pointer">
                                                        View Details <ArrowRight size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rootBtn = document.querySelector('#workshops-konfhub-root button, #workshops-konfhub-root iframe, #workshops-konfhub-root a, #workshops-konfhub-root [class*="konfhub"]');
                                                            if (rootBtn) rootBtn.click();
                                                            else setActiveTicketBtnId(ws.button_id || 'btn_f340f876fc8c');
                                                        }}
                                                        className="inline-flex items-center gap-2 bg-[#FF9900] hover:bg-[#e68a00] text-slate-950 font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-2xl shadow-md transition-all duration-300 active:scale-95 cursor-pointer"
                                                    >
                                                        <Laptop size={14} /> Get Workshop Ticket <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {ws.image && (
                                            <div onClick={() => setActiveWorkshop(ws)} className="w-full h-52 sm:h-64 md:h-auto md:w-[50%] lg:w-[45%] shrink-0 bg-slate-100 border-b md:border-b-0 md:border-l border-slate-200 relative cursor-pointer overflow-hidden rounded-t-3xl md:rounded-t-none md:rounded-r-3xl">
                                                <img src={ws.image} alt={ws.title} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════
                SCHEDULE — Light Slate Theme (#EFF0F3)
            ══════════════════════════════════════ */}
            {agendaBlocks.length > 0 && (
                <section id="agenda" className="py-24 bg-[#EFF0F3] text-[#23303E] border-t border-slate-200 relative overflow-hidden">
                    <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                        <div className="mb-12">
                            <p className="label-teal mb-4">EVENT TIMELINE</p>
                            <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight font-display">Schedule</h2>
                        </div>
                        {agendaBlocks.length > 1 && (
                            <div className="flex gap-3 mb-10 overflow-x-auto pb-2 no-scrollbar">
                                {agendaBlocks.map((block, idx) => (
                                    <button key={idx} onClick={() => setActiveBlockIdx(idx)}
                                        className={`px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-xl ${activeBlockIdx === idx ? 'bg-[#23303E] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#23303E]'}`}>
                                        {block.title || `Block ${idx + 1}`}
                                    </button>
                                ))}
                            </div>
                        )}
                        {agendaBlocks[activeBlockIdx]?.type === 'parallel' ? (
                            (() => {
                                const tracks = safeArray(agendaBlocks[activeBlockIdx]?.tracks);
                                if (!tracks.length) return <div className="text-center text-slate-400 py-8 font-mono text-sm">No tracks available</div>;

                                const maxSessions = Math.max(...tracks.map(t => safeArray(t.sessions).length));
                                const sessionRows = [];
                                for (let i = 0; i < maxSessions; i++) {
                                    sessionRows.push(tracks.map(t => safeArray(t.sessions)[i] || null));
                                }

                                const isCommonKeyword = (titleStr) => {
                                    if (!titleStr) return false;
                                    const t = titleStr.toLowerCase().trim();
                                    const commonKeywords = [
                                        'registration', 'keynote', 'opening', 'closing', 'concluding',
                                        'speech', 'remarks', 'lunch', 'break', 'tea', 'swag', 'networking',
                                        'ceremony', 'welcome', 'dinner', 'breakfast', 'thanks', 'valedictory'
                                    ];
                                    return commonKeywords.some(kw => t.includes(kw));
                                };

                                return (
                                    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    {showTimeslot && (
                                                        <th className="py-4 px-6 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider w-36 border-r border-slate-200">
                                                            Slot
                                                        </th>
                                                    )}
                                                    {tracks.map((track, tIdx) => (
                                                        <th key={tIdx} className="py-4 px-6 font-mono text-xl font-bold text-[#23303E] uppercase tracking-wider border-r last:border-r-0 border-slate-200">
                                                            {track.name || `Track ${tIdx + 1}`}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 text-sm">
                                                {sessionRows.map((trackSessions, rowIdx) => {
                                                    const nonNull = trackSessions.filter(s => s != null);
                                                    if (nonNull.length === 0) return null;

                                                    const firstSession = nonNull[0];
                                                    const firstTitle = (firstSession.title || '').trim();
                                                    const firstTitleLower = firstTitle.toLowerCase();

                                                    const isPlaceholder = /^session\s*\d+/i.test(firstTitleLower) || firstTitleLower === 'tba' || firstTitleLower === 'to be announced';
                                                    const uniqueTitles = new Set(nonNull.map(s => (s.title || '').trim().toLowerCase()));
                                                    const isCommon = uniqueTitles.size === 1 && !isPlaceholder && isCommonKeyword(firstTitleLower);

                                                    const slotLabel = firstSession.time || `Session ${rowIdx + 1}`;

                                                    if (isCommon) {
                                                        return (
                                                            <tr key={rowIdx} className="bg-slate-50/70 hover:bg-slate-100/60 transition-colors">
                                                                {showTimeslot && (
                                                                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-400 border-r border-slate-200 whitespace-nowrap align-middle">
                                                                        {slotLabel}
                                                                    </td>
                                                                )}
                                                                <td colSpan={tracks.length} className="py-6 px-6 text-center align-middle">
                                                                    <div className="font-bold text-[#23303E] text-base">{firstSession.title}</div>
                                                                    {firstSession.speaker && <div className="label-teal inline-block mt-1">{firstSession.speaker}</div>}
                                                                    {firstSession.description && <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto leading-relaxed">{firstSession.description}</p>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    } else {
                                                        return (
                                                            <tr key={rowIdx} className="hover:bg-slate-50/30 transition-colors">
                                                                {showTimeslot && (
                                                                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-400 border-r border-slate-200 whitespace-nowrap align-top">
                                                                        {slotLabel}
                                                                    </td>
                                                                )}
                                                                {trackSessions.map((session, colIdx) => (
                                                                    <td key={colIdx} className="py-5 px-6 border-r last:border-r-0 border-slate-200 align-top">
                                                                        {session ? (
                                                                            <div className="space-y-1">
                                                                                <div className="font-bold text-[#23303E] leading-snug">{session.title}</div>
                                                                                {session.speaker && <div className="label-teal text-xs mt-1 inline-block">{session.speaker}</div>}
                                                                                {session.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{session.description}</p>}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-300 font-mono">—</span>
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    }
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                {safeArray(agendaBlocks[activeBlockIdx]?.sessions).map((session, sIdx) => (
                                    <div key={sIdx}
                                        className="px-8 py-6 flex flex-col gap-2 border-b border-slate-200 last:border-0 transition-colors bg-white hover:bg-slate-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-base font-bold text-[#23303E]">{session.title}</h4>
                                            {showTimeslot && session.time && <span className="font-mono text-xs text-slate-400">{session.time}</span>}
                                        </div>
                                        {session.speaker && <span className="label-teal">{session.speaker}</span>}
                                        {session.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{session.description}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════
                SPONSORS
            ══════════════════════════════════════ */}
            {sponsors.length > 0 && (
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                        <div className="mb-12 text-center">
                            <p className="label-teal mb-4">OUR SUPPORTERS</p>
                            <h2 className="text-4xl sm:text-5xl font-black text-[#23303E] leading-tight tracking-tight">Sponsors</h2>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4">
                            {sponsors.map((sponsor, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 w-48 hover:shadow-md hover:border-[#4F8EF7]/30 transition-all duration-300">
                                    {sponsor.logo ? (
                                        <img src={sponsor.logo} alt={sponsor.name} className="max-h-12 max-w-[120px] object-contain grayscale hover:grayscale-0 transition-all" />
                                    ) : (
                                        <span className="font-mono text-xs font-bold text-[#23303E]/40 uppercase text-center">{sponsor.name}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════
                SPEAKERS — Light Premium Theme
            ══════════════════════════════════════ */}
            {speakers.length > 0 && (
                <section id="speakers" className="py-24 bg-[#EFF0F3]">
                    <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                        <div className="mb-12">
                            <p className="label-teal mb-4">INDUSTRY EXPERTS</p>
                            <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight">Speakers</h2>
                            <p className="text-slate-500 text-base font-medium mt-3 max-w-xl">Learn from AWS Heroes, cloud architects, and tech leaders shaping the future.</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4 sm:gap-8">
                            {speakers.map((speaker, sIdx) => (
                                <div key={sIdx} className="bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-sm hover:shadow-xl hover:border-[#4F8EF7]/30 transition-all duration-300 group">
                                    <div className="w-28 h-28 mx-auto mb-6 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 group-hover:border-[#4F8EF7] group-hover:scale-105 transition-all duration-300">
                                        {speaker.image ? (
                                            <img src={speaker.image} alt={speaker.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                                <Users size={40} />
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-bold text-[#23303E] mb-1 group-hover:text-[#4F8EF7] transition-colors">{speaker.name}</h4>
                                    {speaker.role && <p className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{speaker.role}</p>}
                                    {speaker.company && <p className="text-xs font-semibold text-[#4F8EF7] mb-4">{speaker.company}</p>}
                                    {speaker.bio && <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">{speaker.bio}</p>}
                                    <div className="flex items-center justify-center gap-3 text-slate-400 pt-2 border-t border-slate-100">
                                        {speaker.linkedin_url && (
                                            <a href={speaker.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#4F8EF7] transition-colors">
                                                <Linkedin size={16} />
                                            </a>
                                        )}
                                        {speaker.twitter_url && (
                                            <a href={speaker.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#23303E] transition-colors">
                                                <Globe size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════
                TEAM & ORGANIZERS — Light Premium Theme
            ══════════════════════════════════════ */}
            {teamMembers.length > 0 && (
                <section id="team" className="py-24 bg-white">
                    <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
                        <div className="mb-12">
                            <p className="label-teal mb-4">THE MINDS BEHIND THE EVENT</p>
                            <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight">Organizing Team</h2>
                            <p className="text-slate-500 text-base font-medium mt-3 max-w-xl">Student leaders and community organizers who made AWS Students Community Day possible.</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4 sm:gap-8">
                            {teamMembers.map((member, tIdx) => (
                                <div key={tIdx} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center shadow-sm hover:shadow-xl hover:border-[#4F8EF7]/30 transition-all duration-300 group">
                                    <div className="w-28 h-28 mx-auto mb-6 rounded-2xl overflow-hidden bg-white border border-slate-200 group-hover:scale-105 transition-transform duration-300">
                                        <img
                                            src={member.image || member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.full_name || 'Team')}&background=EFF0F3&color=23303E`}
                                            alt={member.name || member.full_name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <h4 className="text-lg font-bold text-[#23303E] mb-1 group-hover:text-[#4F8EF7] transition-colors">{member.name || member.full_name}</h4>
                                    <p className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{member.role || member.role_title || 'Organizer'}</p>
                                    <div className="flex items-center justify-center gap-4 text-slate-400">
                                        {member.github_url && (
                                            <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#23303E] transition-colors">
                                                <Github size={16} />
                                            </a>
                                        )}
                                        {member.linkedin_url && (
                                            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#4F8EF7] transition-colors">
                                                <Linkedin size={16} />
                                            </a>
                                        )}
                                        {member.instagram_url && (
                                            <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors">
                                                <Instagram size={16} />
                                            </a>
                                        )}
                                        {member.portfolio_url && (
                                            <a href={member.portfolio_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#4F8EF7] transition-colors" title="Portfolio">
                                                <Globe size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════
                VENUE
            ══════════════════════════════════════ */}
            <section id="venue" className="py-24 bg-[#EFF0F3]">
                <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
                    <div className="mb-12">
                        <p className="label-teal mb-4">CAMPUS LOCATION</p>
                        <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight">Venue</h2>
                    </div>
                    <div className="border border-slate-200 bg-white overflow-hidden rounded-3xl shadow-sm">
                        <div className="h-72 md:h-96 w-full">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3681.3072706642474!2d72.87820267391233!3d22.679602629042737!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e5adf2c171355%3A0xe1e974ce083657fb!2sDharmsinh%20Desai%20University!5e0!3m2!1sen!2sin!4v1785051382336!5m2!1sen!2sin"
                                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                        <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h3 className="text-2xl font-bold text-[#23303E] mb-2">{event.venue || "Dharmsinh Desai University (DDU)"}</h3>
                                <p className="text-slate-500 font-mono text-sm">College Road, Nadiad, Gujarat 387001</p>
                            </div>
                            <a href="https://maps.app.goo.gl/3Q8xXjJ6Y1q2hP4p8" target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 bg-[#23303E] hover:bg-[#4F8EF7] rounded-2xl text-white font-bold font-mono uppercase tracking-wider text-xs px-8 py-4 transition-all duration-300 active:scale-95 whitespace-nowrap shadow-md">
                                <MapPin size={16} /> View Directions
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                FAQ
            ══════════════════════════════════════ */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-6 lg:px-12 max-w-4xl">
                    <div className="mb-12 text-center">
                        <p className="label-teal mb-4">QUESTIONS & ANSWERS</p>
                        <h2 className="text-4xl sm:text-6xl font-black text-[#23303E] leading-tight tracking-tight">FAQ</h2>
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-sm">
                        {faqs.map((faq, idx) => {
                            const isOpen = activeFaqIdx === idx;
                            return (
                                <div key={idx}>
                                    <button type="button" onClick={() => setActiveFaqIdx(isOpen ? null : idx)}
                                        className="w-full px-8 py-6 flex items-center justify-between text-left font-bold text-base text-[#23303E] hover:bg-slate-50 transition-colors cursor-pointer">
                                        <span>{faq.q}</span>
                                        <ChevronDown size={20} className={`text-[#4F8EF7] shrink-0 transition-transform duration-300 ml-4 ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isOpen && (
                                        <div className="px-8 pb-8 text-sm text-slate-600 leading-relaxed pt-2">{faq.a}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                WORKSHOP MODAL
            ══════════════════════════════════════ */}
            {activeWorkshop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-[#23303E]/40 backdrop-blur-sm" onClick={() => setActiveWorkshop(null)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden max-h-[90vh] flex flex-col z-10 shadow-2xl">
                        <div className="flex items-start justify-between p-8 border-b border-slate-100 bg-slate-50">
                            <div className="pr-8 space-y-2">
                                <h3 className="text-2xl font-bold text-[#23303E]">{activeWorkshop.title}</h3>
                                {activeWorkshop.time && <span className="label-teal">&#9200; {activeWorkshop.time}</span>}
                            </div>
                            <button onClick={() => setActiveWorkshop(null)} className="p-2 text-slate-400 hover:text-[#23303E] bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer rounded-xl shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-6 text-sm text-slate-700">
                            <div className="space-y-2">
                                <h4 className="label-teal">WHAT YOU&apos;LL LEARN</h4>
                                <p className="leading-relaxed text-slate-600">{activeWorkshop.description}</p>
                            </div>
                            {activeWorkshop.requirements && (
                                <div className="space-y-2">
                                    <h4 className="label-teal">PREREQUISITES</h4>
                                    <p className="leading-relaxed text-slate-600">{activeWorkshop.requirements}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KONFHUB FULL-SCREEN POPUP MODAL */}
            {activeTicketBtnId && (
                <div
                    className="fixed inset-0 z-[100] flex items-start justify-center pt-10 sm:pt-14 pb-6 bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setActiveTicketBtnId(null);
                    }}
                >
                    {/* Fixed Top-Right Close Button */}
                    <button
                        onClick={() => setActiveTicketBtnId(null)}
                        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[110] text-white bg-slate-800/90 hover:bg-slate-700 p-2.5 rounded-full transition-all cursor-pointer shadow-2xl backdrop-blur-md flex items-center justify-center border border-white/20 hover:scale-105"
                        title="Close Modal"
                    >
                        <X size={22} strokeWidth={2.5} />
                    </button>

                    {/* Widget Wrapper */}
                    <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto flex justify-center items-center -mt-2">
                        <KonfhubWidget buttonId={activeTicketBtnId} />
                    </div>
                </div>
            )}
        </div>
    );
}
