'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Upload, AlertCircle, CameraOff } from 'lucide-react';
import { parseScannedQR } from '@/lib/onepass/qr';

/**
 * InlineQRScanner — renders directly in the page (no popup modal).
 * Props:
 *   isOpen   : boolean — whether scanner section is visible
 *   onClose  : fn — called when user clicks X to collapse it
 *   onScan   : fn(decodedToken) — called on successful scan
 *   title    : string — label shown in the scanner header
 */
export default function InlineQRScanner({ isOpen, onClose, onScan, title = 'Scan QR Code' }) {
    const html5QrRef = useRef(null);
    const scanLockRef = useRef(false);
    const lastBeepRef = useRef(0);
    const viewportId = useRef(`qr-inline-${Math.random().toString(36).slice(2, 8)}`).current;
    const fileTempId = useRef(`qr-file-${Math.random().toString(36).slice(2, 8)}`).current;

    const [cameras, setCameras] = useState([]);
    const [selectedCam, setSelectedCam] = useState('');
    const [scanning, setScanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [fileProcessing, setFileProcessing] = useState(false);

    // When opened: enumerate cameras, pick back cam if available
    useEffect(() => {
        if (!isOpen) {
            scanLockRef.current = false;
            stopCamera();
            return;
        }
        scanLockRef.current = false;
        setErrorMsg('');
        Html5Qrcode.getCameras()
            .then(devs => {
                if (devs && devs.length) {
                    setCameras(devs);
                    const back = devs.find(d => /back|environment/i.test(d.label));
                    setSelectedCam(back ? back.id : devs[0].id);
                }
            })
            .catch(() => setErrorMsg('NO_CAMERA'));

        return () => {
            scanLockRef.current = false;
            stopCamera();
        };
    }, [isOpen]);

    // Auto-start camera when selectedCam is set
    useEffect(() => {
        if (isOpen && selectedCam && !scanning) {
            startCamera(selectedCam);
        }
    }, [isOpen, selectedCam]);

    const startCamera = async (camId) => {
        try {
            setErrorMsg('');
            scanLockRef.current = false;
            if (html5QrRef.current) await stopCamera();

            const scanner = new Html5Qrcode(viewportId);
            html5QrRef.current = scanner;

            await scanner.start(
                camId,
                { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
                async (decodedText) => {
                    if (scanLockRef.current) return;
                    scanLockRef.current = true;
                    const clean = parseScannedQR(decodedText);
                    if (clean) {
                        playBeep();
                        try { html5QrRef.current?.pause(true); } catch (_) {}
                        await stopCamera();
                        onScan(clean);
                    } else {
                        setTimeout(() => { scanLockRef.current = false; }, 1000);
                    }
                },
                () => {}
            );
            setScanning(true);
        } catch (err) {
            const m = (err?.message || '').toLowerCase();
            if (m.includes('permission') || m.includes('denied') || m.includes('notallowed')) {
                setErrorMsg('CAMERA_DENIED');
            } else {
                setErrorMsg('CAMERA_ERROR');
            }
            setScanning(false);
        }
    };

    const stopCamera = async () => {
        const s = html5QrRef.current;
        if (!s) return;
        try {
            if (scanning) await s.stop();
            s.clear();
        } catch (_) {}
        finally {
            html5QrRef.current = null;
            setScanning(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileProcessing(true);
        setErrorMsg('');
        try {
            const tmp = new Html5Qrcode(fileTempId);
            const text = await tmp.scanFile(file, true);
            playBeep();
            const clean = parseScannedQR(text);
            if (clean) { onScan(clean); }
            else { setErrorMsg('QR code in image not recognized as a valid token.'); }
        } catch { setErrorMsg('Could not decode QR code from the uploaded image.'); }
        finally { setFileProcessing(false); }
    };

    const playBeep = () => {
        const now = Date.now();
        if (now - lastBeepRef.current < 1000) return;
        lastBeepRef.current = now;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            g.gain.setValueAtTime(0.25, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } catch (_) {}
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const clean = parseScannedQR(manualCode);
        if (clean) { playBeep(); onScan(clean); setManualCode(''); }
        else { setErrorMsg('Please enter a valid QR token, booking ID, or code.'); }
    };

    if (!isOpen) return null;

    return (
        <div className="animate-fade-in rounded-3xl overflow-hidden border-2 border-[#0073BB] bg-[#0C111D] shadow-2xl shadow-[#0073BB]/10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#151c2e] border-b border-[#1a2540]">
                <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#0073BB]" />
                    <span className="font-bold text-white text-sm">{title}</span>
                    {scanning && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            LIVE
                        </span>
                    )}
                </div>
                <button onClick={() => { stopCamera(); onClose(); }} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2540] transition">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-5 space-y-5">
                {/* Error Banners */}
                {errorMsg === 'CAMERA_DENIED' && (
                    <div className="p-4 bg-amber-950/50 border border-amber-600/60 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                            <AlertCircle className="w-4 h-4" />Camera Permission Blocked
                        </div>
                        <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside font-mono">
                            <li><strong className="text-white">Chrome/Edge:</strong> Click 🔒 in address bar → Camera → Allow → Reload page</li>
                            <li><strong className="text-white">Firefox:</strong> Click camera icon → Remove Block → Reload</li>
                            <li><strong className="text-white">Safari iPhone:</strong> Settings → Safari → Camera → Allow</li>
                            <li><strong className="text-white">Android:</strong> ⋮ menu → Site Settings → Camera → Allow</li>
                        </ol>
                        <div className="flex justify-between items-center pt-1">
                            <p className="text-[10px] text-slate-400 font-mono">Or use manual entry / upload below ↓</p>
                            <button onClick={() => { setErrorMsg(''); if (selectedCam) startCamera(selectedCam); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-xl transition">
                                <RefreshCw className="w-3 h-3" />Retry Camera
                            </button>
                        </div>
                    </div>
                )}
                {errorMsg === 'NO_CAMERA' && (
                    <div className="p-3 bg-[#151c2e] border border-[#1a2540] rounded-xl flex items-center gap-2 text-xs text-slate-400">
                        <CameraOff className="w-4 h-4 flex-shrink-0" />
                        No camera detected. Use manual entry or upload a QR badge image below.
                    </div>
                )}
                {errorMsg === 'CAMERA_ERROR' && (
                    <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />Could not start camera. Use manual entry or image upload below.
                    </div>
                )}
                {errorMsg && !['CAMERA_DENIED', 'NO_CAMERA', 'CAMERA_ERROR'].includes(errorMsg) && (
                    <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{errorMsg}
                    </div>
                )}

                {/* Camera Viewport — inline, not in a modal */}
                {errorMsg !== 'NO_CAMERA' && (
                    <div className="relative w-full max-w-sm mx-auto aspect-square bg-black rounded-2xl overflow-hidden border border-[#1a2540] shadow-inner">
                        <div id={viewportId} className="w-full h-full" />
                        <div id={fileTempId} className="hidden" />
                        {/* Reticle overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-44 h-44 border-2 border-[#0073BB]/70 rounded-xl relative">
                                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#4F8EF7]" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#4F8EF7]" />
                                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#4F8EF7]" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#4F8EF7]" />
                                {scanning && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0073BB] animate-bounce" />}
                            </div>
                        </div>
                    </div>
                )}

                {/* Camera Switcher */}
                {cameras.length > 1 && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Camera:</span>
                        <select value={selectedCam} onChange={e => setSelectedCam(e.target.value)}
                            className="bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#0073BB]">
                            {cameras.map(c => <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.slice(0, 6)}`}</option>)}
                        </select>
                    </div>
                )}

                {/* Manual Entry */}
                <form onSubmit={handleManualSubmit} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase">
                        <span>Manual Entry</span><span>Name, Email, Booking ID, or QR Token</span>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={manualCode} onChange={e => setManualCode(e.target.value)}
                            placeholder="Type attendee name, email, or code..."
                            className="flex-1 bg-[#151c2e] border border-[#1a2540] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#0073BB]" />
                        <button type="submit" disabled={!manualCode.trim()}
                            className="px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/80 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition">
                            Go
                        </button>
                    </div>
                </form>

                {/* File Upload */}
                <div className="flex items-center justify-between border-t border-[#1a2540] pt-4">
                    <span className="text-xs text-slate-400">Or upload QR badge image</span>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-slate-200 text-xs rounded-xl cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{fileProcessing ? 'Reading...' : 'Upload Image'}</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>
            </div>
        </div>
    );
}