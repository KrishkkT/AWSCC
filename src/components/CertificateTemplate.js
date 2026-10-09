import { parseCertificateEvent, DEFAULT_CERT_LAYOUT } from "@/utils/pdfGenerator";

export default function CertificateTemplate({
    recipientName = "John Doe",
    eventName = "AWS Cloud Day",
    introText,
    date = new Date().toLocaleDateString(),
    type = "participation",
    certificateId = "CERT-12345",
    layout = {}
}) {
    const templateUrl = "/templates/attendee_template_blue.jpg";
    const parsed = parseCertificateEvent(eventName, introText || "for successfully attending the");
    const displayIntro = (eventName && typeof eventName === 'string' && eventName.includes(':::'))
        ? parsed.introText
        : (introText || parsed.introText || "for successfully attending the");
    const displayEvent = parsed.eventName || (typeof eventName === 'string' && eventName.includes(':::') ? eventName.split(':::').slice(1).join(':::').trim() : eventName);

    // Merge layout configuration with defaults (and parsed layout from certificate metadata)
    const activeLayout = {
        nameSize: layout?.nameSize ?? parsed.layout?.nameSize ?? DEFAULT_CERT_LAYOUT.nameSize,
        nameY: layout?.nameY ?? parsed.layout?.nameY ?? DEFAULT_CERT_LAYOUT.nameY,
        introSize: layout?.introSize ?? parsed.layout?.introSize ?? DEFAULT_CERT_LAYOUT.introSize,
        introY: layout?.introY ?? parsed.layout?.introY ?? DEFAULT_CERT_LAYOUT.introY,
        titleSize: layout?.titleSize ?? parsed.layout?.titleSize ?? DEFAULT_CERT_LAYOUT.titleSize,
        titleY: layout?.titleY ?? parsed.layout?.titleY ?? DEFAULT_CERT_LAYOUT.titleY
    };

    return (
        <div className="w-full flex justify-center items-center py-2 bg-transparent">
            {/* Responsive certificate canvas with container query scaling */}
            <div
                id="certificate-content"
                className="w-full max-w-[760px] aspect-[2475/1912.5] bg-[#070b12] relative overflow-hidden shadow-2xl rounded-2xl select-none border border-white/10 [container-type:inline-size]"
                style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }}
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

                {/* Dynamic Content Layers */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {/* Recipient Name - Independently positioned and sized */}
                    <div
                        className="absolute left-[54%] w-[42%] text-center px-3 flex items-center justify-center -translate-y-1/2 transition-all duration-150 box-border"
                        style={{ top: `${activeLayout.nameY}%` }}
                    >
                        <h1
                            className="text-white font-bold uppercase tracking-tight leading-[1.1] drop-shadow-md text-center max-w-full break-words m-0"
                            style={{
                                fontSize: `${(activeLayout.nameSize / 100) * 3.15}cqi`,
                                letterSpacing: "-0.01em"
                            }}
                        >
                            {recipientName}
                        </h1>
                    </div>

                    {/* Custom Intro Phrase - Independently positioned and sized */}
                    <div
                        className="absolute left-[54%] w-[42%] text-center px-3 flex items-center justify-center -translate-y-1/2 transition-all duration-150 box-border"
                        style={{ top: `${activeLayout.introY}%` }}
                    >
                        <p
                            className="text-white/90 font-medium tracking-normal leading-[1.25] drop-shadow-md text-center max-w-full break-words m-0"
                            style={{
                                fontSize: `${(activeLayout.introSize / 100) * 1.05}cqi`
                            }}
                        >
                            {displayIntro}
                        </p>
                    </div>

                    {/* Event Title - Independently positioned and sized */}
                    <div
                        className="absolute left-[54%] w-[42%] text-center px-3 flex items-center justify-center -translate-y-1/2 transition-all duration-150 box-border"
                        style={{ top: `${activeLayout.titleY}%` }}
                    >
                        <p
                            className="text-white font-bold tracking-normal leading-[1.25] drop-shadow-md text-center max-w-full break-words m-0"
                            style={{
                                fontSize: `${(activeLayout.titleSize / 100) * 1.30}cqi`
                            }}
                        >
                            {displayEvent}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}


