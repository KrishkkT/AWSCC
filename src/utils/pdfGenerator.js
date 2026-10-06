import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
 * Parses certificate record or event string to extract intro text and event title.
 * Format support: "introText:::eventName" or separate fields.
 */
export function parseCertificateEvent(certOrEventName, fallbackIntro = "for successfully attending the") {
    if (!certOrEventName) {
        return { introText: fallbackIntro, eventName: "AWS Community Event" };
    }

    if (typeof certOrEventName === 'object') {
        const rawEvent = certOrEventName.event_name || certOrEventName.events?.title || '';
        if (typeof rawEvent === 'string' && rawEvent.includes(':::')) {
            const parts = rawEvent.split(':::');
            return {
                introText: parts[0].trim() || fallbackIntro,
                eventName: parts.slice(1).join(':::').trim() || "AWS Community Event"
            };
        }
        const directIntro = certOrEventName.intro_text || certOrEventName.introText;
        if (directIntro) {
            return {
                introText: directIntro,
                eventName: rawEvent || "AWS Community Event"
            };
        }
        return { introText: fallbackIntro, eventName: rawEvent || "AWS Community Event" };
    }

    const raw = String(certOrEventName);
    if (raw.includes(':::')) {
        const parts = raw.split(':::');
        return {
            introText: parts[0].trim() || fallbackIntro,
            eventName: parts.slice(1).join(':::').trim() || "AWS Community Event"
        };
    }

    return {
        introText: fallbackIntro,
        eventName: raw || "AWS Community Event"
    };
}

/**
 * Generates certificate PDF bytes.
 */
export const generateCertificatePDFBytes = async (certData) => {
    if (!certData) return null;

    // 1. Fetch template PDF (Blue template)
    const templateFile = 'attendee_template_blue.pdf';
    const response = await fetch(`/templates/${templateFile}`);
    if (!response.ok) throw new Error(`Template not found: ${templateFile}`);
    const existingPdfBytes = await response.arrayBuffer();

    // 2. Load PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // 3. Resolve Dynamic Text
    const { introText, eventName: eventTitle } = parseCertificateEvent(certData);
    const recipientName = (certData.recipient_name || "Recipient").toUpperCase();

    // Right column horizontal center & width budget
    const centerX = width * 0.75;
    const maxTextWidth = width * 0.40;

    // Dynamic prominent font-sizing for Recipient Name
    let nameFontSize = 96;
    if (recipientName.length > 28) {
        nameFontSize = 64;
    } else if (recipientName.length > 20) {
        nameFontSize = 76;
    } else if (recipientName.length > 14) {
        nameFontSize = 86;
    }

    let nameTextWidth = fontMonoBold.widthOfTextAtSize(recipientName, nameFontSize);
    while (nameTextWidth > maxTextWidth && nameFontSize > 36) {
        nameFontSize -= 2;
        nameTextWidth = fontMonoBold.widthOfTextAtSize(recipientName, nameFontSize);
    }

    // Dynamic prominent font-sizing for Intro Phrase
    let introFontSize = 28;
    if (introText.length > 40) {
        introFontSize = 22;
    } else if (introText.length > 30) {
        introFontSize = 25;
    }

    let introTextWidth = fontMono.widthOfTextAtSize(introText, introFontSize);
    while (introTextWidth > maxTextWidth && introFontSize > 16) {
        introFontSize -= 1;
        introTextWidth = fontMono.widthOfTextAtSize(introText, introFontSize);
    }

    // Dynamic prominent font-sizing for Event Title
    let eventFontSize = 38;
    if (eventTitle.length > 40) {
        eventFontSize = 26;
    } else if (eventTitle.length > 28) {
        eventFontSize = 32;
    }

    let eventTextWidth = fontMonoBold.widthOfTextAtSize(eventTitle, eventFontSize);
    while (eventTextWidth > maxTextWidth && eventFontSize > 18) {
        eventFontSize -= 1;
        eventTextWidth = fontMonoBold.widthOfTextAtSize(eventTitle, eventFontSize);
    }

    // Recipient Name - Bold White Monospace
    firstPage.drawText(recipientName, {
        x: centerX - nameTextWidth / 2,
        y: height * 0.415,
        size: nameFontSize,
        font: fontMonoBold,
        color: rgb(1, 1, 1),
    });

    // Custom Intro Text - Monospace Light White
    firstPage.drawText(introText, {
        x: centerX - introTextWidth / 2,
        y: height * 0.330,
        size: introFontSize,
        font: fontMono,
        color: rgb(0.9, 0.9, 0.9),
    });

    // Event Title - Bold White Monospace
    firstPage.drawText(eventTitle, {
        x: centerX - eventTextWidth / 2,
        y: height * 0.285,
        size: eventFontSize,
        font: fontMonoBold,
        color: rgb(1, 1, 1),
    });

    return await pdfDoc.save();
};

