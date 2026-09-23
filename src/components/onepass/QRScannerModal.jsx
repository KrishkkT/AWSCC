'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, CameraOff, SwitchCamera, CheckCircle } from 'lucide-react';
import { parseScannedQR } from '@/lib/onepass/qr';

/**
 * Helper to identify back/rear camera labels across various mobile vendors
 * (Android Chrome, iOS Safari, Samsung Internet, Huawei, Xiaomi, etc.)
 */
function findBestCamera(devices, targetMode) {
    if (!devices || devices.length === 0) return null;

    if (targetMode === 'user') {
        const front = devices.find(d => 
            /front|user|selfie|face|camera2\s*1|1,\s*facing\s*front/i.test(d.label || '')
        );
        if (front) return front.id;
        if (devices.length > 1) return devices[1].id;
        return devices[0].id;
    }

    // targetMode === 'environment' (Back/Rear Camera)
    const backMatches = devices.filter(d => {
        const label = (d.label || '').toLowerCase();
        const isFront = /front|user|selfie|face|camera2\s*1|1,\s*facing\s*front/.test(label);
        if (isFront) return false;
        return /back|rear|environment|facing\s*back|0,\s*facing\s*back|camera2\s*0|camera\s*0|wide|main/.test(label);
    });

    if (backMatches.length > 0) {
        const primary = backMatches.find(d => /0|main|wide|primary/i.test(d.label || '')) || backMatches[0];
        return primary.id;
    }

    const nonFront = devices.filter(d => 
        !/front|user|selfie|face|camera2\s*1|1,\s*facing\s*front/i.test(d.label || '')
    );
    if (nonFront.length > 0) {
        return nonFront[0].id;
    }

    return devices[0].id;
}

/**
 * QRScannerModal — High-performance, rock-solid modal popup scanner.
 * 
 * Stability & Performance Guarantees:
 * 1. Conservative 10 FPS + fixed 250x250 qrbox to eliminate frame drops and lag.
 * 2. Continuous autofocus where supported across Android/iOS devices.
 * 3. iOS Safari optimized (playsInline, muted, and mounted DOM delayed start).
 * 4. Full async teardown on single decode / dismiss to prevent NotReadableError and background CPU drain.
 * 5. Automatic popup close on scan with immediate callback.
 */
