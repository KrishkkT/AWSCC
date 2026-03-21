"use client";

import { Award, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function CertificateTemplate({
    recipientName = "John Doe",
    eventName = "AWS Cloud Day",
    date = new Date().toLocaleDateString(),
    type = "participation",
    certificateId = "CERT-12345"
}) {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const templateUrl = "/templates/attendee_template.png";

    // Handle responsive scaling
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const parentWidth = containerRef.current.parentElement.offsetWidth;
                const newScale = Math.min(parentWidth / 1000, 1.2); // Cap at 1.2x on large screens
                setScale(newScale);
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    return (
        <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden py-4 bg-transparent">
            {/* The actual certificate content with dynamic scaling */}
            <div 
                id="certificate-content" 
                className="w-[1000px] h-[707px] bg-white relative overflow-hidden shadow-2xl select-none print:shadow-none origin-center shrink-0"
                style={{ 
                    transform: `scale(${scale})`,
                    margin: `calc(-1 * (707px * (1 - ${scale})) / 2) 0`
                }}
            >
                {/* Template Image Layer */}
                <img
                    src={templateUrl}
                    alt="Certificate Template"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />

                {/* Fallback Background (Only visible if img fails) */}
                <div className="hidden absolute inset-0 bg-brand-dark flex flex-col items-center justify-center p-20 z-0 text-center">
                    <div className="border-4 border-brand-cyan/20 w-full h-full rounded-2xl flex flex-col items-center justify-center">
                        <h1 className="text-white/10 text-9xl font-black rotate-[-15deg] uppercase">AWSCC DDU</h1>
                        <p className="text-white/20 font-bold uppercase tracking-widest mt-4">Template Missing</p>
                    </div>
                </div>

                {/* Dynamic Content Layers - Absolute Positioning */}
                <div className="absolute inset-0 z-10 font-serif text-brand-dark">
                    {/* Recipient Name - Precision Alignment */}
                    <div className="absolute top-[42%] left-0 w-full text-center">
                        <h1 className="text-[#C5A059] text-5xl font-black tracking-tight px-8" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                            {recipientName}
                        </h1>
                    </div>

                    {/* Event Name - Precision Alignment */}
                    <div className="absolute top-[60%] left-0 w-full text-center px-20">
                        <h2 className="text-[#8B7355] text-lg font-black uppercase tracking-[0.15em] leading-relaxed" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                            {eventName}
                        </h2>
                    </div>

                    {/* Footer Section (ID and Date) */}
                    <div className="absolute bottom-[10%] right-[8%] text-right flex flex-col items-end gap-1">
                        <div className="space-y-0.5">
                            <p className="text-[7px] text-[#C5A059] font-black uppercase tracking-widest leading-none">Date</p>
                            <p className="text-[10px] font-bold text-[#1A1A1A] leading-tight">{date}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[7px] text-[#C5A059] font-black uppercase tracking-widest leading-none">Verification ID</p>
                            <p className="text-[10px] font-bold text-[#1A1A1A] leading-tight">{certificateId}</p>
                        </div>
                    </div>

                    {/* Badge/Seal Overlay - Conditional based on type */}
                    <div className="absolute top-[10%] right-[10%] w-24 h-24 flex items-center justify-center">
                        <div className="w-full h-full rounded-full border-2 border-brand-cyan/20 bg-brand-cyan/5 blur-[2px] absolute scale-110" />
                        {type === "excellence" || type === "achievement" ? (
                            <Award size={48} className="text-brand-dark relative z-10" />
                        ) : (
                            <ShieldCheck size={48} className="text-brand-dark relative z-10" />
                        )}
                    </div>
                </div>

                <style jsx>{`
                    h1 {
                        background: linear-gradient(135deg, #C5A059 0%, #8B7355 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                `}</style>
            </div>
        </div>
    );
}
