"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Award, Search, Download, Plus, Eye, Trash2, FileText, Loader2, X,
    ShieldCheck, Upload, Archive, CheckSquare, Square, Image as ImageIcon,
    Check, Sliders, RotateCcw, Sparkles, Type, MoveVertical, Save
} from "lucide-react";
import { logActivity } from "@/utils/logger";
import Toast from "@/components/Toast";
import JSZip from "jszip";
import {
    generateCertificatePDF,
    generateCertificatePDFBlob,
    generateCertificateImageBlob,
    parseCertificateEvent,
    DEFAULT_CERT_LAYOUT
} from "@/utils/pdfGenerator";
import { parseCSVRecipients } from "@/utils/csvParser";
import CertificateTemplate from "@/components/CertificateTemplate";

export default function AdminCertificates() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showLayoutStudio, setShowLayoutStudio] = useState(false);
    const [showLivePreviewInModal, setShowLivePreviewInModal] = useState(true);
    const [events, setEvents] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [zipProgress, setZipProgress] = useState({ current: 0, total: 0, active: false, type: '' });
    const [feedback, setFeedback] = useState(null);
    const [showPreview, setShowPreview] = useState(null);
    const [previewLayout, setPreviewLayout] = useState(DEFAULT_CERT_LAYOUT);
    const [bulkStats, setBulkStats] = useState(null);
    const [useCustomEvent, setUseCustomEvent] = useState(false);
    const certificateRef = useRef(null);

    // Global layout state for certificate typography and vertical positioning
    const [certLayout, setCertLayout] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('awscc_cert_layout');
                if (saved) return { ...DEFAULT_CERT_LAYOUT, ...JSON.parse(saved) };
            } catch (e) {
                console.warn("Could not load saved certificate layout:", e);
            }
        }
        return DEFAULT_CERT_LAYOUT;
    });

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

    const saveLayoutAsDefault = (layoutToSave = certLayout) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('awscc_cert_layout', JSON.stringify(layoutToSave));
            }
            setCertLayout(layoutToSave);
            setFeedback({ message: "Certificate layout & typography settings saved as default!", type: "success" });
        } catch (e) {
            setFeedback({ message: "Failed to save layout: " + e.message, type: "error" });
        }
    };

    const resetLayout = () => {
        setCertLayout(DEFAULT_CERT_LAYOUT);
        setPreviewLayout(DEFAULT_CERT_LAYOUT);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('awscc_cert_layout');
        }
        setFeedback({ message: "Layout reset to default standard values.", type: "info" });
    };

    const applyLayoutPreset = (presetName, targetSetter = setCertLayout) => {
        let preset = { ...DEFAULT_CERT_LAYOUT };
        if (presetName === 'compact') {
            // Optimized for long recipient names and 2-line intro/title
            preset = {
                nameSize: 85,
                nameY: 55.0,
                introSize: 85,
                introY: 64.0,
                titleSize: 90,
                titleY: 71.0
            };
        } else if (presetName === 'spacious') {
            // For short names and single line events
            preset = {
                nameSize: 110,
                nameY: 57.0,
                introSize: 105,
                introY: 66.5,
                titleSize: 105,
                titleY: 73.0
            };
        } else if (presetName === 'multiline') {
            // Extra breathing room for lengthy workshop titles
            preset = {
                nameSize: 88,
                nameY: 54.0,
                introSize: 80,
                introY: 63.0,
                titleSize: 85,
                titleY: 70.0
            };
        }
        targetSetter(preset);
        setFeedback({ message: `Applied "${presetName}" typography preset.`, type: "info" });
    };

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
                const blob = await generateCertificateImageBlob(cert, certLayout);
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
                const blob = await generateCertificatePDFBlob(cert, certLayout);
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

    // Reusable Typography & Layout Control Panel Component
    const LayoutControlSliders = ({ layoutState, onChange, targetSetter }) => (
        <div className="space-y-4 text-xs">
            {/* Presets Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-cyan flex items-center gap-1.5">
                    <Sparkles size={13} /> Layout Presets
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => applyLayoutPreset('default', targetSetter)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-all"
                    >
                        Standard
                    </button>
                    <button
                        type="button"
                        onClick={() => applyLayoutPreset('compact', targetSetter)}
                        className="px-2.5 py-1 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-[10px] font-bold text-brand-cyan transition-all"
                        title="Best for 2-line names or 2-line titles"
                    >
                        Compact
                    </button>
                    <button
                        type="button"
                        onClick={() => applyLayoutPreset('multiline', targetSetter)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-all"
                    >
                        Long Text
                    </button>
                    <button
                        type="button"
                        onClick={() => targetSetter(DEFAULT_CERT_LAYOUT)}
                        className="p-1 text-white/40 hover:text-white transition-colors"
                        title="Reset to default"
                    >
                        <RotateCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Recipient Name Controls */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Type size={14} className="text-brand-cyan" />
                        <span className="font-bold text-white text-[11px]">Recipient Name</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">
                        {layoutState.nameSize}% size · {layoutState.nameY}% Y
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50">
                            <span>Font Size</span>
                            <span className="font-mono text-brand-cyan">{layoutState.nameSize}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="140"
                            step="1"
                            value={layoutState.nameSize}
                            onChange={(e) => onChange('nameSize', Number(e.target.value))}
                            className="w-full accent-brand-cyan cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50">
                            <span>Vertical Position (Y)</span>
                            <span className="font-mono text-brand-cyan">{layoutState.nameY}%</span>
                        </div>
                        <input
                            type="range"
                            min="45"
                            max="65"
                            step="0.5"
                            value={layoutState.nameY}
                            onChange={(e) => onChange('nameY', Number(e.target.value))}
                            className="w-full accent-brand-cyan cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                        />
                    </div>
                </div>
            </div>

            {/* Intro Phrase Controls */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Type size={14} className="text-yellow-400" />
                        <span className="font-bold text-white text-[11px]">Introductory Text</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">
                        {layoutState.introSize}% size · {layoutState.introY}% Y
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50">
                            <span>Font Size</span>
                            <span className="font-mono text-yellow-400">{layoutState.introSize}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="150"
                            step="1"
                            value={layoutState.introSize}
                            onChange={(e) => onChange('introSize', Number(e.target.value))}
                            className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50">
                            <span>Vertical Position (Y)</span>
                            <span className="font-mono text-yellow-400">{layoutState.introY}%</span>
                        </div>
                        <input
                            type="range"
                            min="56"
                            max="76"
                            step="0.5"
                            value={layoutState.introY}
                            onChange={(e) => onChange('introY', Number(e.target.value))}
                            className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                        />
                    </div>
                </div>
            </div>

            {/* Event Title Controls */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Type size={14} className="text-emerald-400" />
                        <span className="font-bold text-white text-[11px]">Event Title / Description</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">
                        {layoutState.titleSize}% size · {layoutState.titleY}% Y
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50">
                            <span>Font Size</span>
                            <span className="font-mono text-emerald-400">{layoutState.titleSize}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="150"
                            step="1"
                            value={layoutState.titleSize}
                            onChange={(e) => onChange('titleSize', Number(e.target.value))}
                            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50">
                            <span>Vertical Position (Y)</span>
                            <span className="font-mono text-emerald-400">{layoutState.titleY}%</span>
                        </div>
                        <input
                            type="range"
                            min="63"
                            max="83"
                            step="0.5"
                            value={layoutState.titleY}
                            onChange={(e) => onChange('titleY', Number(e.target.value))}
                            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                        />
                    </div>
                </div>
            </div>
        </div>
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
                    <p className="text-white/40 font-medium">Issue, customize typography & layout, track, and verify event certificates.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowLayoutStudio(true)}
                        className="btn-outline px-5 py-4 flex items-center gap-2.5 border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/10"
                        title="Adjust default font sizes and positions"
                    >
                        <Sliders size={18} />
                        <span className="font-bold text-xs uppercase tracking-wider">Layout & Fonts</span>
                    </button>
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
                                    onClick={() => {
                                        setPreviewLayout(certLayout);
                                        setShowPreview(cert);
                                    }}
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
                                            await generateCertificatePDF(cert, certLayout);
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

            {/* Layout Studio Modal */}
            {showLayoutStudio && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        onClick={() => setShowLayoutStudio(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative z-10 w-full max-w-5xl bg-[#060913] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan flex items-center justify-center">
                                    <Sliders size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-white">Certificate <span className="text-brand-cyan">Typography & Layout Studio</span></h2>
                                    <p className="text-xs text-white/40">Adjust font sizes and positions for recipient names, intro phrases, and event titles.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowLayoutStudio(false)} className="text-white/40 hover:text-white p-2 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Controls */}
                            <div className="lg:col-span-6 space-y-6">
                                <LayoutControlSliders
                                    layoutState={certLayout}
                                    onChange={(field, val) => setCertLayout(prev => ({ ...prev, [field]: val }))}
                                    targetSetter={setCertLayout}
                                />

                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => saveLayoutAsDefault(certLayout)}
                                        className="btn-primary py-3 px-6 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,194,255,0.25)]"
                                    >
                                        <Save size={15} /> Save as Global Default
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetLayout}
                                        className="btn-outline py-3 px-5 text-xs font-bold border-white/10 hover:border-white/20 text-white/60 hover:text-white flex items-center gap-2"
                                    >
                                        <RotateCcw size={14} /> Reset
                                    </button>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className="lg:col-span-6 space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-bold text-white/50 px-1">
                                    <span>Live Interactive Preview</span>
                                    <span className="text-brand-cyan font-mono text-[10px]">Auto-scaled</span>
                                </div>
                                <div className="w-full bg-[#03060c] p-3 sm:p-4 rounded-2xl border border-white/10 shadow-2xl flex justify-center">
                                    <CertificateTemplate
                                        recipientName="KRISH JAYMINBHAI THAKKER"
                                        eventName="at AWS Student Community Day 2026, held on 26 September 2026 at DDU, Nadiad."
                                        introText="for active participation in the hands-on workshop Scalable Architecture on AWS"
                                        layout={certLayout}
                                    />
                                </div>
                                <p className="text-[11px] text-white/30 text-center">
                                    Preview demonstrates long names and 2-line event/intro texts with your chosen coordinates and font scales.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Issuance Modal (Single & Bulk) */}
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
                        className={`glass-card w-full p-5 sm:p-8 md:p-10 relative z-10 border-white/10 transition-all duration-300 max-h-[92vh] overflow-y-auto ${showLivePreviewInModal ? 'max-w-4xl' : (bulkData.length > 0 ? 'max-w-2xl' : 'max-w-xl')}`}
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

                                    {/* Typography customizer inside modal */}
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white flex items-center gap-2">
                                                <Sliders size={14} className="text-brand-cyan" /> Certificate Typography & Positions
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => saveLayoutAsDefault(certLayout)}
                                                className="text-[10px] text-brand-cyan hover:underline font-bold"
                                            >
                                                Save as Default
                                            </button>
                                        </div>
                                        <LayoutControlSliders
                                            layoutState={certLayout}
                                            onChange={(field, val) => setCertLayout(prev => ({ ...prev, [field]: val }))}
                                            targetSetter={setCertLayout}
                                        />
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
                                <div className="flex items-center justify-between mb-6 sm:mb-8">
                                    <h2 className="text-2xl sm:text-3xl font-black text-white">Issue <span className="text-brand-cyan">Certificate</span></h2>
                                    <button
                                        type="button"
                                        onClick={() => setShowLivePreviewInModal(!showLivePreviewInModal)}
                                        className="text-xs font-bold text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/30 px-3 py-1.5 rounded-xl hover:bg-brand-cyan/20 transition-all flex items-center gap-1.5"
                                    >
                                        <Eye size={14} /> {showLivePreviewInModal ? "Hide Preview" : "Show Live Preview"}
                                    </button>
                                </div>

                                <div className={`grid grid-cols-1 ${showLivePreviewInModal ? 'lg:grid-cols-12 gap-8' : ''} items-start`}>
                                    <div className={`${showLivePreviewInModal ? 'lg:col-span-6' : ''}`}>
                                        <form onSubmit={handleIssueCert} className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Recipient Name</label>
                                                <input
                                                    required type="text"
                                                    value={newCert.recipient_name}
                                                    onChange={e => setNewCert({ ...newCert, recipient_name: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-white focus:border-brand-cyan outline-none transition-all font-bold"
                                                    placeholder="Enter full name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Recipient Email</label>
                                                <input
                                                    required type="email"
                                                    value={newCert.recipient_email}
                                                    onChange={e => setNewCert({ ...newCert, recipient_email: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-white focus:border-brand-cyan outline-none transition-all font-bold"
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
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white focus:border-brand-cyan outline-none transition-all font-mono text-xs placeholder-white/20"
                                                    placeholder="e.g. for successfully attending the, for participating in, in recognition of winning..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                                        Event Title / Text
                                                    </label>
                                                    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setUseCustomEvent(false)}
                                                            className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all ${!useCustomEvent ? 'bg-brand-cyan text-brand-dark shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                        >
                                                            Choose Event
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setUseCustomEvent(true)}
                                                            className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all ${useCustomEvent ? 'bg-brand-cyan text-brand-dark shadow-sm' : 'text-white/40 hover:text-white'}`}
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
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-white focus:border-brand-cyan outline-none transition-all font-bold cursor-pointer font-sans text-xs sm:text-sm"
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
                                                        className="w-full bg-white/5 border border-brand-cyan/40 rounded-2xl px-6 py-3.5 text-white focus:border-brand-cyan outline-none transition-all font-bold placeholder-white/20 text-xs sm:text-sm"
                                                        placeholder="e.g. AWS Cloud Day, Hackathon Finalist, Cloud Bootcamp..."
                                                    />
                                                )}
                                            </div>

                                            {/* Typography controls */}
                                            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                                        <Sliders size={13} className="text-brand-cyan" /> Typography & Layout
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveLayoutAsDefault(certLayout)}
                                                        className="text-[10px] text-brand-cyan hover:underline font-bold"
                                                    >
                                                        Save as Default
                                                    </button>
                                                </div>
                                                <LayoutControlSliders
                                                    layoutState={certLayout}
                                                    onChange={(field, val) => setCertLayout(prev => ({ ...prev, [field]: val }))}
                                                    targetSetter={setCertLayout}
                                                />
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 pt-3">
                                                <button type="button" onClick={() => { setShowModal(false); setUseCustomEvent(false); }} className="w-full sm:flex-1 btn-secondary py-3.5 font-black uppercase tracking-widest">Cancel</button>
                                                <button type="submit" disabled={submitting} className="w-full sm:flex-1 btn-primary py-3.5 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                                                    {submitting ? 'Issuing...' : 'Confirm Issue'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Live Certificate Preview in Modal */}
                                    {showLivePreviewInModal && (
                                        <div className="lg:col-span-6 space-y-3 sticky top-4">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-white/50 px-1">
                                                <span>Live Preview</span>
                                                <span className="text-brand-cyan font-mono text-[10px]">Real-time feedback</span>
                                            </div>
                                            <div className="w-full bg-[#03060c] p-3 rounded-2xl border border-white/10 shadow-2xl flex justify-center">
                                                <CertificateTemplate
                                                    recipientName={newCert.recipient_name || "RECIPIENT FULL NAME"}
                                                    eventName={(!useCustomEvent ? events.find(x => x.id === newCert.event_id)?.title : newCert.custom_event_title) || "AWS Community Event Title"}
                                                    introText={newCert.intro_text || "for successfully attending the"}
                                                    layout={certLayout}
                                                />
                                            </div>
                                            <p className="text-[10px] text-white/30 text-center">
                                                Text and positions in this preview accurately match the downloaded PDF and high-res image.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Preview Modal with Live Layout Tweaking */}
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
                        className="relative z-10 w-full max-w-5xl bg-[#060913] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between w-full text-white/70 font-bold px-1 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-widest text-brand-cyan">Certificate Inspector & Customizer</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    disabled={processingId === showPreview.id}
                                    onClick={async () => {
                                        try {
                                            setProcessingId(showPreview.id);
                                            await generateCertificatePDF(showPreview, previewLayout);
                                            setFeedback({ message: `Certificate PDF downloaded for ${showPreview.recipient_name}`, type: 'success' });
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
                                <button
                                    disabled={processingId === showPreview.id}
                                    onClick={async () => {
                                        try {
                                            setProcessingId(showPreview.id);
                                            const blob = await generateCertificateImageBlob(showPreview, previewLayout);
                                            if (!blob) throw new Error("Could not generate image");
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `Certificate-${(showPreview.recipient_name || "Credential").replace(/\s+/g, '_')}.png`;
                                            link.click();
                                            URL.revokeObjectURL(url);
                                            setFeedback({ message: `Certificate PNG downloaded for ${showPreview.recipient_name}`, type: 'success' });
                                        } catch (err) {
                                            console.error("PNG download failed:", err);
                                            setFeedback({ message: "Download failed: " + err.message, type: 'error' });
                                        } finally {
                                            setProcessingId(null);
                                        }
                                    }}
                                    className="btn-outline py-1.5 px-3.5 flex items-center gap-2 text-xs font-bold border-white/20 hover:border-brand-cyan"
                                >
                                    <ImageIcon size={15} /> Download PNG
                                </button>
                                <button onClick={() => setShowPreview(null)} className="text-white/40 hover:text-white p-1 transition-colors"><X size={22} /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Certificate Visual Display */}
                            <div className="lg:col-span-7 space-y-3">
                                <div className="w-full bg-[#03060c] p-3 sm:p-4 rounded-2xl border border-white/10 flex justify-center shadow-2xl">
                                    <CertificateTemplate
                                        recipientName={showPreview.recipient_name}
                                        eventName={showPreview.event_name}
                                        date={new Date(showPreview.created_at).toLocaleDateString()}
                                        type={showPreview.certificate_type}
                                        certificateId={showPreview.id}
                                        layout={previewLayout}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center justify-between w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/40 gap-2">
                                    <div>Recipient: <strong className="text-white">{showPreview.recipient_name}</strong></div>
                                    <div>Event: <strong className="text-white">{parseCertificateEvent(showPreview.event_name).eventName}</strong></div>
                                    <div>ID: <span className="font-mono text-brand-cyan">{showPreview.id.slice(0, 8)}...</span></div>
                                </div>
                            </div>

                            {/* Live Layout Controls for this preview */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <Sliders size={14} className="text-brand-cyan" /> Fine-Tune Typography & Layout
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => saveLayoutAsDefault(previewLayout)}
                                            className="text-[10px] text-brand-cyan hover:underline font-bold flex items-center gap-1"
                                            title="Save current slider values as default for all future certificates"
                                        >
                                            <Save size={12} /> Set as Default
                                        </button>
                                    </div>
                                    <LayoutControlSliders
                                        layoutState={previewLayout}
                                        onChange={(field, val) => setPreviewLayout(prev => ({ ...prev, [field]: val }))}
                                        targetSetter={setPreviewLayout}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

