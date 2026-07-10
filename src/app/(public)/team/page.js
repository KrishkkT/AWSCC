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
                            className="card-professional p-8 text-center group border-border relative max-w-[320px] w-full"
                        >
                            <div className="w-32 h-32 mx-auto mb-8 rounded-2xl p-0.5 bg-secondary relative group-hover:bg-brand-aws transition-all duration-500 overflow-hidden group-hover:shadow-[0_0_20px_rgba(255,153,0,0.4)] group-hover:scale-105">
                                <div className="w-full h-full rounded-2xl overflow-hidden bg-background">
                                    <img
                                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=111111&color=fff`}
                                        alt={member.full_name}
                                        className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-2 group-hover:brightness-110 transition-all duration-700"
                                    />
                                </div>
                            </div>

                            <h3 className="text-xl font-display font-bold text-foreground mb-2 group-hover:text-brand-aws transition-colors">{member.full_name}</h3>
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-8 pb-6 border-b border-border">
                                {member.role_title}
                            </div>

                            {/* Social Links */}
                            <div className="flex justify-center gap-6 text-muted-foreground">
                                {member.github_url && (
                                    <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-all transform hover:-translate-y-1">
                                        <Github size={20} />
                                    </a>
                                )}
                                {member.linkedin_url && (
                                    <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue transition-all transform hover:-translate-y-1">
                                        <Linkedin size={20} />
                                    </a>
                                )}
                                {member.instagram_url && (
                                    <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-aws transition-all transform hover:-translate-y-1">
                                        <Instagram size={20} />
                                    </a>
                                )}
                                {member.portfolio_url && (
                                    <a href={member.portfolio_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-cyan transition-all transform hover:-translate-y-1" title="Portfolio Website">
                                        <Globe size={20} />
                                    </a>
                                )}
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
