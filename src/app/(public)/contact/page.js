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
        <div className="min-h-screen bg-background pt-32 pb-24 relative overflow-hidden">
            <div className="fixed inset-0 bg-slate-grid pointer-events-none"></div>

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
                            <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground mb-8 tracking-tight">
                                Let&apos;s <span className="text-brand-aws">Connect</span>
                            </h1>
                            <p className="text-muted-foreground text-lg md:text-xl font-medium leading-relaxed max-w-lg">
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
                                    className="card-professional flex items-start gap-6 p-8 shadow-sm"
                                >
                                    <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center text-brand-aws shrink-0 border border-border/50 shadow-inner">
                                        <item.icon size={28} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{item.label}</div>
                                        <h3 className="text-xl font-display font-bold text-foreground mb-1">{item.title}</h3>
                                        <p className="text-muted-foreground font-medium">{item.value}</p>
                                    </div>
                                </motion.div>
                            ))}
                            
                            {/* DDU Map Location Box */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="card-professional overflow-hidden shadow-sm h-56 relative rounded-3xl border border-border/50 group"
                            >
                                <iframe 
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3683.003319080649!2d72.8687790757271!3d22.68612197941094!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e5b206cd2dbaf%3A0xe549b062ca61665e!2sDharmsinh%20Desai%20University!5e0!3m2!1sen!2sin!4v1710928000000!5m2!1sen!2sin" 
                                    className="w-full h-full grayscale-[20%] contrast-[1.1] group-hover:grayscale-0 transition-all duration-500"
                                    style={{ border: 0 }} 
                                    allowFullScreen="" 
                                    loading="lazy" 
                                    title="Dharmsinh Desai University Map"
                                ></iframe>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Form Side */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="card-professional p-12 relative shadow-2xl"
                    >
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                    <div className="relative">
                                        <input required name="name" type="text" className="w-full bg-secondary transition-all focus:bg-background" placeholder="Mukesh Ambani" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                    <div className="relative">
                                        <input required name="email" type="email" className="w-full bg-secondary transition-all focus:bg-background" placeholder="mukesh@gmail.com" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Subject</label>
                                <div className="relative">
                                    <input required name="subject" type="text" className="w-full bg-secondary transition-all focus:bg-background" placeholder="Workshop Inquiry / Partnership" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Detailed Message</label>
                                <div className="relative">
                                    <textarea required name="message" rows={6} className="w-full resize-none bg-secondary transition-all focus:bg-background" placeholder="Tell us more about your inquiry..."></textarea>
                                </div>
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
                                    className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-600 dark:text-green-400 text-sm text-center font-bold"
                                >
                                    Transmission successful! We&apos;ll reply shortly.
                                </motion.div>
                            )}
                            {status === 'error' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-500 text-sm text-center font-bold"
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