function QRScannerModal({
    isOpen,
    onClose,
    onScan,
    title = 'Scan QR Code'
}) {
    const scannerRef = useRef(null);
    const scanLockRef = useRef(false);
    const isStoppingRef = useRef(false);
    const isMountedRef = useRef(false);
    const facingModeRef = useRef('environment');
    const selectedCamRef = useRef('');
    const containerIdRef = useRef(`qr-modal-vp-${Math.random().toString(36).substring(2, 9)}`);

    const [cameras, setCameras] = useState([]);
    const [selectedCam, setSelectedCam] = useState('');
    const [facingMode, setFacingMode] = useState('environment');
    const [scanning, setScanning] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [lastScanSuccess, setLastScanSuccess] = useState(null);

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
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (_) {}
    };

    // Full Camera Hardware Teardown
    const stopCamera = useCallback(async () => {
        if (isStoppingRef.current) return;
        isStoppingRef.current = true;

        try {
            if (scannerRef.current) {
                const s = scannerRef.current;
                scannerRef.current = null;
                try {
                    const state = s.getState ? s.getState() : 0;
                    if (state === 2 || state === 3 || s.isScanning) {
                        await s.stop();
                    }
                } catch (_) {}
                try {
                    s.clear();
                } catch (_) {}
            }

            const container = document.getElementById(containerIdRef.current);
            if (container) {
                const videos = container.querySelectorAll('video');
                videos.forEach(v => {
                    if (v.srcObject && v.srcObject.getTracks) {
                        v.srcObject.getTracks().forEach(track => {
                            try { track.stop(); } catch (_) {}
                        });
                        v.srcObject = null;
                    }
                });
                container.innerHTML = '';
            }
        } catch (e) {
            console.warn('[QRScannerModal] stopCamera warning:', e);
        } finally {
            setScanning(false);
            setInitializing(false);
            isStoppingRef.current = false;
        }
    }, []);

    // Start Camera Stream with Robust Fallbacks
    const startCamera = useCallback(async (cameraParam = null, targetFacingMode = null) => {
        if (!isMountedRef.current) return;
        setErrorMsg('');
        setInitializing(true);
        scanLockRef.current = false;

        const activeMode = targetFacingMode || facingModeRef.current || 'environment';
        facingModeRef.current = activeMode;
        setFacingMode(activeMode);

        // Await clean teardown and yield 100ms hardware release
        await stopCamera();
        await new Promise(r => setTimeout(r, 100));

        if (!isMountedRef.current) {
            setInitializing(false);
            return;
        }

        const containerEl = document.getElementById(containerIdRef.current);
        if (!containerEl) {
            setInitializing(false);
            return;
        }
        containerEl.innerHTML = '';

        try {
            const scanner = new Html5Qrcode(containerIdRef.current, {
                verbose: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            });
            scannerRef.current = scanner;

            // Stable 10 FPS and Fixed 250x250 Box (Eliminates lag & flicker)
            const qrConfig = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                videoConstraints: {
                    facingMode: activeMode,
                    focusMode: 'continuous',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            // SYNCHRONOUS DECODE HANDLER
            const onScanSuccess = async (decodedText) => {
                if (scanLockRef.current) return;
                scanLockRef.current = true;

                const clean = parseScannedQR(decodedText);
                if (!clean) {
                    scanLockRef.current = false;
                    return;
                }

                playBeep();
                setLastScanSuccess(clean);

                // Pause stream immediately
                try {
                    if (scannerRef.current) {
                        scannerRef.current.pause(true);
                    }
                } catch (_) {}

                // Teardown camera cleanly
                await stopCamera();

                // Fire parent callback and close modal popup
                if (onScan) {
                    onScan(clean);
                }
                if (onClose) {
                    onClose();
                }
            };

            const onScanError = () => {};

            // Enumerate hardware devices
            let devices = [];
            try {
                devices = await Html5Qrcode.getCameras();
                if (devices && devices.length > 0) {
                    setCameras(devices);
                }
            } catch (_) {}

            let started = false;

            // 1. Explicit cameraParam if chosen
            if (cameraParam && typeof cameraParam === 'string') {
                try {
                    await scanner.start(cameraParam, qrConfig, onScanSuccess, onScanError);
                    started = true;
                    selectedCamRef.current = cameraParam;
                    setSelectedCam(cameraParam);
                } catch (e) {
                    console.warn('[QRScannerModal] Specific camera start failed:', e);
                }
            }

            // 2. Best physical back camera from hardware enumeration
            if (!started && devices && devices.length > 0) {
                const bestId = findBestCamera(devices, activeMode);
                if (bestId) {
                    try {
                        await scanner.start(bestId, qrConfig, onScanSuccess, onScanError);
                        started = true;
                        selectedCamRef.current = bestId;
                        setSelectedCam(bestId);
                    } catch (e) {
                        console.warn('[QRScannerModal] Best camera start failed:', e);
                    }
                }
            }

            // 3. FacingMode constraint
            if (!started) {
                try {
                    await scanner.start({ facingMode: activeMode }, qrConfig, onScanSuccess, onScanError);
                    started = true;
                } catch (e) {
                    console.warn('[QRScannerModal] facingMode start failed:', e);
                }
            }

            // 4. Ideal facingMode fallback
            if (!started) {
                try {
                    await scanner.start({ facingMode: { ideal: activeMode } }, qrConfig, onScanSuccess, onScanError);
                    started = true;
                } catch (e) {
                    console.warn('[QRScannerModal] ideal facingMode failed:', e);
                }
            }

            // 5. User camera fallback
            if (!started) {
                await scanner.start({ facingMode: 'user' }, qrConfig, onScanSuccess, onScanError);
                started = true;
            }

            // Ensure iOS Safari playsInline and muted attributes on video elements
            const container = document.getElementById(containerIdRef.current);
            if (container) {
                const video = container.querySelector('video');
                if (video) {
                    video.setAttribute('playsinline', 'true');
                    video.setAttribute('webkit-playsinline', 'true');
                    video.muted = true;
                }
            }

            setScanning(true);
            setInitializing(false);
        } catch (err) {
            console.error('[QRScannerModal] Start error:', err);
            const errStr = (err?.message || err?.name || '').toLowerCase();
            if (errStr.includes('permission') || errStr.includes('denied') || errStr.includes('notallowed')) {
                setErrorMsg('CAMERA_DENIED');
            } else if (errStr.includes('notfound') || errStr.includes('devicesnotfound')) {
                setErrorMsg('NO_CAMERA');
            } else {
                setErrorMsg('CAMERA_ERROR');
            }
            setScanning(false);
            setInitializing(false);
        }
    }, [stopCamera, onScan, onClose]);

    // Modal Mount & Lifecycle Management
    useEffect(() => {
        if (isOpen) {
            isMountedRef.current = true;
            scanLockRef.current = false;
            // Delay start slightly to guarantee modal DOM element is rendered
            const timer = setTimeout(() => {
                if (isMountedRef.current) {
                    startCamera(selectedCamRef.current || null, facingModeRef.current);
                }
            }, 120);

            return () => {
                isMountedRef.current = false;
                clearTimeout(timer);
                stopCamera();
            };
        } else {
            isMountedRef.current = false;
            stopCamera();
        }
    }, [isOpen, startCamera, stopCamera]);

    // Flip Camera (Front / Back)
    const handleFlipCamera = async () => {
        const nextMode = facingModeRef.current === 'environment' ? 'user' : 'environment';
        facingModeRef.current = nextMode;
        setFacingMode(nextMode);
        selectedCamRef.current = '';
        setSelectedCam('');
        await startCamera(null, nextMode);
    };

    // Camera Selector
    const handleSelectCamera = async (cameraId) => {
        selectedCamRef.current = cameraId;
        setSelectedCam(cameraId);
        await startCamera(cameraId, facingModeRef.current);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md bg-[#0C111D] border-2 border-[#0073BB] rounded-3xl overflow-hidden shadow-2xl shadow-[#0073BB]/20">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[#151c2e] border-b border-[#1a2540]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#0073BB]/20 flex items-center justify-center border border-[#0073BB]/30">
                            <Camera className="w-4 h-4 text-[#4F8EF7]" />
                        </div>
                        <div>
                            <span className="font-bold text-white text-sm block leading-tight">{title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {scanning ? `● ${facingMode === 'environment' ? 'Rear' : 'Front'} Camera Live` : initializing ? 'Starting camera...' : 'Ready'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Camera Flip Button */}
                        <button
                            type="button"
                            onClick={handleFlipCamera}
                            title={`Switch to ${facingMode === 'environment' ? 'Front' : 'Back'} Camera`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2540] hover:bg-[#253252] text-slate-200 rounded-xl text-xs font-semibold transition border border-[#2a385c] active:scale-95"
                        >
                            <SwitchCamera className="w-3.5 h-3.5 text-[#4F8EF7]" />
                            <span className="text-[11px] font-mono">{facingMode === 'environment' ? 'Front' : 'Back'}</span>
                        </button>

                        {/* Restart Button */}
                        <button
                            type="button"
                            onClick={() => startCamera(selectedCamRef.current || null, facingModeRef.current)}
                            title="Restart Camera Stream"
                            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#1a2540] transition border border-transparent hover:border-[#1a2540]"
                        >
                            <RefreshCw className={`w-4 h-4 ${initializing ? 'animate-spin text-[#4F8EF7]' : ''}`} />
                        </button>

                        {/* Close Modal Button */}
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

                <div className="p-5 space-y-4">
                    {/* Error Alerts */}
                    {errorMsg === 'CAMERA_DENIED' && (
                        <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                                <AlertCircle className="w-4 h-4" />
                                <span>Camera Permission Blocked</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                Tap the <strong>🔒 lock icon</strong> in your browser address bar and choose <strong>Camera → Allow</strong>.
                            </p>
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => startCamera(selectedCamRef.current || null, facingModeRef.current)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-xl transition"
                                >
                                    <RefreshCw className="w-3 h-3" /> Retry Camera
                                </button>
                            </div>
                        </div>
                    )}

                    {errorMsg === 'CAMERA_ERROR' && (
                        <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl flex items-center justify-between text-xs text-red-300">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>Camera stream interrupted or in use.</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => startCamera(null, 'environment')}
                                className="px-2.5 py-1 bg-red-800/40 hover:bg-red-800/60 rounded-lg text-[11px] font-bold text-white transition"
                            >
                                Restart
                            </button>
                        </div>
                    )}

                    {errorMsg === 'NO_CAMERA' && (
                        <div className="p-4 bg-[#151c2e] border border-[#1a2540] rounded-xl flex items-center gap-2 text-xs text-slate-300">
                            <CameraOff className="w-4 h-4 flex-shrink-0 text-slate-400" />
                            <span>No camera hardware detected on this device.</span>
                        </div>
                    )}

                    {/* Dedicated Live Camera Viewport */}
                    {errorMsg !== 'NO_CAMERA' && (
                        <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border border-[#1a2540] shadow-inner flex items-center justify-center">
                            <div id={containerIdRef.current} className="w-full h-full" />

                            {/* Reticle Overlay */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-56 h-56 border-2 border-[#0073BB]/60 rounded-2xl relative shadow-2xl">
                                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#4F8EF7] rounded-tl" />
                                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#4F8EF7] rounded-tr" />
                                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#4F8EF7] rounded-bl" />
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#4F8EF7] rounded-br" />

                                    {scanning && (
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#4F8EF7] to-transparent animate-bounce opacity-80" />
                                    )}
                                </div>
                            </div>

                            {/* Loading Indicator */}
                            {initializing && (
                                <div className="absolute inset-0 bg-[#0C111D]/80 flex flex-col items-center justify-center gap-2">
                                    <RefreshCw className="w-7 h-7 text-[#0073BB] animate-spin" />
                                    <span className="text-xs text-slate-300 font-medium">Opening camera...</span>
                                </div>
                            )}

                            {/* Scanned Success Badge */}
                            {lastScanSuccess && (
                                <div className="absolute inset-x-4 bottom-4 py-2 px-3 bg-emerald-950/90 border border-emerald-500 rounded-xl flex items-center gap-2 text-emerald-200 text-xs font-bold animate-fade-in shadow-xl backdrop-blur-md">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <span className="truncate">Scanned: {lastScanSuccess}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lens Selector Dropdown */}
                    {cameras.length > 1 && (
                        <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-slate-400 font-medium">Lens:</span>
                            <select
                                value={selectedCam}
                                onChange={(e) => handleSelectCamera(e.target.value)}
                                className="bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#0073BB] max-w-[240px] truncate"
                            >
                                <option value="">Auto ({facingMode === 'environment' ? 'Rear Lens' : 'Front Lens'})</option>
                                {cameras.map(c => {
                                    const isBack = /back|rear|environment|0/i.test(c.label || '');
                                    return (
                                        <option key={c.id} value={c.id}>
                                            {c.label ? `${isBack ? '📷 Rear: ' : '🤳 Front: '}${c.label}` : `Camera ${c.id.slice(0, 6)}`}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(QRScannerModal);
