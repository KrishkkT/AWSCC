"use client";

import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Cloud, Terminal, Zap, Cpu, Linkedin } from "lucide-react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

// Layout constants for dynamic bento grid handled in component

export default function Home() {
    const containerRef = useRef(null);
    const [galleryPhotos, setGalleryPhotos] = useState([]);
    const [events, setEvents] = useState([]);
    const [communityEvent, setCommunityEvent] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [showGlimpseGallery, setShowGlimpseGallery] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 600);
            setIsTablet(window.innerWidth >= 600 && window.innerWidth < 1024);
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { createClient } = await import("@/utils/supabase/client");
                const supabase = createClient();

                const { data: galleryData } = await supabase.from('home_gallery').select('*').order('created_at', { ascending: false }).limit(20);
                let photos = [];
                if (galleryData && galleryData.length > 0) {
                    photos = galleryData;
                }

                setGalleryPhotos(photos);

                const { data: globalSettings } = await supabase.from('global_settings').select('show_glimpse_gallery').single();
                if (globalSettings && globalSettings.show_glimpse_gallery !== undefined) {
                    setShowGlimpseGallery(globalSettings.show_glimpse_gallery === true);
                }

                const { data: eventsData } = await supabase.from('events').select('*').in('status', ['upcoming', 'active']).order('date', { ascending: true }).limit(3);
                if (eventsData) setEvents(eventsData);

                const { data: scdEvent } = await supabase.from('community_events').select('*').eq('is_active', true).order('year', { ascending: false }).limit(1).maybeSingle();
                if (scdEvent) setCommunityEvent(scdEvent);

                const { data: teamData } = await supabase.from('team_members').select('*');
                if (teamData && teamData.length > 0) {
                    const mainNames = ['Vipul Dabhi', 'Harshad Prajapati', 'Sandeep Suthar', 'Anand Patel'];
                    let mainMembers = teamData.filter(m => {
                        const name = (m.full_name || '').toLowerCase();
                        return mainNames.some(mainName => name.includes(mainName.toLowerCase()));
                    });

                    // Sort to match requested order
                    mainMembers.sort((a, b) => {
                        const nameA = (a.full_name || '').toLowerCase();
                        const nameB = (b.full_name || '').toLowerCase();
                        const indexA = mainNames.findIndex(n => nameA.includes(n.toLowerCase()));
                        const indexB = mainNames.findIndex(n => nameB.includes(n.toLowerCase()));
                        return indexA - indexB;
                    });

                    // Fallback if none found
                    if (mainMembers.length === 0) {
                        mainMembers = teamData.slice(0, 4);
                    }

                    setTeamMembers(mainMembers);
                } else {
                    setTeamMembers([]);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };
        fetchData();
    }, []);

    useGSAP(() => {
        if (galleryPhotos.length === 0) return;

        const track = document.querySelector('.glimpse-track');
        const pinTarget = document.querySelector('.glimpse-pin');

        if (!track || !pinTarget) return;

        const batchSize = isMobile ? 2 : isTablet ? 4 : 8;
        const SCROLL_DISTANCE_PER_BATCH = isMobile ? 300 : 500;

        const photoElements = gsap.utils.toArray('.glimpse-photo');
        const batches = [];
        for (let i = 0; i < photoElements.length; i += batchSize) {
            batches.push(photoElements.slice(i, i + batchSize));
        }

        const N = batches.length;
        if (N === 0) return;

        const totalEnd = SCROLL_DISTANCE_PER_BATCH * N;
        // Let GSAP handle the track height via pinSpacing

        // Setup heading initial state
        gsap.set('.glimpse-heading', { opacity: 0, scale: 0.8 });
        gsap.set('.glimpse-heading-left', { opacity: 0, rotation: 180, yPercent: -50, x: 200 });
        gsap.set('.glimpse-heading-right', { opacity: 0, yPercent: -50, x: -200 });

        const st = ScrollTrigger.create({
            trigger: track,
            start: 'top top',
            end: `+=${totalEnd}`,
            pin: pinTarget,
            pinSpacing: true,
            anticipatePin: 1,
            onUpdate: (self) => {
                const progress = self.progress;
                // If progress is very close to 0, ensure the heading is fully visible
                // and the first batch starts showing up.
                const segment = 1 / N;

                // Heading fade in quickly at the start
                const headP = Math.min(progress / 0.05, 1);
                gsap.set('.glimpse-heading', { opacity: headP, scale: 0.8 + (0.2 * headP) });
                gsap.set('.glimpse-heading-left', { opacity: headP, x: 200 - (200 * headP) });
                gsap.set('.glimpse-heading-right', { opacity: headP, x: -200 + (200 * headP) });

                batches.forEach((batchPhotos, i) => {
                    const segStart = i * segment;
                    const segEnd = segStart + segment;

                    if (progress < segStart || progress > segEnd) {
                        // Fully outside window
                        gsap.set(batchPhotos, { opacity: 0, visibility: 'hidden', pointerEvents: 'none' });
                        return;
                    }

                    const local = (progress - segStart) / segment;
                    gsap.set(batchPhotos, { visibility: 'visible', pointerEvents: 'auto' });

                    if (local < 0.35) {
                        // Enter phase
                        const t = local / 0.35;
                        batchPhotos.forEach((el, idx) => {
                            const staggered = Math.min(1, Math.max(0, (t - idx * 0.04) / (1 - idx * 0.04)));
                            const startRot = parseFloat(el.dataset.startrot || 0);
                            gsap.set(el, { opacity: staggered, y: 60 * (1 - staggered), rotation: startRot * (1 - staggered) });
                        });
                    } else if (local < 0.65) {
                        // Hold phase
                        gsap.set(batchPhotos, { opacity: 1, y: 0, rotation: 0 });
                    } else {
                        // Exit phase (moves up)
                        const t = (local - 0.65) / 0.35;
                        batchPhotos.forEach((el, idx) => {
                            const staggered = Math.min(1, Math.max(0, (t - idx * 0.04) / (1 - idx * 0.04)));
                            const startRot = parseFloat(el.dataset.startrot || 0);
                            gsap.set(el, { opacity: 1 - staggered, y: -60 * staggered, rotation: startRot * staggered });
                        });
                    }
                });
            }
        });

        return () => {
            if (st) st.kill();
        };
    }, { dependencies: [isMobile, isTablet, galleryPhotos, showGlimpseGallery], scope: containerRef });

    return (
        <div className="flex flex-col min-h-screen bg-white">

            {/* HERO SECTION */}
            <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-[#0C111D] pt-20">
                {/* Background Image Overlay */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: "url('/images/aws-sbg-ddu-students-cloud-workshop.png')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C111D] via-transparent to-transparent"></div>

                <div className="container relative z-10 px-6 md:px-10 max-w-7xl mx-auto flex flex-col items-start">

                    <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.05] tracking-tight max-w-5xl mb-8">
                        AWS SBG<br />
                        <span className="text-[#0073BB]">Community</span><br />
                        Nadiad
                    </h1>

                    <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-12 font-sans font-light leading-relaxed">
                        AWS Student Builder Group (SBG) Nadiad is a student-led community empowering the next generation of cloud builders through hands-on learning, technical events and global community collaboration.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                        <Link href="https://www.meetup.com/aws-sbg-ddit/" target="_blank" className="relative overflow-hidden group border-2 border-[#0073BB] text-white font-bold text-sm px-8 py-4 text-center tracking-wider inline-flex justify-center items-center">
                            <span className="relative z-10 transition-colors duration-300">JOIN COMMUNITY</span>
                            <div className="absolute inset-0 bg-[#0073BB] transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>
                        <Link href="/events" className="relative overflow-hidden group border-2 border-white/30 hover:border-white/0 text-white font-bold text-sm px-8 py-4 text-center tracking-wider inline-flex justify-center items-center">
                            <span className="relative z-10 group-hover:text-[#0C111D] transition-colors duration-300">EXPLORE EVENTS</span>
                            <div className="absolute inset-0 bg-white transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>
                    </div>
                </div>
            </section>

            <section aria-label="About AWS Student Builder Group DDU" className="sr-only">
                <p>
                    The AWS Student Builder Group (SBG) at Dharmsinh Desai University (DDU), Nadiad,
                    Gujarat is the official AWS student community for cloud enthusiasts at DDIT.
                    We host monthly meetups, hands-on AWS workshops, certification bootcamps,
                    and our flagship event — AWS Students Community Day Nadiad — bringing together
                    students, industry professionals, and AWS community leaders from across Gujarat.
                </p>
            </section>

            {/* ABOUT SECTION */}
            <section className="py-24 bg-[#F9F9F9]">
                <div className="container px-6 md:px-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <div className="w-full lg:w-1/2 flex flex-col items-start">
                        <span className="text-[#0073BB] font-bold text-sm tracking-[0.15em] uppercase mb-4">
                            ABOUT US
                        </span>
                        <h2 className="text-[#0C111D] text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                            Building Nadiad&apos;s Cloud Community
                        </h2>
                        <p className="text-gray-600 text-lg leading-relaxed mb-10 font-sans">
                            AWS Student Builder Group Nadiad is a student-led community for people curious about cloud, whether you&apos;re writing your first line of code, preparing for certifications, building products, or solving real infrastructure challenges.
                        </p>
                        <Link href="/events" className="relative overflow-hidden group border-2 border-[#0C111D] text-[#0C111D] font-bold text-sm px-8 py-3 tracking-wider inline-flex justify-center items-center">
                            <span className="relative z-10 group-hover:text-white transition-colors duration-300">EXPLORE EVENTS</span>
                            <div className="absolute inset-0 bg-[#0C111D] transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>
                    </div>
                    <div className="w-full lg:w-1/2">
                        <div className="border-l-[12px] border-[#0073BB] pl-0 shadow-2xl">
                            {/* Fallback image if real one isn't present, but using generic grey block with text for now if missing, actually img is better */}
                            <img src="/images/aws-sbg-ddu-students-cloud-workshop.png" alt="AWS Student Builder Group DDU students at cloud workshop Nadiad" className="w-full h-[400px] object-cover bg-gray-200" onError={(e) => { e.target.src = 'https://placehold.co/800x600/e2e8f0/64748b?text=Community+Image' }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* EVENTS SECTION */}
            <section className="py-24 bg-[#0C111D]">
                <div className="container px-6 md:px-10 max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                        <div className="max-w-xl">
                            <span className="text-brand-cyan font-bold text-sm tracking-[0.15em] uppercase mb-4 block">
                                EVENTS
                            </span>
                            <h2 className="text-white text-4xl md:text-5xl font-serif font-bold leading-tight">
                                Events & Meetups
                            </h2>
                        </div>
                        <div className="max-w-md text-gray-300 text-lg font-sans">
                            From casual monthly catchups to our biggest day of the year — there&apos;s always something happening in the AWS Nadiad community.
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mb-12">
                        <Link href="/events" className="relative overflow-hidden group bg-white text-[#0C111D] font-bold px-8 py-3 rounded-full text-sm inline-flex justify-center items-center">
                            <span className="relative z-10 group-hover:text-white transition-colors duration-300">Upcoming events</span>
                            <div className="absolute inset-0 bg-[#0073BB] transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>
                        <Link href="/events?tab=past" className="relative overflow-hidden group border border-white/30 text-white font-bold px-8 py-3 rounded-full text-sm inline-flex justify-center items-center">
                            <span className="relative z-10 group-hover:text-[#0C111D] transition-colors duration-300">Past events</span>
                            <div className="absolute inset-0 bg-white transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(events.length > 0 || communityEvent) ? (
                            <>
                                {communityEvent && (() => {
                                    const heroData = communityEvent.hero_data || {};
                                    const desktopImg = heroData.desktop_image || heroData.popup_image || heroData.image || heroData.url;
                                    const mobileImg = heroData.mobile_image || desktopImg;

                                    return (
                                        <Link href={`/scd/${communityEvent.year}`} className="block group h-full">
                                            <div className="bg-[#1A1F2B] rounded-2xl h-full border border-brand-aws/50 group-hover:border-brand-aws transition-colors flex flex-col relative overflow-hidden">

                                                {(desktopImg || mobileImg) && (
                                                    <div className="h-48 w-full relative overflow-hidden shrink-0">
                                                        {mobileImg && <img src={mobileImg} alt={communityEvent.title} className={`w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ${desktopImg && desktopImg !== mobileImg ? 'sm:hidden' : ''}`} />}
                                                        {desktopImg && desktopImg !== mobileImg && <img src={desktopImg} alt={communityEvent.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 hidden sm:block" />}
                                                    </div>
                                                )}

                                                <div className="p-8 flex flex-col flex-grow relative">
                                                    <div className="absolute inset-0 bg-gradient-to-b from-brand-aws/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                                    <div className="mb-6 z-10">
                                                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400">
                                                            FLAGSHIP EVENT
                                                        </span>
                                                    </div>
                                                    <h3 className="text-white text-2xl font-bold mb-4 group-hover:text-brand-aws transition-colors leading-tight z-10">{communityEvent.title}</h3>
                                                    <p className="text-gray-400 text-sm line-clamp-3 mb-6 flex-grow leading-relaxed z-10">Join us for a full day of expert sessions, hands-on workshops, and massive networking opportunities.</p>

                                                    <div className="mt-auto z-10 pt-4 border-t border-white/5">
                                                        <span className="inline-flex items-center gap-2 text-brand-aws font-bold text-sm group-hover:gap-3 transition-all">
                                                            View Event <ArrowRight size={16} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })()}
                                {events.map((event) => {
                                    const titleLower = event.title?.toLowerCase() || '';
                                    const isHackathon = titleLower.includes('hackathon');
                                    const isFlagship = titleLower.includes('day') || titleLower.includes('flagship');
                                    const badgeColor = isHackathon ? 'bg-yellow-500/20 text-yellow-400' : isFlagship ? 'bg-orange-500/20 text-orange-400' : 'bg-pink-500/20 text-pink-400';
                                    const badgeText = isHackathon ? 'HACKATHON' : isFlagship ? 'FLAGSHIP' : 'MEETUP';

                                    return (
                                        <Link href={`/events`} key={event.id} className="block group h-full">
                                            <div className="bg-[#1A1F2B] rounded-2xl p-8 h-full border border-white/5 group-hover:border-white/20 transition-colors flex flex-col relative overflow-hidden">
                                                {/* Optional faint gradient glow on hover */}
                                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                                <div className="mb-6">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeColor}`}>
                                                        {badgeText}
                                                    </span>
                                                </div>
                                                <h3 className="text-white text-2xl font-bold mb-4 group-hover:text-brand-cyan transition-colors leading-tight">{event.title}</h3>
                                                <p className="text-gray-400 text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">{event.description || 'Details coming soon. Stay tuned. 🚀'}</p>

                                                <div className="mt-auto pt-4 border-t border-white/5">
                                                    <span className="inline-flex items-center gap-2 text-brand-cyan font-bold text-sm group-hover:gap-3 transition-all">
                                                        View Event <ArrowRight size={16} />
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                                }
                            </>
                        ) : (
                            <div className="col-span-3 text-center py-12 text-white/50 bg-[#1A1F2B] rounded-2xl border border-white/5">
                                No upcoming events at the moment. Check back soon!
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* COMMUNITY GLIMPSE SCROLL TRACK */}
            {showGlimpseGallery && (
                <section ref={containerRef} className={`glimpse-track relative bg-[#F7F8FA]`}>
                    <div className={`glimpse-pin w-full h-screen overflow-hidden flex flex-col items-center justify-center pt-24`}>
                        {isMobile ? (
                            <h2 className="glimpse-heading absolute z-50 top-20 left-0 right-0 text-center text-[#1A1D23] font-serif font-bold tracking-widest mix-blend-multiply text-3xl uppercase leading-snug">
                                A Glimpse<br />from the community
                            </h2>
                        ) : (
                            <>
                                <h2 className={`glimpse-heading-left absolute z-50 left-4 lg:left-8 top-1/2 text-[#1A1D23] font-serif font-bold tracking-widest mix-blend-multiply text-3xl lg:text-6xl uppercase`} style={{ writingMode: 'vertical-rl' }}>
                                    A Glimpse
                                </h2>
                                <h2 className={`glimpse-heading-right absolute z-50 right-4 lg:right-8 top-1/2 text-[#1A1D23] font-serif font-bold tracking-widest mix-blend-multiply text-3xl lg:text-6xl uppercase`} style={{ writingMode: 'vertical-rl' }}>
                                    from the community
                                </h2>
                            </>
                        )}

                        <div className={`absolute inset-0 flex items-center justify-center w-full h-full pointer-events-none ${isMobile ? 'pt-28 pb-4' : 'pt-40 pb-20'}`}>
                            <div className="container mx-auto px-6 h-full w-full max-w-6xl pointer-events-none flex items-center justify-center relative">
                                {(() => {
                                    const batchSize = isMobile ? 2 : isTablet ? 4 : 8;
                                    const batches = [];
                                    for (let i = 0; i < galleryPhotos.length; i += batchSize) {
                                        batches.push(galleryPhotos.slice(i, i + batchSize));
                                    }
                                    return batches.map((batch, batchIndex) => (
                                        <div key={batchIndex} className={`absolute w-full h-full mx-auto pointer-events-none ${isMobile ? 'flex flex-col items-center justify-center gap-4 px-6' : `grid gap-4 lg:gap-6 max-w-5xl ${isTablet ? 'grid-cols-2 auto-rows-[200px]' : 'grid-cols-4 auto-rows-[160px] lg:auto-rows-[200px]'}`}`}>
                                            {batch.map((photoData, i) => {
                                                let spanClass = 'col-span-1 row-span-1';
                                                if (!isTablet && !isMobile) {
                                                    // Desktop Bento
                                                    if (i === 0) spanClass = 'col-span-2 row-span-2';
                                                    else if (i === 3) spanClass = 'col-span-2 row-span-1';
                                                } else if (isTablet) {
                                                    // Tablet Bento
                                                    if (i === 0) spanClass = 'col-span-2 row-span-1';
                                                }

                                                const mobileImgClass = isMobile ? 'w-full max-w-[280px] aspect-[4/3]' : '';
                                                const startRot = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 8 + 5);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`glimpse-photo rounded-xl overflow-hidden shadow-2xl opacity-0 ${isMobile ? '' : spanClass} ${mobileImgClass} pointer-events-auto`}
                                                        data-startrot={startRot}
                                                    >
                                                        <img src={photoData.url} alt={photoData.title || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* TEAM SECTION */}
            <section className="py-24 bg-[#080B13] border-t border-white/5">
                <div className="container px-6 md:px-10 max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                        <div className="max-w-xl">
                            <span className="text-brand-cyan font-bold text-sm tracking-[0.15em] uppercase mb-4 block">
                                TEAM
                            </span>
                            <h2 className="text-white text-4xl md:text-5xl font-serif font-bold leading-tight">
                                Meet the Team Behind Community
                            </h2>
                        </div>
                        <div className="max-w-md text-gray-300 text-lg font-sans">
                            Behind every meetup, workshop, and community conversation is a group of people who genuinely care about bringing builders together.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {teamMembers.map((member) => (
                            <div key={member.id} className="bg-white rounded-3xl p-6 relative overflow-hidden group flex flex-col h-[450px] sm:h-[380px]">
                                <div className="flex justify-between items-start z-10 mb-4">
                                    <h3 className="text-[#0C111D] text-2xl font-bold leading-tight max-w-[70%]">
                                        {(member.full_name || 'Team Member').split(' ').map((n, i) => <span key={i} className="block">{n}</span>)}
                                    </h3>
                                    {member.linkedin_url && (
                                        <Link href={member.linkedin_url} target="_blank" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-[#0073BB] hover:text-white hover:border-[#0073BB] transition-colors bg-white text-[#0C111D]">
                                            <Linkedin size={18} />
                                        </Link>
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-[320px] sm:h-[250px] overflow-hidden rounded-b-3xl mt-4">
                                    <img src={member.avatar_url} alt={member.full_name || 'Team Member'} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 flex justify-center">
                        <Link href="/team" className="relative overflow-hidden group bg-white text-[#0C111D] font-bold text-sm px-10 py-4 text-center tracking-wider inline-flex justify-center items-center rounded-full border border-transparent transition-all">
                            <span className="relative z-10 group-hover:text-white transition-colors duration-300">VIEW ALL MEMBERS</span>
                            <div className="absolute inset-0 bg-[#0073BB] transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="bg-[#0C111D] pt-24 pb-12">
                <div className="container px-6 md:px-10 max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12 max-w-3xl mx-auto"
                    >
                        <h2 className="text-white text-4xl md:text-6xl font-serif font-bold leading-tight mb-8">
                            EMBARK ON YOUR CLOUD JOURNEY TODAY.
                        </h2>
                        <p className="text-gray-400 text-lg font-sans mb-10">
                            Join hundreds of students in Nadiad who are accelerating their careers through hands-on AWS experience and community mentorship.
                        </p>
                        <Link href="https://www.meetup.com/aws-sbg-ddit/" target="_blank" className="relative overflow-hidden group border-2 border-[#0073BB] text-white font-bold text-sm px-10 py-4 tracking-widest uppercase inline-flex justify-center items-center">
                            <span className="relative z-10 transition-colors duration-300">BECOME A MEMBER</span>
                            <div className="absolute inset-0 bg-[#0073BB] transform scale-0 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out origin-center"></div>
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}


