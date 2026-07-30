"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Instagram, Users, Globe } from "lucide-react";

export default function Team() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchTeam = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .order('display_order', { ascending: true });

        if (data) {
            setTeam(data);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    const TeamSection = ({ title, members }) => {
        if (members.length === 0) return null;

        return (
            <div className="space-y-12">
                <div className="flex flex-col items-center gap-4 text-center">
                    <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">{title}</h2>
                    <div className="h-1 w-20 bg-brand-aws rounded-full"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-10">
                    {members.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative w-full max-w-[320px] rounded-[30px] overflow-hidden bg-[#080B13] border border-white/10 hover:border-brand-aws/40 transition-all duration-500 shadow-2xl flex flex-col h-[420px]"
                        >
                            {/* Image Section */}
                            <div className="absolute inset-0 w-full h-full overflow-hidden">
                                <img
                                    src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=111111&color=fff`}
                                    alt={member.full_name}
                                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#080B13] via-[#080B13]/40 to-transparent"></div>
                            </div>

                            {/* Content Section */}
                            <div className="relative z-10 flex-grow flex flex-col justify-end p-6 text-center">
                                <div className="mt-auto">
                                    <h3 className="text-2xl font-display font-bold text-white mb-1 drop-shadow-lg">{member.full_name}</h3>
                                    <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-cyan mb-4 drop-shadow-md">
                                        {member.role_title}
                                    </div>

                                    {/* Social Links */}
                                    <div className="flex justify-center gap-4 pt-2">
                                        {member.github_url && (
                                            <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white hover:bg-black transition-all transform hover:-translate-y-1 bg-white/10 backdrop-blur-sm p-2 rounded-full border border-white/10 hover:border-black">
                                                <Github size={18} />
                                            </a>
                                        )}
                                        {member.linkedin_url && (
                                            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white hover:bg-[#0073BB] transition-all transform hover:-translate-y-1 bg-white/10 backdrop-blur-sm p-2 rounded-full border border-white/10 hover:border-[#0073BB]">
                                                <Linkedin size={18} />
                                            </a>
                                        )}
                                        {member.instagram_url && (
                                            <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white hover:bg-[#E1306C] transition-all transform hover:-translate-y-1 bg-white/10 backdrop-blur-sm p-2 rounded-full border border-white/10 hover:border-[#E1306C]">
                                                <Instagram size={18} />
                                            </a>
                                        )}
                                        {member.portfolio_url && (
                                            <a href={member.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white hover:bg-purple-600 transition-all transform hover:-translate-y-1 bg-white/10 backdrop-blur-sm p-2 rounded-full border border-white/10 hover:border-purple-600" title="Portfolio Website">
                                                <Globe size={18} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        Council & Core
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground mb-8 tracking-tight">
                        Meet the <span className="text-brand-aws">Architects</span>
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
                        A dedicated assembly of cloud-native builders pushing the boundaries of technology at DDU.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-secondary border-t-brand-aws rounded-full animate-spin"></div>
                        <p className="text-muted-foreground font-medium animate-pulse">Initializing crew...</p>
                    </div>
                ) : team.length === 0 ? (
                    <div className="text-center py-20 bg-secondary/30 rounded-[2.5rem] border border-border border-dashed max-w-2xl mx-auto">
                        <Users size={64} className="mx-auto text-muted-foreground/20 mb-6" />
                        <h3 className="text-2xl font-display font-bold text-muted-foreground">No architects active!</h3>
                    </div>
                ) : (
                    <div className="space-y-32">
                        {/* 1. Mentors Section */}
                        <TeamSection
                            title="Academic Mentors"
                            members={team.filter(m => m.category === 'Mentor')}
                        />

                        {/* 2. Leader Section */}
                        <TeamSection
                            title="Club Leaders"
                            members={team.filter(m => m.category === 'Leader' || m.category === 'Captain')}
                        />

                        {/* 3. Core Team Section */}
                        <TeamSection
                            title="Core Committee"
                            members={team.filter(m => m.category === 'Team')}
                        />

                        {/* 4. Founding Leaders Section */}
                        <TeamSection
                            title="Founding Leaders"
                            members={team.filter(m => m.category === 'Founding')}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
