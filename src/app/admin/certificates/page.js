"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Award, Search, Download, Plus, Eye, Trash2, FileText, Loader2, X, ShieldCheck } from "lucide-react";
import Toast from "@/components/Toast";
import { generateCertificatePDF } from "@/utils/pdfGenerator";

export default function AdminCertificates() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [events, setEvents] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showPreview, setShowPreview] = useState(null);
    const certificateRef = useRef(null);
    const [newCert, setNewCert] = useState({
        recipient_name: '',
        recipient_email: '',
        event_id: '',
        certificate_type: 'participation'
    });
    const supabase = createClient();

    useEffect(() => {
        fetchCertificates();
        fetchEvents();
    }, []);

    async function fetchCertificates() {
        setLoading(true);
        const { data, error } = await supabase
            .from('certificates')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setCertificates(data || []);
        setLoading(false);
    }

    async function fetchEvents() {
        const { data } = await supabase.from('events').select('id, title').order('created_at', { ascending: false });
        if (data) setEvents(data);
    }

    async function handleIssueCert(e) {
        e.preventDefault();
        setSubmitting(true);

        const eventName = events.find(ev => ev.id === newCert.event_id)?.title || 'Event';

        const { data: certData, error } = await supabase
            .from('certificates')
            .insert([{
                ...newCert,
                event_name: eventName,
                status: 'verified'
            }])
            .select('id')
            .single();

        if (!error) {
            try {
                await fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: newCert.recipient_email,
                        type: 'certificateissued',
                        data: {
                            name: newCert.recipient_name,
                            eventName: eventName,
                            certId: certData.id
                        }
                    })
                });
            } catch (err) {
                console.error("Email notification failed:", err);
            }

            setShowModal(false);
            setNewCert({ recipient_name: '', recipient_email: '', event_id: '', certificate_type: 'participation' });
            fetchCertificates();
            setFeedback({ message: 'Certificate issued successfully!', type: 'success' });
        } else {
            console.error("Supabase Error:", error);
            setFeedback({ message: "Error issuing certificate: " + error.message, type: 'error' });
        }
        setSubmitting(false);
    }

    const filtered = (certificates || []).filter(c =>
        (c.recipient_name || c.event_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10">
            {feedback && (
                <Toast
                    message={feedback.message}
                    type={feedback.type}
                    onClose={() => setFeedback(null)}
                />
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-white mb-2 tracking-tight">
                        Certificate <span className="text-brand-cyan">Engine</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Issue, track, and verify event certificates.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary px-8 py-4 flex items-center gap-3 shadow-[0_0_30px_rgba(0,194,255,0.2)]"
                >
                    <Plus size={20} /> Issue Certificate
                </button>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="glass-card w-full max-w-xl p-10 relative z-10 border-white/10"
                    >
                        <h2 className="text-3xl font-black text-white mb-8">Issue <span className="text-brand-cyan">Certificate</span></h2>
                        <form onSubmit={handleIssueCert} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Recipient Name</label>
                                <input
                                    required type="text"
                                    value={newCert.recipient_name}
                                    onChange={e => setNewCert({ ...newCert, recipient_name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold"
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Recipient Email</label>
                                <input
                                    required type="email"
                                    value={newCert.recipient_email}
                                    onChange={e => setNewCert({ ...newCert, recipient_email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Select Event</label>
                                    <select
                                        required
                                        value={newCert.event_id}
                                        onChange={e => setNewCert({ ...newCert, event_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold"
                                    >
                                        <option value="" className="bg-brand-dark">Select Event</option>
                                        {events.map(event => (
                                            <option key={event.id} value={event.id} className="bg-brand-dark">{event.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Cert Type</label>
                                    <select
                                        required
                                        value={newCert.certificate_type}
                                        onChange={e => setNewCert({ ...newCert, certificate_type: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold"
                                    >
                                        <option value="participation" className="bg-brand-dark">Participation</option>
                                        <option value="excellence" className="bg-brand-dark">Excellence</option>
                                        <option value="winner" className="bg-brand-dark">Winner</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-grow btn-secondary py-4 font-black uppercase tracking-widest">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-grow btn-primary py-4 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                                    {submitting ? 'Issuing...' : 'Confirm Issue'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Total Issued", value: certificates.length, color: "cyan" },
                    { label: "Pending", value: (certificates || []).filter(c => c.status === 'pending').length, color: "teal" },
                    { label: "Verified", value: (certificates || []).filter(c => c.status === 'verified').length, color: "white" },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6 border-white/5">
                        <div className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">{stat.label}</div>
                        <div className={`text-3xl font-black text-brand-${stat.color} tracking-tighter`}>{stat.value}</div>
                    </motion.div>
                ))}
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 max-w-md group focus-within:border-brand-cyan/50 transition-all">
                <Search size={16} className="text-white/20 group-focus-within:text-brand-cyan" />
                <input type="text" placeholder="Search certificates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white placeholder-white/20 w-full font-bold" />
            </div>

            {loading ? (
                <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse py-20 text-center">Loading Certificates...</div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-16 text-center border-white/5">
                    <Award size={48} className="text-white/10 mx-auto mb-6" />
                    <p className="text-white/30 font-bold mb-2">No certificates issued yet.</p>
                    <p className="text-white/20 text-sm">Certificates will appear here after events are completed.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((cert, i) => (
                        <motion.div key={cert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-5 border-white/5 hover:border-white/10 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-white text-sm">{cert.recipient_name}</div>
                                    <div className="text-xs text-white/30">{cert.event_name} · {new Date(cert.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowPreview(cert)}
                                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-brand-cyan hover:border-brand-cyan/50 transition-all"
                                    title="Preview Certificate"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    onClick={async () => {
                                        setProcessingId(cert.id);
                                        setShowPreview(cert);
                                        setProcessingId(null);
                                    }}
                                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-brand-cyan hover:border-brand-cyan/50 transition-all"
                                    title="Download Certificate"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    disabled={processingId === cert.id}
                                    onClick={async () => {
                                        if (confirm("Delete this certificate?")) {
                                            setProcessingId(cert.id);
                                            const { error } = await supabase.from("certificates").delete().eq("id", cert.id);
                                            if (!error) {
                                                setFeedback({ message: "Certificate deleted!", type: "info" });
                                                fetchCertificates();
                                            } else {
                                                setFeedback({ message: "Delete failed: " + error.message, type: "error" });
                                            }
                                            setProcessingId(null);
                                        }
                                    }}
                                    className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {processingId === cert.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Preview & Download Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        onClick={() => setShowPreview(null)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl bg-white"
                    >
                        {/* Control Bar */}
                        <div className="absolute top-6 right-6 z-20 flex gap-3">
                            <button
                                onClick={() => generateCertificatePDF(certificateRef, showPreview.recipient_name)}
                                disabled={submitting}
                                className="bg-brand-cyan text-brand-dark px-8 py-4 flex items-center gap-3 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_rgba(0,194,255,0.4)]"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Download size={20} />}
                                Download PDF
                            </button>
                            <button onClick={() => setShowPreview(null)} className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md">
                                <X size={28} />
                            </button>
                        </div>

                        {/* PREMIUM CERTIFICATE UI */}
                        <div
                            ref={certificateRef}
                            className="w-full aspect-[1.414/1] bg-white relative overflow-hidden flex items-center justify-center"
                            style={{ fontFamily: "'Cinzel', serif" }}
                        >
                            {/* Template Background Overlay (Original PNG) */}
                            <img
                                src="/templates/attendee_template.png"
                                className="absolute inset-0 w-full h-full object-contain"
                                alt="Certificate Template"
                            />

                            {/* Dynamic Content Overlay */}
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-24 text-center">
                                <div className="space-y-4">
                                    <p className="text-[#C5A059] font-black uppercase tracking-[0.3em] text-[10px]">Certificate of {showPreview.certificate_type || 'Achievement'}</p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[#666] italic text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        This is to certify that
                                    </p>
                                    <h1 className="text-[#1A1A1A] text-4xl font-bold tracking-tight border-b-2 border-[#C5A059]/30 inline-block pb-1 px-8">
                                        {showPreview.recipient_name}
                                    </h1>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[#444] text-base">
                                        has successfully completed the workshop on
                                    </p>
                                    <h2 className="text-[#C5A059] text-2xl font-black uppercase tracking-[0.2em]">
                                        {showPreview.event_name}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-2 w-full px-20 text-left pt-12">
                                    <div className="space-y-1">
                                        <p className="text-[7px] text-[#C5A059] font-black uppercase tracking-widest">Verification ID</p>
                                        <p className="text-[10px] font-bold text-[#1A1A1A]">{showPreview.id.substring(0, 12).toUpperCase()}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[7px] text-[#C5A059] font-black uppercase tracking-widest">Date of Issue</p>
                                        <p className="text-[10px] font-bold text-[#1A1A1A]">{new Date(showPreview.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
