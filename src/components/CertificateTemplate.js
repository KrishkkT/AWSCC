"use client";

import { Award, ShieldCheck, Zap } from "lucide-react";

export default function CertificateTemplate({
    recipientName = "John Doe",
    eventName = "AWS Cloud Day",
    date = new Date().toLocaleDateString(),
    type = "participation",
    certificateId = "CERT-12345"
}) {
    // Note: PDFs cannot be rendered in <img> tags. 
    // For a visual preview, use a PNG/JPG version of the template.
    // The PDF generation logic in the issuance/verification page correctly uses the PDF template.
    const templateUrl = "/templates/attendee_template.png";

    return (
        <div id="certificate-content" className="w-[1000px] h-[707px] bg-white relative overflow-hidden shadow-2xl mx-auto select-none print:shadow-none">
            {/* Template Image Layer */}
            <img
                src={templateUrl}
                alt="Certificate Template"
                className="absolute inset-0 w-full h-full object-cover z-0"
                onError={(e) => {
                    // Fallback to stylized background if image fails to load
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
            {/* IMPORTANT: These coordinates may need adjustment based on the user's specific image template */}
            <div className="relative z-10 w-full h-full font-serif text-brand-dark">
                {/* Recipient Name */}
                <div className="absolute top-[45%] left-0 w-full text-center">
                    <h2 className="text-5xl font-black italic tracking-tight uppercase">
                        {recipientName}
                    </h2>
                </div>

                {/* Event Name */}
                <div className="absolute top-[68%] left-0 w-full text-center">
                    <h3 className="text-2xl font-bold opacity-80">
                        {eventName}
                    </h3>
                </div>

                {/* Date */}
                <div className="absolute bottom-[10%] left-[15%]">
                    <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-1">Date</p>
                    <p className="font-bold">{date}</p>
                </div>

                {/* Certificate ID */}
                <div className="absolute bottom-[10%] right-[15%] text-right">
                    <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-1">Credential ID</p>
                    <p className="text-[10px] font-bold tracking-tighter">{certificateId}</p>
                </div>

                {/* Badge/Seal Overlay */}
                <div className="absolute top-[10%] right-[10%] w-24 h-24 flex items-center justify-center">
                    <div className="w-full h-full rounded-full border-2 border-brand-cyan/20 bg-brand-cyan/5 blur-[2px] absolute scale-110" />
                    {type === "excellence" || type === "achievement" ? (
                        <Award size={48} className="text-brand-dark relative z-10" />
                    ) : (
                        <ShieldCheck size={48} className="text-brand-dark relative z-10" />
                    )}
                </div>
            </div>

            {/* Style for dynamic adjustments */}
            <style jsx>{`
                h2 {
                    font-family: 'Times New Roman', serif;
                    background: linear-gradient(135deg, #000 0%, #333 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>
        </div>
    );
}

