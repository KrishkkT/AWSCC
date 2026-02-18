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
        <div className="min-h-screen bg-brand-dark pt-32 pb-20 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-deep to-brand-dark pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                    {/* Info Side */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-12"
                    >
                        <div>
                            <h1 className="text-5xl font-black mb-6">Let's <span className="text-brand-cyan">Connect</span></h1>
                            <p className="text-white/60 text-lg font-medium leading-relaxed">
                                Have questions about the club? Want to partner with us for an event?
                                We'd love to hear from you.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="glass-card p-6 flex items-start gap-6 border-white/5">
                                <div className="w-12 h-12 bg-brand-cyan/10 rounded-xl flex items-center justify-center text-brand-cyan shrink-0">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">Email Us</h3>
                                    <p className="text-white/50">awscloudclub@ddu.ac.in</p>
                                </div>
                            </div>
                            <div className="glass-card p-6 flex items-start gap-6 border-white/5">
                                <div className="w-12 h-12 bg-brand-teal/10 rounded-xl flex items-center justify-center text-brand-teal shrink-0">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">Visit Us</h3>
                                    <p className="text-white/50">
                                        Faculty of Technology,<br />
                                        Dharmsinh Desai University,<br />
                                        Nadiad, Gujarat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Form Side */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-10 border-white/10 relative"
                    >
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-white/40">Name</label>
                                    <input required name="name" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all outline-none" placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-white/40">Email</label>
                                    <input required name="email" type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all outline-none" placeholder="john@example.com" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Subject</label>
                                <input required name="subject" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all outline-none" placeholder="Workshop Inquiry" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Message</label>
                                <textarea required name="message" rows={5} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all outline-none" placeholder="How can we help you?"></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-4 text-sm flex items-center justify-center gap-2 group"
                            >
                                {loading ? 'Sending...' : 'Send Message'}
                                {!loading && <Send size={16} className="group-hover:translate-x-1 transition-transform" />}
                            </button>

                            {status === 'success' && (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center font-bold animate-in fade-in slide-in-from-bottom-2">
                                    Message sent successfully! We'll get back to you soon.
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center font-bold animate-in fade-in slide-in-from-bottom-2">
                                    Something went wrong. Please try again later.
                                </div>
                            )}
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
