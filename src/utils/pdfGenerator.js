import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateProfessionalReport = async (data, title = "System Report", chartImages = []) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // COLOR PALETTE
    const brandNavy = [11, 83, 148];
    const brandCyan = [0, 194, 255];
    const textDark = [40, 40, 40];
    const textGray = [100, 100, 100];
    const bgLight = [248, 250, 252];

    // ================= PAGE 1: COVER PAGE =================
    doc.setFillColor(...brandNavy);
    doc.rect(0, 0, width, height, 'F');

    doc.setFillColor(...brandCyan);
    doc.rect(0, 0, width, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(48);
    doc.text("AWS", width / 2, height / 3 - 20, { align: 'center' });
    doc.setFontSize(28);
    doc.setFont('helvetica', 'normal');
    doc.text("Cloud Club DDU", width / 2, height / 3, { align: 'center' });

    doc.setFillColor(255, 255, 255);
    doc.rect(20, height / 2 - 30, width - 40, 60, 'F');
    doc.setTextColor(...brandNavy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(title.toUpperCase(), width / 2, height / 2, { align: 'center' });
    doc.setDrawColor(...brandCyan);
    doc.setLineWidth(2);
    doc.line(width / 2 - 40, height / 2 + 10, width / 2 + 40, height / 2 + 10);

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`DATE GENERATED: ${dateStr.toUpperCase()}`, width / 2, height - 40, { align: 'center' });
    doc.text(`CONFIDENTIAL - INTERNAL USE ONLY`, width / 2, height - 30, { align: 'center' });

    // ================= PAGE 2: DATA & INSIGHTS =================
    doc.addPage();
    doc.setFillColor(...bgLight);
    doc.rect(0, 0, width, height, 'F');

    doc.setFillColor(...brandNavy);
    doc.rect(0, 0, width, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text("EXECUTIVE REPORT", 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, width - 20, 25, { align: 'right' });

    doc.setTextColor(...textDark);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Core Metrics & Data Analysis", 20, 60);
    doc.setDrawColor(...brandCyan);
    doc.setLineWidth(1);
    doc.line(20, 65, 80, 65);

    let yPos = 85;

    doc.setFontSize(11);
    Object.entries(data).forEach(([key, value]) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPos - 8, width - 40, 16, 'F');

        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(20, yPos + 8, width - 20, yPos + 8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textDark);
        doc.text(key.toUpperCase(), 25, yPos + 2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textGray);

        const valStr = String(value);
        const splitText = doc.splitTextToSize(valStr, width - 120);
        doc.text(splitText, 100, yPos + 2);

        yPos += 16 + (splitText.length > 1 ? (splitText.length - 1) * 5 : 0);

        if (yPos > height - 40) {
            doc.addPage();
            doc.setFillColor(...bgLight);
            doc.rect(0, 0, width, height, 'F');
            yPos = 30;
        }
    });

    // ================= PAGE 3: CHARTS =================
    if (chartImages && chartImages.length > 0) {
        doc.addPage();
        doc.setFillColor(...bgLight);
        doc.rect(0, 0, width, height, 'F');

        doc.setFillColor(...brandNavy);
        doc.rect(0, 0, width, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text("VISUAL ANALYTICS", 20, 25);

        let chartY = 60;
        chartImages.forEach((imgData, index) => {
            if (chartY + 100 > height - 30) {
                doc.addPage();
                doc.setFillColor(...bgLight);
                doc.rect(0, 0, width, height, 'F');
                chartY = 30;
            }

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.5);
            doc.rect(20, chartY, width - 40, 100, 'FD');

            doc.addImage(imgData, 'PNG', 25, chartY + 5, 160, 90);

            chartY += 120;
        });
    }

    // ================= FOOTER =================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, height - 20, width - 20, height - 20);

        doc.text(`AWS SBG DDU Admin Report`, 20, height - 12);
        doc.text(`Page ${i} of ${pageCount}`, width - 20, height - 12, { align: 'right' });
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

/**
 * Default Certificate Typography & Layout settings
 * Pre-tuned so long names fit single-line and multiline titles breathe nicely
 */
