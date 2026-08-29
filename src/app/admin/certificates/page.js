"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Award, Search, Download, Plus, Eye, Trash2, FileText, Loader2, X, ShieldCheck, Upload } from "lucide-react";
import { logActivity } from "@/utils/logger";
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
        certificate_type: 'participation',
        template: 'blue'
    });
    const [bulkData, setBulkData] = useState([]);
    const supabase = createClient();

    const fetchCertificates = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('certificates')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setCertificates(data || []);
        setLoading(false);
    }, [supabase]);

    const fetchEvents = useCallback(async () => {
        const { data } = await supabase.from('events').select('id, title').order('created_at', { ascending: false });
        if (data) setEvents(data);
    }, [supabase]);

    useEffect(() => {
        fetchCertificates();
        fetchEvents();
    }, [fetchCertificates, fetchEvents]);

    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length === 0) {
                setFeedback({ message: 'The CSV file is empty.', type: 'error' });
                return;
            }

            const firstLine = lines[0].split(',').map(item => item.trim().replace(/^["']|["']$/g, '').toLowerCase());
            let nameColIdx = -1;
            let emailColIdx = -1;

            nameColIdx = firstLine.findIndex(h => h.includes('name') || h === 'recipient');
            emailColIdx = firstLine.findIndex(h => h.includes('email') || h.includes('mail') || h === 'address');

            let startIndex = 0;
            if (nameColIdx !== -1 && emailColIdx !== -1) {
                startIndex = 1;
            } else {
                nameColIdx = 0;
                emailColIdx = 1;
                startIndex = 0;
            }

            const parsed = [];
            for (let i = startIndex; i < lines.length; i++) {
                const cols = lines[i].split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
                const name = cols[nameColIdx];
                const email = cols[emailColIdx];
                if (name && email && email.includes('@')) {
                    parsed.push({
                        recipient_name: name,
                        recipient_email: email,
                        template: 'blue'
                    });
                }
            }

            if (parsed.length > 0) {
                setBulkData(parsed);
                setNewCert({
                    recipient_name: '',
                    recipient_email: '',
                    event_id: '',
                    certificate_type: 'participation'
                });
                setShowModal(true);
                setFeedback({ message: `Parsed ${parsed.length} recipients from CSV.`, type: 'success' });
            } else {
                setFeedback({ message: 'Failed to parse names and emails. Make sure the CSV has Name and Email columns.', type: 'error' });
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    async function handleIssueCert(e) {
        e.preventDefault();
        setSubmitting(true);

        const eventName = events.find(ev => ev.id === newCert.event_id)?.title || 'Event';

        if (bulkData.length > 0) {
            const insertData = bulkData.map(item => ({
                recipient_name: item.recipient_name,
                recipient_email: item.recipient_email,
                event_id: newCert.event_id,
                event_name: eventName,
                certificate_type: newCert.certificate_type,
                template: item.template,
                status: 'verified'
            }));

            const { data: insertedCerts, error } = await supabase
                .from('certificates')
                .insert(insertData)
                .select('id, recipient_name, recipient_email');

            if (!error) {
                if (insertedCerts && insertedCerts.length > 0) {
                    for (const cert of insertedCerts) {
                        try {
                            await fetch('/api/email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: cert.recipient_email,
                                    type: 'certificateissued',
                                    data: {
                                        name: cert.recipient_name,
                                        eventName: eventName,
                                        certId: cert.id
                                    }
                                })
                            });
                        } catch (err) {
                            console.error("Email notification failed for:", cert.recipient_email, err);
                        }
                    }
                }

                await logActivity(
                    supabase,
                    'Batch Issued Certificates',
                    `Issued ${insertData.length} certificates for event "${eventName}"`,
                    'success'
                );
                setShowModal(false);
                setBulkData([]);
                setNewCert({ recipient_name: '', recipient_email: '', event_id: '', certificate_type: 'participation', template: 'blue' });
                fetchCertificates();
                setFeedback({ message: `Successfully issued ${insertData.length} certificates!`, type: 'success' });
            } else {
                console.error("Supabase Error:", error);
                await logActivity(supabase, 'Batch Certificate Issuance Failed', `Error: ${error.message}`, 'error');
                setFeedback({ message: "Error issuing certificates: " + error.message, type: 'error' });
            }
        } else {
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

                await logActivity(
                    supabase,
                    'Issued Certificate',
                    `Issued certificate to ${newCert.recipient_name} (${newCert.recipient_email}) for "${eventName}"`,
                    'success'
                );
                setShowModal(false);
                setNewCert({ recipient_name: '', recipient_email: '', event_id: '', certificate_type: 'participation', template: 'blue' });
                fetchCertificates();
                setFeedback({ message: 'Certificate issued successfully!', type: 'success' });
            } else {
                console.error("Supabase Error:", error);
                await logActivity(supabase, 'Certificate Issuance Failed', `Error: ${error.message}`, 'error');
                setFeedback({ message: "Error issuing certificate: " + error.message, type: 'error' });
            }
        }
        setSubmitting(false);
    }

    async function handleDelete(id) {
        if (confirm("Delete this certificate?")) {
            setProcessingId(id);
            const certToDelete = certificates.find(c => c.id === id);
            const { error } = await supabase.from("certificates").delete().eq("id", id);
            if (!error) {
                await logActivity(
                    supabase,
                    'Deleted Certificate',
                    `Deleted certificate for ${certToDelete?.recipient_name || id} (Event: ${certToDelete?.event_name || 'Event'})`,
                    'warning'
                );
                setFeedback({ message: "Certificate deleted!", type: "info" });
                fetchCertificates();
            } else {
                setFeedback({ message: "Delete failed: " + error.message, type: "error" });
            }
            setProcessingId(null);
        }
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
                <div className="flex items-center gap-4">
                    <label className="btn-outline px-6 py-4 flex items-center gap-3 cursor-pointer">
                        <Upload size={20} /> Upload CSV
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVUpload}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={() => {
                            setBulkData([]);
                            setShowModal(true);
                        }}
                        className="btn-primary px-8 py-4 flex items-center gap-3 shadow-[0_0_30px_rgba(0,194,255,0.2)]"
                    >
                        <Plus size={20} /> Issue Certificate
                    </button>
                </div>
            </div>

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
                                    className="btn-crud-edit"
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
                                    className="btn-crud-edit"
                                    title="Download Certificate"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    disabled={processingId === cert.id}
                                    onClick={() => handleDelete(cert.id)}
                                    className="btn-crud-delete disabled:opacity-50"
                                >
                                    {processingId === cert.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

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
                        className={`glass-card w-full p-10 relative z-10 border-white/10 transition-all duration-300 ${bulkData.length > 0 ? 'max-w-2xl' : 'max-w-xl'}`}
                    >
                        {bulkData.length > 0 ? (
                            <>
                                <h2 className="text-3xl font-black text-white mb-6">Issue Bulk <span className="text-brand-cyan">Certificates</span></h2>
                                <form onSubmit={handleIssueCert} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Recipients List ({bulkData.length})</label>
                                        <div className="max-h-60 overflow-y-auto border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="sticky top-0 bg-brand-dark border-b border-white/10 text-white/40">
                                                    <tr>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px]">Name</th>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px]">Email</th>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px]">Template</th>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px] text-center w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bulkData.map((item, idx) => (
                                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="px-2 py-1.5 text-white">
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    value={item.recipient_name}
                                                                    onChange={(e) => {
                                                                        const updated = [...bulkData];
                                                                        updated[idx].recipient_name = e.target.value;
                                                                        setBulkData(updated);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:border-brand-cyan outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1.5 text-white">
                                                                <input
                                                                    type="email"
                                                                    required
                                                                    value={item.recipient_email}
                                                                    onChange={(e) => {
                                                                        const updated = [...bulkData];
                                                                        updated[idx].recipient_email = e.target.value;
                                                                        setBulkData(updated);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white/80 text-xs font-medium focus:border-brand-cyan outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <select
                                                                    value={item.template}
                                                                    onChange={(e) => {
                                                                        const updated = [...bulkData];
                                                                        updated[idx].template = e.target.value;
                                                                        setBulkData(updated);
                                                                    }}
                                                                    className="bg-brand-dark border border-white/10 rounded-lg px-2 py-1.5 text-white text-[10px] font-bold focus:border-brand-cyan outline-none cursor-pointer font-sans"
                                                                >
                                                                    <option value="blue">Green</option>
                                                                    <option value="purple">Purple</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-2 py-1.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...bulkData];
                                                                        updated.splice(idx, 1);
                                                                        setBulkData(updated);
                                                                    }}
                                                                    className="text-white/30 hover:text-red-400 p-1 transition-colors"
                                                                    title="Remove Recipient"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Select Event</label>
                                        <select
                                            required
                                            value={newCert.event_id}
                                            onChange={e => setNewCert({ ...newCert, event_id: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold cursor-pointer font-sans"
                                        >
                                            <option value="" className="bg-brand-dark">Select Event</option>
                                            {events.map(event => (
                                                <option key={event.id} value={event.id} className="bg-brand-dark">{event.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={() => { setShowModal(false); setBulkData([]); }} className="flex-grow btn-secondary py-4 font-black uppercase tracking-widest">Cancel</button>
                                        <button type="submit" disabled={submitting} className="flex-grow btn-primary py-4 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                                            {submitting ? 'Issuing...' : 'Confirm Issue'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
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
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Template Color</label>
                                        <select
                                            required
                                            value={newCert.template}
                                            onChange={e => setNewCert({ ...newCert, template: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold cursor-pointer font-sans"
                                        >
                                            <option value="blue" className="bg-brand-dark font-sans">Green</option>
                                            <option value="purple" className="bg-brand-dark font-sans">Purple</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Select Event</label>
                                        <select
                                            required
                                            value={newCert.event_id}
                                            onChange={e => setNewCert({ ...newCert, event_id: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold cursor-pointer font-sans"
                                        >
                                            <option value="" className="bg-brand-dark">Select Event</option>
                                            {events.map(event => (
                                                <option key={event.id} value={event.id} className="bg-brand-dark">{event.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={() => setShowModal(false)} className="flex-grow btn-secondary py-4 font-black uppercase tracking-widest">Cancel</button>
                                        <button type="submit" disabled={submitting} className="flex-grow btn-primary py-4 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                                            {submitting ? 'Issuing...' : 'Confirm Issue'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Preview Modal */}
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
                        className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-6"
                    >
                        <div className="flex items-center justify-between w-full text-white/40 font-bold px-4">
                            <span className="text-xs font-black uppercase tracking-widest">Preview Mode · {showPreview.recipient_name}</span>
                            <button onClick={() => setShowPreview(null)} className="hover:text-white transition-colors"><X size={24} /></button>
                        </div>

                        <div className="w-full bg-[#05080f] p-8 rounded-3xl border border-white/10 flex flex-col items-center">
                            <div className="text-center py-12 space-y-4">
                                <Award size={64} className="text-brand-cyan mx-auto animate-bounce" />
                                <h2 className="text-3xl font-black text-white">{showPreview.recipient_name}</h2>
                                <p className="text-white/60">{showPreview.event_name}</p>
                                <span className="inline-block px-4 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-black uppercase tracking-widest">
                                    ID: {showPreview.id}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
