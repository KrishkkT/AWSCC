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
 * Default Certificate Typography & Layout settings
 */
export const DEFAULT_CERT_LAYOUT = {
    nameSize: 100,     // % scale
    nameY: 56.5,       // % from top (0-100)
    introSize: 100,    // % scale
    introY: 65.5,      // % from top (0-100)
    titleSize: 100,    // % scale
    titleY: 71.5       // % from top (0-100)
};

/**
 * Splits text into lines wrapped within maxWidth using pdf-lib font.
 */
function wrapTextPdf(text, maxWidth, font, fontSize) {
    if (!text) return [];
    const words = String(text).trim().split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

/**
 * Splits text into lines wrapped within maxWidth using 2D Canvas context.
 */
function wrapTextCanvas(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).trim().split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

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
 * Generates certificate PDF bytes with customizable layout and typography.
 */
export const generateCertificatePDFBytes = async (certData, customLayout = null) => {
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

    // 3. Resolve Dynamic Text and Layout
    const { introText, eventName: eventTitle } = parseCertificateEvent(certData);
    const recipientName = (certData.recipient_name || "Recipient").toUpperCase();

    const activeLayout = {
        nameSize: customLayout?.nameSize ?? certData?.layout?.nameSize ?? DEFAULT_CERT_LAYOUT.nameSize,
        nameY: customLayout?.nameY ?? certData?.layout?.nameY ?? DEFAULT_CERT_LAYOUT.nameY,
        introSize: customLayout?.introSize ?? certData?.layout?.introSize ?? DEFAULT_CERT_LAYOUT.introSize,
        introY: customLayout?.introY ?? certData?.layout?.introY ?? DEFAULT_CERT_LAYOUT.introY,
        titleSize: customLayout?.titleSize ?? certData?.layout?.titleSize ?? DEFAULT_CERT_LAYOUT.titleSize,
        titleY: customLayout?.titleY ?? certData?.layout?.titleY ?? DEFAULT_CERT_LAYOUT.titleY
    };

    // Right column horizontal center & width budget (42% width)
    const centerX = width * 0.75;
    const maxTextWidth = width * 0.42;

    // 1. Recipient Name Layout & Multi-line Wrapping
    let baseNameSize = Math.round(84 * (activeLayout.nameSize / 100));
    let nameLines = wrapTextPdf(recipientName, maxTextWidth, fontMonoBold, baseNameSize);
    while (nameLines.length > 2 && baseNameSize > 32) {
        baseNameSize -= 4;
        nameLines = wrapTextPdf(recipientName, maxTextWidth, fontMonoBold, baseNameSize);
    }
    const nameLineHeight = baseNameSize * 1.15;
    const nameCenterY = height * (1 - (activeLayout.nameY / 100));
    const startNameY = nameCenterY + ((nameLines.length - 1) * nameLineHeight) / 2;

    nameLines.forEach((line, index) => {
        const lineWidth = fontMonoBold.widthOfTextAtSize(line, baseNameSize);
        firstPage.drawText(line, {
            x: centerX - lineWidth / 2,
            y: startNameY - index * nameLineHeight,
            size: baseNameSize,
            font: fontMonoBold,
            color: rgb(1, 1, 1),
        });
    });

    // 2. Custom Intro Text Layout & Multi-line Wrapping
    let baseIntroSize = Math.round(24 * (activeLayout.introSize / 100));
    let introLines = wrapTextPdf(introText, maxTextWidth, fontMono, baseIntroSize);
    while (introLines.length > 3 && baseIntroSize > 14) {
        baseIntroSize -= 2;
        introLines = wrapTextPdf(introText, maxTextWidth, fontMono, baseIntroSize);
    }
    const introLineHeight = baseIntroSize * 1.25;
    const introCenterY = height * (1 - (activeLayout.introY / 100));
    const startIntroY = introCenterY + ((introLines.length - 1) * introLineHeight) / 2;

    introLines.forEach((line, index) => {
        const lineWidth = fontMono.widthOfTextAtSize(line, baseIntroSize);
        firstPage.drawText(line, {
            x: centerX - lineWidth / 2,
            y: startIntroY - index * introLineHeight,
            size: baseIntroSize,
            font: fontMono,
            color: rgb(0.9, 0.9, 0.9),
        });
    });

    // 3. Event Title Layout & Multi-line Wrapping
    let baseTitleSize = Math.round(32 * (activeLayout.titleSize / 100));
    let titleLines = wrapTextPdf(eventTitle, maxTextWidth, fontMonoBold, baseTitleSize);
    while (titleLines.length > 3 && baseTitleSize > 16) {
        baseTitleSize -= 2;
        titleLines = wrapTextPdf(eventTitle, maxTextWidth, fontMonoBold, baseTitleSize);
    }
    const titleLineHeight = baseTitleSize * 1.25;
    const titleCenterY = height * (1 - (activeLayout.titleY / 100));
    const startTitleY = titleCenterY + ((titleLines.length - 1) * titleLineHeight) / 2;

    titleLines.forEach((line, index) => {
        const lineWidth = fontMonoBold.widthOfTextAtSize(line, baseTitleSize);
        firstPage.drawText(line, {
            x: centerX - lineWidth / 2,
            y: startTitleY - index * titleLineHeight,
            size: baseTitleSize,
            font: fontMonoBold,
            color: rgb(1, 1, 1),
        });
    });

    return await pdfDoc.save();
};

/**
 * Generates a high-quality certificate PDF Blob.
 */
export const generateCertificatePDFBlob = async (certData, customLayout = null) => {
    const pdfBytes = await generateCertificatePDFBytes(certData, customLayout);
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Generates a high-quality certificate image (PNG Blob) by rendering onto high-res canvas.
 */
export const generateCertificateImageBlob = async (certData, customLayout = null) => {
    if (!certData) return null;

    const { introText, eventName: eventTitle } = parseCertificateEvent(certData);
    const recipientName = (certData.recipient_name || "Recipient").toUpperCase();

    const activeLayout = {
        nameSize: customLayout?.nameSize ?? certData?.layout?.nameSize ?? DEFAULT_CERT_LAYOUT.nameSize,
        nameY: customLayout?.nameY ?? certData?.layout?.nameY ?? DEFAULT_CERT_LAYOUT.nameY,
        introSize: customLayout?.introSize ?? certData?.layout?.introSize ?? DEFAULT_CERT_LAYOUT.introSize,
        introY: customLayout?.introY ?? certData?.layout?.introY ?? DEFAULT_CERT_LAYOUT.introY,
        titleSize: customLayout?.titleSize ?? certData?.layout?.titleSize ?? DEFAULT_CERT_LAYOUT.titleSize,
        titleY: customLayout?.titleY ?? certData?.layout?.titleY ?? DEFAULT_CERT_LAYOUT.titleY
    };

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
    const maxTextWidth = canvas.width * 0.42;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Recipient Name
    ctx.fillStyle = '#ffffff';
    let baseNameSize = Math.round((canvas.width * 0.035) * (activeLayout.nameSize / 100));
    ctx.font = `bold ${baseNameSize}px "Courier New", Courier, monospace`;
    let nameLines = wrapTextCanvas(ctx, recipientName, maxTextWidth);
    while (nameLines.length > 2 && baseNameSize > 32) {
        baseNameSize -= 4;
        ctx.font = `bold ${baseNameSize}px "Courier New", Courier, monospace`;
        nameLines = wrapTextCanvas(ctx, recipientName, maxTextWidth);
    }
    const nameLineHeight = baseNameSize * 1.15;
    const nameCenterY = canvas.height * (activeLayout.nameY / 100);
    const startNameY = nameCenterY - ((nameLines.length - 1) * nameLineHeight) / 2;

    nameLines.forEach((line, index) => {
        ctx.fillText(line, centerX, startNameY + index * nameLineHeight);
    });

    // 2. Intro Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    let baseIntroSize = Math.round((canvas.width * 0.010) * (activeLayout.introSize / 100));
    ctx.font = `${baseIntroSize}px "Courier New", Courier, monospace`;
    let introLines = wrapTextCanvas(ctx, introText, maxTextWidth);
    while (introLines.length > 3 && baseIntroSize > 14) {
        baseIntroSize -= 2;
        ctx.font = `${baseIntroSize}px "Courier New", Courier, monospace`;
        introLines = wrapTextCanvas(ctx, introText, maxTextWidth);
    }
    const introLineHeight = baseIntroSize * 1.25;
    const introCenterY = canvas.height * (activeLayout.introY / 100);
    const startIntroY = introCenterY - ((introLines.length - 1) * introLineHeight) / 2;

    introLines.forEach((line, index) => {
        ctx.fillText(line, centerX, startIntroY + index * introLineHeight);
    });

    // 3. Event Title
    ctx.fillStyle = '#ffffff';
    let baseTitleSize = Math.round((canvas.width * 0.013) * (activeLayout.titleSize / 100));
    ctx.font = `bold ${baseTitleSize}px "Courier New", Courier, monospace`;
    let titleLines = wrapTextCanvas(ctx, eventTitle, maxTextWidth);
    while (titleLines.length > 3 && baseTitleSize > 16) {
        baseTitleSize -= 2;
        ctx.font = `bold ${baseTitleSize}px "Courier New", Courier, monospace`;
        titleLines = wrapTextCanvas(ctx, eventTitle, maxTextWidth);
    }
    const titleLineHeight = baseTitleSize * 1.25;
    const titleCenterY = canvas.height * (activeLayout.titleY / 100);
    const startTitleY = titleCenterY - ((titleLines.length - 1) * titleLineHeight) / 2;

    titleLines.forEach((line, index) => {
        ctx.fillText(line, centerX, startTitleY + index * titleLineHeight);
    });

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
    });
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