export const DEFAULT_CERT_LAYOUT = {
    nameSize: 85,      // % scale (85% fits long recipient names cleanly on a single line)
    nameY: 56.0,       // % from top (0-100)
    introSize: 100,    // % scale
    introY: 64.5,      // % from top (0-100)
    titleSize: 100,    // % scale
    titleY: 70.5       // % from top (0-100)
};

/**
 * Parses certificate record or event string to extract intro text, event title, and stored layout metadata.
 * Format support: "introText:::eventName" or "introText:::eventName:::layoutJson" or separate fields.
 */
export function parseCertificateEvent(certOrEventName, fallbackIntro = "for successfully attending the") {
    let raw = '';
    let directIntro = null;
    let explicitLayout = null;

    if (certOrEventName && typeof certOrEventName === 'object') {
        raw = certOrEventName.event_name || certOrEventName.events?.title || '';
        directIntro = certOrEventName.intro_text || certOrEventName.introText;
        if (certOrEventName.layout && typeof certOrEventName.layout === 'object') {
            explicitLayout = certOrEventName.layout;
        }
    } else if (typeof certOrEventName === 'string') {
        raw = certOrEventName;
    }

    if (!raw) {
        return {
            introText: directIntro || fallbackIntro,
            eventName: "AWS Community Event",
            layout: explicitLayout || null
        };
    }

    if (raw.includes(':::')) {
        const parts = raw.split(':::');
        let introText = parts[0].trim() || fallbackIntro;
        let eventName = '';
        let layout = explicitLayout || null;

        if (parts.length >= 3) {
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart.startsWith('{') && lastPart.endsWith('}')) {
                try {
                    layout = { ...(layout || {}), ...JSON.parse(lastPart) };
                    eventName = parts.slice(1, parts.length - 1).join(':::').trim();
                } catch (e) {
                    eventName = parts.slice(1).join(':::').trim();
                }
            } else {
                eventName = parts.slice(1).join(':::').trim();
            }
        } else {
            eventName = parts[1].trim();
        }

        return {
            introText: directIntro || introText || fallbackIntro,
            eventName: eventName || "AWS Community Event",
            layout
        };
    }

    return {
        introText: directIntro || fallbackIntro,
        eventName: raw || "AWS Community Event",
        layout: explicitLayout || null
    };
}

/**
 * Renders a pixel-perfect high-resolution (2475 x 1912.5) certificate canvas using DOM rendering.
 * Matches 100% with the CertificateTemplate component on screen.
 */
