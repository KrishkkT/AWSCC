"use client";

import { createClient } from "@/utils/supabase/client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import CertificateTemplate from "@/components/CertificateTemplate";
import { Download, Share2, ShieldCheck, Printer, ExternalLink, AlertCircle, Award, Image as ImageIcon, Copy, Check, Sparkles } from "lucide-react";
import { generateCertificatePDF, generateCertificateImageBlob, parseCertificateEvent } from "@/utils/pdfGenerator";

export default function VerifyClient({ params }) {
    const { id } = React.use(params);
    const [cert, setCert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sharingMedia, setSharingMedia] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedImage, setCopiedImage] = useState(false);
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

    const { introText, eventName } = parseCertificateEvent(cert);

    const handleDownloadPDF = async () => {
        if (!cert) return;
        setGenerating(true);
        try {
            await generateCertificatePDF(cert);
        } catch (err) {
            console.error("PDF download failed:", err);
            alert("Error downloading PDF: " + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadImage = async () => {
        if (!cert) return;
        setGenerating(true);
        try {
            const blob = await generateCertificateImageBlob(cert);
            if (!blob) throw new Error("Failed to generate image.");
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Certificate-${(cert.recipient_name || "Credential").replace(/\s+/g, '_')}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Image download failed:", err);
            alert("Error downloading image: " + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleShareMedia = async () => {
        if (!cert) return;
        setSharingMedia(true);
        const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
        const shareTitle = `${cert.recipient_name}'s Certificate | AWS SBG DDU`;
        const shareText = `Check out my verified certificate for "${eventName}" (${introText} ${eventName}) issued by AWS Student Builder Group DDU!\n\nVerify online: ${shareUrl}`;

        try {
            const imageBlob = await generateCertificateImageBlob(cert);
            const imageFile = imageBlob ? new File([imageBlob], `Certificate-${cert.recipient_name.replace(/\s+/g, '_')}.png`, { type: 'image/png' }) : null;

            if (navigator.canShare && imageFile && navigator.canShare({ files: [imageFile] })) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    files: [imageFile],
                    url: shareUrl
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl
                });
            } else {
                // Fallback: Copy link and alert
                await navigator.clipboard.writeText(`${shareText}`);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 3000);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Media share failed:", err);
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                } catch { }
            }
        } finally {
            setSharingMedia(false);
        }
    };

    const handleCopyImage = async () => {
        if (!cert) return;
        try {
            const blob = await generateCertificateImageBlob(cert);
            if (!blob) throw new Error("Could not create image blob");
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 3000);
        } catch (err) {
            console.error("Copy image failed:", err);
            // Fallback to downloading image
            handleDownloadImage();
        }
    };

    const handleCopyLink = async () => {
        const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 3000);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    const handlePrint = () => { window.print(); };

    const handleLinkedInAdd = () => {
        if (!cert) return;
        const certName = `Certificate: ${eventName}`;
        const issueDate = new Date(cert.created_at);
        const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certName)}&organizationName=${encodeURIComponent("AWS Student Builder Group DDU")}&issueMonth=${issueDate.getMonth() + 1}&issueYear=${issueDate.getFullYear()}&certUrl=${encodeURIComponent(window.location.href)}&certId=${cert.id}`;
        window.open(url, '_blank');
    };

    const handleLinkedInShare = () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
        window.open(url, '_blank');
    };

    const handleWhatsAppShare = () => {
        const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
        const msg = `🏅 Check out my official verified certificate for *${eventName}* (${introText} ${eventName}) from AWS Student Builder Group DDU!\n\nVerify credential: ${shareUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleTwitterShare = () => {
        const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
        const msg = `Proud to receive my certificate for ${eventName} from @AWSCloudClub DDU! 🚀☁️ Verified online:`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
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
                            eventName={eventName}
                            introText={introText}
                            date={new Date(cert.events?.start_time || cert.events?.date || cert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            type={cert.certificate_type}
                            certificateId={cert.id}
                            template={cert.template}
                        />
                    </div>

                    <div className="w-full lg:w-84 space-y-6 shrink-0 print:hidden text-foreground">
                        <div className="card-professional p-6 sm:p-8 border-border shadow-sm">
                            <div className="flex items-center gap-3 text-brand-aws mb-4">
                                <ShieldCheck size={24} />
                                <span className="font-black uppercase tracking-widest text-xs">Verified Asset</span>
                            </div>
                            <h2 className="text-2xl font-black mb-1 tracking-tight">Digital Credential</h2>
                            <p className="text-xs text-muted-foreground font-medium mb-6">Verified achievement issued by AWS Student Builder Group DDU.</p>

                            {/* Primary Action Buttons */}
                            <div className="space-y-2.5">
                                {/* Native Media Share Button */}
                                <button
                                    onClick={handleShareMedia}
                                    disabled={sharingMedia}
                                    className="w-full btn-aws py-3.5 flex items-center justify-center gap-2.5 shadow-lg shadow-brand-aws/20 text-xs font-black uppercase tracking-wider"
                                >
                                    <Share2 size={16} />
                                    {sharingMedia ? "Preparing Media..." : "Share Certificate Media"}
                                </button>

                                {/* PDF Download */}
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generating}
                                    className="w-full btn-outline py-3 flex items-center justify-center gap-2.5 text-xs font-bold border-border hover:border-brand-aws/40 transition-colors"
                                >
                                    <Download size={16} />
                                    {generating ? "Generating..." : "Download PDF Document"}
                                </button>

                                {/* Image Download */}
                                <button
                                    onClick={handleDownloadImage}
                                    disabled={generating}
                                    className="w-full btn-outline py-3 flex items-center justify-center gap-2.5 text-xs font-bold border-border hover:border-brand-aws/40 transition-colors"
                                >
                                    <ImageIcon size={16} />
                                    Download Image (PNG)
                                </button>

                                {/* Copy Image to Clipboard */}
                                <button
                                    onClick={handleCopyImage}
                                    className="w-full btn-outline py-3 flex items-center justify-center gap-2.5 text-xs font-bold border-border hover:border-brand-aws/40 transition-colors"
                                >
                                    {copiedImage ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    {copiedImage ? "Image Copied to Clipboard!" : "Copy Image to Clipboard"}
                                </button>
                                
                                <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2">
                                    {/* LinkedIn Add */}
                                    <button 
                                        onClick={handleLinkedInAdd}
                                        className="btn-outline py-2.5 px-2 flex items-center justify-center gap-1.5 text-[11px] font-bold border-border hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
                                        title="Add certificate to LinkedIn Profile"
                                    >
                                        <Award size={14} /> Add to Profile
                                    </button>

                                    {/* WhatsApp Direct Share */}
                                    <button
                                        onClick={handleWhatsAppShare}
                                        className="btn-outline py-2.5 px-2 flex items-center justify-center gap-1.5 text-[11px] font-bold border-border hover:border-green-500 hover:text-green-500 transition-colors"
                                        title="Share on WhatsApp with message and link"
                                    >
                                        <Sparkles size={14} /> WhatsApp
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {/* Share on LinkedIn */}
                                    <button
                                        onClick={handleLinkedInShare}
                                        className="btn-outline py-2.5 px-2 flex items-center justify-center gap-1.5 text-[11px] font-bold border-border hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
                                    >
                                        <Share2 size={14} /> LinkedIn
                                    </button>

                                    {/* Share on Twitter/X */}
                                    <button
                                        onClick={handleTwitterShare}
                                        className="btn-outline py-2.5 px-2 flex items-center justify-center gap-1.5 text-[11px] font-bold border-border hover:border-white/40 transition-colors"
                                    >
                                        <ExternalLink size={14} /> X / Twitter
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    {/* Copy Verification Link */}
                                    <button
                                        onClick={handleCopyLink}
                                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground py-2 transition-colors border border-border/40 rounded-xl"
                                    >
                                        {copiedLink ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                                        {copiedLink ? "Link Copied!" : "Copy Link"}
                                    </button>

                                    {/* Print Copy */}
                                    <button
                                        onClick={handlePrint}
                                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground py-2 transition-colors border border-border/40 rounded-xl"
                                    >
                                        <Printer size={13} /> Print
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Credential Metadata Card */}
                        <div className="card-professional p-6 border-border/50 gap-3 shadow-sm flex flex-col">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Recipient</p>
                                <p className="font-bold text-sm">{cert.recipient_name}</p>
                            </div>
                            <div className="h-px bg-border w-full" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Award For</p>
                                <p className="font-semibold text-xs text-brand-aws">{introText}</p>
                                <p className="font-bold text-sm mt-0.5">{eventName}</p>
                            </div>
                            <div className="h-px bg-border w-full" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Credential ID</p>
                                <p className="font-mono text-xs text-muted-foreground break-all">{cert.id}</p>
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