/**
 * Generates a high-quality certificate PDF Blob.
 */
export const generateCertificatePDFBlob = async (certData) => {
    const pdfBytes = await generateCertificatePDFBytes(certData);
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Generates a high-quality certificate image (PNG Blob) by rendering onto high-res canvas.
 */
export const generateCertificateImageBlob = async (certData) => {
    if (!certData) return null;

    const { introText, eventName: eventTitle } = parseCertificateEvent(certData);
    const recipientName = (certData.recipient_name || "Recipient").toUpperCase();

    const canvas = document.createElement('canvas');
    canvas.width = 2475;
    canvas.height = 1913;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/templates/attendee_template_blue.jpg';

    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load certificate template image'));
    });

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const centerX = canvas.width * 0.75;
    const maxTextWidth = canvas.width * 0.40;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Recipient Name
    ctx.fillStyle = '#ffffff';
    let nameSize = 96;
    if (recipientName.length > 28) nameSize = 64;
    else if (recipientName.length > 20) nameSize = 76;
    else if (recipientName.length > 14) nameSize = 86;

    ctx.font = `bold ${nameSize}px "Courier New", Courier, monospace`;
    let nameWidth = ctx.measureText(recipientName).width;
    while (nameWidth > maxTextWidth && nameSize > 36) {
        nameSize -= 2;
        ctx.font = `bold ${nameSize}px "Courier New", Courier, monospace`;
        nameWidth = ctx.measureText(recipientName).width;
    }
    ctx.fillText(recipientName, centerX, canvas.height * 0.585);

    // 2. Intro Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    let introSize = 28;
    if (introText.length > 40) introSize = 22;
    else if (introText.length > 30) introSize = 25;

    ctx.font = `${introSize}px "Courier New", Courier, monospace`;
    let introWidth = ctx.measureText(introText).width;
    while (introWidth > maxTextWidth && introSize > 16) {
        introSize -= 1;
        ctx.font = `${introSize}px "Courier New", Courier, monospace`;
        introWidth = ctx.measureText(introText).width;
    }
    ctx.fillText(introText, centerX, canvas.height * 0.670);

    // 3. Event Title
    ctx.fillStyle = '#ffffff';
    let eventSize = 38;
    if (eventTitle.length > 40) eventSize = 26;
    else if (eventTitle.length > 28) eventSize = 32;

    ctx.font = `bold ${eventSize}px "Courier New", Courier, monospace`;
    let eventWidth = ctx.measureText(eventTitle).width;
    while (eventWidth > maxTextWidth && eventSize > 18) {
        eventSize -= 1;
        ctx.font = `bold ${eventSize}px "Courier New", Courier, monospace`;
        eventWidth = ctx.measureText(eventTitle).width;
    }
    ctx.fillText(eventTitle, centerX, canvas.height * 0.715);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
    });
};

/**
 * Generates and downloads a high-quality certificate PDF.
 */
export const generateCertificatePDF = async (certData) => {
    if (!certData) return;

    try {
        const blob = await generateCertificatePDFBlob(certData);
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
