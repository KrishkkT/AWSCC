"use client";

export default function CertificateTemplate({
    recipientName = "John Doe",
    eventName = "AWS Cloud Day",
    date = new Date().toLocaleDateString(),
    type = "participation",
    certificateId = "CERT-12345"
}) {
    const templateUrl = "/templates/attendee_template_blue.jpg";

    return (
        <div className="w-full flex justify-center items-center py-2 bg-transparent">
            {/* Responsive certificate canvas with container query scaling */}
            <div
                id="certificate-content"
                className="w-full max-w-[760px] aspect-[3300/2550] bg-[#070b12] relative overflow-hidden shadow-2xl rounded-2xl select-none border border-white/10 [container-type:inline-size]"
            >
                {/* Template Image Layer */}
                <img
                    src={templateUrl}
                    alt="Certificate Template"
                    className="absolute inset-0 w-full h-full object-contain z-0"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                        }
                    }}
                />

                {/* Fallback Background */}
                <div className="hidden absolute inset-0 bg-brand-dark flex flex-col items-center justify-center p-8 z-0 text-center">
                    <div className="border-4 border-brand-cyan/20 w-full h-full rounded-2xl flex flex-col items-center justify-center">
                        <h1 className="text-white/10 text-6xl font-black uppercase">AWSCC DDU</h1>
                        <p className="text-white/20 font-bold uppercase tracking-widest mt-2">Template Missing</p>
                    </div>
                </div>

                {/* Dynamic Content Layers - Monospace font matching the certificate text */}
                <div className="absolute inset-0 z-10 font-mono pointer-events-none">
                    {/* Recipient Name - Precision Centered in Right Column (Increased size) */}
                    <div className="absolute top-[57.5%] left-[55%] w-[40%] text-center px-1 flex items-center justify-center">
                        <h1
                            className="text-white font-bold font-mono uppercase tracking-tight leading-tight drop-shadow-md text-center"
                            style={{
                                fontSize: "clamp(12px, 3.4cqi, 32px)",
                                letterSpacing: "-0.01em"
                            }}
                        >
                            {recipientName}
                        </h1>
                    </div>

                    {/* Event Section - "for successfully attending the" + Event Title */}
                    <div className="absolute top-[67%] left-[55%] w-[40%] text-center px-1 flex flex-col items-center justify-center">
                        <p
                            className="text-white/80 font-mono font-medium tracking-normal leading-tight drop-shadow-md text-center"
                            style={{
                                fontSize: "clamp(6px, 1.05cqi, 11px)"
                            }}
                        >
                            for successfully attending the
                        </p>
                        <p
                            className="text-white font-mono font-bold tracking-normal leading-snug drop-shadow-md text-center mt-0.5"
                            style={{
                                fontSize: "clamp(7px, 1.35cqi, 14px)"
                            }}
                        >
                            {eventName}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
