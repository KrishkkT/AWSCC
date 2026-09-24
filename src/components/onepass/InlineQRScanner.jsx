'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Upload, AlertCircle, CameraOff, SwitchCamera, CheckCircle, Pause } from 'lucide-react';
import { parseScannedQR } from '@/lib/onepass/qr';

/**
 * Helper to identify back/rear camera labels across various mobile vendors
 * (Android Chrome, iOS Safari, Samsung Internet, Huawei, Xiaomi, etc.)
 */
function findBestCamera(devices, targetMode) {
    if (!devices || devices.length === 0) return null;

    if (targetMode === 'user') {
        // Look for front/user/selfie camera
        const front = devices.find(d => 
            /front|user|selfie|face|camera2\s*1|1,\s*facing\s*front/i.test(d.label || '')
        );
        if (front) return front.id;
        // If not found by label, check if secondary device exists
        if (devices.length > 1) return devices[1].id;
        return devices[0].id;
    }

    // targetMode === 'environment' (Back/Rear Camera)
    // 1. Explicit back camera label matching (avoiding front)
    const backMatches = devices.filter(d => {
        const label = (d.label || '').toLowerCase();
        const isFront = /front|user|selfie|face|camera2\s*1|1,\s*facing\s*front/.test(label);
        if (isFront) return false;
        return /back|rear|environment|facing\s*back|0,\s*facing\s*back|camera2\s*0|camera\s*0|wide|main/.test(label);
    });

    if (backMatches.length > 0) {
        // Return primary back camera (prefer 0 or main/wide if multiple)
        const primary = backMatches.find(d => /0|main|wide|primary/i.test(d.label || '')) || backMatches[0];
        return primary.id;
    }

    // 2. Filter out any device explicitly identified as front camera
    const nonFront = devices.filter(d => 
        !/front|user|selfie|face|camera2\s*1|1,\s*facing\s*front/i.test(d.label || '')
    );
    if (nonFront.length > 0) {
        return nonFront[0].id;
    }

    // 3. Default to first camera device
    return devices[0].id;
}

/**
 * InlineQRScanner — Cross-platform, mobile-optimized inline QR scanner.
 * 
 * Key guarantees:
 * 1. Single Html5Qrcode instance lifecycle — NEVER recreate/stop on each scan.
 * 2. Instant synchronous pause(true) + scanLockRef on first decode to eliminate
 *    repeated scans, duplicate beeps, and browser video track crashes.
 * 3. Mobile Back Camera priority: Deterministic physical back camera resolution
 *    with multi-tier fallbacks across Android Chrome and iOS Safari.
 * 4. Camera stays safely paused until explicitly resumed via resume() / Scan Next trigger.
 */
