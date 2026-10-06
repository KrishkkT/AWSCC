"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Search, Download, Plus, Eye, Trash2, FileText, Loader2, X, ShieldCheck, Upload, Archive, CheckSquare, Square, Image as ImageIcon, Check } from "lucide-react";
import { logActivity } from "@/utils/logger";
import Toast from "@/components/Toast";
import JSZip from "jszip";
import { generateCertificatePDF, generateCertificatePDFBlob, generateCertificateImageBlob, parseCertificateEvent } from "@/utils/pdfGenerator";
import { parseCSVRecipients } from "@/utils/csvParser";
import CertificateTemplate from "@/components/CertificateTemplate";

export default function AdminCertificates() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [events, setEvents] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [zipProgress, setZipProgress] = useState({ current: 0, total: 0, active: false, type: '' });
    const [feedback, setFeedback] = useState(null);
    const [showPreview, setShowPreview] = useState(null);
    const [bulkStats, setBulkStats] = useState(null);
    const [useCustomEvent, setUseCustomEvent] = useState(false);
    const certificateRef = useRef(null);
    const [newCert, setNewCert] = useState({
        recipient_name: '',
        recipient_email: '',
        event_id: '',
        custom_event_title: '',
        intro_text: 'for successfully attending the',
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
            const parseResult = parseCSVRecipients(text);

            if (!parseResult.success) {
                setFeedback({ message: parseResult.error || 'Failed to parse CSV.', type: 'error' });
                return;
            }

            setBulkData(parseResult.recipients);
            setBulkStats({
                total: parseResult.totalParsed,
                duplicates: parseResult.duplicateCount,
                invalid: parseResult.invalidCount
            });
            setNewCert({
                recipient_name: '',
                recipient_email: '',
                event_id: '',
                custom_event_title: '',
                intro_text: 'for successfully attending the',
                certificate_type: 'participation'
            });
            setShowModal(true);

            let msg = `Loaded ${parseResult.totalParsed} attendees from CSV.`;
            if (parseResult.duplicateCount > 0) {
                msg += ` (${parseResult.duplicateCount} duplicate emails removed)`;
            }
            setFeedback({ message: msg, type: 'success' });
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    async function handleIssueCert(e) {
        e.preventDefault();
        setSubmitting(true);

        const selectedEvent = events.find(ev => ev.id === newCert.event_id);
        const eventName = useCustomEvent
            ? (newCert.custom_event_title.trim() || 'AWS Community Event')
            : (newCert.custom_event_title.trim() || selectedEvent?.title || 'AWS Community Event');
        const targetEventId = useCustomEvent || newCert.event_id === '__custom__' ? null : (newCert.event_id || null);
        const introPhrase = (newCert.intro_text && newCert.intro_text.trim()) || 'for successfully attending the';
        const storedEventName = introPhrase !== 'for successfully attending the' ? `${introPhrase}:::${eventName}` : eventName;

        if (bulkData.length > 0) {
            try {
                // Call dedicated bulk issuance API with chunking and rate-limited email queue
                const res = await fetch('/api/certificates/bulk-issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId: targetEventId,
                        customEventTitle: storedEventName,
                        introText: introPhrase,
                        recipients: bulkData
                    })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to issue bulk certificates');
                }

                await logActivity(
                    supabase,
                    'Batch Issued Certificates',
                    `Issued ${data.issuedCount} certificates (${data.emailsSent} emails sent) for event "${eventName}"`,
                    'success'
                );

                setShowModal(false);
                setBulkData([]);
                setBulkStats(null);
                setUseCustomEvent(false);
                setNewCert({ recipient_name: '', recipient_email: '', event_id: '', custom_event_title: '', intro_text: 'for successfully attending the', certificate_type: 'participation', template: 'blue' });
                await fetchCertificates();
                setFeedback({
                    message: `Successfully issued ${data.issuedCount} certificates! (${data.emailsSent} notification emails sent securely via Nodemailer).`,
                    type: 'success'
                });
            } catch (err) {
                console.error("Bulk issuance failed:", err);
                await logActivity(supabase, 'Batch Certificate Issuance Failed', `Error: ${err.message}`, 'error');
                setFeedback({ message: "Error issuing certificates: " + err.message, type: 'error' });
            }
        } else {
            const { data: certData, error } = await supabase
                .from('certificates')
                .insert([{
                    recipient_name: newCert.recipient_name,
                    recipient_email: newCert.recipient_email,
                    event_id: targetEventId,
                    event_name: storedEventName,
                    certificate_type: newCert.certificate_type,
                    template: 'blue',
                    status: 'verified'
                }])
                .select('id')
                .single();

            if (!error && certData) {
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
                setUseCustomEvent(false);
                setNewCert({ recipient_name: '', recipient_email: '', event_id: '', custom_event_title: '', intro_text: 'for successfully attending the', certificate_type: 'participation', template: 'blue' });
                await fetchCertificates();
                setFeedback({ message: 'Certificate issued and notification email sent successfully!', type: 'success' });
            } else {
                console.error("Supabase Error:", error);
                await logActivity(supabase, 'Certificate Issuance Failed', `Error: ${error?.message}`, 'error');
                setFeedback({ message: "Error issuing certificate: " + (error?.message || 'Unknown error'), type: 'error' });
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
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
                setFeedback({ message: "Certificate deleted!", type: "info" });
                fetchCertificates();
            } else {
                setFeedback({ message: "Delete failed: " + error.message, type: "error" });
            }
            setProcessingId(null);
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length && filtered.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(c => c.id)));
        }
    };

    const handleDownloadPNGZip = async () => {
        const selectedCerts = certificates.filter(c => selectedIds.has(c.id));
        if (selectedCerts.length === 0) return;

        setZipProgress({ current: 0, total: selectedCerts.length, active: true, type: 'PNG' });
        try {
            const zip = new JSZip();
            const folder = zip.folder("certificates_png");

            for (let i = 0; i < selectedCerts.length; i++) {
                const cert = selectedCerts[i];
                setZipProgress({ current: i + 1, total: selectedCerts.length, active: true, type: 'PNG' });
                const blob = await generateCertificateImageBlob(cert);
                if (blob) {
                    const cleanName = (cert.recipient_name || `cert_${i + 1}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
                    const filename = `${cleanName}_${cert.id.slice(0, 8)}.png`;
                    folder.file(filename, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `AWSCC_Certificates_PNG_${Date.now()}.zip`;
            link.click();
            URL.revokeObjectURL(url);

            setFeedback({ message: `Successfully downloaded ${selectedCerts.length} certificates in PNG ZIP!`, type: "success" });
        } catch (err) {
            console.error("ZIP Generation failed:", err);
            setFeedback({ message: `Failed to create PNG ZIP: ${err.message}`, type: "error" });
        } finally {
            setZipProgress({ current: 0, total: 0, active: false, type: '' });
        }
    };

    const handleDownloadPDFZip = async () => {
        const selectedCerts = certificates.filter(c => selectedIds.has(c.id));
        if (selectedCerts.length === 0) return;

        setZipProgress({ current: 0, total: selectedCerts.length, active: true, type: 'PDF' });
        try {
            const zip = new JSZip();
            const folder = zip.folder("certificates_pdf");

            for (let i = 0; i < selectedCerts.length; i++) {
                const cert = selectedCerts[i];
                setZipProgress({ current: i + 1, total: selectedCerts.length, active: true, type: 'PDF' });
                const blob = await generateCertificatePDFBlob(cert);
                if (blob) {
                    const cleanName = (cert.recipient_name || `cert_${i + 1}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
                    const filename = `${cleanName}_${cert.id.slice(0, 8)}.pdf`;
                    folder.file(filename, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `AWSCC_Certificates_PDF_${Date.now()}.zip`;
            link.click();
            URL.revokeObjectURL(url);

            setFeedback({ message: `Successfully downloaded ${selectedCerts.length} certificates in PDF ZIP!`, type: "success" });
        } catch (err) {
            console.error("ZIP Generation failed:", err);
            setFeedback({ message: `Failed to create PDF ZIP: ${err.message}`, type: "error" });
        } finally {
            setZipProgress({ current: 0, total: 0, active: false, type: '' });
        }
    };

    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(selectedIds);
        if (idsToDelete.length === 0) return;

        if (confirm(`Are you sure you want to permanently delete ${idsToDelete.length} selected certificate(s)?`)) {
            setSubmitting(true);
            try {
                const CHUNK_SIZE = 50;
                for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
                    const chunk = idsToDelete.slice(i, i + CHUNK_SIZE);
                    const { error } = await supabase.from('certificates').delete().in('id', chunk);
                    if (error) throw error;
                }

                await logActivity(
                    supabase,
                    'Bulk Deleted Certificates',
                    `Deleted ${idsToDelete.length} certificates`,
                    'warning'
                );

                setSelectedIds(new Set());
                await fetchCertificates();
                setFeedback({ message: `Successfully deleted ${idsToDelete.length} certificates.`, type: "info" });
            } catch (err) {
                console.error("Bulk delete failed:", err);
                setFeedback({ message: `Bulk delete failed: ${err.message}`, type: "error" });
            } finally {
                setSubmitting(false);
            }
        }
    };

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

            {/* Sticky Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.98 }}
                        className="sticky top-6 z-40 w-full p-4 sm:p-5 rounded-2xl bg-brand-dark/95 border border-brand-cyan/40 backdrop-blur-xl shadow-[0_15px_50px_rgba(0,194,255,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan font-black text-sm flex items-center justify-center shadow-[0_0_15px_rgba(0,194,255,0.3)]">
                                {selectedIds.size}
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm sm:text-base">{selectedIds.size} Certificate{selectedIds.size > 1 ? 's' : ''} Selected</div>
                                <div className="text-white/40 text-xs">Download high-res PNG ZIP or manage batch</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Download High-Res PNG ZIP */}
                            <button
                                onClick={handleDownloadPNGZip}
                                disabled={zipProgress.active}
                                className="btn-primary py-2.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,194,255,0.3)]"
                            >
                                {zipProgress.active && zipProgress.type === 'PNG' ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Bundling PNGs ({zipProgress.current}/{zipProgress.total})...</span>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon size={15} />
                                        <span>Download PNG ZIP</span>
                                    </>
                                )}
                            </button>

                            {/* Download PDF ZIP */}
                            <button
                                onClick={handleDownloadPDFZip}
                                disabled={zipProgress.active}
                                className="btn-outline py-2.5 px-4 text-xs font-bold border-white/20 hover:border-brand-cyan flex items-center gap-2"
                            >
                                {zipProgress.active && zipProgress.type === 'PDF' ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Bundling PDFs ({zipProgress.current}/{zipProgress.total})...</span>
                                    </>
                                ) : (
                                    <>
                                        <Archive size={15} />
                                        <span>Download PDF ZIP</span>
                                    </>
                                )}
                            </button>

                            {/* Bulk Delete */}
                            <button
                                onClick={handleBulkDelete}
                                disabled={submitting || zipProgress.active}
                                className="btn-crud-delete px-4 py-2.5 text-xs font-bold flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                            >
                                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                <span>Delete ({selectedIds.size})</span>
                            </button>

                            {/* Deselect All */}
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-white/40 hover:text-white p-2 text-xs font-bold transition-colors ml-1"
                                title="Clear selection"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search & Select All Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 w-full max-w-md group focus-within:border-brand-cyan/50 transition-all">
                    <Search size={16} className="text-white/20 group-focus-within:text-brand-cyan" />
                    <input
                        type="text"
                        placeholder="Search certificates..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-white placeholder-white/20 w-full font-bold"
                    />
                </div>

                {filtered.length > 0 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="btn-outline py-2.5 px-4 text-xs font-bold flex items-center gap-2 border-white/10 hover:border-brand-cyan"
                        >
                            {selectedIds.size === filtered.length && filtered.length > 0 ? (
                                <>
                                    <CheckSquare size={16} className="text-brand-cyan" />
                                    <span>Deselect All ({filtered.length})</span>
                                </>
                            ) : (
                                <>
                                    <Square size={16} className="text-white/40" />
                                    <span>Select All ({filtered.length})</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
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
                        <motion.div
                            key={cert.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`glass-card p-5 border-white/5 hover:border-white/10 transition-all flex items-center justify-between ${selectedIds.has(cert.id) ? 'border-brand-cyan/40 bg-brand-cyan/5' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => toggleSelect(cert.id)}
                                    className="text-white/40 hover:text-brand-cyan p-1 transition-colors"
                                    title={selectedIds.has(cert.id) ? "Deselect" : "Select"}
                                >
                                    {selectedIds.has(cert.id) ? (
                                        <CheckSquare size={20} className="text-brand-cyan" />
                                    ) : (
                                        <Square size={20} />
                                    )}
                                </button>
                                <div className="w-11 h-11 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-white text-sm">{cert.recipient_name}</div>
                                    <div className="text-xs text-white/30">{parseCertificateEvent(cert.event_name).eventName} · {new Date(cert.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowPreview(cert)}
                                    className="btn-crud-edit"
                                    title="Preview Certificate"
                                >
                                    <Eye size={20} />
                                </button>
                                <button
                                    disabled={processingId === cert.id}
                                    onClick={async () => {
                                        try {
                                            setProcessingId(cert.id);
                                            await generateCertificatePDF(cert);
                                            setFeedback({ message: `Certificate downloaded for ${cert.recipient_name}`, type: 'success' });
                                        } catch (err) {
                                            console.error("PDF download failed:", err);
                                            setFeedback({ message: "Download failed: " + err.message, type: 'error' });
                                        } finally {
                                            setProcessingId(null);
                                        }
                                    }}
                                    className="btn-crud-edit disabled:opacity-50"
                                    title="Download Certificate PDF"
                                >
                                    {processingId === cert.id ? <Loader2 size={20} className="animate-spin text-brand-cyan" /> : <Download size={20} />}
                                </button>
                                <button
                                    disabled={processingId === cert.id}
                                    onClick={() => handleDelete(cert.id)}
                                    className="btn-crud-delete disabled:opacity-50"
                                >
                                    {processingId === cert.id ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
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
                        className={`glass-card w-full p-5 sm:p-8 md:p-10 relative z-10 border-white/10 transition-all duration-300 max-h-[92vh] overflow-y-auto ${bulkData.length > 0 ? 'max-w-2xl' : 'max-w-xl'}`}
                    >
                        {bulkData.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl sm:text-3xl font-black text-white">Issue Bulk <span className="text-brand-cyan">Certificates</span></h2>
                                    {bulkStats && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="px-2.5 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold">
                                                {bulkData.length} Attendees
                                            </span>
                                            {bulkStats.duplicates > 0 && (
                                                <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold" title="Duplicates removed automatically">
                                                    {bulkStats.duplicates} dupes filtered
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <form onSubmit={handleIssueCert} className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                            <span>Attendee Preview List ({bulkData.length})</span>
                                            {bulkData.length > 50 && (
                                                <span className="text-brand-cyan">Showing first 50 of {bulkData.length}</span>
                                            )}
                                        </div>
                                        <div className="max-h-60 overflow-y-auto border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="sticky top-0 bg-brand-dark border-b border-white/10 text-white/40">
                                                    <tr>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px] w-12 text-center">#</th>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px]">Name</th>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px]">Email</th>
                                                        <th className="px-4 py-2.5 font-black uppercase tracking-widest text-[9px] text-center w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bulkData.slice(0, 100).map((item, idx) => (
                                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="px-2 py-1.5 text-center text-white/30 font-mono text-[10px]">{idx + 1}</td>
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
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                                Introductory Phrase / Text
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setNewCert({ ...newCert, intro_text: 'for successfully attending the' })}
                                                className="text-[10px] text-brand-cyan hover:underline uppercase tracking-wider font-bold"
                                            >
                                                Reset to Default
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={newCert.intro_text}
                                            onChange={e => setNewCert({ ...newCert, intro_text: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-white focus:border-brand-cyan outline-none transition-all font-mono text-xs sm:text-sm placeholder-white/20"
                                            placeholder="e.g. for successfully attending the, for participating in, in recognition of winning..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                                Event Title / Text
                                            </label>
                                            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setUseCustomEvent(false)}
                                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${!useCustomEvent ? 'bg-brand-cyan text-brand-dark shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    Choose Event
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setUseCustomEvent(true)}
                                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${useCustomEvent ? 'bg-brand-cyan text-brand-dark shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    Custom Text
                                                </button>
                                            </div>
                                        </div>

                                        {!useCustomEvent ? (
                                            <select
                                                required={!useCustomEvent}
                                                value={newCert.event_id}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '__custom__') {
                                                        setUseCustomEvent(true);
                                                    } else {
                                                        const ev = events.find(x => x.id === val);
                                                        setNewCert({ ...newCert, event_id: val, custom_event_title: ev?.title || '' });
                                                    }
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold cursor-pointer font-sans"
                                            >
                                                <option value="" className="bg-brand-dark">Select Registered Event</option>
                                                {events.map(event => (
                                                    <option key={event.id} value={event.id} className="bg-brand-dark">{event.title}</option>
                                                ))}
                                                <option value="__custom__" className="bg-brand-dark text-brand-cyan">✍️ Enter Custom Event Title / Text...</option>
                                            </select>
                                        ) : (
                                            <input
                                                required={useCustomEvent}
                                                type="text"
                                                value={newCert.custom_event_title}
                                                onChange={e => setNewCert({ ...newCert, custom_event_title: e.target.value })}
                                                className="w-full bg-white/5 border border-brand-cyan/40 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold placeholder-white/20"
                                                placeholder="e.g. AWS Cloud Day, Hackathon Finalist, Cloud Bootcamp..."
                                            />
                                        )}
                                        <p className="text-[11px] text-white/40 ml-2">
                                            Certificate wording preview: <span className="text-brand-cyan font-mono">{newCert.intro_text || 'for successfully attending the'}</span> <span className="text-white font-mono font-bold">{(!useCustomEvent ? events.find(x => x.id === newCert.event_id)?.title : newCert.custom_event_title) || '[Event Name]'}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                        <button type="button" onClick={() => { setShowModal(false); setBulkData([]); setBulkStats(null); setUseCustomEvent(false); }} className="w-full sm:flex-1 btn-secondary py-3.5 sm:py-4 font-black uppercase tracking-widest">Cancel</button>
                                        <button type="submit" disabled={submitting} className="w-full sm:flex-1 btn-primary py-3.5 sm:py-4 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,194,255,0.2)] flex items-center justify-center gap-2">
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin text-white" />
                                                    <span>Issuing & Sending Emails...</span>
                                                </>
                                            ) : `Confirm Issue (${bulkData.length})`}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 sm:mb-8">Issue <span className="text-brand-cyan">Certificate</span></h2>
                                <form onSubmit={handleIssueCert} className="space-y-5 sm:space-y-6">
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
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                                Introductory Phrase / Text
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setNewCert({ ...newCert, intro_text: 'for successfully attending the' })}
                                                className="text-[10px] text-brand-cyan hover:underline uppercase tracking-wider font-bold"
                                            >
                                                Reset to Default
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={newCert.intro_text}
                                            onChange={e => setNewCert({ ...newCert, intro_text: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-white focus:border-brand-cyan outline-none transition-all font-mono text-xs sm:text-sm placeholder-white/20"
                                            placeholder="e.g. for successfully attending the, for participating in, in recognition of winning..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                                Event Title / Text
                                            </label>
                                            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setUseCustomEvent(false)}
                                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${!useCustomEvent ? 'bg-brand-cyan text-brand-dark shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    Choose Event
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setUseCustomEvent(true)}
                                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${useCustomEvent ? 'bg-brand-cyan text-brand-dark shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    Custom Text
                                                </button>
                                            </div>
                                        </div>

                                        {!useCustomEvent ? (
                                            <select
                                                required={!useCustomEvent}
                                                value={newCert.event_id}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '__custom__') {
                                                        setUseCustomEvent(true);
                                                    } else {
                                                        const ev = events.find(x => x.id === val);
                                                        setNewCert({ ...newCert, event_id: val, custom_event_title: ev?.title || '' });
                                                    }
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold cursor-pointer font-sans"
                                            >
                                                <option value="" className="bg-brand-dark">Select Registered Event</option>
                                                {events.map(event => (
                                                    <option key={event.id} value={event.id} className="bg-brand-dark">{event.title}</option>
                                                ))}
                                                <option value="__custom__" className="bg-brand-dark text-brand-cyan">✍️ Enter Custom Event Title / Text...</option>
                                            </select>
                                        ) : (
                                            <input
                                                required={useCustomEvent}
                                                type="text"
                                                value={newCert.custom_event_title}
                                                onChange={e => setNewCert({ ...newCert, custom_event_title: e.target.value })}
                                                className="w-full bg-white/5 border border-brand-cyan/40 rounded-2xl px-6 py-4 text-white focus:border-brand-cyan outline-none transition-all font-bold placeholder-white/20"
                                                placeholder="e.g. AWS Cloud Day, Hackathon Finalist, Cloud Bootcamp..."
                                            />
                                        )}
                                        <p className="text-[11px] text-white/40 ml-2">
                                            Certificate wording preview: <span className="text-brand-cyan font-mono">{newCert.intro_text || 'for successfully attending the'}</span> <span className="text-white font-mono font-bold">{(!useCustomEvent ? events.find(x => x.id === newCert.event_id)?.title : newCert.custom_event_title) || '[Event Name]'}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                        <button type="button" onClick={() => { setShowModal(false); setUseCustomEvent(false); }} className="w-full sm:flex-1 btn-secondary py-3.5 sm:py-4 font-black uppercase tracking-widest">Cancel</button>
                                        <button type="submit" disabled={submitting} className="w-full sm:flex-1 btn-primary py-3.5 sm:py-4 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,194,255,0.2)]">
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
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-3.5 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between w-full text-white/70 font-bold px-1">
                            <span className="text-xs font-black uppercase tracking-widest text-brand-cyan">Certificate Preview</span>
                            <div className="flex items-center gap-3">
                                <button
                                    disabled={processingId === showPreview.id}
                                    onClick={async () => {
                                        try {
                                            setProcessingId(showPreview.id);
                                            await generateCertificatePDF(showPreview);
                                            setFeedback({ message: `Certificate downloaded for ${showPreview.recipient_name}`, type: 'success' });
                                        } catch (err) {
                                            console.error("PDF download failed:", err);
                                            setFeedback({ message: "Download failed: " + err.message, type: 'error' });
                                        } finally {
                                            setProcessingId(null);
                                        }
                                    }}
                                    className="btn-primary py-1.5 px-3.5 flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,194,255,0.25)]"
                                >
                                    {processingId === showPreview.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                    Download PDF
                                </button>
                                <button onClick={() => setShowPreview(null)} className="text-white/40 hover:text-white p-1 transition-colors"><X size={22} /></button>
                            </div>
                        </div>

                        <div className="w-full bg-[#05080f] p-3 sm:p-5 rounded-2xl border border-white/10 flex flex-col items-center shadow-2xl">
                            <div className="w-full max-w-2xl overflow-hidden rounded-xl shadow-2xl bg-[#070b12] border border-white/10 flex justify-center">
                                <CertificateTemplate
                                    recipientName={showPreview.recipient_name}
                                    eventName={showPreview.event_name}
                                    date={new Date(showPreview.created_at).toLocaleDateString()}
                                    type={showPreview.certificate_type}
                                    certificateId={showPreview.id}
                                />
                            </div>
                            <div className="flex flex-wrap items-center justify-between w-full mt-3 pt-3 border-t border-white/5 text-xs text-white/40 gap-2">
                                <div>Recipient: <strong className="text-white">{showPreview.recipient_name}</strong></div>
                                <div>Event: <strong className="text-white">{parseCertificateEvent(showPreview.event_name).eventName}</strong></div>
                                <div>ID: <span className="font-mono text-brand-cyan">{showPreview.id}</span></div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
