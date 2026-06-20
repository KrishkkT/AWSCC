"use client";

import { createClient } from "@/utils/supabase/client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import CertificateTemplate from "@/components/CertificateTemplate";
import { Download, Share2, ShieldCheck, Printer, ExternalLink, AlertCircle, Award } from "lucide-react";
import { generateCertificatePDF } from "@/utils/pdfGenerator";

export default function VerifyClient({ params }) {
    const { id } = React.use(params);
    const [cert, setCert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const supabase = createClient();
    const certRef = useRef();

    const fetchCert = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('certificates')
                .select('*, events(title, start_time, date)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setCert(data);
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Certificate not found");
        } finally {
            setLoading(false);
        }
    }, [id, supabase]);

    useEffect(() => {
        if (id) fetchCert();
    }, [id, fetchCert]);

    const handleDownloadPDF = async () => {
        if (!cert) return;
        setGenerating(true);
        try {
            await generateCertificatePDF(cert);
        } catch (err) {
            console.error("PDF Elevation failed:", err);
            alert("Error: " + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = () => { window.print(); };

    const handleLinkedInAdd = () => {
        if (!cert) return;
        const certName = `Certificate of Completion: ${cert.event_name}`;
        const issueDate = new Date(cert.created_at);
        const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certName)}&organizationName=${encodeURIComponent("AWS Student Builder Group DDU")}&issueMonth=${issueDate.getMonth() + 1}&issueYear=${issueDate.getFullYear()}&certUrl=${encodeURIComponent(window.location.href)}&certId=${cert.id}`;
        window.open(url, '_blank');
    };

    const handleLinkedInShare = () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground/20 font-black tracking-[0.5em] animate-pulse text-sm">SECURE VERIFICATION IN PROGRESS...</div>
            </div>
        );
    }

    if (error || !cert) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center text-foreground">
                <div className="max-w-md">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <AlertCircle size={64} className="text-red-500/20 mx-auto mb-8" />
                        <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase">Invalid Credential</h1>
                        <p className="text-muted-foreground font-medium mb-8">This certificate record could not be found. It may have been revoked or the ID is incorrect.</p>
                        <a href="/" className="btn-primary px-10 py-4 block uppercase tracking-widest text-xs">Return to Home</a>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-4 md:px-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-12 items-start">

                    <div className="flex-grow w-full overflow-hidden rounded-3xl shadow-2xl bg-white dark:bg-zinc-950 print:shadow-none print:rounded-none" ref={certRef}>
                        <CertificateTemplate
                            recipientName={cert.recipient_name}
                            eventName={cert.event_name || cert.events?.title}
                            date={new Date(cert.events?.start_time || cert.events?.date || cert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            type={cert.certificate_type}
                            certificateId={cert.id}
                        />
                    </div>

                    <div className="w-full lg:w-80 space-y-6 shrink-0 print:hidden text-foreground">
                        <div className="card-professional p-8 border-border shadow-sm">
                            <div className="flex items-center gap-3 text-brand-aws mb-6">
                                <ShieldCheck size={24} />
                                <span className="font-black uppercase tracking-widest text-xs">Verified Asset</span>
                            </div>
                            <h2 className="text-2xl font-black mb-2 tracking-tight">Digital Credential</h2>
                            <p className="text-sm text-muted-foreground font-medium mb-8">This certificate is a verified achievement issued by AWS Student Builder Group DDU.</p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generating}
                                    className="w-full btn-aws py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-aws/20"
                                >
                                    {generating ? <span className="animate-spin text-lg">◌</span> : <Download size={18} />}
                                    {generating ? "Generating..." : "Download PDF"}
                                </button>
                                
                                <button 
                                    onClick={handleLinkedInAdd}
                                    className="w-full btn-outline py-4 flex items-center justify-center gap-3 border-border hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
                                >
                                    <Award size={18} /> Add to Profile
                                </button>

                                <button onClick={handlePrint} className="w-full btn-outline py-4 flex items-center justify-center gap-3 border-border hover:border-foreground/20">
                                    <Printer size={18} /> Print Copy
                                </button>
                                
                                <button
                                    onClick={handleLinkedInShare}
                                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground mt-4 transition-colors"
                                >
                                    <Share2 size={14} /> Share on LinkedIn
                                </button>
                            </div>
                        </div>

                        <div className="card-professional p-8 border-border/50 gap-4 shadow-sm flex flex-col">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Recipient</p>
                                <p className="font-bold">{cert.recipient_name}</p>
                            </div>
                            <div className="h-px bg-border w-full" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Event Date</p>
                                <p className="font-bold">{new Date(cert.events?.start_time || cert.events?.date || cert.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:rounded-none { border-radius: 0 !important; }
                    header, footer, nav { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                    .min-h-screen { height: auto !important; min-height: 0 !important; padding: 0 !important; }
                }
            `}</style>
        </div>
    );
}
