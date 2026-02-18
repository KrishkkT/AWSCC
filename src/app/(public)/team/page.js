"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Instagram } from "lucide-react";

export default function Team() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchTeam() {
            setLoading(true);
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('display_order', { ascending: true });

            if (data) {
                setTeam(data);
            }
            setLoading(false);
        }
        fetchTeam();
    }, []);

    const TeamSection = ({ title, members, isCaptain = false }) => {
        if (members.length === 0) return null;

        return (
            <div className="space-y-12">
                <div className="flex items-center gap-6">
                    <h2 className="text-3xl font-black text-white whitespace-nowrap">{title}</h2>
                    <div className="h-px bg-white/5 w-full"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-8">
                    {members.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card p-6 text-center group border-white/5 hover:border-brand-cyan/20 relative mx-auto w-full max-w-[400px]"
                        >
                            <div className="w-32 h-32 mx-auto mb-6 rounded-full p-1 bg-gradient-to-tr from-brand-cyan via-brand-purple to-brand-teal relative">
                                <div className="w-full h-full rounded-full overflow-hidden bg-brand-dark">
                                    <img
                                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=0A0A0A&color=fff`}
                                        alt={member.full_name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-brand-cyan transition-colors">{member.full_name}</h3>
                            <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 border-b border-white/5 pb-4">
                                {member.role_title}
                            </div>

                            {/* Social Links */}
                            <div className="flex justify-center gap-4 text-white/40">
                                {member.github_url && <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Github size={18} /></a>}
                                {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue transition-colors"><Linkedin size={18} /></a>}
                                {member.instagram_url && <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors"><Instagram size={18} /></a>}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-brand-dark pt-32 pb-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-teal/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h1 className="text-5xl font-black mb-6">Meet the <span className="text-brand-cyan">Team</span></h1>
                    <p className="text-white/60 text-xl font-medium">
                        The passionate individuals driving the cloud revolution at DDU.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
                    </div>
                ) : team.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-white/30 text-lg">No team members found.</p>
                    </div>
                ) : (
                    <div className="space-y-24">
                        {/* 1. Mentors Section */}
                        <TeamSection
                            title="Mentors"
                            members={team.filter(m => m.category === 'Mentor')}
                        />

                        {/* 2. Captain Section */}
                        <TeamSection
                            title="Captain"
                            members={team.filter(m => m.category === 'Captain')}
                            isCaptain
                        />

                        {/* 3. Core Team Section */}
                        <TeamSection
                            title="Team"
                            members={team.filter(m => m.category === 'Team')}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
