'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, SwitchCamera, Upload, Keyboard, CheckCircle2 } from 'lucide-react';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function QRScannerModal({
    isOpen,
    onClose,
    onScan,
    title = 'Scan QR Code'
}) {
    const html5QrCodeRef = useRef(null);
    const isScanningRef = useRef(false);
    const isStartingRef = useRef(false);
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [fileProcessing, setFileProcessing] = useState(false);
    const [showManual, setShowManual] = useState(false);

    // Audio Beep Confirmation
    const playBeep = () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (_) {}
    };

    // Clean Stop Camera
    const stopCamera = useCallback(async () => {
        if (html5QrCodeRef.current) {
            try {
                const scanner = html5QrCodeRef.current;
                html5QrCodeRef.current = null;
                const state = scanner.getState ? scanner.getState() : 0;
                // 2 is SCANNING, 3 is PAUSED
                if (state === 2 || state === 3 || isScanningRef.current) {
                    await scanner.stop();
                }
                scanner.clear();
            } catch (err) {
                console.warn('[QRScannerModal] stopCamera warning:', err);
            } finally {
                isScanningRef.current = false;
                setIsScanning(false);
                setInitializing(false);
            }
        }
    }, []);

    // Start Camera Stream
    const startCamera = useCallback(async (cameraParam) => {
        if (!cameraParam || isStartingRef.current) return;
        isStartingRef.current = true;
        setInitializing(true);
        setErrorMsg('');

        try {
            await stopCamera();

            // Small delay to ensure previous stream is released and DOM is ready
            await new Promise(r => setTimeout(r, 80));

            const container = document.getElementById('qr-reader-modal-viewport');
            if (!container) {
                isStartingRef.current = false;
                setInitializing(false);
                return;
            }

            const qrCodeScanner = new Html5Qrcode('qr-reader-modal-viewport', {
                verbose: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: false
                }
            });
            html5QrCodeRef.current = qrCodeScanner;

            const config = {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrSize = Math.floor(minEdge * 0.75);
                    return {
                        width: Math.max(160, Math.min(260, qrSize)),
                        height: Math.max(160, Math.min(260, qrSize))
                    };
                },
                aspectRatio: 1.0
            };

            const onDecode = (decodedText) => {
                if (!decodedText) return;
                const clean = parseScannedQR(decodedText);
                if (clean) {
                    playBeep();
                    stopCamera();
                    if (onScanRef.current) onScanRef.current(clean);
                    if (onCloseRef.current) onCloseRef.current();
                }
            };

            await qrCodeScanner.start(
                cameraParam,
                config,
                onDecode,
                () => {}
            );

            // Apply playsinline attributes to any video element on iOS Safari
            const videoEl = container.querySelector('video');
            if (videoEl) {
                videoEl.setAttribute('playsinline', 'true');
                videoEl.setAttribute('webkit-playsinline', 'true');
                videoEl.setAttribute('autoplay', 'true');
                videoEl.muted = true;
                videoEl.playsInline = true;
                videoEl.play().catch(() => {});
            }

            isScanningRef.current = true;
            setIsScanning(true);
        } catch (err) {
            console.error('[QRScannerModal] startCamera error:', err);
            const errStr = (err?.message || err?.name || String(err)).toLowerCase();
            if (errStr.includes('permission') || errStr.includes('notallowed') || errStr.includes('denied')) {
                setErrorMsg('Camera permission blocked. Please allow camera access in Safari Settings.');
            } else if (errStr.includes('notfound') || errStr.includes('device')) {
                setErrorMsg('No working camera found on this device. You can type or upload below.');
            } else {
                // Fallback attempt: Try generic facingMode constraint
                if (typeof cameraParam === 'string') {
                    try {
                        const fallbackScanner = new Html5Qrcode('qr-reader-modal-viewport');
                        html5QrCodeRef.current = fallbackScanner;
                        await fallbackScanner.start(
                            { facingMode: 'environment' },
                            { fps: 15, aspectRatio: 1.0 },
                            (text) => {
                                const clean = parseScannedQR(text);
                                if (clean) {
                                    playBeep();
                                    stopCamera();
                                    if (onScanRef.current) onScanRef.current(clean);
                                    if (onCloseRef.current) onCloseRef.current();
                                }
                            },
                            () => {}
                        );
                        isScanningRef.current = true;
                        setIsScanning(true);
                        setInitializing(false);
                        isStartingRef.current = false;
                        return;
                    } catch (_) {}
                }
                setErrorMsg('Could not open camera. Please use manual entry or file upload below.');
            }
        } finally {
            setInitializing(false);
            isStartingRef.current = false;
        }
    }, [stopCamera]);

    // Mount / Open Lifecycle
    useEffect(() => {
        if (isOpen) {
            let isMounted = true;
            setErrorMsg('');
            setShowManual(false);

            Html5Qrcode.getCameras().then((devices) => {
                if (!isMounted) return;
                if (devices && devices.length > 0) {
                    setCameras(devices);
                    const backCamera = devices.find(d => 
                        /back|rear|environment|camera2\s*0/i.test(d.label || '') && 
                        !/front|user|selfie/i.test(d.label || '')
                    );
                    const targetId = backCamera ? backCamera.id : devices[0].id;
                    setSelectedCameraId(targetId);
                    startCamera(targetId);
                } else {
                    setSelectedCameraId({ facingMode: 'environment' });
                    startCamera({ facingMode: 'environment' });
                }
            }).catch(() => {
                if (!isMounted) return;
                setSelectedCameraId({ facingMode: 'environment' });
                startCamera({ facingMode: 'environment' });
            });

            return () => {
                isMounted = false;
                stopCamera();
            };
        } else {
            stopCamera();
        }
    }, [isOpen, startCamera, stopCamera]);

    // Flip Camera / Switch Lens
    const handleSwitchCamera = (cameraId) => {
        setSelectedCameraId(cameraId);
        startCamera(cameraId);
    };

    // Fallback: Image file upload
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileProcessing(true);
        setErrorMsg('');

        try {
            const qrScanner = new Html5Qrcode('qr-reader-file-temp');
            const decodedText = await qrScanner.scanFile(file, true);
            playBeep();
            const clean = parseScannedQR(decodedText);
            if (clean) {
                stopCamera();
                if (onScanRef.current) onScanRef.current(clean);
                if (onCloseRef.current) onCloseRef.current();
            } else {
                setErrorMsg('No valid OnePass QR token recognized in the image.');
            }
        } catch (_) {
            setErrorMsg('Could not decode QR code from the uploaded image.');
        } finally {
            setFileProcessing(false);
        }
    };

    // Fallback: Manual code submit
    const handleManualSubmit = (e) => {
        e.preventDefault();
        const clean = parseScannedQR(manualCode);
        if (clean) {
            playBeep();
            stopCamera();
            if (onScanRef.current) onScanRef.current(clean);
            if (onCloseRef.current) onCloseRef.current();
            setManualCode('');
        } else {
            setErrorMsg('Please enter a valid QR token or booking code.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md bg-[#0C111D] border-2 border-[#0073BB] rounded-3xl overflow-hidden shadow-2xl shadow-[#0073BB]/20 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[#151c2e] border-b border-[#1a2540]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#0073BB]/20 flex items-center justify-center border border-[#0073BB]/30">
                            <Camera className="w-4 h-4 text-[#4F8EF7]" />
                        </div>
                        <div>
                            <span className="font-bold text-white text-sm block leading-tight">{title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {isScanning ? '● Camera Live' : initializing ? 'Opening camera...' : 'Ready'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setShowManual(!showManual)}
                            title="Toggle Manual Entry / Upload"
                            className={`p-1.5 rounded-xl border transition ${showManual ? 'bg-[#0073BB] text-white border-[#0073BB]' : 'text-slate-400 hover:text-white bg-[#1a2540] border-[#2a385c]'}`}
                        >
                            <Keyboard className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => startCamera(selectedCameraId || { facingMode: 'environment' })}
                            title="Restart Camera"
                            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-[#1a2540] hover:bg-[#253252] border border-[#2a385c] transition"
                        >
                            <RefreshCw className={`w-4 h-4 ${initializing ? 'animate-spin text-[#4F8EF7]' : ''}`} />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                stopCamera();
                                onClose();
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-red-500/20 hover:text-red-300 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    {errorMsg && (
                        <div className="p-3 bg-red-950/50 border border-red-800 rounded-2xl text-xs text-red-200 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                            <div className="space-y-1">
                                <span>{errorMsg}</span>
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => startCamera(selectedCameraId || { facingMode: 'environment' })}
                                        className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded-lg text-[11px] font-bold transition"
                                    >
                                        Retry Camera
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Camera Viewport */}
                    <div className="relative w-full aspect-square max-w-[320px] mx-auto bg-black rounded-2xl overflow-hidden border border-[#1a2540] shadow-inner flex items-center justify-center">
                        <div id="qr-reader-modal-viewport" className="w-full h-full" />
                        <div id="qr-reader-file-temp" className="hidden" />

                        {/* Visual Scanning Reticle Frame */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                            <div className="w-52 h-52 border-2 border-[#0073BB]/60 rounded-2xl relative shadow-2xl">
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#4F8EF7] rounded-tl" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#4F8EF7] rounded-tr" />
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#4F8EF7] rounded-bl" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#4F8EF7] rounded-br" />

                                {isScanning && (
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#4F8EF7] to-transparent animate-bounce opacity-80" />
                                )}
                            </div>
                        </div>

                        {initializing && (
                            <div className="absolute inset-0 bg-[#0C111D]/80 flex flex-col items-center justify-center gap-2 z-20">
                                <RefreshCw className="w-7 h-7 text-[#0073BB] animate-spin" />
                                <span className="text-xs text-slate-300 font-medium">Opening camera...</span>
                            </div>
                        )}
                    </div>

                    {/* Camera Source Selector */}
                    {cameras.length > 1 && (
                        <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                                <SwitchCamera className="w-3.5 h-3.5 text-[#4F8EF7]" /> Lens:
                            </span>
                            <select
                                value={typeof selectedCameraId === 'string' ? selectedCameraId : ''}
                                onChange={(e) => handleSwitchCamera(e.target.value)}
                                className="bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#0073BB] max-w-[220px] truncate"
                            >
                                {cameras.map((c) => {
                                    const isBack = /back|rear|environment|0/i.test(c.label || '');
                                    return (
                                        <option key={c.id} value={c.id}>
                                            {c.label ? `${isBack ? '📷 ' : '🤳 '}${c.label}` : `Camera ${c.id.slice(0, 6)}`}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* Manual Code & File Upload Section */}
                    {(showManual || errorMsg) && (
                        <div className="pt-3 border-t border-[#1a2540] space-y-3 animate-fade-in">
                            <form onSubmit={handleManualSubmit} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span className="font-semibold text-slate-300">Manual Code Entry</span>
                                    <span className="font-mono text-[10px] text-slate-500">e.g. 10e90612</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder="Paste or type QR token / Booking ID"
                                        className="flex-1 bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#0073BB]"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95"
                                    >
                                        Verify
                                    </button>
                                </div>
                            </form>

                            <div className="flex items-center justify-between pt-1 text-xs">
                                <span className="text-slate-400">Upload QR Badge Image</span>
                                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-slate-200 text-xs rounded-xl cursor-pointer transition font-medium">
                                    <Upload className="w-3.5 h-3.5 text-[#4F8EF7]" />
                                    <span>{fileProcessing ? 'Reading...' : 'Upload Image'}</span>
                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
