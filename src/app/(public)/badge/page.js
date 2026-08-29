'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Upload, Download, Share2, Sparkles, RefreshCw, ZoomIn, ZoomOut,
    Move, Check, Copy, ArrowRight, User, Shield, Award, Camera,
    Linkedin, Twitter, MessageCircle, ExternalLink, Image as ImageIcon,
    RotateCw, ChevronRight, Sliders, CheckCircle2, Building2
} from 'lucide-react';

export default function SocialBadgeGeneratorPage() {
    // Attendee Customization State
    const [name, setName] = useState('');
    const [organization, setOrganization] = useState('');
    const [photoSrc, setPhotoSrc] = useState(null);

    // Image Positioning State
    const [zoom, setZoom] = useState(1);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [rotation, setRotation] = useState(0);

    // UI State
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageCopied, setImageCopied] = useState(false);
    const [templateLoaded, setTemplateLoaded] = useState(false);

    // Refs
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const templateImgRef = useRef(null);
    const userImgRef = useRef(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    // Load Template Image (591 x 1004)
    useEffect(() => {
        const img = new window.Image();
        img.src = '/images/badge1.png';
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            templateImgRef.current = img;
            setTemplateLoaded(true);
            drawBadge();
        };
        img.onerror = () => {
            console.error('Failed to load badge template /images/badge1.png');
        };
    }, []);

    // Handle Photo Upload
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const uploaded = new window.Image();
            uploaded.src = event.target.result;
            uploaded.onload = () => {
                userImgRef.current = uploaded;
                setPhotoSrc(event.target.result);
                // Reset zoom and pan
                setZoom(1);
                setOffsetX(0);
                setOffsetY(0);
                setRotation(0);
            };
        };
        reader.readAsDataURL(file);
    };

    // Main Canvas Drawing Function (Super-sampled 2X for Ultra-HD)
    const drawBadge = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Base dimensions from badge1.png
        const BASE_WIDTH = 591;
        const BASE_HEIGHT = 1004;
        const SCALE = 2; // 2x supersampling: 1182 x 2008

        canvas.width = BASE_WIDTH * SCALE;
        canvas.height = BASE_HEIGHT * SCALE;

        ctx.save();
        ctx.scale(SCALE, SCALE);

        // 1. Draw Template Background
        if (templateImgRef.current) {
            ctx.drawImage(templateImgRef.current, 0, 0, BASE_WIDTH, BASE_HEIGHT);
        } else {
            ctx.fillStyle = '#5521B5';
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        }

        // 2. Draw User Photo inside Rounded Square
        // Calibrated Frame Coordinates in badge1.png:
        // Outer Container: X=122, Y=236, W=346, H=346, Outer Radius=32
        // Inner Picture Box: X=138, Y=252, W=314, H=314, Inner Radius=22
        const frameX = 122;
        const frameY = 236;
        const frameW = 346;
        const frameH = 346;
        const frameRadius = 32;

        const innerX = 138;
        const innerY = 252;
        const innerW = 314;
        const innerH = 314;
        const innerRadius = 22;

        if (userImgRef.current) {
            ctx.save();

            // First draw white rounded outer background
            ctx.fillStyle = '#FFFFFF';
            drawRoundedRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
            ctx.fill();

            // Clip inner photo region with smooth corner radius
            ctx.beginPath();
            drawRoundedRect(ctx, innerX, innerY, innerW, innerH, innerRadius);
            ctx.clip();

            // Calculate user image aspect ratio and scaling
            const uImg = userImgRef.current;
            const imgW = uImg.naturalWidth || uImg.width;
            const imgH = uImg.naturalHeight || uImg.height;

            const baseScale = Math.max(innerW / imgW, innerH / imgH);
            const renderW = imgW * baseScale * zoom;
            const renderH = imgH * baseScale * zoom;

            // Center image + apply user drag offsets
            const cx = innerX + innerW / 2 + offsetX;
            const cy = innerY + innerH / 2 + offsetY;

            ctx.translate(cx, cy);
            if (rotation !== 0) {
                ctx.rotate((rotation * Math.PI) / 180);
            }

            ctx.drawImage(
                uImg,
                -renderW / 2,
                -renderH / 2,
                renderW,
                renderH
            );

            ctx.restore();

            // Re-draw crisp outer white border stroke
            ctx.save();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            drawRoundedRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Render Custom Name, ATTENDEE & College/Organization in Designation Area
        const hasCustomName = name && name.trim().length > 0;
        const hasOrg = organization && organization.trim().length > 0;

        // Cover the template placeholder "ATTENDEE" text with background gradient
        const textRegionY = 618;
        const textRegionH = 160;

        ctx.save();
        const grad = ctx.createLinearGradient(0, textRegionY, 0, textRegionY + textRegionH);
        grad.addColorStop(0, '#5521B5');
        grad.addColorStop(0.5, '#6829CF');
        grad.addColorStop(1, '#5722BA');

        ctx.fillStyle = grad;
        ctx.beginPath();
        drawRoundedRect(ctx, 35, textRegionY, BASE_WIDTH - 70, textRegionH, 20);
        ctx.fill();

        // Subtle glowing glassmorphism border around the designation area
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, 35, textRegionY, BASE_WIDTH - 70, textRegionH, 20);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = BASE_WIDTH / 2;

        if (hasCustomName) {
            // A. ATTENDEE NAME (Enlarged, Bold & Prominent)
            const displayName = name.trim();
            let nameFontSize = 35;
            ctx.font = `900 ${nameFontSize}px Inter, -apple-system, sans-serif`;

            // Auto-shrink text if name is longer
            let textWidth = ctx.measureText(displayName).width;
            const maxAllowedWidth = BASE_WIDTH - 100;
            while (textWidth > maxAllowedWidth && nameFontSize > 20) {
                nameFontSize -= 2;
                ctx.font = `900 ${nameFontSize}px Inter, -apple-system, sans-serif`;
                textWidth = ctx.measureText(displayName).width;
            }

            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 3;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(displayName, centerX, hasOrg ? textRegionY + 38 : textRegionY + 48);

            // B. "ATTENDEE" BADGE LABEL (Increased Size & Prominence)
            ctx.shadowColor = 'transparent';
            const attendeeBadgeY = hasOrg ? textRegionY + 84 : textRegionY + 104;

            // Draw pill behind ATTENDEE
            const badgePillW = 200;
            const badgePillH = 34;
            ctx.fillStyle = 'rgba(255, 153, 0, 0.15)';
            ctx.beginPath();
            drawRoundedRect(ctx, centerX - badgePillW / 2, attendeeBadgeY - badgePillH / 2, badgePillW, badgePillH, 17);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 153, 0, 0.6)';
            ctx.lineWidth = 1.5;
            drawRoundedRect(ctx, centerX - badgePillW / 2, attendeeBadgeY - badgePillH / 2, badgePillW, badgePillH, 17);
            ctx.stroke();

            // ATTENDEE text inside pill
            ctx.font = `900 20px Inter, -apple-system, sans-serif`;
            ctx.letterSpacing = '3px';
            ctx.fillStyle = '#FF9900'; // AWS Amber
            ctx.fillText('ATTENDEE', centerX, attendeeBadgeY);

            // C. COLLEGE / ORGANIZATION (Significantly Enlarged Font)
            if (hasOrg) {
                const orgName = organization.trim();
                let orgFontSize = 18;
                ctx.font = `700 ${orgFontSize}px Inter, -apple-system, sans-serif`;

                let orgWidth = ctx.measureText(orgName).width;
                while (orgWidth > maxAllowedWidth && orgFontSize > 13) {
                    orgFontSize -= 1;
                    ctx.font = `700 ${orgFontSize}px Inter, -apple-system, sans-serif`;
                    orgWidth = ctx.measureText(orgName).width;
                }

                ctx.fillStyle = '#F1F5F9';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 6;
                ctx.fillText(orgName, centerX, textRegionY + 128);
            }
        } else {
            // If name is not yet entered: Large, bold ATTENDEE text
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `900 44px Inter, -apple-system, sans-serif`;
            ctx.letterSpacing = '4px';
            ctx.fillText('ATTENDEE', centerX, hasOrg ? textRegionY + 65 : textRegionY + 80);

            if (hasOrg) {
                const orgName = organization.trim();
                let orgFontSize = 20;
                ctx.font = `700 ${orgFontSize}px Inter, -apple-system, sans-serif`;
                let orgWidth = ctx.measureText(orgName).width;
                const maxAllowedWidth = BASE_WIDTH - 100;
                while (orgWidth > maxAllowedWidth && orgFontSize > 13) {
                    orgFontSize -= 1;
                    ctx.font = `700 ${orgFontSize}px Inter, -apple-system, sans-serif`;
                    orgWidth = ctx.measureText(orgName).width;
                }
                ctx.fillStyle = '#FF9900';
                ctx.fillText(orgName, centerX, textRegionY + 115);
            }
        }

        ctx.restore();
        ctx.restore();
    };

    // Helper: Rounded Rectangle Path
    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };

    // Redraw whenever state changes
    useEffect(() => {
        if (templateLoaded) {
            drawBadge();
        }
    }, [name, organization, photoSrc, zoom, offsetX, offsetY, rotation, templateLoaded]);

    // Interactive Drag to Pan Photo
    const handleMouseDown = (e) => {
        if (!photoSrc) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        setOffsetX((prev) => prev + dx * 0.7);
        setOffsetY((prev) => prev + dy * 0.7);
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

    // Touch Support for Mobile Drag
    const handleTouchStart = (e) => {
        if (!photoSrc || e.touches.length !== 1) return;
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e) => {
        if (!isDraggingRef.current || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setOffsetX((prev) => prev + dx * 0.7);
        setOffsetY((prev) => prev + dy * 0.7);
    };

    // Download High-Resolution PNG
    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setGenerating(true);
        try {
            const link = document.createElement('a');
            const fileName = name ? `AWS_SCD26_Badge_${name.trim().replace(/\s+/g, '_')}.png` : 'AWS_SCD26_Attendee_Badge.png';
            link.download = fileName;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error('Failed to download badge:', err);
        } finally {
            setGenerating(false);
        }
    };

    // Copy Image Directly to Clipboard
    const handleCopyImage = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                setImageCopied(true);
                setTimeout(() => setImageCopied(false), 2500);
            }, 'image/png');
        } catch (e) {
            console.warn('Clipboard image write failed, falling back to download:', e);
            handleDownload();
        }
    };

    // Social Sharing Direct Links
    const shareText = `Excited to announce that I will be attending AWS Student Community Day DDU Nadiad 2026! 🚀 Connect with me at the event. Grab your ticket now! #AWSSCD26 #AWSCommunity #AWSCloud #DDU`;
    const eventUrl = 'https://aws.ddu.ac.in';

    const shareLinkedIn = () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}&summary=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=600,height=600');
    };

    const shareTwitter = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`;
        window.open(url, '_blank', 'width=600,height=600');
    };

    const shareWhatsApp = () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + eventUrl)}`;
        window.open(url, '_blank');
    };

    const handleNativeShare = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (navigator.share) {
            try {
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], 'AWS_SCD26_Badge.png', { type: 'image/png' });
                    await navigator.share({
                        title: 'AWS Student Community Day 2026 Badge',
                        text: shareText,
                        url: eventUrl,
                        files: [file]
                    });
                });
            } catch (err) {
                console.log('Share canceled or failed:', err);
            }
        } else {
            handleCopyLink();
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(eventUrl + '/badge');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#0C111D] text-white pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#8B5CF6]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#0073BB]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#FF9900]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10 space-y-10">
                {/* Hero Header */}
                <div className="text-center space-y-3 max-w-2xl mx-auto">
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                        Claim Your Official <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-[#4F8EF7] via-[#8B5CF6] to-[#FF9900] bg-clip-text text-transparent">
                            AWS SCD 2026 Badge
                        </span>
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-400">
                        Upload your photo, add your name and college, and share your official attendee badge on LinkedIn, X, and Instagram.
                    </p>
                </div>

                {/* Studio Workspace Split Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN: CONTROLS & STUDIO (7 cols) */}
                    <div className="lg:col-span-7 bg-[#151c2e] border border-[#1a2540] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-between pb-4 border-b border-[#1a2540]">
                            <div className="flex items-center space-x-2.5">
                                <Sliders className="w-4 h-4 text-[#4F8EF7]" />
                                <h2 className="font-bold text-white text-base">Attendee Badge Details</h2>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Step-by-Step</span>
                        </div>

                        {/* Step 1: Upload Photo */}
                        <div className="space-y-3">
                            <label className="text-xs font-mono uppercase text-slate-300 font-bold tracking-wider flex items-center justify-between">
                                <span>1. Upload Your Photo</span>
                                {photoSrc && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[11px] text-[#4F8EF7] hover:underline normal-case font-sans"
                                    >
                                        Change photo
                                    </button>
                                )}
                            </label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {!photoSrc ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-8 border-2 border-dashed border-[#1a2540] hover:border-[#0073BB] rounded-2xl bg-[#0C111D] text-center cursor-pointer transition group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-[#151c2e] group-hover:bg-[#0073BB]/20 text-slate-400 group-hover:text-[#4F8EF7] flex items-center justify-center mx-auto mb-3 transition">
                                        <Camera className="w-6 h-6" />
                                    </div>
                                    <div className="font-bold text-sm text-white">Click or drag your picture here</div>
                                    <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WebP (Square or portrait recommended)</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-mono">Photo Positioning & Scale:</span>
                                        <span className="text-[#4F8EF7] font-mono font-bold">{(zoom * 100).toFixed(0)}%</span>
                                    </div>

                                    {/* Zoom Slider */}
                                    <div className="flex items-center space-x-3">
                                        <ZoomOut className="w-4 h-4 text-slate-500" />
                                        <input
                                            type="range"
                                            min="0.6"
                                            max="2.5"
                                            step="0.05"
                                            value={zoom}
                                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                                            className="flex-1 accent-[#0073BB] cursor-pointer"
                                        />
                                        <ZoomIn className="w-4 h-4 text-slate-500" />
                                    </div>

                                    {/* Action Helpers */}
                                    <div className="flex items-center justify-between pt-2 border-t border-[#1a2540]/60 text-xs">
                                        <span className="text-slate-500 text-[11px] flex items-center space-x-1">
                                            <Move className="w-3 h-3 text-[#4F8EF7]" />
                                            <span>Click & drag photo on badge to reposition</span>
                                        </span>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setRotation((r) => (r + 90) % 360)}
                                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#151c2e] transition"
                                                title="Rotate Photo"
                                            >
                                                <RotateCw className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setZoom(1);
                                                    setOffsetX(0);
                                                    setOffsetY(0);
                                                    setRotation(0);
                                                }}
                                                className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white bg-[#151c2e] rounded-lg transition"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Name & Details */}
                        <div className="space-y-4 pt-2">
                            <label className="text-xs font-mono uppercase text-slate-300 font-bold tracking-wider">
                                2. Attendee Information
                            </label>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
                                    <User className="w-3.5 h-3.5 text-[#4F8EF7]" />
                                    <span>Full Name</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Aarav Patel"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={35}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0073BB] font-semibold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-[#FF9900]" />
                                    <span>College / Organization / University</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Dharmsinh Desai University (DDU)"
                                    value={organization}
                                    onChange={(e) => setOrganization(e.target.value)}
                                    maxLength={45}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#0073BB] font-semibold"
                                />
                            </div>
                        </div>

                        {/* Step 3: Fast Actions & Download */}
                        <div className="space-y-3 pt-4 border-t border-[#1a2540]">
                            <button
                                onClick={handleDownload}
                                className="w-full flex items-center justify-center space-x-2 py-4 bg-gradient-to-r from-[#0073BB] to-[#4F8EF7] hover:from-[#0073BB]/90 hover:to-[#4F8EF7]/90 text-white font-extrabold text-sm rounded-2xl transition shadow-xl shadow-[#0073BB]/25 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Download className="w-5 h-5 stroke-[2.5]" />
                                <span>Download High-Res Attendee Badge (PNG)</span>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleCopyImage}
                                    className="flex items-center justify-center space-x-1.5 py-2.5 bg-[#0C111D] hover:bg-[#1a2540] border border-[#1a2540] text-white rounded-xl text-xs font-semibold transition"
                                >
                                    {imageCopied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Image Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Copy Image</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleNativeShare}
                                    className="flex items-center justify-center space-x-1.5 py-2.5 bg-[#0C111D] hover:bg-[#1a2540] border border-[#1a2540] text-white rounded-xl text-xs font-semibold transition"
                                >
                                    <Share2 className="w-3.5 h-3.5 text-[#4F8EF7]" />
                                    <span>Share Link</span>
                                </button>
                            </div>
                        </div>

                        {/* Social Media One-Click Direct Links */}
                        <div className="space-y-2 pt-2">
                            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                                Share directly to your social feed:
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={shareLinkedIn}
                                    className="flex items-center justify-center space-x-1.5 py-2 bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 text-[#70B5F9] border border-[#0A66C2]/40 rounded-xl text-xs font-semibold transition"
                                >
                                    <Linkedin className="w-3.5 h-3.5 fill-current" />
                                    <span>LinkedIn</span>
                                </button>

                                <button
                                    onClick={shareTwitter}
                                    className="flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-semibold transition"
                                >
                                    <Twitter className="w-3.5 h-3.5 fill-current" />
                                    <span>Twitter / X</span>
                                </button>

                                <button
                                    onClick={shareWhatsApp}
                                    className="flex items-center justify-center space-x-1.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-600/40 rounded-xl text-xs font-semibold transition"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIVE INTERACTIVE BADGE PREVIEW (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col items-center space-y-4">
                        <div className="relative group">
                            {/* Live Badge Canvas Card */}
                            <div
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                touch-action="none"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleMouseUp}
                                className={`relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5 transition-transform duration-300 ${photoSrc ? 'cursor-grab active:cursor-grabbing' : ''
                                    }`}
                                style={{ maxWidth: '340px', aspectRatio: '591/1004' }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full object-contain block"
                                />

                                {/* Interactive Move Overlay Tooltip */}
                                {photoSrc && (
                                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-mono text-slate-300 border border-white/10 opacity-0 group-hover:opacity-100 transition pointer-events-none flex items-center space-x-1">
                                        <Move className="w-2.5 h-2.5" />
                                        <span>Drag to adjust</span>
                                    </div>
                                )}
                            </div>

                            {/* Decorative ambient underglow */}
                            <div className="absolute -inset-2 bg-gradient-to-r from-[#0073BB]/30 to-[#8B5CF6]/30 rounded-3xl blur-xl -z-10 opacity-70 group-hover:opacity-100 transition duration-500" />
                        </div>

                        <div className="text-center space-y-1">
                            <span className="text-[11px] font-mono text-slate-400 flex items-center justify-center space-x-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Live Ultra-HD 2X Preview (1182 x 2008)</span>
                            </span>
                            <p className="text-[11px] text-slate-500 max-w-xs">
                                Ready for high-resolution sharing on LinkedIn, Instagram, and Twitter.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
