'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    QrCode, Lock, Mail, ArrowRight, AlertCircle, Upload, Image as ImageIcon,
    Plus, Trash2, Download, FileText, Archive, Eye, Edit3, Move, Type,
    User, Camera, ChevronRight, Check, X, Table, FileSpreadsheet,
    Layers, Settings, RotateCcw, ZoomIn, ZoomOut, Crosshair,
    AlignLeft, AlignCenter, AlignRight, Bold, LogOut, CreditCard,
    Pipette, MousePointer, Maximize2, Cloud, Database, RefreshCw
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const FIELD_TYPES = [
    { id: 'first_name', label: 'First Name', icon: User },
    { id: 'last_name', label: 'Last Name', icon: User },
    { id: 'name', label: 'Full Name', icon: User },
    { id: 'photo', label: 'Photo', icon: Camera },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'role', label: 'Role / Title', icon: CreditCard },
    { id: 'booking_id', label: 'Booking ID', icon: FileText },
    { id: 'custom', label: 'Custom Text', icon: Type },
];

const FONT_OPTIONS = [
    'Arial', 'Inter', 'Roboto', 'Helvetica', 'Georgia',
    'Courier New', 'Verdana', 'Times New Roman', 'Trebuchet MS',
    'Segoe UI', 'Tahoma', 'Calibri', 'Poppins', 'Montserrat', 'Open Sans'
];
const PHOTO_SHAPES = [
    { id: 'rectangle', label: 'Rectangle' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'circle', label: 'Circle' },
    { id: 'custom', label: 'Custom' },
];
const SAMPLE_ATTENDEE = {
    first_name: 'Krish', last_name: 'Patel',
    name: 'Krish Patel', email: 'krish@example.com',
    role: 'Core Team Lead', booking_id: 'BK-0042', photo: ''
};

function generateId() {
    return 'f_' + Math.random().toString(36).substring(2, 10);
}