const InlineQRScanner = forwardRef(function InlineQRScanner({
    isOpen,
    onClose,
    onScan,
    title = 'Scan QR Code',
    continuous = false,
    isPaused = false
}, ref) {
    const scannerRef = useRef(null);
    const scanLockRef = useRef(false);
    const isStoppingRef = useRef(false);
    const facingModeRef = useRef('environment'); // Keep sync with current mode
    const selectedCamRef = useRef('');
    const lastScanTimeRef = useRef(0);
    const lastScannedTextRef = useRef('');
    const containerIdRef = useRef(`qr-vp-${Math.random().toString(36).substring(2, 9)}`);

    const [cameras, setCameras] = useState([]);
    const [selectedCam, setSelectedCam] = useState('');
    const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
    const [scanning, setScanning] = useState(false);
    const [isPausedState, setIsPausedState] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [fileProcessing, setFileProcessing] = useState(false);
    const [lastScanSuccess, setLastScanSuccess] = useState(null);

    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;

    // Completely release camera hardware only on explicit close or unmount
    const stopCamera = useCallback(async () => {
        if (isStoppingRef.current) return;
        isStoppingRef.current = true;

        try {
            if (scannerRef.current) {
                const s = scannerRef.current;
                scannerRef.current = null;
                try {
                    const state = s.getState ? s.getState() : 0;
                    if (state === 2 || state === 3 || s.isScanning) { // SCANNING or PAUSED
                        await s.stop();
                    }
                } catch (_) {}
                try {
                    s.clear();
                } catch (_) {}
            }

            // Force stop any lingering MediaStream tracks in the DOM container
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
            console.warn('[InlineQRScanner] stopCamera warning:', e);
        } finally {
            setScanning(false);
            setIsPausedState(false);
            setInitializing(false);
            isStoppingRef.current = false;
        }
    }, []);

    // Play a crisp confirmation audio beep
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
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.18);
        } catch (_) {}
    };

    // Safely pause scanner hardware stream
    const pauseScanner = useCallback(() => {
        scanLockRef.current = true;
        setIsPausedState(true);
        try {
            if (scannerRef.current) {
                const state = scannerRef.current.getState ? scannerRef.current.getState() : null;
                if (state === 2 || typeof scannerRef.current.pause === 'function') {
                    scannerRef.current.pause(true);
                }
            }
        } catch (e) {
            console.warn('[InlineQRScanner] pause error:', e);
        }
    }, []);

    // Safely resume scanner hardware stream without restarting camera
    const resumeScanner = useCallback(() => {
        scanLockRef.current = false;
        setIsPausedState(false);
        setLastScanSuccess(null);
        try {
            if (scannerRef.current) {
                const state = scannerRef.current.getState ? scannerRef.current.getState() : null;
                if (state === 3 || typeof scannerRef.current.resume === 'function') {
                    scannerRef.current.resume();
                }
            }
        } catch (e) {
            console.warn('[InlineQRScanner] resume error:', e);
        }
    }, []);

    // Initialize and start camera with single persistent instance & multi-stage back camera resolution
    const startCamera = useCallback(async (cameraParam = null, targetFacingMode = null) => {
        if (!isOpen) return;
        setErrorMsg('');
        setInitializing(true);
        scanLockRef.current = false;
        setIsPausedState(false);

        const activeMode = targetFacingMode || facingModeRef.current || 'environment';
        facingModeRef.current = activeMode;
        setFacingMode(activeMode);

        // Clean up any existing instances and yield hardware track release (100ms)
        await stopCamera();
        await new Promise(r => setTimeout(r, 100));

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
                    useBarCodeDetectorIfSupported: false
                }
            });
            scannerRef.current = scanner;

            const qrConfig = {
                fps: 20
            };

            // SYNCHRONOUS DECODE HANDLER
            const onScanSuccess = (decodedText) => {
                // Synchronously drop any subsequent frames if already locked/paused
                if (scanLockRef.current) return;

                const clean = parseScannedQR(decodedText);
                if (!clean) return;

                // 1. SYNCHRONOUS LOCK & HARDWARE PAUSE IMMEDIATELY
                scanLockRef.current = true;
                setIsPausedState(true);
                try {
                    if (scannerRef.current) {
                        scannerRef.current.pause(true);
                    }
                } catch (pauseErr) {
                    console.warn('[InlineQRScanner] Immediate pause warning:', pauseErr);
                }

                // 2. Audible feedback and state notification
                lastScanTimeRef.current = Date.now();
                lastScannedTextRef.current = clean;
                playBeep();
                setLastScanSuccess(clean);

                // 3. Invoke parent callback
                if (onScanRef.current) {
                    onScanRef.current(clean);
                }

                // 4. Auto-resume ONLY if continuous mode is explicitly set to true
                if (continuous) {
                    setTimeout(() => {
                        resumeScanner();
                    }, 2000);
                }
            };

            const onScanError = () => {};

            // Query devices to determine best physical camera ID
            let devices = [];
            try {
                devices = await Html5Qrcode.getCameras();
                if (devices && devices.length > 0) {
                    setCameras(devices);
                }
            } catch (_) {}

            let started = false;

            // Strategy 1: Explicit cameraParam ID if provided
            if (cameraParam && typeof cameraParam === 'string') {
                try {
                    await scanner.start(cameraParam, qrConfig, onScanSuccess, onScanError);
                    started = true;
                    selectedCamRef.current = cameraParam;
                    setSelectedCam(cameraParam);
                } catch (camErr) {
                    console.warn('[InlineQRScanner] Specific cameraParam start failed:', camErr);
                }
            }

            // Strategy 2: Standard facingMode constraint (iOS Safari & Mobile optimized)
            if (!started) {
                try {
                    await scanner.start({ facingMode: activeMode }, qrConfig, onScanSuccess, onScanError);
                    started = true;
                } catch (facingErr) {
                    console.warn('[InlineQRScanner] facingMode constraint failed:', facingErr);
                }
            }

            // Strategy 3: Best physical camera ID matched from enumeration
            if (!started && devices && devices.length > 0) {
                const bestId = findBestCamera(devices, activeMode);
                if (bestId) {
                    try {
                        await scanner.start(bestId, qrConfig, onScanSuccess, onScanError);
                        started = true;
                        selectedCamRef.current = bestId;
                        setSelectedCam(bestId);
                    } catch (enumErr) {
                        console.warn('[InlineQRScanner] Enumerated best camera start failed:', enumErr);
                    }
                }
            }

            // Strategy 4: Exact facingMode constraint fallback
            if (!started) {
                try {
                    await scanner.start({ facingMode: { exact: activeMode } }, qrConfig, onScanSuccess, onScanError);
                    started = true;
                } catch (exactErr) {
                    console.warn('[InlineQRScanner] facingMode exact constraint failed:', exactErr);
                }
            }

            // Strategy 5: Ultimate user facing mode fallback
            if (!started) {
                await scanner.start({ facingMode: 'user' }, qrConfig, onScanSuccess, onScanError);
                started = true;
            }

            // Populate updated camera list in background without blocking
            Html5Qrcode.getCameras().then(devs => {
                if (devs && devs.length > 0) {
                    setCameras(devs);
                }
            }).catch(() => {});

            setScanning(true);
            setInitializing(false);
        } catch (err) {
            console.error('[InlineQRScanner] Camera start error:', err);
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
    }, [isOpen, continuous, stopCamera, resumeScanner]);

    // Expose imperative control handle to parent components
    useImperativeHandle(ref, () => ({
        resume: resumeScanner,
        pause: pauseScanner,
        stop: stopCamera,
        restart: () => startCamera(selectedCamRef.current || null, facingModeRef.current),
        isPaused: () => scanLockRef.current || isPausedState
    }), [resumeScanner, pauseScanner, stopCamera, startCamera, isPausedState]);

    // React to external isPaused prop change
    useEffect(() => {
        if (isPaused) {
            pauseScanner();
        } else if (isOpen && scanning && isPausedState) {
            resumeScanner();
        }
    }, [isPaused, pauseScanner, resumeScanner, isOpen, scanning, isPausedState]);

    // Handle open/close lifecycle and iOS video attribute observation
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            return;
        }

        const container = document.getElementById(containerIdRef.current);
        let observer = null;
        if (container) {
            observer = new MutationObserver(() => {
                const videos = container.querySelectorAll('video');
                videos.forEach((v) => {
                    v.setAttribute('playsinline', 'true');
                    v.setAttribute('webkit-playsinline', 'true');
                    v.setAttribute('autoplay', 'true');
                    v.setAttribute('muted', 'true');
                    v.muted = true;
                    v.playsInline = true;
                    v.style.setProperty('width', '100%', 'important');
                    v.style.setProperty('height', '100%', 'important');
                    v.style.setProperty('object-fit', 'cover', 'important');
                    v.style.setProperty('position', 'absolute', 'important');
                    v.style.setProperty('top', '0', 'important');
                    v.style.setProperty('left', '0', 'important');
                    v.style.setProperty('display', 'block', 'important');
                    v.style.setProperty('border-radius', '1rem', 'important');
                    if (v.paused) {
                        v.play().catch(() => {});
                    }
                });

                const shaded = container.querySelector('#qr-shaded-region');
                if (shaded) {
                    shaded.style.setProperty('display', 'none', 'important');
                }
                const canvases = container.querySelectorAll('canvas');
                canvases.forEach((c) => {
                    c.style.setProperty('display', 'none', 'important');
                });
            });

            observer.observe(container, { childList: true, subtree: true });
        }

        const timer = setTimeout(() => {
            startCamera(selectedCamRef.current || null, facingModeRef.current);
        }, 80);

        return () => {
            if (observer) observer.disconnect();
            clearTimeout(timer);
            stopCamera();
        };
    }, [isOpen]);

    // Recover camera stream on mobile tab focus / visibilitychange
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isOpen && !scanning && !initializing) {
                startCamera(selectedCamRef.current || null, facingModeRef.current);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isOpen, scanning, initializing, startCamera]);

    // Toggle camera flip (Front / Back) with synchronous parameter passing
    const handleFlipCamera = async () => {
        const nextMode = facingModeRef.current === 'environment' ? 'user' : 'environment';
        facingModeRef.current = nextMode;
        setFacingMode(nextMode);
        selectedCamRef.current = '';
        setSelectedCam('');
        await startCamera(null, nextMode);
    };

    // Camera selector change handler
    const handleSelectCamera = async (cameraId) => {
        selectedCamRef.current = cameraId;
        setSelectedCam(cameraId);
        await startCamera(cameraId, facingModeRef.current);
    };

    // Manual Submit
    const handleManualSubmit = (e) => {
        e.preventDefault();
        const clean = parseScannedQR(manualCode);
        if (clean) {
            scanLockRef.current = true;
            setIsPausedState(true);
            try {
                if (scannerRef.current) scannerRef.current.pause(true);
            } catch (_) {}
            playBeep();
            setLastScanSuccess(clean);
            if (onScan) onScan(clean);
            setManualCode('');
        } else {
            setErrorMsg('Please enter a valid ticket booking ID or QR code.');
        }
    };

    // Image File Upload Scan
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileProcessing(true);
        setErrorMsg('');
        try {
            const tempScanner = new Html5Qrcode(`temp-${containerIdRef.current}`);
            const text = await tempScanner.scanFile(file, true);
            const clean = parseScannedQR(text);
            if (clean) {
                scanLockRef.current = true;
                setIsPausedState(true);
                try {
                    if (scannerRef.current) scannerRef.current.pause(true);
                } catch (_) {}
                playBeep();
                setLastScanSuccess(clean);
                if (onScan) onScan(clean);
            } else {
                setErrorMsg('QR code in image not recognized as a valid token.');
            }
        } catch {
            setErrorMsg('Could not decode QR code from the uploaded image.');
        } finally {
            setFileProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="animate-fade-in rounded-3xl overflow-hidden border-2 border-[#0073BB] bg-[#0C111D] shadow-2xl shadow-[#0073BB]/10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#151c2e] border-b border-[#1a2540]">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#0073BB]/20 flex items-center justify-center border border-[#0073BB]/30">
                        <Camera className="w-4 h-4 text-[#4F8EF7]" />
                    </div>
                    <div>
                        <span className="font-bold text-white text-sm block leading-tight">{title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                            {isPausedState ? '⏸️ Paused (Awaiting next scan)' : scanning ? `● ${facingMode === 'environment' ? 'Back' : 'Front'} Camera Live` : initializing ? 'Starting camera...' : 'Ready'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Resume Button if Paused */}
                    {isPausedState && (
                        <button
                            type="button"
                            onClick={resumeScanner}
                            title="Resume Camera Stream"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition border border-emerald-500/40 animate-pulse"
                        >
                            <span>Resume</span>
                        </button>
                    )}

                    {/* Camera Flip */}
                    <button
                        type="button"
                        onClick={handleFlipCamera}
                        title={`Switch to ${facingMode === 'environment' ? 'Front' : 'Back'} Camera`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2540] hover:bg-[#253252] text-slate-200 rounded-xl text-xs font-semibold transition border border-[#2a385c] active:scale-95"
                    >
                        <SwitchCamera className="w-3.5 h-3.5 text-[#4F8EF7]" />
                        <span className="text-[11px] font-mono">{facingMode === 'environment' ? 'Flip to Front' : 'Flip to Back'}</span>
                    </button>

                    {/* Restart Camera */}
                    <button
                        type="button"
                        onClick={() => startCamera(selectedCamRef.current || null, facingModeRef.current)}
                        title="Restart Camera Stream"
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#1a2540] transition border border-transparent hover:border-[#1a2540]"
                    >
                        <RefreshCw className={`w-4 h-4 ${initializing ? 'animate-spin text-[#4F8EF7]' : ''}`} />
                    </button>

                    {/* Close */}
                    <button
                        type="button"
                        onClick={() => { stopCamera(); onClose(); }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-red-500/20 hover:text-red-300 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Error Notifications */}
                {errorMsg === 'CAMERA_DENIED' && (
                    <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                            <AlertCircle className="w-4 h-4" />
                            <span>Camera Permission Blocked</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            Tap the <strong>🔒 lock / settings icon</strong> in your mobile browser address bar and select <strong>Camera → Allow</strong>, then tap Retry below.
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
                            Restart (Back Lens)
                        </button>
                    </div>
                )}

                {errorMsg === 'NO_CAMERA' && (
                    <div className="p-3 bg-[#151c2e] border border-[#1a2540] rounded-xl flex items-center gap-2 text-xs text-slate-300">
                        <CameraOff className="w-4 h-4 flex-shrink-0 text-slate-400" />
                        <span>No camera detected. Use manual entry or upload badge below.</span>
                    </div>
                )}

                {/* Live Camera Viewport */}
                {errorMsg !== 'NO_CAMERA' && (
                    <div className="relative w-full max-w-sm mx-auto aspect-square bg-black rounded-2xl overflow-hidden border border-[#1a2540] shadow-inner flex items-center justify-center">
                        <style>{`
                            #${containerIdRef.current} {
                                position: relative !important;
                                width: 100% !important;
                                height: 100% !important;
                                overflow: hidden !important;
                                border-radius: 1rem !important;
                            }
                            #${containerIdRef.current} video {
                                position: absolute !important;
                                top: 0 !important;
                                left: 0 !important;
                                width: 100% !important;
                                height: 100% !important;
                                object-fit: cover !important;
                                border-radius: 1rem !important;
                                display: block !important;
                                z-index: 1 !important;
                            }
                            #${containerIdRef.current} #qr-shaded-region {
                                display: none !important;
                            }
                            #${containerIdRef.current} canvas {
                                display: none !important;
                            }
                        `}</style>

                        <div id={containerIdRef.current} className="w-full h-full" />
                        <div id={`temp-${containerIdRef.current}`} className="hidden" />

                        {/* Scanner Reticle Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                            <div className="w-48 h-48 border-2 border-[#0073BB]/60 rounded-2xl relative shadow-2xl">
                                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#4F8EF7] rounded-tl" />
                                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#4F8EF7] rounded-tr" />
                                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#4F8EF7] rounded-bl" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#4F8EF7] rounded-br" />
                                
                                {scanning && !isPausedState && (
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#4F8EF7] to-transparent animate-bounce opacity-80" />
                                )}
                            </div>
                        </div>

                        {/* Paused State Overlay */}
                        {isPausedState && (
                            <div className="absolute inset-0 bg-[#0C111D]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center animate-fade-in">
                                <div className="w-12 h-12 rounded-full bg-[#0073BB]/20 border border-[#0073BB]/40 flex items-center justify-center text-[#4F8EF7]">
                                    <Pause className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-bold text-white block">Scanner Paused</span>
                                    <span className="text-xs text-slate-300 font-mono block">
                                        Review attendee details below.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={resumeScanner}
                                    className="px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/80 text-white rounded-xl text-xs font-bold transition shadow-lg"
                                >
                                    Resume Scanner
                                </button>
                            </div>
                        )}

                        {/* Success Badge Popover */}
                        {lastScanSuccess && !isPausedState && (
                            <div className="absolute inset-x-4 bottom-4 py-2 px-3 bg-emerald-950/90 border border-emerald-500 rounded-xl flex items-center gap-2 text-emerald-200 text-xs font-bold animate-fade-in shadow-xl backdrop-blur-md">
                                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span className="truncate">Scanned: {lastScanSuccess}</span>
                            </div>
                        )}

                        {/* Loading / Starting Indicator */}
                        {initializing && (
                            <div className="absolute inset-0 bg-[#0C111D]/80 flex flex-col items-center justify-center gap-2">
                                <RefreshCw className="w-6 h-6 text-[#0073BB] animate-spin" />
                                <span className="text-xs text-slate-300 font-medium">Opening camera...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Multiple Camera Selection Dropdown */}
                {cameras.length > 1 && (
                    <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-slate-400 font-medium">Select Lens:</span>
                        <select
                            value={selectedCam}
                            onChange={(e) => handleSelectCamera(e.target.value)}
                            className="bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#0073BB] max-w-[220px] truncate"
                        >
                            <option value="">Auto ({facingMode === 'environment' ? 'Back Lens' : 'Front Lens'})</option>
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

                {/* Manual Ticket / QR Code Entry */}
                <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase px-1">
                        <span>Manual Lookup</span>
                        <span>Name, Booking ID, or Token</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="Type attendee name, email, or code..."
                            className="flex-1 bg-[#151c2e] border border-[#1a2540] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#0073BB]"
                        />
                        <button
                            type="submit"
                            disabled={!manualCode.trim()}
                            className="px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/80 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                        >
                            <span>Lookup</span>
                        </button>
                    </div>
                </form>

                {/* File Upload Option */}
                <div className="flex items-center justify-between border-t border-[#1a2540] pt-3 px-1">
                    <span className="text-xs text-slate-400">Or scan image from gallery</span>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151c2e] hover:bg-[#1a2540] border border-[#1a2540] text-slate-200 text-xs rounded-xl cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5 text-[#4F8EF7]" />
                        <span>{fileProcessing ? 'Analyzing...' : 'Upload Image'}</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>
            </div>
        </div>
    );
});

export default InlineQRScanner;