export const renderCertificateCanvas = async (certData, customLayout = null) => {
    if (typeof window === 'undefined') return null;

    const parsed = parseCertificateEvent(certData);
    const { introText, eventName, layout: parsedLayout } = parsed;
    const recipientName = (certData.recipient_name || "Recipient").toUpperCase();

    const activeLayout = {
        nameSize: customLayout?.nameSize ?? certData?.layout?.nameSize ?? parsedLayout?.nameSize ?? DEFAULT_CERT_LAYOUT.nameSize,
        nameY: customLayout?.nameY ?? certData?.layout?.nameY ?? parsedLayout?.nameY ?? DEFAULT_CERT_LAYOUT.nameY,
        introSize: customLayout?.introSize ?? certData?.layout?.introSize ?? parsedLayout?.introSize ?? DEFAULT_CERT_LAYOUT.introSize,
        introY: customLayout?.introY ?? certData?.layout?.introY ?? parsedLayout?.introY ?? DEFAULT_CERT_LAYOUT.introY,
        titleSize: customLayout?.titleSize ?? certData?.layout?.titleSize ?? parsedLayout?.titleSize ?? DEFAULT_CERT_LAYOUT.titleSize,
        titleY: customLayout?.titleY ?? certData?.layout?.titleY ?? parsedLayout?.titleY ?? DEFAULT_CERT_LAYOUT.titleY
    };

    // Off-screen full-resolution rendering container (2475 x 1912.5)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.width = '2475px';
    container.style.height = '1912.5px';
    container.style.zIndex = '-99999';
    container.style.overflow = 'hidden';
    container.style.backgroundColor = '#070b12';
    container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    container.style.boxSizing = 'border-box';

    const namePx = ((activeLayout.nameSize / 100) * 3.15 * 24.75).toFixed(2);
    const introPx = ((activeLayout.introSize / 100) * 1.05 * 24.75).toFixed(2);
    const titlePx = ((activeLayout.titleSize / 100) * 1.30 * 24.75).toFixed(2);

    container.innerHTML = `
        <div style="position:relative;width:2475px;height:1912.5px;overflow:hidden;background-color:#070b12;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;box-sizing:border-box;">
            <img src="/templates/attendee_template_blue.jpg" style="position:absolute;top:0;left:0;width:2475px;height:1912.5px;object-fit:contain;z-index:0;" />
            <div style="position:absolute;inset:0;z-index:10;pointer-events:none;width:2475px;height:1912.5px;">
                <div style="position:absolute;left:54%;top:${activeLayout.nameY}%;width:42%;text-align:center;padding:0 16px;display:flex;align-items:center;justify-content:center;transform:translateY(-50%);box-sizing:border-box;">
                    <h1 style="color:#ffffff;font-weight:700;text-transform:uppercase;letter-spacing:-0.01em;line-height:1.1;text-shadow:0 2px 4px rgba(0,0,0,0.5);text-align:center;max-width:100%;word-break:break-word;margin:0;font-size:${namePx}px;font-family:inherit;">
                        ${recipientName}
                    </h1>
                </div>
                <div style="position:absolute;left:54%;top:${activeLayout.introY}%;width:42%;text-align:center;padding:0 16px;display:flex;align-items:center;justify-content:center;transform:translateY(-50%);box-sizing:border-box;">
                    <p style="color:rgba(255,255,255,0.9);font-weight:500;letter-spacing:0;line-height:1.25;text-shadow:0 2px 4px rgba(0,0,0,0.5);text-align:center;max-width:100%;word-break:break-word;margin:0;font-size:${introPx}px;font-family:inherit;">
                        ${introText}
                    </p>
                </div>
                <div style="position:absolute;left:54%;top:${activeLayout.titleY}%;width:42%;text-align:center;padding:0 16px;display:flex;align-items:center;justify-content:center;transform:translateY(-50%);box-sizing:border-box;">
                    <p style="color:#ffffff;font-weight:700;letter-spacing:0;line-height:1.25;text-shadow:0 2px 4px rgba(0,0,0,0.5);text-align:center;max-width:100%;word-break:break-word;margin:0;font-size:${titlePx}px;font-family:inherit;">
                        ${eventName}
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    const img = container.querySelector('img');
    if (img && !img.complete) {
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    }

    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }

    try {
        const target = container.firstElementChild || container;
        const canvas = await html2canvas(target, {
            scale: 1,
            width: 2475,
            height: 1912.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#070b12',
            logging: false,
            imageTimeout: 15000
        });
        return canvas;
    } finally {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
};

/**
 * Generates a high-quality certificate image (PNG Blob) identical to preview.
 */
export const generateCertificateImageBlob = async (certData, customLayout = null) => {
    if (!certData) return null;
    const canvas = await renderCertificateCanvas(certData, customLayout);
    if (!canvas) throw new Error("Failed to render certificate canvas");

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create PNG blob"));
        }, 'image/png', 0.98);
    });
};

/**
 * Generates a high-quality certificate PDF Blob identical to preview.
 */
export const generateCertificatePDFBlob = async (certData, customLayout = null) => {
    if (!certData) return null;
    const canvas = await renderCertificateCanvas(certData, customLayout);
    if (!canvas) throw new Error("Failed to render certificate canvas");

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [2475, 1912.5],
        hotfixes: ['px_scaling']
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgData, 'JPEG', 0, 0, 2475, 1912.5);

    return pdf.output('blob');
};

/**
 * Generates certificate PDF bytes for compatibility.
 */
export const generateCertificatePDFBytes = async (certData, customLayout = null) => {
    const blob = await generateCertificatePDFBlob(certData, customLayout);
    if (!blob) return null;
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
};

/**
 * Generates and downloads a high-quality certificate PDF.
 */
export const generateCertificatePDF = async (certData, customLayout = null) => {
    if (!certData) return;

    try {
        const blob = await generateCertificatePDFBlob(certData, customLayout);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificate-${(certData.recipient_name || "Credential").replace(/\s+/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Certificate PDF Generation failed:", err);
        throw err;
    }
};