// ─── Admin Login Gate ────────────────────────────────────────────────────────
function AdminLoginGate({ onAuthenticated }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        fetch('/api/onepass/auth/me').then(r => r.json()).then(data => {
            if (data.authenticated && data.user && data.user.role === 'ADMIN') {
                onAuthenticated(data.user);
            }
            setChecking(false);
        }).catch(() => setChecking(false));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch('/api/onepass/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Authentication failed');
            if (data.user?.role !== 'ADMIN') throw new Error('Admin access only.');
            onAuthenticated(data.user);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    if (checking) return (
        <div className="min-h-screen bg-[#0C111D] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#0073BB] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0C111D] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#0073BB]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="w-full max-w-md space-y-6 relative z-10">
                <div className="text-center space-y-2">
                    <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0073BB] to-[#4F8EF7] items-center justify-center shadow-xl shadow-[#0073BB]/20">
                        <CreditCard className="w-6 h-6 text-white stroke-[2.5]" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Badge Studio</h1>
                    <p className="text-xs text-slate-400">OnePass ID Card Generator &bull; Admin Only</p>
                </div>
                <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold">Administrator Sign In</h2>
                        <p className="text-xs text-slate-400">Sign in with your admin credentials</p>
                    </div>
                    {error && (
                        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300">Email</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@onepass.ddu.ac.in"
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB] transition" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB] transition" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center space-x-2 py-3 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-[#0073BB]/20 mt-2">
                            {loading ? <span>Authenticating...</span> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ─── IndexedDB Persistent Storage for Templates, Regions & Attendees ────────
const DB_NAME = 'OnePassBadgeStudioDB_v1';
const DB_VERSION = 1;
const STORE_TEMPLATES = 'templates';
const STORE_FIELDS = 'fields';
const STORE_ATTENDEES = 'attendees';
const STORE_SETTINGS = 'settings';

function openBadgeDB() {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            resolve(null);
            return;
        }
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
                db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_FIELDS)) {
                db.createObjectStore(STORE_FIELDS);
            }
            if (!db.objectStoreNames.contains(STORE_ATTENDEES)) {
                db.createObjectStore(STORE_ATTENDEES);
            }
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                db.createObjectStore(STORE_SETTINGS);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

async function loadSavedDataFromDB() {
    try {
        const db = await openBadgeDB();
        if (!db) return null;
        return new Promise((resolve) => {
            const tx = db.transaction([STORE_TEMPLATES, STORE_FIELDS, STORE_ATTENDEES, STORE_SETTINGS], 'readonly');
            const tplStore = tx.objectStore(STORE_TEMPLATES);
            const fieldsStore = tx.objectStore(STORE_FIELDS);
            const attStore = tx.objectStore(STORE_ATTENDEES);
            const settingsStore = tx.objectStore(STORE_SETTINGS);

            const tplReq = tplStore.getAll();
            const fieldsReq = fieldsStore.get('all_fields');
            const attReq = attStore.get('all_attendees');
            const activeIdxReq = settingsStore.get('active_template_idx');

            tx.oncomplete = () => {
                let attendeesData = attReq.result || {};
                // Migration: if previously saved as a flat array, attach to the first template
                if (Array.isArray(attendeesData)) {
                    const firstTplId = tplReq.result?.[0]?.id;
                    if (firstTplId) {
                        attendeesData = { [firstTplId]: attendeesData };
                    } else {
                        attendeesData = {};
                    }
                }
                resolve({
                    templates: tplReq.result || [],
                    fields: fieldsReq.result || {},
                    attendeesByTemplate: attendeesData,
                    activeTemplateIdx: activeIdxReq.result ?? 0
                });
            };
            tx.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function saveStudioDataToDB(templates, fields, attendeesByTemplate, activeTemplateIdx) {
    try {
        const db = await openBadgeDB();
        if (!db) return;
        const tx = db.transaction([STORE_TEMPLATES, STORE_FIELDS, STORE_ATTENDEES, STORE_SETTINGS], 'readwrite');
        const tplStore = tx.objectStore(STORE_TEMPLATES);
        const fieldsStore = tx.objectStore(STORE_FIELDS);
        const attStore = tx.objectStore(STORE_ATTENDEES);
        const settingsStore = tx.objectStore(STORE_SETTINGS);

        // Save current templates
        tplStore.clear();
        (templates || []).forEach(tpl => tplStore.put(tpl));
        fieldsStore.put(fields || {}, 'all_fields');
        attStore.put(attendeesByTemplate || {}, 'all_attendees');
        settingsStore.put(activeTemplateIdx || 0, 'active_template_idx');
    } catch (err) {
        console.warn('Failed to save to IndexedDB', err);
    }
}

// ─── Canvas Helper ───────────────────────────────────────────────────────────
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });
}

// ─── Sample color from EDGES of a region (avoids sampling placeholder text) ──
function sampleColorFromImage(dataUrl, x, y, w, h) {
    return new Promise(resolve => {
        const img = new window.Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Sample multiple points along the EDGES of the region (not center, which has text)
            const samplePoints = [
                [Math.round(x + 2), Math.round(y + 2)],                    // top-left corner
                [Math.round(x + w - 2), Math.round(y + 2)],                // top-right corner
                [Math.round(x + 2), Math.round(y + h - 2)],                // bottom-left corner
                [Math.round(x + w - 2), Math.round(y + h - 2)],            // bottom-right corner
                [Math.round(x + w / 2), Math.round(y + 1)],                // top-center edge
                [Math.round(x + w / 2), Math.round(y + h - 1)],            // bottom-center edge
                [Math.round(x + 1), Math.round(y + h / 2)],                // left-center edge
            ];

            const colors = [];
            for (const [sx, sy] of samplePoints) {
                if (sx >= 0 && sx < c.width && sy >= 0 && sy < c.height) {
                    try {
                        const pixel = ctx.getImageData(sx, sy, 1, 1).data;
                        colors.push([pixel[0], pixel[1], pixel[2]]);
                    } catch { /* skip */ }
                }
            }

            if (colors.length === 0) { resolve('#ffffff'); return; }

            // Use the most common color (mode) to avoid picking text color
            const colorMap = {};
            let bestKey = '', bestCount = 0;
            for (const [r, g, b] of colors) {
                // Quantize to nearest 8 to group similar colors
                const qr = Math.round(r / 8) * 8, qg = Math.round(g / 8) * 8, qb = Math.round(b / 8) * 8;
                const key = `${qr},${qg},${qb}`;
                colorMap[key] = (colorMap[key] || 0) + 1;
                if (colorMap[key] > bestCount) { bestCount = colorMap[key]; bestKey = key; }
            }
            const [br, bg, bb] = bestKey.split(',').map(Number);
            resolve(`#${br.toString(16).padStart(2,'0')}${bg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`);
        };
        img.onerror = () => resolve('#ffffff');
        img.src = dataUrl;
    });
}

// ─── Word-wrap text into lines that fit a max width ──────────────────────────
function wrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

// ─── Auto-shrink font size until individual words fit within region width ─────
function fitFontSize(ctx, text, maxWidth, startSize, fontFamily, bold) {
    const words = text.split(/\s+/);
    let size = startSize;
    while (size > 8) {
        ctx.font = `${bold ? 'bold' : 'normal'} ${size}px "${fontFamily}"`;
        const anyWordTooWide = words.some(w => ctx.measureText(w).width > maxWidth);
        if (!anyWordTooWide) break;
        size -= 1;
    }
    return size;
}

// ─── Render a single badge ───────────────────────────────────────────────────
async function renderBadgeToCanvas(template, fields, attendee, scale = 1, cachedBgImg = null, targetCanvas = null) {
    const canvas = targetCanvas || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const bgImg = cachedBgImg || (await loadImage(template.dataUrl));

    canvas.width = Math.round(bgImg.naturalWidth * scale);
    canvas.height = Math.round(bgImg.naturalHeight * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight);

    const overrides = attendee?.fieldOverrides || {};

    for (const field of fields) {
        // If this region is marked hidden for this attendee, skip rendering it
        if (overrides[`${field.id}_hidden`]) continue;

        const { x, y, width: w, height: h } = field;
        const pad = field.bgPadding || 0;

        // Step 1: FILL the region with background color to ERASE the placeholder
        if (field.bgColor && field.bgColor !== 'transparent') {
            ctx.save();
            ctx.fillStyle = field.bgColor;
            ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
            ctx.restore();
        }

        const overrideVal = overrides[field.id];

        // Step 2: Render the dynamic content
        if (field.type === 'photo') {
            const photoSrc = (overrideVal !== undefined && overrideVal !== '') ? overrideVal : attendee.photo;
            if (photoSrc) {
                try {
                    const photoImg = await loadImage(photoSrc);
                    ctx.save();

                    // Build clipping path based on shape
                    const bw = field.borderWidth || 0;
                    const cx = x + bw, cy = y + bw, cw = Math.max(1, w - bw * 2), ch = Math.max(1, h - bw * 2);

                    if (field.photoShape === 'circle') {
                        const rx = cx + cw / 2, ry = cy + ch / 2, r = Math.min(cw, ch) / 2;
                        ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.clip();
                    } else if (field.photoShape === 'custom' || field.photoShape === 'rounded') {
                        const uniformR = field.uniformRadius != null ? field.uniformRadius : Math.round(Math.min(cw, ch) * 0.08);
                        const rTL = Math.min(cw / 2, ch / 2, field.photoShape === 'custom' ? (field.radiusTL ?? 12) : uniformR);
                        const rTR = Math.min(cw / 2, ch / 2, field.photoShape === 'custom' ? (field.radiusTR ?? 12) : uniformR);
                        const rBR = Math.min(cw / 2, ch / 2, field.photoShape === 'custom' ? (field.radiusBR ?? 12) : uniformR);
                        const rBL = Math.min(cw / 2, ch / 2, field.photoShape === 'custom' ? (field.radiusBL ?? 12) : uniformR);
                        ctx.beginPath();
                        ctx.moveTo(cx + rTL, cy);
                        ctx.lineTo(cx + cw - rTR, cy);
                        ctx.quadraticCurveTo(cx + cw, cy, cx + cw, cy + rTR);
                        ctx.lineTo(cx + cw, cy + ch - rBR);
                        ctx.quadraticCurveTo(cx + cw, cy + ch, cx + cw - rBR, cy + ch);
                        ctx.lineTo(cx + rBL, cy + ch);
                        ctx.quadraticCurveTo(cx, cy + ch, cx, cy + ch - rBL);
                        ctx.lineTo(cx, cy + rTL);
                        ctx.quadraticCurveTo(cx, cy, cx + rTL, cy);
                        ctx.closePath(); ctx.clip();
                    }

                    // Object-fit: COVER with attendee-specific or template zoom & pan
                    const zoom = Math.max(0.1, Number(attendee.photoZoom ?? field.photoZoom ?? 1));
                    const panX = Number(attendee.photoPanX ?? field.photoPanX ?? 0); // percentage offset (-100 to 100)
                    const panY = Number(attendee.photoPanY ?? field.photoPanY ?? 0);

                    const imgW = photoImg.naturalWidth || 100;
                    const imgH = photoImg.naturalHeight || 100;
                    const baseScale = Math.max(cw / imgW, ch / imgH);
                    const finalScale = baseScale * zoom;

                    const drawnW = imgW * finalScale;
                    const drawnH = imgH * finalScale;

                    // Center position + pan offset
                    const offsetX = (cw - drawnW) / 2 + (panX / 100) * (cw / 2);
                    const offsetY = (ch - drawnH) / 2 + (panY / 100) * (ch / 2);

                    ctx.drawImage(photoImg, cx + offsetX, cy + offsetY, drawnW, drawnH);
                    ctx.restore();

                    // Draw border on top (outside the clip)
                    if (bw > 0 && field.borderColor) {
                        ctx.save();
                        ctx.strokeStyle = field.borderColor;
                        ctx.lineWidth = bw;
                        if (field.photoShape === 'circle') {
                            const rx = x + w / 2, ry = y + h / 2, r = Math.min(w, h) / 2 - bw / 2;
                            ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke();
                        } else if (field.photoShape === 'custom' || field.photoShape === 'rounded') {
                            const bx = x + bw / 2, by = y + bw / 2, bwi = w - bw, bhi = h - bw;
                            const uniformRb = field.uniformRadius != null ? field.uniformRadius : Math.round(Math.min(w, h) * 0.08);
                            const rTL = Math.min(bwi / 2, bhi / 2, field.photoShape === 'custom' ? (field.radiusTL ?? 12) : uniformRb);
                            const rTR = Math.min(bwi / 2, bhi / 2, field.photoShape === 'custom' ? (field.radiusTR ?? 12) : uniformRb);
                            const rBR = Math.min(bwi / 2, bhi / 2, field.photoShape === 'custom' ? (field.radiusBR ?? 12) : uniformRb);
                            const rBL = Math.min(bwi / 2, bhi / 2, field.photoShape === 'custom' ? (field.radiusBL ?? 12) : uniformRb);
                            ctx.beginPath();
                            ctx.moveTo(bx + rTL, by);
                            ctx.lineTo(bx + bwi - rTR, by);
                            ctx.quadraticCurveTo(bx + bwi, by, bx + bwi, by + rTR);
                            ctx.lineTo(bx + bwi, by + bhi - rBR);
                            ctx.quadraticCurveTo(bx + bwi, by + bhi, bx + bwi - rBR, by + bhi);
                            ctx.lineTo(bx + rBL, by + bhi);
                            ctx.quadraticCurveTo(bx, by + bhi, bx, by + bhi - rBL);
                            ctx.lineTo(bx, by + rTL);
                            ctx.quadraticCurveTo(bx, by, bx + rTL, by);
                            ctx.closePath(); ctx.stroke();
                        } else {
                            ctx.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);
                        }
                        ctx.restore();
                    }
                } catch {
                    ctx.save();
                    ctx.fillStyle = field.bgColor || '#f0f0f0';
                    ctx.fillRect(x, y, w, h);
                    ctx.fillStyle = '#aaa';
                    ctx.font = `${Math.max(12, Math.min(w, h) * 0.15)}px Arial`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('Photo', x + w / 2, y + h / 2);
                    ctx.restore();
                }
            } else {
                ctx.save();
                ctx.fillStyle = field.bgColor || '#f0f0f0';
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = '#bbb';
                ctx.font = `${Math.max(12, Math.min(w, h) * 0.15)}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('No Photo', x + w / 2, y + h / 2);
                ctx.restore();
            }
        } else {
            // ─── Text field rendering with exact alignment & box bounds ─────
            let text = '';
            if (overrideVal !== undefined && overrideVal !== null && overrideVal !== '') {
                text = String(overrideVal);
            } else if (field.type === 'first_name') {
                text = attendee.first_name || (attendee.name ? attendee.name.split(' ')[0] : '');
            } else if (field.type === 'last_name') {
                text = attendee.last_name || (attendee.name ? attendee.name.split(' ').slice(1).join(' ') : '');
            } else if (field.type === 'name') {
                text = attendee.name || `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim();
            } else if (field.type === 'email') {
                text = attendee.email || '';
            } else if (field.type === 'role') {
                text = attendee.role || '';
            } else if (field.type === 'booking_id') {
                text = attendee.booking_id || '';
            } else if (field.type === 'custom') {
                text = (attendee[field.label] !== undefined && attendee[field.label] !== '') ? attendee[field.label] : (field.customText || '');
            }

            if (text) {
                const fontFamily = field.fontFamily || 'Arial';
                const isBold = !!field.bold;
                const textPadding = field.textPadding ?? 0;
                const maxTextWidth = Math.max(10, w - textPadding * 2);
                let fontSize = field.fontSize || 18;

                // Auto-fit font size only if single word exceeds width
                fontSize = fitFontSize(ctx, text, maxTextWidth, fontSize, fontFamily, isBold);
                ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px "${fontFamily}"`;
                ctx.fillStyle = field.fontColor || '#000000';
                
                const textAlign = field.textAlign || 'left';
                ctx.textAlign = textAlign;

                // Calculate exact X position matching the drawn box
                let textX = x;
                if (textAlign === 'center') textX = x + w / 2;
                else if (textAlign === 'right') textX = x + w - textPadding;
                else textX = x + textPadding;

                // Word-wrap into lines
                const lines = wrapText(ctx, text, maxTextWidth);
                const lineHeight = fontSize * (field.lineHeightMultiplier || 1.15);

                const vAlign = field.verticalAlign || 'middle';
                if (vAlign === 'top') {
                    ctx.textBaseline = 'top';
                    for (let i = 0; i < lines.length; i++) {
                        ctx.fillText(lines[i], textX, y + i * lineHeight);
                    }
                } else if (vAlign === 'bottom') {
                    ctx.textBaseline = 'bottom';
                    const startY = y + h - (lines.length - 1) * lineHeight;
                    for (let i = 0; i < lines.length; i++) {
                        ctx.fillText(lines[i], textX, startY + i * lineHeight);
                    }
                } else {
                    // Middle: vertically center line(s) precisely within box height h
                    ctx.textBaseline = 'middle';
                    const totalBlockHeight = (lines.length - 1) * lineHeight;
                    const startY = y + h / 2 - totalBlockHeight / 2;
                    for (let i = 0; i < lines.length; i++) {
                        ctx.fillText(lines[i], textX, startY + i * lineHeight);
                    }
                }
            }
        }
    }

    return canvas;
}

// ─── Attendee Details & Region Overrides Modal ────────────────────────────────
function AttendeeRegionModal({ attendee, template, fields, onSave, onClose }) {
    const [firstName, setFirstName] = useState(attendee.first_name || '');
    const [lastName, setLastName] = useState(attendee.last_name || '');
    const [email, setEmail] = useState(attendee.email || '');
    const [role, setRole] = useState(attendee.role || '');
    const [bookingId, setBookingId] = useState(attendee.booking_id || '');
    const [photo, setPhoto] = useState(attendee.photo || '');
    const [overrides, setOverrides] = useState({ ...(attendee.fieldOverrides || {}) });
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Build temporary attendee object for live preview
    const tempAttendee = useMemo(() => {
        const fName = firstName.trim();
        const lName = lastName.trim();
        return {
            ...attendee,
            first_name: fName,
            last_name: lName,
            name: `${fName} ${lName}`.trim() || attendee.name || 'Attendee',
            email: email.trim(),
            role: role.trim(),
            booking_id: bookingId.trim(),
            photo: photo,
            fieldOverrides: overrides
        };
    }, [attendee, firstName, lastName, email, role, bookingId, photo, overrides]);

    // Live update preview canvas whenever tempAttendee changes
    useEffect(() => {
        let isMounted = true;
        if (!template) return;
        setPreviewLoading(true);
        renderBadgeToCanvas(template, fields || [], tempAttendee, 0.7)
            .then(canvas => {
                if (isMounted) {
                    setPreviewUrl(canvas.toDataURL('image/png'));
                    setPreviewLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setPreviewLoading(false);
            });
        return () => { isMounted = false; };
    }, [template, fields, tempAttendee]);

    const handleSave = () => {
        onSave(tempAttendee);
    };

    const handleRegionPhotoUpload = (fieldId, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setOverrides(prev => ({ ...prev, [fieldId]: ev.target.result }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl space-y-4 p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1a2540] pb-3 flex-shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center space-x-2">
                            <Edit3 className="w-4 h-4 text-[#4F8EF7]" />
                            <span>Edit Attendee &amp; Custom Region Overrides</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            Customize text, photo, or visibility for specific regions on <strong className="text-slate-200">{attendee.name || 'this attendee'}</strong>&apos;s badge
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content grid: Form & Live Badge Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto pr-1 flex-1">
                    {/* Left Form: Basic Info + Regions */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* Basic Info */}
                        <div className="bg-[#0A0F1D] border border-[#1a2540] rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                                <User className="w-3.5 h-3.5 text-[#4F8EF7]" />
                                <span>Basic Details</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400">First Name</label>
                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0073BB]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400">Last Name</label>
                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0073BB]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400">Role / Title</label>
                                    <input type="text" value={role} onChange={e => setRole(e.target.value)}
                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0073BB]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400">Booking ID</label>
                                    <input type="text" value={bookingId} onChange={e => setBookingId(e.target.value)}
                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#0073BB]" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] text-slate-400">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0073BB]" />
                                </div>
                            </div>
                        </div>

                        {/* Marked Regions List */}
                        <div className="bg-[#0A0F1D] border border-[#1a2540] rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                                    <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Template Regions &amp; Custom Overrides ({(fields || []).length})</span>
                                </h4>
                                {Object.keys(overrides).length > 0 && (
                                    <button onClick={() => setOverrides({})} className="text-[10px] text-red-400 hover:text-red-300 transition underline">
                                        Reset All Overrides
                                    </button>
                                )}
                            </div>

                            {(!fields || fields.length === 0) ? (
                                <p className="text-xs text-slate-500 py-2">No regions drawn on this template yet. Draw regions in the &quot;Select &amp; Replace&quot; tab.</p>
                            ) : (
                                <div className="space-y-3">
                                    {fields.map(f => {
                                        const FI = FIELD_TYPES.find(ft => ft.id === f.type)?.icon || Type;
                                        const isHidden = !!overrides[`${f.id}_hidden`];
                                        const hasCustomVal = overrides[f.id] !== undefined && overrides[f.id] !== '';
                                        
                                        // Default fallback text
                                        let defaultVal = '';
                                        if (f.type === 'first_name') defaultVal = firstName || 'First Name';
                                        else if (f.type === 'last_name') defaultVal = lastName || 'Last Name';
                                        else if (f.type === 'name') defaultVal = `${firstName} ${lastName}`.trim() || 'Full Name';
                                        else if (f.type === 'role') defaultVal = role || 'Role';
                                        else if (f.type === 'email') defaultVal = email || 'Email';
                                        else if (f.type === 'booking_id') defaultVal = bookingId || 'Booking ID';
                                        else if (f.type === 'custom') defaultVal = f.customText || '(Custom Text)';
                                        else if (f.type === 'photo') defaultVal = photo ? 'Using Main Photo' : 'No Photo';

                                        return (
                                            <div key={f.id} className={`p-3 rounded-xl border transition ${isHidden ? 'bg-slate-900/30 border-slate-800 opacity-60' : hasCustomVal ? 'bg-[#0073BB]/10 border-[#0073BB]/40' : 'bg-[#151c2e] border-[#1a2540]'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <FI className="w-3.5 h-3.5 text-[#4F8EF7]" />
                                                        <span className="text-xs font-semibold text-white">{f.label || f.type}</span>
                                                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                                            {f.type}
                                                        </span>
                                                        {hasCustomVal && (
                                                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                Customized
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={() => setOverrides(prev => ({ ...prev, [`${f.id}_hidden`]: !prev[`${f.id}_hidden`] }))}
                                                        className={`text-[10px] px-2 py-0.5 rounded transition ${isHidden ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-slate-400 hover:text-white'}`}>
                                                        {isHidden ? 'Hidden on Card' : 'Visible'}
                                                    </button>
                                                </div>

                                                {!isHidden && (
                                                    <div className="space-y-1.5">
                                                        {f.type === 'photo' ? (
                                                            <div className="flex items-center space-x-3">
                                                                {(overrides[f.id] || photo) ? (
                                                                    <img src={overrides[f.id] || photo} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#1a2540]" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-lg bg-[#0C111D] border border-[#1a2540] flex items-center justify-center">
                                                                        <Camera className="w-4 h-4 text-slate-500" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col space-y-1">
                                                                    <label className="text-[11px] px-2.5 py-1 bg-[#0C111D] border border-[#1a2540] hover:bg-[#1a2540] rounded-lg text-slate-300 cursor-pointer text-center">
                                                                        {overrides[f.id] ? 'Change Region Photo' : 'Upload Specific Photo for this Region'}
                                                                        <input type="file" accept="image/*" onChange={e => handleRegionPhotoUpload(f.id, e)} className="hidden" />
                                                                    </label>
                                                                    {overrides[f.id] && (
                                                                        <button type="button" onClick={() => setOverrides(prev => { const n = { ...prev }; delete n[f.id]; return n; })}
                                                                            className="text-[9px] text-slate-400 hover:text-red-400 text-left">
                                                                            Reset to Main Attendee Photo
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                                    <span>Default: <em className="text-slate-400">{defaultVal}</em></span>
                                                                    {hasCustomVal && (
                                                                        <button type="button" onClick={() => setOverrides(prev => { const n = { ...prev }; delete n[f.id]; return n; })}
                                                                            className="text-amber-400 hover:underline">
                                                                            Reset to default
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <input type="text"
                                                                    value={overrides[f.id] !== undefined ? overrides[f.id] : ''}
                                                                    placeholder={`Override text (e.g. VIP, Table 3, Custom Role...)`}
                                                                    onChange={e => setOverrides(prev => ({ ...prev, [f.id]: e.target.value }))}
                                                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0073BB]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Real-time Live Badge Preview for this Attendee */}
                    <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-3 bg-[#0A0F1D] border border-[#1a2540] rounded-xl p-4">
                        <div className="w-full flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Live Card Preview</span>
                            </span>
                            {previewLoading && <span className="text-[10px] text-blue-400 animate-pulse">Rendering...</span>}
                        </div>

                        <div className="w-full bg-[#0C111D] rounded-xl border border-[#1a2540] p-3 flex items-center justify-center min-h-[300px]">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Badge Preview" className="max-w-full max-h-[360px] object-contain rounded-lg shadow-xl shadow-black/40" />
                            ) : (
                                <div className="text-center py-12 text-slate-500 text-xs">
                                    <p>Generating preview...</p>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 text-center">
                            Any edits made above update this preview instantly and apply exclusively to this attendee card.
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-[#1a2540] pt-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-[#0A0F1D] border border-[#1a2540] text-slate-400 hover:text-white text-xs font-medium rounded-xl transition">
                        Cancel
                    </button>
                    <button onClick={handleSave}
                        className="flex items-center space-x-1.5 px-6 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#0073BB]/20">
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Interactive Photo Adjustment Modal (Zoom In/Out, Pan & Crop) ─────────────
function PhotoAdjustmentModal({ attendee, photoField, onSave, onClose }) {
    const [zoom, setZoom] = useState(attendee.photoZoom ?? photoField?.photoZoom ?? 1);
    const [panX, setPanX] = useState(attendee.photoPanX ?? photoField?.photoPanX ?? 0);
    const [panY, setPanY] = useState(attendee.photoPanY ?? photoField?.photoPanY ?? 0);
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, origPanX: 0, origPanY: 0 });

    const fw = photoField?.width || 200;
    const fh = photoField?.height || 260;
    const aspect = fw / fh;
    const previewHeight = 280;
    const previewWidth = Math.round(previewHeight * aspect);

    let borderRadius = '8px';
    if (photoField?.photoShape === 'circle') borderRadius = '9999px';
    else if (photoField?.photoShape === 'rounded') borderRadius = `${photoField.uniformRadius ?? 16}px`;
    else if (photoField?.photoShape === 'custom') borderRadius = `${photoField.radiusTL ?? 16}px ${photoField.radiusTR ?? 16}px ${photoField.radiusBR ?? 16}px ${photoField.radiusBL ?? 16}px`;
    else if (photoField?.photoShape === 'rectangle') borderRadius = '0px';

    const handleMouseDown = (e) => {
        e.preventDefault();
        setDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY, origPanX: panX, origPanY: panY });
    };

    const handleMouseMove = useCallback((e) => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const sensitivity = 0.8;
        const newPanX = Math.max(-100, Math.min(100, Math.round(dragStart.origPanX + (dx / (previewWidth / 2)) * 100 * sensitivity)));
        const newPanY = Math.max(-100, Math.min(100, Math.round(dragStart.origPanY + (dy / (previewHeight / 2)) * 100 * sensitivity)));
        setPanX(newPanX);
        setPanY(newPanY);
    }, [dragging, dragStart, previewWidth, previewHeight]);

    const handleMouseUp = useCallback(() => {
        setDragging(false);
    }, []);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(z => Math.max(0.3, Math.min(3.0, parseFloat((z + delta).toFixed(2)))));
    };

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-[#1a2540] pb-3">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                            <Camera className="w-4 h-4 text-[#4F8EF7]" />
                            <span>Adjust Photo Position &amp; Zoom</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">Position headshot for <strong className="text-slate-200">{attendee.name || 'Attendee'}</strong></p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Interactive Preview Canvas */}
                <div className="flex flex-col items-center justify-center bg-[#080c16] rounded-xl p-4 border border-[#1a2540]">
                    <div className="text-[10px] text-slate-400 mb-2 flex items-center space-x-2">
                        <Move className="w-3 h-3 text-amber-400" />
                        <span>Click &amp; drag photo to pan &bull; Scroll wheel to zoom in/out</span>
                    </div>

                    <div onMouseDown={handleMouseDown}
                        onWheel={handleWheel}
                        className="relative overflow-hidden cursor-grab active:cursor-grabbing border-2 border-[#0073BB] shadow-2xl select-none"
                        style={{
                            width: `${previewWidth}px`,
                            height: `${previewHeight}px`,
                            borderRadius: borderRadius,
                            backgroundColor: '#1e293b'
                        }}>
                        {attendee.photo && (
                            <img src={attendee.photo}
                                alt=""
                                draggable={false}
                                className="absolute max-w-none pointer-events-none"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: `scale(${zoom}) translate(${panX / 2}%, ${panY / 2}%)`,
                                    transformOrigin: 'center center'
                                }} />
                        )}
                        {/* 3x3 Grid Overlay */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20 border border-white/40">
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-white" />
                            <div className="border-r border-white" />
                            <div />
                        </div>
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="space-y-3 bg-[#0A0F1D] p-3.5 rounded-xl border border-[#1a2540]">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
                            <ZoomIn className="w-3.5 h-3.5 text-[#4F8EF7]" />
                            <span>Zoom Level</span>
                        </span>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(2))))} className="px-2 py-0.5 rounded bg-[#151c2e] hover:bg-[#1a2540] text-slate-300 text-xs font-bold transition">-</button>
                            <span className="text-[#4F8EF7] font-mono font-bold text-xs w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                            <button onClick={() => setZoom(z => Math.min(3.0, parseFloat((z + 0.1).toFixed(2))))} className="px-2 py-0.5 rounded bg-[#151c2e] hover:bg-[#1a2540] text-slate-300 text-xs font-bold transition">+</button>
                        </div>
                    </div>
                    <input type="range" min="0.3" max="3.0" step="0.02" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#151c2e] rounded-lg appearance-none cursor-pointer accent-[#0073BB]" />

                    {/* Pan X and Pan Y Controls */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#1a2540]/60">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Pan Horizontal (X)</span>
                                <span className="font-mono text-slate-300">{panX}%</span>
                            </div>
                            <input type="range" min="-100" max="100" value={panX} onChange={e => setPanX(parseInt(e.target.value) || 0)}
                                className="w-full h-1.5 bg-[#151c2e] rounded-lg appearance-none cursor-pointer accent-[#0073BB]" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Pan Vertical (Y)</span>
                                <span className="font-mono text-slate-300">{panY}%</span>
                            </div>
                            <input type="range" min="-100" max="100" value={panY} onChange={e => setPanY(parseInt(e.target.value) || 0)}
                                className="w-full h-1.5 bg-[#151c2e] rounded-lg appearance-none cursor-pointer accent-[#0073BB]" />
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-1">
                    <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
                        className="flex items-center space-x-1 px-3 py-2 bg-[#0A0F1D] border border-[#1a2540] hover:bg-[#151c2e] text-slate-400 hover:text-white text-xs font-medium rounded-xl transition">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                    </button>
                    <div className="flex items-center space-x-2">
                        <button onClick={onClose}
                            className="px-4 py-2 bg-[#0A0F1D] border border-[#1a2540] text-slate-400 hover:text-white text-xs font-medium rounded-xl transition">
                            Cancel
                        </button>
                        <button onClick={() => onSave({ photoZoom: zoom, photoPanX: panX, photoPanY: panY })}
                            className="flex items-center space-x-1.5 px-5 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#0073BB]/20">
                            <Check className="w-3.5 h-3.5" />
                            <span>Save &amp; Apply</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Badge Studio ──────────────────────────────────────────────────────
function BadgeStudio({ admin }) {
    const [activeTab, setActiveTab] = useState(0);
    // Templates
    const [templates, setTemplates] = useState([]);
    const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);
    // Fields per template
    const [fields, setFields] = useState({});
    const [selectedFieldId, setSelectedFieldId] = useState(null);
    // Editor tools
    const [editorTool, setEditorTool] = useState('select'); // 'select' | 'draw' | 'eyedropper'
    const [drawFieldType, setDrawFieldType] = useState('first_name');
    const [drawState, setDrawState] = useState(null); // { startX, startY }
    const [drawRect, setDrawRect] = useState(null); // { x, y, w, h } during drawing
    const [dragState, setDragState] = useState(null);
    const [resizeState, setResizeState] = useState(null);
    const [editorScale, setEditorScale] = useState(1);
    const [showPreview, setShowPreview] = useState(false);
    const [previewAttendeeId, setPreviewAttendeeId] = useState('sample');
    const [previewCanvasUrl, setPreviewCanvasUrl] = useState(null);
    const editorContainerRef = useRef(null);
    const imgRef = useRef(null);
    // Attendees (Isolated per template)
    const [attendeesByTemplate, setAttendeesByTemplate] = useState({});
    const [manualFirstName, setManualFirstName] = useState('');
    const [manualLastName, setManualLastName] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [manualRole, setManualRole] = useState('');
    const [manualBookingId, setManualBookingId] = useState('');
    const [manualPhotoUrl, setManualPhotoUrl] = useState('');
    const [columnMapping, setColumnMapping] = useState(null);
    const [importedHeaders, setImportedHeaders] = useState([]);
    const [importedRows, setImportedRows] = useState([]);
    // Bulk Region Customization Tool
    const [bulkTargetFieldId, setBulkTargetFieldId] = useState('');
    const [bulkCustomText, setBulkCustomText] = useState('');
    const [bulkFeedback, setBulkFeedback] = useState('');
    // Modal for Editing an Attendee's Details & Region Overrides
    const [editingAttendee, setEditingAttendee] = useState(null);
    // Export
    const [previewCards, setPreviewCards] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, label: '' });
    // Photo Adjustment Modal
    const [adjustingAttendee, setAdjustingAttendee] = useState(null);
    // Persistence state
    const [isLoadedFromDB, setIsLoadedFromDB] = useState(false);
    const [savedStatus, setSavedStatus] = useState('Saved'); // 'Saving...' | 'Saved'

    const activeTemplate = templates[activeTemplateIdx] || null;
    const activeFields = activeTemplate ? (fields[activeTemplate.id] || []) : [];
    const selectedField = activeFields.find(f => f.id === selectedFieldId);

    const attendees = useMemo(() => {
        return activeTemplate ? (attendeesByTemplate[activeTemplate.id] || []) : [];
    }, [activeTemplate, attendeesByTemplate]);

    const setAttendees = useCallback((updater) => {
        if (!activeTemplate) return;
        setAttendeesByTemplate(prev => {
            const current = prev[activeTemplate.id] || [];
            const next = typeof updater === 'function' ? updater(current) : updater;
            return { ...prev, [activeTemplate.id]: next };
        });
    }, [activeTemplate]);

    // Multi-Selection & Export Scope (Scoped to Active Template)
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState(new Set());
    const [exportScope, setExportScope] = useState('all'); // 'all' | 'selected'
    const [pdfBatchOption, setPdfBatchOption] = useState('all'); // 'all' | '50' | '100'
    const [previewLimit, setPreviewLimit] = useState(24);

    // Reset selection when switching templates
    useEffect(() => {
        setSelectedAttendeeIds(new Set());
    }, [activeTemplateIdx]);

    const toggleSelectAttendee = (id) => {
        setSelectedAttendeeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedAttendeeIds.size === attendees.length && attendees.length > 0) {
            setSelectedAttendeeIds(new Set());
        } else {
            setSelectedAttendeeIds(new Set(attendees.map(a => a.id)));
        }
    };

    const deleteSelectedAttendees = () => {
        if (selectedAttendeeIds.size === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedAttendeeIds.size} selected attendee${selectedAttendeeIds.size > 1 ? 's' : ''}?`)) {
            setAttendees(prev => prev.filter(a => !selectedAttendeeIds.has(a.id)));
            setSelectedAttendeeIds(new Set());
        }
    };

    const invertSelection = () => {
        setSelectedAttendeeIds(prev => {
            const next = new Set();
            attendees.forEach(a => {
                if (!prev.has(a.id)) next.add(a.id);
            });
            return next;
        });
    };

    const getTargetAttendees = useCallback(() => {
        if (exportScope === 'selected' && selectedAttendeeIds.size > 0) {
            return attendees.filter(a => selectedAttendeeIds.has(a.id));
        }
        return attendees;
    }, [attendees, exportScope, selectedAttendeeIds]);

    const [cloudStatus, setCloudStatus] = useState('Synced'); // 'Syncing...' | 'Synced' | 'Offline'

    // ─── Load saved templates, regions & attendees on mount (Local + Supabase Cloud) ───
    useEffect(() => {
        loadSavedDataFromDB().then((saved) => {
            let hasLocal = false;
            if (saved && saved.templates && saved.templates.length > 0) {
                setTemplates(saved.templates);
                setFields(saved.fields || {});
                setAttendeesByTemplate(saved.attendeesByTemplate || {});
                setActiveTemplateIdx(Math.min(saved.activeTemplateIdx || 0, saved.templates.length - 1));
                hasLocal = true;
            }
            setIsLoadedFromDB(true);

            // Fetch from Supabase Cloud to merge or restore
            fetch('/api/onepass/sync')
                .then(r => r.json())
                .then(res => {
                    if (res.success && res.data && res.data.templates && res.data.templates.length > 0) {
                        if (!hasLocal || res.data.templates.length >= (saved?.templates?.length || 0)) {
                            setTemplates(res.data.templates);
                            setFields(res.data.fields || {});
                            setAttendeesByTemplate(res.data.attendeesByTemplate || {});
                            setActiveTemplateIdx(Math.min(res.data.activeTemplateIdx || 0, res.data.templates.length - 1));
                        }
                    }
                })
                .catch(() => {});
        });
    }, []);

    // ─── Auto-save templates, regions & attendees on change (IndexedDB + Supabase) ───
    useEffect(() => {
        if (!isLoadedFromDB) return;
        setSavedStatus('Saving...');
        setCloudStatus('Syncing...');
        const timer = setTimeout(() => {
            // 1. Local IndexedDB immediate save
            saveStudioDataToDB(templates, fields, attendeesByTemplate, activeTemplateIdx).then(() => {
                setSavedStatus('Saved');
            });

            // 2. Supabase Cloud Sync
            fetch('/api/onepass/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'badge_studio',
                    templates,
                    fields,
                    attendeesByTemplate,
                    activeTemplateIdx
                })
            })
                .then(r => r.json())
                .then(res => {
                    if (res.success) setCloudStatus('Synced');
                    else setCloudStatus('Offline');
                })
                .catch(() => setCloudStatus('Offline'));
        }, 500);
        return () => clearTimeout(timer);
    }, [templates, fields, attendeesByTemplate, activeTemplateIdx, isLoadedFromDB]);

    const tabs = [
        { label: 'Templates', icon: Layers },
        { label: 'Select & Replace', icon: Crosshair },
        { label: 'Attendee Data', icon: Table },
        { label: 'Preview & Export', icon: Download }
    ];

    // ─── Template Management ─────────────────────────────────────────────────
    const handleTemplateUpload = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const id = 'tpl_' + Math.random().toString(36).substring(2, 10);
                setTemplates(prev => [...prev, { id, name: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '), dataUrl: ev.target.result }]);
                setFields(prev => ({ ...prev, [id]: [] }));
                setAttendeesByTemplate(prev => ({ ...prev, [id]: [] }));
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const deleteTemplate = (idx) => {
        const removed = templates[idx];
        setTemplates(prev => prev.filter((_, i) => i !== idx));
        if (removed) {
            setFields(prev => { const n = { ...prev }; delete n[removed.id]; return n; });
            setAttendeesByTemplate(prev => { const n = { ...prev }; delete n[removed.id]; return n; });
        }
        if (activeTemplateIdx >= templates.length - 1) setActiveTemplateIdx(Math.max(0, templates.length - 2));
    };

    // ─── Field Manipulation ──────────────────────────────────────────────────
    const updateField = useCallback((fieldId, updates) => {
        if (!activeTemplate) return;
        setFields(prev => ({
            ...prev,
            [activeTemplate.id]: (prev[activeTemplate.id] || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
        }));
    }, [activeTemplate]);

    const deleteField = (fieldId) => {
        if (!activeTemplate) return;
        setFields(prev => ({
            ...prev,
            [activeTemplate.id]: (prev[activeTemplate.id] || []).filter(f => f.id !== fieldId)
        }));
        if (selectedFieldId === fieldId) setSelectedFieldId(null);
    };

    // ─── Drawing regions on the template ─────────────────────────────────────
    const getRelativePos = (e) => {
        const container = editorContainerRef.current;
        if (!container) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left) / editorScale),
            y: Math.round((e.clientY - rect.top) / editorScale)
        };
    };

    const handleCanvasMouseDown = (e) => {
        if (editorTool !== 'draw') return;
        e.preventDefault();
        const pos = getRelativePos(e);
        setDrawState({ startX: pos.x, startY: pos.y });
        setDrawRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    };

    const handleCanvasMouseMove = (e) => {
        if (!drawState || editorTool !== 'draw') return;
        const pos = getRelativePos(e);
        const x = Math.min(drawState.startX, pos.x);
        const y = Math.min(drawState.startY, pos.y);
        const w = Math.abs(pos.x - drawState.startX);
        const h = Math.abs(pos.y - drawState.startY);
        setDrawRect({ x, y, w, h });
    };

    const handleCanvasMouseUp = async (e) => {
        if (!drawState || editorTool !== 'draw' || !activeTemplate) { setDrawState(null); setDrawRect(null); return; }
        const pos = getRelativePos(e);
        const x = Math.min(drawState.startX, pos.x);
        const y = Math.min(drawState.startY, pos.y);
        const w = Math.abs(pos.x - drawState.startX);
        const h = Math.abs(pos.y - drawState.startY);

        setDrawState(null);
        setDrawRect(null);

        if (w < 10 || h < 10) return; // too small

        // Auto-sample background color from the region edges
        const bgColor = await sampleColorFromImage(activeTemplate.dataUrl, x, y, w, h);

        const newField = {
            id: generateId(),
            type: drawFieldType,
            label: FIELD_TYPES.find(f => f.id === drawFieldType)?.label || drawFieldType,
            x, y, width: w, height: h,
            bgColor: 'transparent',
            bgSampledColor: bgColor,
            bgPadding: 0,
            fontSize: Math.round(h * 0.55),
            fontFamily: 'Arial',
            fontColor: '#000000',
            textAlign: 'left',
            bold: ['name', 'first_name', 'last_name'].includes(drawFieldType),
            photoShape: 'rectangle',
            customText: drawFieldType === 'custom' ? 'Text Here' : ''
        };

        setFields(prev => ({
            ...prev,
            [activeTemplate.id]: [...(prev[activeTemplate.id] || []), newField]
        }));
        setSelectedFieldId(newField.id);
    };

    // ─── Eyedropper: sample color at click point ─────────────────────────────
    const handleEyedropper = async (e) => {
        if (editorTool !== 'eyedropper' || !activeTemplate || !selectedFieldId) return;
        const pos = getRelativePos(e);
        const color = await sampleColorFromImage(activeTemplate.dataUrl, pos.x - 2, pos.y - 2, 4, 4);
        updateField(selectedFieldId, { bgColor: color });
        setEditorTool('select');
    };

    // Drag & resize for existing fields (select mode)
    const handleFieldMouseDown = (e, fieldId, action) => {
        if (editorTool !== 'select') return;
        e.preventDefault(); e.stopPropagation();
        const field = activeFields.find(f => f.id === fieldId);
        if (!field) return;

        if (action === 'move') {
            setDragState({ fieldId, startX: e.clientX, startY: e.clientY, origX: field.x, origY: field.y });
        } else if (action === 'resize') {
            setResizeState({ fieldId, startX: e.clientX, startY: e.clientY, origW: field.width, origH: field.height });
        }
        setSelectedFieldId(fieldId);
    };

    useEffect(() => {
        const onMove = (e) => {
            if (dragState) {
                const dx = (e.clientX - dragState.startX) / editorScale;
                const dy = (e.clientY - dragState.startY) / editorScale;
                updateField(dragState.fieldId, { x: Math.max(0, Math.round(dragState.origX + dx)), y: Math.max(0, Math.round(dragState.origY + dy)) });
            }
            if (resizeState) {
                const dx = (e.clientX - resizeState.startX) / editorScale;
                const dy = (e.clientY - resizeState.startY) / editorScale;
                updateField(resizeState.fieldId, { width: Math.max(20, Math.round(resizeState.origW + dx)), height: Math.max(12, Math.round(resizeState.origH + dy)) });
            }
        };
        const onUp = () => { setDragState(null); setResizeState(null); };
        if (dragState || resizeState) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        }
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragState, resizeState, editorScale, updateField]);

    // ─── Live Preview in Tab 1 (Support inspecting specific attendee) ────────
    const currentPreviewAttendee = useMemo(() => {
        if (previewAttendeeId === 'sample' || !previewAttendeeId) return SAMPLE_ATTENDEE;
        return attendees.find(a => a.id === previewAttendeeId) || SAMPLE_ATTENDEE;
    }, [previewAttendeeId, attendees]);

    const refreshPreview = useCallback(async () => {
        if (!activeTemplate || activeFields.length === 0) { setPreviewCanvasUrl(null); return; }
        try {
            const canvas = await renderBadgeToCanvas(activeTemplate, activeFields, currentPreviewAttendee, 1);
            setPreviewCanvasUrl(canvas.toDataURL('image/png'));
        } catch { setPreviewCanvasUrl(null); }
    }, [activeTemplate, activeFields, currentPreviewAttendee]);

    useEffect(() => {
        if (showPreview) refreshPreview();
    }, [showPreview, refreshPreview, previewAttendeeId]);

    // ─── Attendee Data Handling & Custom Mapping ──────────────────────────────
    const handleCSVUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        let headers = [];
        let rows = [];

        try {
            if (ext === 'csv') {
                const Papa = (await import('papaparse')).default || (await import('papaparse'));
                const text = await file.text();
                const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                headers = (result.meta.fields || []).map(h => String(h || '').trim()).filter(Boolean);
                rows = result.data;
            } else if (['xlsx', 'xls'].includes(ext)) {
                const XLSX = (await import('xlsx')).default || (await import('xlsx'));
                const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
                const firstSheet = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                if (json.length > 0) {
                    headers = json[0].map(h => String(h || '').trim()).filter(Boolean);
                    rows = json.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((h, i) => {
                            obj[h] = row[i] != null ? String(row[i]).trim() : '';
                        });
                        return obj;
                    });
                }
            }
        } catch (err) {
            console.error('File import error:', err);
            alert('Failed to read file: ' + err.message);
            return;
        } finally {
            e.target.value = '';
        }

        if (!headers.length || !rows.length) {
            alert('No data found in uploaded file. Please make sure the sheet has headers and rows.');
            return;
        }

        const lh = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const find = (keys) => {
            const idx = lh.findIndex(h => keys.some(k => h.includes(k) || k.includes(h)));
            return idx !== -1 ? headers[idx] : '';
        };

        const foundFirst = find(['firstname', 'first_name', 'fname', 'first', 'givenname']);
        const foundLast = find(['lastname', 'last_name', 'lname', 'last', 'surname', 'familyname']);
        const foundFull = find(['fullname', 'full_name', 'attendeename', 'participant', 'name']);

        setImportedHeaders(headers);
        setImportedRows(rows);

        const initialMapping = {
            first_name: foundFirst,
            last_name: foundLast,
            name: (!foundFirst && !foundLast) ? foundFull : (foundFull || ''),
            email: find(['email', 'emailaddress', 'mail', 'emailid']),
            role: find(['role', 'title', 'designation', 'position', 'type', 'tickettype', 'department', 'dept']),
            booking_id: find(['bookingid', 'booking_id', 'id', 'ticketid', 'registrationid']),
            photo: find(['photo', 'photourl', 'photo_url', 'image', 'imageurl', 'avatar', 'picture'])
        };

        // Auto-match custom regions from active template
        activeFields.forEach(f => {
            const cleanLabel = (f.label || f.type).toLowerCase().replace(/[^a-z0-9]/g, '');
            const matchHeader = headers.find(h => {
                const ch = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                return ch.includes(cleanLabel) || cleanLabel.includes(ch);
            });
            if (matchHeader) {
                initialMapping[f.id] = matchHeader;
            }
        });

        setColumnMapping(initialMapping);
    };

    const confirmMapping = () => {
        if (!columnMapping || !importedRows.length) return;
        const mapped = importedRows.map(row => {
            const firstName = (columnMapping.first_name ? row[columnMapping.first_name] : '') || '';
            const lastName = (columnMapping.last_name ? row[columnMapping.last_name] : '') || '';
            const fullName = (columnMapping.name ? row[columnMapping.name] : '') || '';

            let finalFirst = String(firstName || '').trim();
            let finalLast = String(lastName || '').trim();
            let finalFull = String(fullName || '').trim();

            if (!finalFull && (finalFirst || finalLast)) {
                finalFull = `${finalFirst} ${finalLast}`.trim();
            } else if (finalFull && !finalFirst && !finalLast) {
                const parts = finalFull.split(/\s+/);
                finalFirst = parts[0] || '';
                finalLast = parts.slice(1).join(' ') || '';
            }

            const email = (columnMapping.email ? String(row[columnMapping.email] || '') : '').trim();
            const role = (columnMapping.role ? String(row[columnMapping.role] || '') : '').trim();
            const booking_id = (columnMapping.booking_id ? String(row[columnMapping.booking_id] || '') : '').trim();
            const photo = (columnMapping.photo ? String(row[columnMapping.photo] || '') : '').trim();

            // Populate region field overrides if columns were mapped
            const overrides = {};
            activeFields.forEach(f => {
                if (columnMapping[f.id] && row[columnMapping[f.id]] !== undefined) {
                    const rowVal = String(row[columnMapping[f.id]]).trim();
                    if (rowVal) overrides[f.id] = rowVal;
                }
            });

            return {
                id: 'att_' + Math.random().toString(36).substring(2, 10),
                first_name: finalFirst,
                last_name: finalLast,
                name: finalFull || `${finalFirst} ${finalLast}`.trim() || email || 'Attendee',
                email,
                role,
                booking_id,
                photo,
                fieldOverrides: overrides
            };
        }).filter(a => a.first_name || a.last_name || a.name || a.email || a.booking_id);

        setAttendees(prev => [...prev, ...mapped]);
        setColumnMapping(null);
        setImportedHeaders([]);
        setImportedRows([]);
    };

    const addManualAttendee = () => {
        if (!manualFirstName.trim() && !manualLastName.trim()) return;
        const fName = manualFirstName.trim();
        const lName = manualLastName.trim();
        const fullName = `${fName} ${lName}`.trim();
        setAttendees(prev => [...prev, {
            id: 'att_' + Math.random().toString(36).substring(2, 10),
            first_name: fName,
            last_name: lName,
            name: fullName,
            email: manualEmail.trim(),
            role: manualRole.trim(),
            booking_id: manualBookingId.trim(),
            photo: manualPhotoUrl.trim(),
            fieldOverrides: {}
        }]);
        setManualFirstName(''); setManualLastName(''); setManualEmail(''); setManualRole(''); setManualBookingId(''); setManualPhotoUrl('');
    };

    const handleManualPhotoFile = (attId, e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const photoDataUrl = ev.target.result;
            setAttendees(prev => {
                const next = prev.map(a => a.id === attId ? { ...a, photo: photoDataUrl } : a);
                const updated = next.find(a => a.id === attId);
                if (updated) {
                    setAdjustingAttendee(updated);
                }
                return next;
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleBulkPhotoUpload = (e) => {
        Array.from(e.target.files || []).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[_-]/g, ' ').trim();
                setAttendees(prev => prev.map(a => {
                    const n = a.name.toLowerCase().trim();
                    if (n === base || n.replace(/\s+/g, '') === base.replace(/\s+/g, '')) return { ...a, photo: ev.target.result };
                    return a;
                }));
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    // ─── Inline & Bulk Region Overrides ──────────────────────────────────────
    const handleInlineFieldUpdate = (attendeeId, fieldId, value) => {
        setAttendees(prev => prev.map(a => {
            if (a.id !== attendeeId) return a;
            const prevOverrides = a.fieldOverrides || {};
            return {
                ...a,
                fieldOverrides: {
                    ...prevOverrides,
                    [fieldId]: value
                }
            };
        }));
    };

    const handleBulkApplyTextToSelected = () => {
        if (selectedAttendeeIds.size === 0) return;
        const targetFieldId = bulkTargetFieldId || activeFields[0]?.id;
        if (!targetFieldId) return;

        setAttendees(prev => prev.map(a => {
            if (!selectedAttendeeIds.has(a.id)) return a;
            const prevOverrides = a.fieldOverrides || {};
            return {
                ...a,
                fieldOverrides: {
                    ...prevOverrides,
                    [targetFieldId]: bulkCustomText
                }
            };
        }));

        setBulkFeedback(`✓ Applied text override to ${selectedAttendeeIds.size} attendees.`);
        setTimeout(() => setBulkFeedback(''), 3500);
    };

    const handleBulkApplyPhotoToSelected = (e) => {
        const file = e.target.files?.[0];
        if (!file || selectedAttendeeIds.size === 0) return;
        const targetFieldId = bulkTargetFieldId || activeFields[0]?.id;
        if (!targetFieldId) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const photoDataUrl = ev.target.result;
            setAttendees(prev => prev.map(a => {
                if (!selectedAttendeeIds.has(a.id)) return a;
                const prevOverrides = a.fieldOverrides || {};
                return {
                    ...a,
                    fieldOverrides: {
                        ...prevOverrides,
                        [targetFieldId]: photoDataUrl
                    }
                };
            }));
            setBulkFeedback(`✓ Applied photo to ${selectedAttendeeIds.size} attendees.`);
            setTimeout(() => setBulkFeedback(''), 3500);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleBulkClearOverridesForSelected = () => {
        if (selectedAttendeeIds.size === 0) return;
        const targetFieldId = bulkTargetFieldId || activeFields[0]?.id;
        if (!targetFieldId) return;

        setAttendees(prev => prev.map(a => {
            if (!selectedAttendeeIds.has(a.id)) return a;
            const prevOverrides = { ...(a.fieldOverrides || {}) };
            delete prevOverrides[targetFieldId];
            delete prevOverrides[`${targetFieldId}_hidden`];
            return {
                ...a,
                fieldOverrides: prevOverrides
            };
        }));

        setBulkFeedback(`✓ Reset region to default for ${selectedAttendeeIds.size} attendees.`);
        setTimeout(() => setBulkFeedback(''), 3500);
    };

    // ─── Memory-Safe Export & Previews ───────────────────────────────────────
    const generatePreviews = useCallback(async () => {
        const targetList = getTargetAttendees();
        if (!activeTemplate || !targetList.length) {
            setPreviewCards([]);
            return;
        }
        setGenerating(true);
        const cards = [];
        const tplFields = fields[activeTemplate.id] || [];
        try {
            const bgImg = await loadImage(activeTemplate.dataUrl);
            const reusableCanvas = document.createElement('canvas');

            const sliceToRender = targetList.slice(0, previewLimit);
            for (let i = 0; i < sliceToRender.length; i++) {
                const att = sliceToRender[i];
                try {
                    await renderBadgeToCanvas(activeTemplate, tplFields, att, 1, bgImg, reusableCanvas);
                    cards.push({ attendee: att, dataUrl: reusableCanvas.toDataURL('image/jpeg', 0.85) });
                } catch (err) {
                    console.warn('Render fail:', att.name, err);
                }
                if (i % 6 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }
            setPreviewCards(cards);
        } catch (err) {
            console.error('Preview error:', err);
        } finally {
            setGenerating(false);
        }
    }, [activeTemplate, fields, getTargetAttendees, previewLimit]);

    useEffect(() => {
        if (activeTab === 3 && activeTemplate && attendees.length) {
            generatePreviews();
        }
    }, [activeTab, exportScope, selectedAttendeeIds, activeTemplate, generatePreviews]);

    const downloadSinglePNG = (card) => {
        const link = document.createElement('a');
        const safeName = (card.attendee.name || `${card.attendee.first_name || ''}_${card.attendee.last_name || ''}`).replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_') || 'badge';
        link.download = `badge_${safeName}.png`;
        link.href = card.dataUrl;
        link.click();
    };

    const downloadAllPDF = async () => {
        const targetList = getTargetAttendees();
        if (!activeTemplate || !targetList.length) return;
        setExporting(true);
        setExportProgress({ current: 0, total: targetList.length, label: 'Initializing PDF export...' });

        try {
            const { jsPDF } = await import('jspdf');
            const tplFields = fields[activeTemplate.id] || [];
            const bgImg = await loadImage(activeTemplate.dataUrl);
            const cW = bgImg.naturalWidth;
            const cH = bgImg.naturalHeight;
            const orientation = cW > cH ? 'landscape' : 'portrait';

            const renderScale = 1.5;
            const reusableCanvas = document.createElement('canvas');

            const batchLimit = pdfBatchOption === '50' ? 50 : pdfBatchOption === '100' ? 100 : 0;
            const chunks = [];
            if (batchLimit > 0 && targetList.length > batchLimit) {
                for (let i = 0; i < targetList.length; i += batchLimit) {
                    chunks.push(targetList.slice(i, i + batchLimit));
                }
            } else {
                chunks.push(targetList);
            }

            let globalIdx = 0;
            for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
                const chunk = chunks[cIdx];
                const pdf = new jsPDF({
                    orientation,
                    unit: 'px',
                    format: [cW + 40, cH + 40],
                    compress: true
                });

                for (let i = 0; i < chunk.length; i++) {
                    globalIdx++;
                    const att = chunk[i];
                    setExportProgress({
                        current: globalIdx,
                        total: targetList.length,
                        label: `Rendering (${globalIdx}/${targetList.length}) ${att.first_name || att.name}...`
                    });

                    if (i > 0) pdf.addPage([cW + 40, cH + 40], orientation);

                    await renderBadgeToCanvas(activeTemplate, tplFields, att, renderScale, bgImg, reusableCanvas);

                    const imgData = reusableCanvas.toDataURL('image/jpeg', 0.90);
                    pdf.addImage(imgData, 'JPEG', 20, 20, cW, cH, undefined, 'FAST');

                    if (i % 3 === 0) {
                        await new Promise(r => setTimeout(r, 10));
                    }
                }

                const batchSuffix = chunks.length > 1 ? `_part_${cIdx + 1}_of_${chunks.length}` : '';
                pdf.save(`badges_${activeTemplate.name.replace(/\s+/g, '_')}${batchSuffix}.pdf`);

                await new Promise(r => setTimeout(r, 60));
            }
        } catch (err) {
            console.error('PDF export error:', err);
            alert('PDF generation error: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    const downloadAllZIP = async () => {
        const targetList = getTargetAttendees();
        if (!activeTemplate || !targetList.length) return;
        setExporting(true);
        setExportProgress({ current: 0, total: targetList.length, label: 'Generating ZIP...' });

        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const tplFields = fields[activeTemplate.id] || [];
            const bgImg = await loadImage(activeTemplate.dataUrl);
            const reusableCanvas = document.createElement('canvas');

            for (let i = 0; i < targetList.length; i++) {
                const att = targetList[i];
                setExportProgress({
                    current: i + 1,
                    total: targetList.length,
                    label: `Rendering (${i + 1}/${targetList.length}) ${att.first_name || att.name}...`
                });

                await renderBadgeToCanvas(activeTemplate, tplFields, att, 1.5, bgImg, reusableCanvas);
                const blob = await new Promise(r => reusableCanvas.toBlob(r, 'image/png'));
                const safeName = (att.name || `${att.first_name || ''}_${att.last_name || ''}`).replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_') || `attendee_${i+1}`;
                zip.file(`badge_${safeName}.png`, blob);

                if (i % 5 === 0) {
                    await new Promise(r => setTimeout(r, 10));
                }
            }

            setExportProgress({ current: targetList.length, total: targetList.length, label: 'Compressing ZIP archive...' });
            const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                setExportProgress({
                    current: Math.round(metadata.percent),
                    total: 100,
                    label: `Compressing ZIP: ${Math.round(metadata.percent)}%`
                });
            });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `badges_${activeTemplate.name.replace(/\s+/g, '_')}_${targetList.length}_cards.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('ZIP export error:', err);
            alert('ZIP error: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    // ─── RENDER ──────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0C111D] text-white">
            {/* Header */}
            <header className="border-b border-[#1a2540] bg-[#0C111D]/95 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0073BB] to-[#4F8EF7] flex items-center justify-center shadow-lg shadow-[#0073BB]/20">
                            <CreditCard className="w-4 h-4 text-white stroke-[2.5]" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Badge Studio</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Admin</span>
                        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#151c2e] border border-[#1a2540] text-[10px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${savedStatus === 'Saved' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
                            <span className="text-slate-400">{savedStatus === 'Saved' ? 'Local' : 'Saving...'}</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#151c2e] border border-blue-500/20 text-[10px]">
                            <Cloud className={`w-3 h-3 ${cloudStatus === 'Synced' ? 'text-emerald-400' : cloudStatus === 'Syncing...' ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
                            <span className={cloudStatus === 'Synced' ? 'text-emerald-300 font-medium' : cloudStatus === 'Syncing...' ? 'text-blue-300 animate-pulse' : 'text-slate-400'}>
                                {cloudStatus === 'Synced' ? 'Supabase Synced' : cloudStatus === 'Syncing...' ? 'Syncing Cloud...' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-[11px] text-slate-400">Signed in as <strong className="text-white">{admin.name}</strong></span>
                        <button onClick={() => window.location.href = '/onepass/dashboard'}
                            className="text-[11px] text-slate-400 hover:text-white transition flex items-center space-x-1">
                            <LogOut className="w-3.5 h-3.5" /><span>Dashboard</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab Bar */}
            <div className="border-b border-[#1a2540] bg-[#0C111D]/80 backdrop-blur-sm sticky top-14 z-40">
                <div className="max-w-[1600px] mx-auto px-6 flex space-x-1">
                    {tabs.map((tab, idx) => (
                        <button key={idx} onClick={() => setActiveTab(idx)}
                            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium transition border-b-2 ${activeTab === idx ? 'border-[#0073BB] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                            <tab.icon className="w-3.5 h-3.5" /><span>{tab.label}</span>
                            {idx === 0 && templates.length > 0 && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[#0073BB]/20 text-[#4F8EF7]">{templates.length}</span>}
                            {idx === 2 && attendees.length > 0 && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">{attendees.length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-6">

                {/* ═══ TAB 0: TEMPLATES ═══ */}
                {activeTab === 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold">Card Templates</h2>
                                <p className="text-xs text-slate-400 mt-1">Upload your ID card designs. The system will let you select &amp; replace text/photo areas.</p>
                            </div>
                            <label className="flex items-center space-x-2 px-4 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-lg shadow-[#0073BB]/20">
                                <Upload className="w-4 h-4" /><span>Upload Template</span>
                                <input type="file" accept="image/*" multiple onChange={handleTemplateUpload} className="hidden" />
                            </label>
                        </div>
                        {templates.length === 0 ? (
                            <div className="border-2 border-dashed border-[#1a2540] rounded-2xl p-16 flex flex-col items-center space-y-4 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-[#151c2e] flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-500" /></div>
                                <p className="text-sm font-semibold text-slate-300">No templates uploaded yet</p>
                                <p className="text-xs text-slate-500">Upload your ID card background images to get started</p>
                                <label className="flex items-center space-x-2 px-5 py-2.5 bg-[#151c2e] hover:bg-[#1a2540] text-slate-300 text-xs font-medium rounded-xl cursor-pointer transition border border-[#1a2540]">
                                    <Plus className="w-4 h-4" /><span>Choose Files</span>
                                    <input type="file" accept="image/*" multiple onChange={handleTemplateUpload} className="hidden" />
                                </label>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templates.map((tpl, idx) => (
                                    <div key={tpl.id} className={`bg-[#151c2e] border rounded-2xl overflow-hidden transition cursor-pointer group ${activeTemplateIdx === idx ? 'border-[#0073BB] ring-1 ring-[#0073BB]/30' : 'border-[#1a2540] hover:border-slate-600'}`}
                                        onClick={() => setActiveTemplateIdx(idx)}>
                                        <div className="aspect-[3/2] bg-[#0A0F1D] flex items-center justify-center overflow-hidden relative">
                                            <img src={tpl.dataUrl} alt={tpl.name} className="max-w-full max-h-full object-contain" />
                                            {activeTemplateIdx === idx && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#0073BB] flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></div>}
                                        </div>
                                        <div className="p-3 flex items-center justify-between">
                                            <input value={tpl.name} onChange={e => setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, name: e.target.value } : t))} onClick={e => e.stopPropagation()}
                                                className="bg-transparent text-xs font-semibold text-white border-none outline-none flex-1 mr-2" />
                                            <div className="flex items-center space-x-1">
                                                <span className="text-[10px] text-slate-500">{(fields[tpl.id] || []).length} regions</span>
                                                <button onClick={e => { e.stopPropagation(); deleteTemplate(idx); }} className="p-1 rounded-lg hover:bg-red-950/50 text-slate-500 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {templates.length > 0 && (
                            <div className="flex justify-end">
                                <button onClick={() => setActiveTab(1)} className="flex items-center space-x-2 px-5 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#0073BB]/20">
                                    <span>Next: Select &amp; Replace Areas</span><ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ TAB 1: SELECT & REPLACE EDITOR ═══ */}
                {activeTab === 1 && (
                    <div className="space-y-4">
                        {!activeTemplate ? (
                            <div className="text-center py-16">
                                <p className="text-sm text-slate-400">Upload a template first.</p>
                                <button onClick={() => setActiveTab(0)} className="mt-3 text-xs text-[#4F8EF7] hover:underline">Go to Templates</button>
                            </div>
                        ) : (
                            <div className="flex gap-5">
                                {/* LEFT: Canvas with draw-to-select */}
                                <div className="flex-1 min-w-0">
                                    {/* Toolbar */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2">
                                        <div className="flex items-center space-x-1">
                                            {/* Tool: Select/Move */}
                                            <button onClick={() => setEditorTool('select')}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${editorTool === 'select' ? 'bg-[#0073BB]/20 text-[#4F8EF7] border border-[#0073BB]/40' : 'text-slate-400 hover:text-white border border-transparent'}`}>
                                                <MousePointer className="w-3.5 h-3.5" /><span>Select / Move</span>
                                            </button>
                                            {/* Tool: Draw Region */}
                                            <button onClick={() => setEditorTool('draw')}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${editorTool === 'draw' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white border border-transparent'}`}>
                                                <Crosshair className="w-3.5 h-3.5" /><span>Draw Region</span>
                                            </button>
                                            {/* Tool: Eyedropper */}
                                            <button onClick={() => { if (selectedFieldId) setEditorTool('eyedropper'); }}
                                                disabled={!selectedFieldId}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition disabled:opacity-30 ${editorTool === 'eyedropper' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'text-slate-400 hover:text-white border border-transparent'}`}>
                                                <Pipette className="w-3.5 h-3.5" /><span>Pick BG Color</span>
                                            </button>
                                            {/* Divider */}
                                            <div className="w-px h-5 bg-[#1a2540] mx-1" />
                                            {/* Draw field type selector */}
                                            {editorTool === 'draw' && (
                                                <select value={drawFieldType} onChange={e => setDrawFieldType(e.target.value)}
                                                    className="bg-[#0A0F1D] border border-amber-500/30 rounded-lg px-2 py-1.5 text-[11px] text-amber-300 focus:outline-none">
                                                    {FIELD_TYPES.map(ft => <option key={ft.id} value={ft.id}>{ft.label}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {/* Live Preview toggle & Attendee Switcher */}
                                            <button onClick={() => { setShowPreview(!showPreview); if (!showPreview) refreshPreview(); }}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${showPreview ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white border border-transparent'}`}>
                                                <Eye className="w-3.5 h-3.5" /><span>Live Preview</span>
                                            </button>
                                            {showPreview && attendees.length > 0 && (
                                                <div className="flex items-center space-x-1.5 bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-2 py-1">
                                                    <span className="text-[10px] text-slate-400">Card for:</span>
                                                    <select value={previewAttendeeId} onChange={e => setPreviewAttendeeId(e.target.value)}
                                                        className="bg-transparent text-white text-[11px] font-medium focus:outline-none cursor-pointer max-w-[130px]">
                                                        <option value="sample" className="bg-[#0C111D]">Sample (Default)</option>
                                                        {attendees.map((a, i) => (
                                                            <option key={a.id} value={a.id} className="bg-[#0C111D]">
                                                                {a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || `Attendee #${i + 1}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="w-px h-5 bg-[#1a2540]" />
                                            <button onClick={() => setEditorScale(s => Math.max(0.25, s - 0.1))} className="p-1 rounded text-slate-400 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
                                            <span className="text-[10px] text-slate-400 w-8 text-center">{Math.round(editorScale * 100)}%</span>
                                            <button onClick={() => setEditorScale(s => Math.min(2, s + 0.1))} className="p-1 rounded text-slate-400 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setEditorScale(1)} className="p-1 rounded text-slate-400 hover:text-white"><RotateCcw className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>

                                    {/* Instruction hint */}
                                    {editorTool === 'draw' && (
                                        <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center space-x-2">
                                            <Crosshair className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span><strong>Draw mode:</strong> Click &amp; drag on the card to select the area where the <strong>{FIELD_TYPES.find(f => f.id === drawFieldType)?.label}</strong> placeholder is. You can customize text/photo differently for individual attendees in Tab 2.</span>
                                        </div>
                                    )}
                                    {editorTool === 'eyedropper' && (
                                        <div className="mb-3 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] text-purple-300 flex items-center space-x-2">
                                            <Pipette className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span><strong>Eyedropper:</strong> Click anywhere on the card to sample that color as the background fill for the selected region.</span>
                                        </div>
                                    )}

                                    {/* Canvas Area */}
                                    <div className="bg-[#080c16] rounded-2xl border border-[#1a2540] overflow-auto p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                                        {showPreview && previewCanvasUrl ? (
                                            <div style={{ transform: `scale(${editorScale})`, transformOrigin: 'top left' }} className="inline-block">
                                                <img src={previewCanvasUrl} alt="Preview" className="block max-w-none select-none rounded" />
                                            </div>
                                        ) : (
                                            <div ref={editorContainerRef}
                                                className="relative inline-block"
                                                style={{ transform: `scale(${editorScale})`, transformOrigin: 'top left', cursor: editorTool === 'draw' ? 'crosshair' : editorTool === 'eyedropper' ? 'crosshair' : 'default' }}
                                                onMouseDown={editorTool === 'draw' ? handleCanvasMouseDown : editorTool === 'eyedropper' ? handleEyedropper : undefined}
                                                onMouseMove={editorTool === 'draw' ? handleCanvasMouseMove : undefined}
                                                onMouseUp={editorTool === 'draw' ? handleCanvasMouseUp : undefined}
                                                onClick={editorTool === 'select' ? () => setSelectedFieldId(null) : undefined}>
                                                <img ref={imgRef} src={activeTemplate.dataUrl} alt="template" className="block max-w-none select-none" draggable={false} />

                                                {/* Active draw rectangle */}
                                                {drawRect && drawRect.w > 2 && drawRect.h > 2 && (
                                                    <div className="absolute border-2 border-amber-400 bg-amber-400/15 pointer-events-none z-30 rounded-sm"
                                                        style={{ left: drawRect.x, top: drawRect.y, width: drawRect.w, height: drawRect.h }} />
                                                )}

                                                {/* Existing field overlays */}
                                                {activeFields.map(field => {
                                                    const isSel = selectedFieldId === field.id;
                                                    const FI = FIELD_TYPES.find(f => f.id === field.type)?.icon || Type;
                                                    
                                                    let overlayRadius = '2px';
                                                    if (field.type === 'photo') {
                                                        if (field.photoShape === 'circle') overlayRadius = '9999px';
                                                        else if (field.photoShape === 'rounded') overlayRadius = `${field.uniformRadius ?? Math.round(Math.min(field.width, field.height) * 0.08)}px`;
                                                        else if (field.photoShape === 'custom') overlayRadius = `${field.radiusTL ?? 12}px ${field.radiusTR ?? 12}px ${field.radiusBR ?? 12}px ${field.radiusBL ?? 12}px`;
                                                    }

                                                    return (
                                                        <div key={field.id}
                                                            className={`absolute group select-none ${editorTool === 'select' ? 'cursor-move' : 'pointer-events-none'} ${isSel ? 'z-20' : 'z-10'}`}
                                                            style={{ left: field.x, top: field.y, width: field.width, height: field.height }}
                                                            onMouseDown={e => handleFieldMouseDown(e, field.id, 'move')}
                                                            onClick={e => { e.stopPropagation(); setSelectedFieldId(field.id); }}>
                                                            <div className={`w-full h-full border-2 flex items-center justify-center transition ${isSel ? 'border-[#0073BB] bg-[#0073BB]/15' : 'border-dashed border-amber-400/60 bg-amber-400/5 group-hover:bg-amber-400/10'}`}
                                                                style={{ borderRadius: overlayRadius }}>
                                                                <div className="flex items-center space-x-1 pointer-events-none">
                                                                    <FI className="w-3 h-3 text-white/50" />
                                                                    <span className="text-[9px] text-white/50 font-medium truncate max-w-[80px]">{field.label}</span>
                                                                </div>
                                                            </div>
                                                            {isSel && editorTool === 'select' && (
                                                                <>
                                                                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#0073BB] rounded-sm cursor-se-resize border border-white/30"
                                                                        onMouseDown={e => handleFieldMouseDown(e, field.id, 'resize')} />
                                                                    <button className="absolute -top-2 -right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-500 transition"
                                                                        onClick={e => { e.stopPropagation(); deleteField(field.id); }}><X className="w-2.5 h-2.5 text-white" /></button>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT: Properties Panel */}
                                <div className="w-72 flex-shrink-0 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                                    {/* Region List */}
                                    <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-4 space-y-2">
                                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Replacement Regions ({activeFields.length})</h4>
                                        {activeFields.length === 0 ? (
                                            <p className="text-[11px] text-slate-500">Switch to <strong>Draw Region</strong> tool and draw over the areas you want to replace with dynamic data.</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {activeFields.map(field => {
                                                    const FI = FIELD_TYPES.find(f => f.id === field.type)?.icon || Type;
                                                    return (
                                                        <div key={field.id}
                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-[11px] ${selectedFieldId === field.id ? 'bg-[#0073BB]/15 border border-[#0073BB]/40' : 'bg-[#0A0F1D] border border-transparent hover:border-[#1a2540]'}`}
                                                            onClick={() => setSelectedFieldId(field.id)}>
                                                            <div className="flex items-center space-x-2 min-w-0">
                                                                <FI className="w-3 h-3 text-[#4F8EF7] flex-shrink-0" />
                                                                <span className="text-slate-300 truncate">{field.label}</span>
                                                                <span className="text-[9px] text-slate-600 flex-shrink-0">{field.width}x{field.height}</span>
                                                            </div>
                                                            <button onClick={e => { e.stopPropagation(); deleteField(field.id); }} className="text-slate-600 hover:text-red-400 transition flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Region Properties */}
                                    {selectedField && (
                                        <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-4 space-y-3">
                                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                                                <Settings className="w-3 h-3" /><span>{selectedField.label} Properties</span>
                                            </h4>

                                            {/* Field label rename */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500">Region Name / Label</label>
                                                <input type="text" value={selectedField.label}
                                                    onChange={e => updateField(selectedField.id, { label: e.target.value })}
                                                    className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#0073BB]" />
                                            </div>

                                            {/* Field type change */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500">Replace With</label>
                                                <select value={selectedField.type}
                                                    onChange={e => {
                                                        const ft = FIELD_TYPES.find(f => f.id === e.target.value);
                                                        updateField(selectedField.id, { type: e.target.value, label: ft?.label || e.target.value });
                                                    }}
                                                    className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#0073BB]">
                                                    {FIELD_TYPES.map(ft => <option key={ft.id} value={ft.id}>{ft.label}</option>)}
                                                </select>
                                            </div>

                                            {/* Position & Size */}
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {[['x','X'],['y','Y'],['width','W'],['height','H']].map(([key, lbl]) => (
                                                    <div key={key} className="space-y-0.5">
                                                        <label className="text-[9px] text-slate-600">{lbl}</label>
                                                        <input type="number" value={selectedField[key]}
                                                            onChange={e => updateField(selectedField.id, { [key]: parseInt(e.target.value) || 0 })}
                                                            className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB] text-center" />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Background Fill Color */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-slate-500">Background Fill (to erase placeholder)</label>
                                                <div className="flex items-center space-x-1 mb-1">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${selectedField.bgColor === 'transparent' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                                        {selectedField.bgColor === 'transparent' ? '✓ No fill (text overlays directly)' : `Fill: ${selectedField.bgColor}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    <input type="color" value={selectedField.bgColor === 'transparent' ? (selectedField.bgSampledColor || '#ffffff') : selectedField.bgColor}
                                                        onChange={e => updateField(selectedField.id, { bgColor: e.target.value })}
                                                        className="w-7 h-7 rounded border border-[#1a2540] cursor-pointer bg-transparent p-0" />
                                                    <input type="text" value={selectedField.bgColor}
                                                        onChange={e => updateField(selectedField.id, { bgColor: e.target.value })}
                                                        className="flex-1 bg-[#0A0F1D] border border-[#1a2540] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    {selectedField.bgSampledColor && (
                                                        <button onClick={() => updateField(selectedField.id, { bgColor: selectedField.bgSampledColor })}
                                                            className="flex items-center space-x-1 text-[9px] text-[#4F8EF7] hover:text-white transition px-1.5 py-1 rounded border border-[#0073BB]/30 bg-[#0073BB]/10">
                                                            <div className="w-2.5 h-2.5 rounded-sm border border-white/20" style={{ background: selectedField.bgSampledColor }} />
                                                            <span>Use Sampled</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => updateField(selectedField.id, { bgColor: 'transparent' })}
                                                        className="text-[9px] text-slate-500 hover:text-white transition px-1.5 py-1 rounded border border-[#1a2540] bg-[#0A0F1D]">No Fill</button>
                                                </div>
                                                {selectedField.bgColor !== 'transparent' && (
                                                    <div className="space-y-0.5">
                                                        <label className="text-[9px] text-slate-600">BG Padding (px)</label>
                                                        <input type="number" value={selectedField.bgPadding || 0}
                                                            onChange={e => updateField(selectedField.id, { bgPadding: parseInt(e.target.value) || 0 })}
                                                            className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Photo-specific: Shape, 4-Corner Radii, Border, Zoom & Pan */}
                                            {selectedField.type === 'photo' && (
                                                <div className="space-y-3 pt-1 border-t border-[#1a2540]/60">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Photo Shape</label>
                                                        <div className="grid grid-cols-4 gap-1">
                                                            {PHOTO_SHAPES.map(shape => (
                                                                <button key={shape.id} onClick={() => updateField(selectedField.id, { photoShape: shape.id })}
                                                                    className={`py-1 text-[9px] rounded-lg border transition text-center font-medium ${selectedField.photoShape === shape.id ? 'bg-[#0073BB]/20 border-[#0073BB]/60 text-[#4F8EF7]' : 'bg-[#0A0F1D] border-[#1a2540] text-slate-400 hover:text-white'}`}>
                                                                    {shape.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Uniform Radius Slider for 'rounded' */}
                                                    {selectedField.photoShape === 'rounded' && (
                                                        <div className="space-y-1 bg-[#0A0F1D] p-2.5 rounded-xl border border-[#1a2540]">
                                                            <div className="flex items-center justify-between text-[10px]">
                                                                <span className="text-slate-400">Corner Radius</span>
                                                                <span className="text-[#4F8EF7] font-mono font-bold">{selectedField.uniformRadius ?? 16}px</span>
                                                            </div>
                                                            <input type="range" min="0" max="100" value={selectedField.uniformRadius ?? 16}
                                                                onChange={e => updateField(selectedField.id, { uniformRadius: parseInt(e.target.value) || 0 })}
                                                                className="w-full h-1.5 bg-[#151c2e] rounded-lg appearance-none cursor-pointer accent-[#0073BB]" />
                                                        </div>
                                                    )}

                                                    {/* Manual 4-Corner Radii for 'custom' */}
                                                    {selectedField.photoShape === 'custom' && (
                                                        <div className="space-y-2 bg-[#0A0F1D] p-2.5 rounded-xl border border-[#1a2540]">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[10px] text-slate-300 font-semibold">Custom Corner Radii (px)</label>
                                                                <button onClick={() => updateField(selectedField.id, { radiusTL: 0, radiusTR: 0, radiusBR: 0, radiusBL: 0 })}
                                                                    className="text-[9px] text-slate-500 hover:text-white transition">Reset</button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-[9px] text-slate-500">Top-Left ↖</label>
                                                                    <input type="number" min="0" max="200" value={selectedField.radiusTL ?? 16}
                                                                        onChange={e => updateField(selectedField.id, { radiusTL: parseInt(e.target.value) || 0 })}
                                                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <label className="text-[9px] text-slate-500">Top-Right ↗</label>
                                                                    <input type="number" min="0" max="200" value={selectedField.radiusTR ?? 16}
                                                                        onChange={e => updateField(selectedField.id, { radiusTR: parseInt(e.target.value) || 0 })}
                                                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <label className="text-[9px] text-slate-500">Bottom-Left ↙</label>
                                                                    <input type="number" min="0" max="200" value={selectedField.radiusBL ?? 16}
                                                                        onChange={e => updateField(selectedField.id, { radiusBL: parseInt(e.target.value) || 0 })}
                                                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <label className="text-[9px] text-slate-500">Bottom-Right ↘</label>
                                                                    <input type="number" min="0" max="200" value={selectedField.radiusBR ?? 16}
                                                                        onChange={e => updateField(selectedField.id, { radiusBR: parseInt(e.target.value) || 0 })}
                                                                        className="w-full bg-[#151c2e] border border-[#1a2540] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Photo Border / Stroke */}
                                                    <div className="space-y-1 bg-[#0A0F1D] p-2.5 rounded-xl border border-[#1a2540]">
                                                        <label className="text-[10px] text-slate-300 font-semibold">Border / Stroke</label>
                                                        <div className="grid grid-cols-2 gap-2 items-center">
                                                            <div className="space-y-0.5">
                                                                <label className="text-[9px] text-slate-500">Width (px)</label>
                                                                <input type="number" min="0" max="30" value={selectedField.borderWidth || 0}
                                                                    onChange={e => updateField(selectedField.id, { borderWidth: parseInt(e.target.value) || 0 })}
                                                                    className="w-full bg-[#151c2e] border border-[#1a2540] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <label className="text-[9px] text-slate-500">Color</label>
                                                                <div className="flex items-center space-x-1">
                                                                    <input type="color" value={selectedField.borderColor || '#0073BB'}
                                                                        onChange={e => updateField(selectedField.id, { borderColor: e.target.value })}
                                                                        className="w-6 h-6 rounded border border-[#1a2540] cursor-pointer bg-transparent p-0" />
                                                                    <input type="text" value={selectedField.borderColor || '#0073BB'}
                                                                        onChange={e => updateField(selectedField.id, { borderColor: e.target.value })}
                                                                        className="flex-1 bg-[#151c2e] border border-[#1a2540] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Photo Headshot Alignment: Zoom & Pan */}
                                                    <div className="space-y-2 bg-[#0A0F1D] p-2.5 rounded-xl border border-[#1a2540]">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] text-slate-300 font-semibold">Default Headshot Zoom &amp; Pan</label>
                                                            <button onClick={() => updateField(selectedField.id, { photoZoom: 1, photoPanX: 0, photoPanY: 0 })}
                                                                className="text-[9px] text-slate-500 hover:text-white transition">Reset</button>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                                                                <span>Zoom</span>
                                                                <span className="font-mono text-[#4F8EF7]">{((selectedField.photoZoom || 1) * 100).toFixed(0)}%</span>
                                                            </div>
                                                            <input type="range" min="1" max="3" step="0.05" value={selectedField.photoZoom || 1}
                                                                onChange={e => updateField(selectedField.id, { photoZoom: parseFloat(e.target.value) || 1 })}
                                                                className="w-full h-1.5 bg-[#151c2e] rounded-lg appearance-none cursor-pointer accent-[#0073BB]" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                                                    <span>Pan X</span>
                                                                    <span>{selectedField.photoPanX || 0}%</span>
                                                                </div>
                                                                <input type="range" min="-100" max="100" value={selectedField.photoPanX || 0}
                                                                    onChange={e => updateField(selectedField.id, { photoPanX: parseInt(e.target.value) || 0 })}
                                                                    className="w-full h-1.5 bg-[#151c2e] rounded-lg appearance-none cursor-pointer accent-[#0073BB]" />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                                                    <span>Pan Y</span>
                                                                    <span>{selectedField.photoPanY || 0}%</span>
                                                                </div>
                                                                <input type="range" min="-100" max="100" value={selectedField.photoPanY || 0}
                                                                    onChange={e => updateField(selectedField.id, { photoPanY: parseInt(e.target.value) || 0 })}
                                                                    className="w-full h-1.5 bg-[#151c2e] rounded-lg appearance-none cursor-pointer accent-[#0073BB]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Text-specific: Font, Size, Color, Align, Bold */}
                                            {selectedField.type !== 'photo' && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-500">Font Size</label>
                                                            <input type="number" value={selectedField.fontSize}
                                                                onChange={e => updateField(selectedField.id, { fontSize: parseInt(e.target.value) || 12 })}
                                                                className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-500">Text Color</label>
                                                            <div className="flex items-center space-x-1">
                                                                <input type="color" value={selectedField.fontColor || '#000000'}
                                                                    onChange={e => updateField(selectedField.id, { fontColor: e.target.value })}
                                                                    className="w-7 h-7 rounded border border-[#1a2540] cursor-pointer bg-transparent p-0" />
                                                                <input type="text" value={selectedField.fontColor || '#000000'}
                                                                    onChange={e => updateField(selectedField.id, { fontColor: e.target.value })}
                                                                    className="flex-1 bg-[#0A0F1D] border border-[#1a2540] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#0073BB]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-500">Font Family</label>
                                                        <select value={selectedField.fontFamily}
                                                            onChange={e => updateField(selectedField.id, { fontFamily: e.target.value })}
                                                            className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#0073BB]">
                                                            {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] text-slate-500">Horizontal &amp; Vertical Alignment</label>
                                                        <div className="flex items-center space-x-2">
                                                            {/* Horizontal Alignment */}
                                                            <div className="flex border border-[#1a2540] rounded-lg overflow-hidden flex-1">
                                                                {['left','center','right'].map(align => (
                                                                    <button key={align} onClick={() => updateField(selectedField.id, { textAlign: align })}
                                                                        title={`Align ${align}`}
                                                                        className={`flex-1 py-1.5 flex justify-center transition ${selectedField.textAlign === align ? 'bg-[#0073BB]/20 text-[#4F8EF7]' : 'bg-[#0A0F1D] text-slate-400 hover:text-white'}`}>
                                                                        {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                                                        {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                                                        {align === 'right' && <AlignRight className="w-3 h-3" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {/* Vertical Alignment */}
                                                            <div className="flex border border-[#1a2540] rounded-lg overflow-hidden flex-1">
                                                                {[
                                                                    { id: 'top', label: 'Top' },
                                                                    { id: 'middle', label: 'Mid' },
                                                                    { id: 'bottom', label: 'Bot' }
                                                                ].map(va => (
                                                                    <button key={va.id} onClick={() => updateField(selectedField.id, { verticalAlign: va.id })}
                                                                        title={`Vertical ${va.label}`}
                                                                        className={`flex-1 py-1.5 text-[9px] font-medium text-center transition ${(selectedField.verticalAlign || 'middle') === va.id ? 'bg-[#0073BB]/20 text-[#4F8EF7]' : 'bg-[#0A0F1D] text-slate-400 hover:text-white'}`}>
                                                                        {va.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {/* Bold Button */}
                                                            <button onClick={() => updateField(selectedField.id, { bold: !selectedField.bold })}
                                                                title="Bold"
                                                                className={`p-1.5 rounded-lg border transition ${selectedField.bold ? 'bg-[#0073BB]/20 border-[#0073BB]/50 text-[#4F8EF7]' : 'bg-[#0A0F1D] border-[#1a2540] text-slate-400 hover:text-white'}`}>
                                                                <Bold className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {selectedField.type === 'custom' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-500">Default Static Text</label>
                                                            <input type="text" value={selectedField.customText}
                                                                onChange={e => updateField(selectedField.id, { customText: e.target.value })}
                                                                className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#0073BB]" placeholder="Enter text..." />
                                                        </div>
                                                    )}
                                                    {/* Font preview */}
                                                    <div className="bg-[#0A0F1D] border border-[#1a2540] rounded-lg p-2">
                                                        <p className="text-[9px] text-slate-600 mb-1">Font Preview:</p>
                                                        <p style={{
                                                            fontFamily: `"${selectedField.fontFamily}", sans-serif`,
                                                            fontSize: `${Math.min(selectedField.fontSize, 28)}px`,
                                                            fontWeight: selectedField.bold ? 'bold' : 'normal',
                                                            color: selectedField.fontColor || '#000',
                                                            textAlign: selectedField.textAlign || 'center',
                                                            background: selectedField.bgColor || '#fff',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            lineHeight: 1.2
                                                        }}>
                                                            {selectedField.type === 'first_name' ? 'Krish' : selectedField.type === 'last_name' ? 'Patel' : selectedField.type === 'name' ? 'Krish Patel' : selectedField.type === 'email' ? 'krish@mail.com' : selectedField.type === 'role' ? 'Core Team' : selectedField.type === 'booking_id' ? 'BK-0042' : selectedField.customText || 'Sample'}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {activeFields.length > 0 && (
                                        <button onClick={() => setActiveTab(2)}
                                            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#0073BB]/20">
                                            <span>Next: Import Attendees</span><ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ TAB 2: ATTENDEE DATA ═══ */}
                {activeTab === 2 && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold">Attendee Data &amp; Custom Region Values</h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Import from CSV/Excel or add manually. Customize text, photos, and region values per attendee or bulk-apply to selected people.
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="flex items-center space-x-2 px-4 py-2.5 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-white text-xs font-medium rounded-xl cursor-pointer transition">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /><span>Import CSV/Excel</span>
                                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} className="hidden" />
                                </label>
                                <label className="flex items-center space-x-2 px-4 py-2.5 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-white text-xs font-medium rounded-xl cursor-pointer transition">
                                    <Camera className="w-4 h-4 text-amber-400" /><span>Bulk Photos</span>
                                    <input type="file" accept="image/*" multiple onChange={handleBulkPhotoUpload} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Column Mapping Modal / Panel */}
                        {columnMapping && importedHeaders.length > 0 && (
                            <div className="bg-[#151c2e] border border-amber-500/30 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Table className="w-4 h-4 text-amber-400" />
                                    <h3 className="text-sm font-bold text-amber-300">Map Columns ({importedRows.length} rows)</h3>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Map columns from your spreadsheet to standard fields and custom regions drawn on your card.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {[
                                        { key: 'first_name', label: 'First Name' },
                                        { key: 'last_name', label: 'Last Name' },
                                        { key: 'name', label: 'Full Name' },
                                        { key: 'email', label: 'Email' },
                                        { key: 'role', label: 'Role / Title' },
                                        { key: 'booking_id', label: 'Booking ID' },
                                        { key: 'photo', label: 'Photo / URL' },
                                        ...activeFields.filter(f => !['first_name', 'last_name', 'name', 'email', 'role', 'booking_id', 'photo'].includes(f.type)).map(f => ({
                                            key: f.id,
                                            label: `Region: ${f.label || f.type}`
                                        }))
                                    ].map(({ key, label }) => (
                                        <div key={key} className="space-y-1">
                                            <label className="text-[10px] text-slate-400 uppercase font-bold truncate block" title={label}>{label}</label>
                                            <select value={columnMapping[key] || ''} onChange={e => setColumnMapping(prev => ({ ...prev, [key]: e.target.value }))}
                                                className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#0073BB]">
                                                <option value="">-- skip --</option>
                                                {importedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={confirmMapping} className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition">
                                        <Check className="w-3.5 h-3.5" /><span>Confirm &amp; Import {importedRows.length} Rows</span>
                                    </button>
                                    <button onClick={() => { setColumnMapping(null); setImportedHeaders([]); setImportedRows([]); }}
                                        className="flex items-center space-x-1.5 px-4 py-2 bg-[#0A0F1D] border border-[#1a2540] text-slate-400 text-xs font-medium rounded-xl hover:text-white transition">
                                        <X className="w-3.5 h-3.5" /><span>Cancel</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Bulk Action Toolbar for Selected Attendees */}
                        {selectedAttendeeIds.size > 0 && activeFields.length > 0 && (
                            <div className="bg-gradient-to-r from-[#0f1b33] via-[#151c2e] to-[#0f1b33] border border-[#0073BB]/60 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in duration-200">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="w-2 h-2 rounded-full bg-[#4F8EF7] animate-pulse" />
                                        <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                                            <span>⚡ Bulk Customize {selectedAttendeeIds.size} Selected Attendee{selectedAttendeeIds.size > 1 ? 's' : ''}</span>
                                        </h4>
                                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                                            (Changes apply only to the {selectedAttendeeIds.size} selected people)
                                        </span>
                                    </div>
                                    {bulkFeedback ? (
                                        <span className="text-xs text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                            {bulkFeedback}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-[#4F8EF7] font-medium font-mono">
                                            {selectedAttendeeIds.size} of {attendees.length} checked
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-end gap-3 pt-1">
                                    <div className="space-y-1 min-w-[200px]">
                                        <label className="text-[10px] text-slate-400 font-semibold uppercase">Target Region / Field</label>
                                        <select value={bulkTargetFieldId || activeFields[0]?.id}
                                            onChange={e => setBulkTargetFieldId(e.target.value)}
                                            className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0073BB]">
                                            {activeFields.map(f => (
                                                <option key={f.id} value={f.id}>
                                                    {f.label || f.type} ({f.type})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {(() => {
                                        const targetF = activeFields.find(f => f.id === (bulkTargetFieldId || activeFields[0]?.id));
                                        if (targetF?.type === 'photo') {
                                            return (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-400 font-semibold uppercase">Upload Photo for Selected</label>
                                                    <label className="flex items-center space-x-2 px-3 py-2 bg-[#0A0F1D] border border-[#1a2540] hover:bg-[#151c2e] text-slate-300 text-xs rounded-xl cursor-pointer transition">
                                                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                                                        <span>Choose Image File</span>
                                                        <input type="file" accept="image/*" onChange={handleBulkApplyPhotoToSelected} className="hidden" />
                                                    </label>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="space-y-1 flex-1 min-w-[240px]">
                                                <label className="text-[10px] text-slate-400 font-semibold uppercase">Custom Text to Apply</label>
                                                <input type="text"
                                                    value={bulkCustomText}
                                                    onChange={e => setBulkCustomText(e.target.value)}
                                                    placeholder={`e.g. VIP Pass, Table 4, Core Committee, All Access...`}
                                                    className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0073BB]" />
                                            </div>
                                        );
                                    })()}

                                    <div className="flex items-center space-x-2">
                                        <button type="button" onClick={handleBulkApplyTextToSelected}
                                            className="flex items-center space-x-1.5 px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#0073BB]/20 h-[36px]">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Apply to Selected ({selectedAttendeeIds.size})</span>
                                        </button>
                                        <button type="button" onClick={handleBulkClearOverridesForSelected}
                                            className="flex items-center space-x-1.5 px-3 py-2 bg-[#0A0F1D] border border-[#1a2540] text-slate-400 hover:text-white text-xs font-medium rounded-xl transition h-[36px]"
                                            title="Reset region to default for selected">
                                            <RotateCcw className="w-3 h-3" />
                                            <span>Reset Default</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Manual Entry */}
                        <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-5 space-y-3">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                                <Plus className="w-3.5 h-3.5 text-[#4F8EF7]" />
                                <span>Add Attendee Manually</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end">
                                {[
                                    ['First Name *', manualFirstName, setManualFirstName, 'First Name'],
                                    ['Last Name', manualLastName, setManualLastName, 'Last Name'],
                                    ['Email', manualEmail, setManualEmail, 'email@example.com'],
                                    ['Role', manualRole, setManualRole, 'Attendee'],
                                    ['Booking ID', manualBookingId, setManualBookingId, 'BK-001'],
                                    ['Photo URL', manualPhotoUrl, setManualPhotoUrl, 'https://... or upload below'],
                                ].map(([label, val, setter, ph]) => (
                                    <div key={label} className="space-y-1">
                                        <label className="text-[10px] text-slate-500">{label}</label>
                                        <input type="text" value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                                            className="w-full bg-[#0A0F1D] border border-[#1a2540] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB]" />
                                    </div>
                                ))}
                                <button onClick={addManualAttendee} disabled={!manualFirstName.trim() && !manualLastName.trim()}
                                    className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition h-[34px]">
                                    <Plus className="w-3.5 h-3.5" /><span>Add</span>
                                </button>
                            </div>
                        </div>

                        {/* Attendee Table */}
                        {attendees.length > 0 && (
                            <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-[#1a2540] flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="text-xs font-bold text-slate-300">
                                            {attendees.length} Attendees Total
                                        </h3>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${selectedAttendeeIds.size > 0 ? 'bg-[#0073BB]/20 text-[#4F8EF7] border border-[#0073BB]/30' : 'bg-slate-800 text-slate-400'}`}>
                                            {selectedAttendeeIds.size} Selected
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={toggleSelectAll} className="px-2.5 py-1.5 rounded-lg bg-[#0A0F1D] border border-[#1a2540] text-[11px] text-slate-300 hover:text-white transition">
                                            {selectedAttendeeIds.size === attendees.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <button onClick={invertSelection} className="px-2.5 py-1.5 rounded-lg bg-[#0A0F1D] border border-[#1a2540] text-[11px] text-slate-300 hover:text-white transition">
                                            Invert
                                        </button>
                                        {selectedAttendeeIds.size > 0 && (
                                            <button onClick={deleteSelectedAttendees}
                                                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 transition text-[11px] font-medium">
                                                <Trash2 className="w-3 h-3" />
                                                <span>Delete Selected ({selectedAttendeeIds.size})</span>
                                            </button>
                                        )}
                                        <button onClick={() => { if (window.confirm('Delete all attendees?')) { setAttendees([]); setSelectedAttendeeIds(new Set()); } }}
                                            className="text-[11px] text-red-400 hover:text-red-300 transition px-2 py-1">
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-[#0A0F1D] sticky top-0 z-10">
                                            <tr>
                                                <th className="w-10 px-4 py-2.5 text-left">
                                                    <input type="checkbox"
                                                        checked={selectedAttendeeIds.size === attendees.length && attendees.length > 0}
                                                        onChange={toggleSelectAll}
                                                        className="rounded border-[#1a2540] text-[#0073BB] focus:ring-0 cursor-pointer" />
                                                </th>
                                                <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Photo</th>
                                                <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Full Name</th>
                                                <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Role</th>
                                                <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Email</th>
                                                <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Booking ID</th>
                                                {/* Dynamic columns for custom / template regions */}
                                                {activeFields.filter(f => f.type === 'custom').map(f => (
                                                    <th key={f.id} className="px-3 py-2.5 text-left text-amber-400 font-semibold">
                                                        <span className="flex items-center space-x-1">
                                                            <Type className="w-3 h-3" />
                                                            <span>{f.label}</span>
                                                        </span>
                                                    </th>
                                                ))}
                                                <th className="px-3 py-2.5 text-center text-slate-500 font-medium">Overrides</th>
                                                <th className="px-3 py-2.5 text-right text-slate-500 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendees.map(att => {
                                                const isSelected = selectedAttendeeIds.has(att.id);
                                                const overridesCount = Object.keys(att.fieldOverrides || {}).filter(k => !k.endsWith('_hidden') && att.fieldOverrides[k]).length;
                                                return (
                                                    <tr key={att.id} className={`border-t border-[#1a2540]/50 transition ${isSelected ? 'bg-[#0073BB]/10 hover:bg-[#0073BB]/15' : 'hover:bg-[#0A0F1D]/40'}`}>
                                                        <td className="w-10 px-4 py-2">
                                                            <input type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectAttendee(att.id)}
                                                                className="rounded border-[#1a2540] text-[#0073BB] focus:ring-0 cursor-pointer" />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="flex items-center space-x-2">
                                                                {att.photo ? (
                                                                    <img src={att.photo} alt=""
                                                                        className="w-8 h-8 rounded-lg object-cover border border-[#1a2540] cursor-pointer hover:ring-2 hover:ring-[#0073BB] transition"
                                                                        onClick={() => setAdjustingAttendee(att)}
                                                                        title="Click to adjust crop/zoom" />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-lg bg-[#0A0F1D] border border-[#1a2540] flex items-center justify-center">
                                                                        <User className="w-3.5 h-3.5 text-slate-500" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col space-y-0.5">
                                                                    <label className="text-[10px] text-[#4F8EF7] cursor-pointer hover:underline">
                                                                        {att.photo ? 'Change' : 'Upload'}
                                                                        <input type="file" accept="image/*" onChange={e => handleManualPhotoFile(att.id, e)} className="hidden" />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-white font-medium">
                                                            {att.name || `${att.first_name || ''} ${att.last_name || ''}`.trim() || '\u2014'}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-300">
                                                            {att.role || '\u2014'}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-400">
                                                            {att.email || '\u2014'}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-400 font-mono">
                                                            {att.booking_id || '\u2014'}
                                                        </td>
                                                        {/* Inline input for custom drawn regions */}
                                                        {activeFields.filter(f => f.type === 'custom').map(f => {
                                                            const customVal = att.fieldOverrides?.[f.id] !== undefined ? att.fieldOverrides[f.id] : (f.customText || '');
                                                            return (
                                                                <td key={f.id} className="px-3 py-2">
                                                                    <input type="text"
                                                                        value={customVal}
                                                                        onChange={e => handleInlineFieldUpdate(att.id, f.id, e.target.value)}
                                                                        placeholder={f.customText || 'Enter text...'}
                                                                        className="w-32 bg-[#0A0F1D] border border-[#1a2540] focus:border-[#0073BB] rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none" />
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-3 py-2 text-center">
                                                            {overridesCount > 0 ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                    {overridesCount} custom
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-600">Default</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="flex items-center justify-end space-x-1.5">
                                                                <button onClick={() => setEditingAttendee(att)}
                                                                    className="flex items-center space-x-1 px-2.5 py-1 bg-[#0073BB]/20 hover:bg-[#0073BB]/30 text-[#4F8EF7] rounded-lg text-[11px] font-medium border border-[#0073BB]/30 transition"
                                                                    title="Edit Details & Region Overrides">
                                                                    <Edit3 className="w-3 h-3" />
                                                                    <span>Edit Regions</span>
                                                                </button>
                                                                <button onClick={() => setAttendees(prev => prev.filter(a => a.id !== att.id))} className="text-slate-600 hover:text-red-400 p-1 transition" title="Delete Attendee">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {attendees.length > 0 && activeTemplate && (
                            <div className="flex justify-end">
                                <button onClick={() => setActiveTab(3)} className="flex items-center space-x-2 px-5 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#0073BB]/20">
                                    <span>Next: Preview &amp; Export</span><ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ TAB 3: PREVIEW & EXPORT ═══ */}
                {activeTab === 3 && (
                    <div className="space-y-6">
                        {!activeTemplate || !attendees.length ? (
                            <div className="text-center py-16">
                                <p className="text-sm text-slate-400">{!activeTemplate ? 'Upload a template first.' : 'No attendees imported.'}</p>
                                <button onClick={() => setActiveTab(!activeTemplate ? 0 : 2)} className="mt-3 text-xs text-[#4F8EF7] hover:underline">{!activeTemplate ? 'Go to Templates' : 'Import Data'}</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-4 bg-[#151c2e] border border-[#1a2540] rounded-2xl p-5">
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-3">
                                            <h2 className="text-lg font-bold">Preview &amp; Export</h2>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0073BB]/20 text-[#4F8EF7] border border-[#0073BB]/30">
                                                {getTargetAttendees().length} Cards Target
                                            </span>
                                        </div>
                                        {/* Scope Selector */}
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => setExportScope('all')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${exportScope === 'all' ? 'bg-[#0073BB] text-white shadow-md' : 'bg-[#0A0F1D] text-slate-400 hover:text-white'}`}>
                                                All Attendees ({attendees.length})
                                            </button>
                                            <button onClick={() => setExportScope('selected')} disabled={selectedAttendeeIds.size === 0}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 ${exportScope === 'selected' ? 'bg-[#0073BB] text-white shadow-md' : 'bg-[#0A0F1D] text-slate-400 hover:text-white'}`}>
                                                Selected Only ({selectedAttendeeIds.size})
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* PDF Batch Split Option */}
                                        <div className="flex items-center space-x-1.5 bg-[#0A0F1D] border border-[#1a2540] rounded-xl px-2.5 py-1.5 text-xs">
                                            <span className="text-slate-400 text-[11px]">PDF Split:</span>
                                            <select value={pdfBatchOption} onChange={e => setPdfBatchOption(e.target.value)}
                                                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs">
                                                <option value="all" className="bg-[#0C111D]">Single PDF (All)</option>
                                                <option value="50" className="bg-[#0C111D]">Batches of 50</option>
                                                <option value="100" className="bg-[#0C111D]">Batches of 100</option>
                                            </select>
                                        </div>

                                        <button onClick={generatePreviews} disabled={generating}
                                            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-[#0A0F1D] hover:bg-[#1a2540] border border-[#1a2540] text-white text-xs font-medium rounded-xl transition">
                                            <RotateCcw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                                            <span>{generating ? 'Rendering...' : 'Refresh Previews'}</span>
                                        </button>
                                        <button onClick={downloadAllPDF} disabled={exporting || !getTargetAttendees().length}
                                            className="flex items-center space-x-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-600/20">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Download PDF ({getTargetAttendees().length})</span>
                                        </button>
                                        <button onClick={downloadAllZIP} disabled={exporting || !getTargetAttendees().length}
                                            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-[#0073BB]/20">
                                            <Archive className="w-3.5 h-3.5" />
                                            <span>Download ZIP ({getTargetAttendees().length})</span>
                                        </button>
                                    </div>
                                </div>

                                {exporting && (
                                    <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-4 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-300 font-medium">{exportProgress.label}</span>
                                            <span className="text-[#4F8EF7] font-mono font-bold">{exportProgress.current}/{exportProgress.total}</span>
                                        </div>
                                        <div className="h-2.5 bg-[#0A0F1D] rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-[#0073BB] to-[#4F8EF7] transition-all duration-200 rounded-full"
                                                style={{ width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total * 100) : 0}%` }} />
                                        </div>
                                    </div>
                                )}

                                {generating ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="flex flex-col items-center space-y-3">
                                            <div className="w-10 h-10 border-2 border-[#0073BB] border-t-transparent rounded-full animate-spin" />
                                            <p className="text-xs text-slate-400">Rendering high-speed card previews...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                                            <span>Showing {previewCards.length} of {getTargetAttendees().length} previews</span>
                                            {getTargetAttendees().length > previewCards.length && (
                                                <button onClick={() => setPreviewLimit(prev => prev + 24)}
                                                    className="text-[#4F8EF7] hover:underline font-medium">
                                                    Load next 24 previews...
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {previewCards.map(card => {
                                                const hasCustom = Object.keys(card.attendee.fieldOverrides || {}).some(k => !k.endsWith('_hidden') && card.attendee.fieldOverrides[k]);
                                                return (
                                                    <div key={card.attendee.id} className="bg-[#151c2e] border border-[#1a2540] rounded-2xl overflow-hidden group hover:border-[#0073BB]/40 transition">
                                                        <div className="bg-[#0A0F1D] flex items-center justify-center p-2 relative">
                                                            <img src={card.dataUrl} alt={card.attendee.name} className="w-full h-auto rounded-lg" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg space-x-2">
                                                                <button onClick={() => downloadSinglePNG(card)}
                                                                    className="flex items-center space-x-1.5 px-3 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-lg hover:bg-white/30 transition">
                                                                    <Download className="w-3.5 h-3.5" /><span>PNG</span>
                                                                </button>
                                                                <button onClick={() => setEditingAttendee(card.attendee)}
                                                                    className="flex items-center space-x-1 px-3 py-2 bg-[#0073BB]/80 backdrop-blur-sm text-white text-xs font-medium rounded-lg hover:bg-[#0073BB] transition">
                                                                    <Edit3 className="w-3.5 h-3.5" /><span>Edit</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 flex items-center justify-between">
                                                            <div className="min-w-0 flex-1 mr-2">
                                                                <div className="flex items-center space-x-1.5">
                                                                    <p className="text-xs font-semibold text-white truncate">{card.attendee.name}</p>
                                                                    {hasCustom && (
                                                                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Has custom region overrides" />
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 truncate">{card.attendee.role || card.attendee.email || '\u2014'}</p>
                                                            </div>
                                                            <div className="flex items-center space-x-1 flex-shrink-0">
                                                                <button onClick={() => setEditingAttendee(card.attendee)}
                                                                    className="p-1.5 rounded-lg bg-[#0A0F1D] border border-[#1a2540] text-slate-400 hover:text-white transition" title="Edit regions for this card">
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={() => downloadSinglePNG(card)}
                                                                    className="p-1.5 rounded-lg bg-[#0A0F1D] border border-[#1a2540] text-slate-400 hover:text-white transition" title="Download single PNG">
                                                                    <Download className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Attendee Details & Region Overrides Modal */}
            {editingAttendee && (
                <AttendeeRegionModal
                    attendee={editingAttendee}
                    template={activeTemplate}
                    fields={activeFields}
                    onSave={(updated) => {
                        setAttendees(prev => prev.map(a => a.id === updated.id ? updated : a));
                        setEditingAttendee(null);
                        if (activeTab === 3) generatePreviews();
                        if (showPreview) refreshPreview();
                    }}
                    onClose={() => setEditingAttendee(null)}
                />
            )}

            {/* Photo Crop / Zoom & Position Modal */}
            {adjustingAttendee && (
                <PhotoAdjustmentModal
                    attendee={adjustingAttendee}
                    photoField={activeFields.find(f => f.type === 'photo')}
                    onSave={(updates) => {
                        setAttendees(prev => prev.map(a => a.id === adjustingAttendee.id ? { ...a, ...updates } : a));
                        setAdjustingAttendee(null);
                        if (activeTab === 3) generatePreviews();
                        if (showPreview) refreshPreview();
                    }}
                    onClose={() => setAdjustingAttendee(null)}
                />
            )}
        </div>
    );
}

// ─── Page Entry Point ────────────────────────────────────────────────────────
export default function BadgesPage() {
    const [admin, setAdmin] = useState(null);
    if (!admin) return <AdminLoginGate onAuthenticated={setAdmin} />;
    return <BadgeStudio admin={admin} />;
}
