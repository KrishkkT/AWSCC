"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import CertificateTemplate from "@/components/CertificateTemplate";
import { Download, Share2, ShieldCheck, Printer, ExternalLink, AlertCircle } from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function VerifyCertificate({ params }) {
    const [cert, setCert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const supabase = createClient();
    const certRef = useRef();

    useEffect(() => {
        async function fetchCert() {
            try {
                const { data, error } = await supabase
                    .from('certificates')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                setCert(data);
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Certificate not found");
            } finally {
                setLoading(false);
            }
        }
        fetchCert();
    }, [params.id]);

    const generatePDF = async () => {
        if (!cert) return;
        setGenerating(true);

        try {
            // 1. Fetch the template PDF
            const response = await fetch('/templates/attendee_template.pdf');
            if (!response.ok) throw new Error("Template not found at /templates/attendee_template.pdf");

            const existingPdfBytes = await response.arrayBuffer();

            // 2. Load the PDF
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            // 3. Draw Dynamic Text
            // Note: coordinates (x, y) might need adjustment based on the user's template
            // y is measured from the bottom of the page in pdf-lib

            // Draw Name
            firstPage.drawText(cert.recipient_name, {
                x: width / 2 - (cert.recipient_name.length * 10), // Rough centering
                y: height * 0.5,
                size: 40,
                font: font,
                color: rgb(0, 0, 0),
            });

            // Draw Event
            firstPage.drawText(cert.event_name, {
                x: width / 2 - (cert.event_name.length * 5),
                y: height * 0.35,
                size: 20,
                font: font,
                color: rgb(0, 0.4, 0.6), // Brand-ish blue
            });

            // Draw Date
            const dateStr = new Date(cert.created_at).toLocaleDateString();
            firstPage.drawText(dateStr, {
                x: width * 0.2,
                y: height * 0.15,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
            });

            // Draw ID
            firstPage.drawText(cert.id.slice(0, 8), {
                x: width * 0.8,
                y: height * 0.15,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5),
            });

            // 4. Save and Download
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Certificate-${cert.recipient_name.replace(/\s+/g, '_')}.pdf`;
            link.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error("PDF Generation failed:", err);
            alert("Error: " + (err.message || "Could not generate PDF. Check if /templates/certificate-template.pdf exists."));
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-dark flex items-center justify-center">
                <div className="text-white/20 font-black tracking-[0.5em] animate-pulse text-sm">SECURE VERIFICATION IN PROGRESS...</div>
            </div>
        );
    }

    if (error || !cert) {
        return (
            <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 text-center">
                <div className="max-w-md">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <AlertCircle size={64} className="text-red-500/20 mx-auto mb-8" />
                        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Invalid Credential</h1>
                        <p className="text-white/40 font-medium mb-8">This certificate record could not be found. It may have been revoked or the ID is incorrect.</p>
                        <a href="/" className="btn-primary px-10 py-4 block uppercase tracking-widest text-xs">Return to Home</a>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-deep pt-32 pb-20 px-4 md:px-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-12 items-start">

                    {/* Left: Certificate Preview */}
                    <div className="flex-grow w-full overflow-hidden rounded-3xl shadow-2xl bg-white print:shadow-none print:rounded-none" ref={certRef}>
                        <CertificateTemplate
                            recipientName={cert.recipient_name}
                            eventName={cert.event_name}
                            date={new Date(cert.created_at).toLocaleDateString()}
                            type={cert.certificate_type}
                            certificateId={cert.id}
                        />
                    </div>

                    {/* Right: Actions */}
                    <div className="w-full lg:w-80 space-y-6 shrink-0 print:hidden">
                        <div className="glass-card p-8 border-white/10">
                            <div className="flex items-center gap-3 text-brand-cyan mb-6">
                                <ShieldCheck size={24} />
                                <span className="font-black uppercase tracking-widest text-xs">Verified Asset</span>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Digital Credential</h2>
                            <p className="text-sm text-white/40 font-medium mb-8">This certificate is a verified achievement issued by AWS Cloud Club DDU.</p>

                            <div className="space-y-3">
                                <button
                                    onClick={generatePDF}
                                    disabled={generating}
                                    className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {generating ? <span className="animate-spin text-lg">◌</span> : <Download size={18} />}
                                    {generating ? "Generating..." : "Download PDF"}
                                </button>
                                <button onClick={handlePrint} className="w-full btn-secondary py-4 flex items-center justify-center gap-3">
                                    <Printer size={18} /> Print Copy
                                </button>
                                <a
                                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full btn-secondary py-4 flex items-center justify-center gap-3"
                                >
                                    <Share2 size={18} /> Share on LinkedIn
                                </a>
                            </div>
                        </div>

                        <div className="glass-card p-8 border-white/5 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Recipient</p>
                            <p className="text-white font-bold">{cert.recipient_name}</p>
                            <div className="h-px bg-white/5 w-full" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Issued On</p>
                            <p className="text-white font-bold">{new Date(cert.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Styles for Printing */}
            <style jsx global>{`
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { shadow: none !important; }
                    .print\\:rounded-none { border-radius: 0 !important; }
                    header, footer, nav { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                    .min-h-screen { height: auto !important; min-height: 0 !important; padding: 0 !important; }
                }
            `}</style>
        </div>
    );
}
