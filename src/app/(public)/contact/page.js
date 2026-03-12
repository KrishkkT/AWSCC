"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Send, MapPin, Mail } from "lucide-react";

export default function Contact() {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success', 'error'

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message'),
        };

        const { error } = await supabase.from('contact_messages').insert([data]);

        if (error) {
            console.error(error);
            setStatus('error');
        } else {
            setStatus('success');
            e.target.reset();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-brand-deep pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

                    {/* Info Side */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-12"
                    >
                        <div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-block px-4 py-1.5 rounded-full bg-brand-aws/10 border border-brand-aws/20 text-brand-aws text-[10px] font-bold uppercase tracking-widest mb-6"
                            >
                                Get in Touch
                            </motion.div>
                            <h1 className="text-5xl md:text-6xl font-display font-bold text-white mb-8 tracking-tight">
                                Let's <span className="text-brand-aws">Connect</span>
                            </h1>
                            <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-lg">
                                Have questions about workshops, certifications, or partnerships?
                                Reach out and our team will get back to you within 24 hours.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {[
                                {
                                    title: "Official Email",
                                    value: "awscloudclub@ddu.ac.in",
                                    icon: Mail,
                                    label: "Primary Contact"
                                },
                                {
                                    title: "Visit Us",
                                    value: "Dharmsinh Desai University, Nadiad",
                                    icon: MapPin,
                                    label: "Faculty of Technology"
                                }
                            ].map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * idx }}
                                    className="card-professional flex items-start gap-6 p-8"
                                >
                                    <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center text-brand-aws shrink-0 border border-slate-700/50 shadow-inner">
                                        <item.icon size={28} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{item.label}</div>
                                        <h3 className="text-xl font-display font-bold text-white mb-1">{item.title}</h3>
                                        <p className="text-slate-400 font-medium">{item.value}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Form Side */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="card-professional p-12 relative shadow-3xl"
                    >
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                                    <input required name="name" type="text" className="w-full" placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                                    <input required name="email" type="email" className="w-full" placeholder="john@ddu.ac.in" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Subject</label>
                                <input required name="subject" type="text" className="w-full" placeholder="Workshop Inquiry / Partnership" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Detailed Message</label>
                                <textarea required name="message" rows={6} className="w-full resize-none" placeholder="Tell us more about your inquiry..."></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-aws py-5 text-sm font-bold flex items-center justify-center gap-3 group transition-all duration-300"
                            >
                                {loading ? 'Transmitting...' : 'Dispatch Message'}
                                {!loading && <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                            </button>

                            {status === 'success' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm text-center font-bold"
                                >
                                    Transmission successful! We'll reply shortly.
                                </motion.div>
                            )}
                            {status === 'error' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm text-center font-bold"
                                >
                                    Sync failure. Please check your connection.
                                </motion.div>
                            )}
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
