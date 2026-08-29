'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Upload, Search, Zap, AlertCircle } from 'lucide-react';
import { parseScannedQR } from '@/lib/onepass/qr';

export default function QRScannerModal({ isOpen, onClose, onScan, title = 'Scan QR Code' }) {
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [fileProcessing, setFileProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            Html5Qrcode.getCameras().then((devices) => {
                if (devices && devices.length) {
                    setCameras(devices);
                    const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
                    setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
                }
            }).catch(err => {
                console.error("No camera found", err);
                setErrorMsg("No camera devices detected. You can use manual entry or file upload.");
            });
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && selectedCameraId && !isScanning) {
            startCamera(selectedCameraId);
        }
    }, [isOpen, selectedCameraId]);

    const startCamera = async (cameraId) => {
        try {
            setErrorMsg('');
            if (html5QrCodeRef.current) {
                await stopCamera();
            }

            const qrCodeScanner = new Html5Qrcode('qr-reader-viewport');
            html5QrCodeRef.current = qrCodeScanner;

            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await qrCodeScanner.start(
                cameraId,
                config,
                (decodedText) => {
                    playBeep();
                    const clean = parseScannedQR(decodedText);
                    if (clean) {
                        onScan(clean);
                        stopCamera();
                    }
                },
                (errorMessage) => {
                    // Suppress scan frame noise
                }
            );

            setIsScanning(true);
        } catch (err) {
            console.error("Camera start error:", err);
            setErrorMsg("Could not access camera stream. Please allow camera permissions in browser.");
            setIsScanning(false);
        }
    };

    const stopCamera = async () => {
        if (html5QrCodeRef.current && isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error("Camera stop error:", err);
            } finally {
                setIsScanning(false);
            }
        }
    };

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
                onScan(clean);
            } else {
                setErrorMsg("No valid OnePass QR token recognized in the image.");
            }
        } catch (err) {
            setErrorMsg("Could not decode QR code from the uploaded image.");
        } finally {
            setFileProcessing(false);
        }
    };

    const playBeep = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5 beep
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            // Audio context not allowed without interaction
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const clean = parseScannedQR(manualCode);
        if (clean) {
            playBeep();
            onScan(clean);
            setManualCode('');
        } else {
            setErrorMsg('Please enter a valid QR token or booking code.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg bg-[#151c2e] border border-[#1a2540] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2540] bg-[#0C111D]/80">
                    <div className="flex items-center space-x-2">
                        <Camera className="w-5 h-5 text-[#0073BB]" />
                        <h2 className="font-bold text-white text-base">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#151c2e] transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {errorMsg && (
                        <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Camera Stream Viewport */}
                    <div className="relative w-full aspect-square max-w-[320px] mx-auto bg-black rounded-2xl overflow-hidden border border-[#1a2540] shadow-inner flex items-center justify-center">
                        <div id="qr-reader-viewport" className="w-full h-full" />
                        <div id="qr-reader-file-temp" className="hidden" />

                        {/* Visual Scanning Reticle Frame */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-[#0073BB] rounded-xl relative animate-pulse">
                                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#4F8EF7]" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#4F8EF7]" />
                                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#4F8EF7]" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#4F8EF7]" />
                            </div>
                        </div>
                    </div>

                    {/* Camera Selector */}
                    {cameras.length > 1 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Camera Source:</span>
                            <select
                                value={selectedCameraId}
                                onChange={(e) => setSelectedCameraId(e.target.value)}
                                className="bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#0073BB]"
                            >
                                {cameras.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label || `Camera ${c.id.slice(0, 5)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Fallback 1: Manual Code Entry */}
                    <form onSubmit={handleManualSubmit} className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Manual Code Entry</span>
                            <span className="font-mono text-[10px]">e.g. SCD26-A1B2-C3D4</span>
                        </div>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Paste or type QR token / Booking ID"
                                className="flex-1 bg-[#0C111D] border border-[#1a2540] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#0073BB]"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white rounded-xl text-xs font-semibold"
                            >
                                Submit
                            </button>
                        </div>
                    </form>

                    {/* Fallback 2: Image File Upload */}
                    <div className="pt-2 border-t border-[#1a2540] flex items-center justify-between">
                        <span className="text-xs text-slate-400">Or upload QR badge image</span>
                        <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0C111D] hover:bg-[#1a2540] border border-[#1a2540] text-slate-200 text-xs rounded-xl cursor-pointer transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{fileProcessing ? 'Reading...' : 'Upload Image'}</span>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
