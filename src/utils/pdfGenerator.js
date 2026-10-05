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

        doc.text(`AWS Cloud Club DDU Admin Report`, 20, height - 12);
        doc.text(`Page ${i} of ${pageCount}`, width - 20, height - 12, { align: 'right' });
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

/**
 * Generates a high-quality certificate PDF by stamping data onto a template.
 * @param {Object} certData - Certificate data (recipient_name, event_name, etc.)
 */
export const generateCertificatePDF = async (certData) => {
    if (!certData) return;

    try {
        // 1. Fetch the template PDF (Blue template)
        const templateFile = 'attendee_template_blue.pdf';
            
        const response = await fetch(`/templates/${templateFile}`);
        if (!response.ok) throw new Error(`Template not found: ${templateFile}`);
        const existingPdfBytes = await response.arrayBuffer();

        // 2. Load the PDF
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
        const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // 3. Draw Dynamic Text
        const recipientName = (certData.recipient_name || "Recipient").toUpperCase();
        const eventTitle = certData.event_name || certData.events?.title || "AWS Community Event";
        
        // Horizontal center for right column (at 75% width)
        const centerX = width * 0.75;
        const maxTextWidth = width * 0.40; // 40% column width budget

        // Dynamic font-sizing for Recipient Name (Monospace font - Larger prominent size)
        let nameFontSize = 74;
        if (recipientName.length > 25) {
            nameFontSize = 48;
        } else if (recipientName.length > 18) {
            nameFontSize = 58;
        } else if (recipientName.length > 12) {
            nameFontSize = 66;
        }

        let nameTextWidth = fontMonoBold.widthOfTextAtSize(recipientName, nameFontSize);
        while (nameTextWidth > maxTextWidth && nameFontSize > 22) {
            nameFontSize -= 2;
            nameTextWidth = fontMonoBold.widthOfTextAtSize(recipientName, nameFontSize);
        }

        // Dynamic font-sizing for Event Title (Monospace font - Smaller refined size)
        let eventFontSize = 24;
        if (eventTitle.length > 35) {
            eventFontSize = 18;
        } else if (eventTitle.length > 25) {
            eventFontSize = 21;
        }

        let eventTextWidth = fontMonoBold.widthOfTextAtSize(eventTitle, eventFontSize);
        while (eventTextWidth > maxTextWidth && eventFontSize > 14) {
            eventFontSize -= 1;
            eventTextWidth = fontMonoBold.widthOfTextAtSize(eventTitle, eventFontSize);
        }

        const introText = "for successfully attending the";
        const introFontSize = 18;
        const introTextWidth = fontMono.widthOfTextAtSize(introText, introFontSize);

        // Recipient Name - Crisp White Monospace (Centered below "Proudly present to")
        firstPage.drawText(recipientName, {
            x: centerX - nameTextWidth / 2,
            y: height * 0.380,
            size: nameFontSize,
            font: fontMonoBold,
            color: rgb(1, 1, 1),
        });

        // "for successfully attending the" - Monospace Light White
        firstPage.drawText(introText, {
            x: centerX - introTextWidth / 2,
            y: height * 0.315,
            size: introFontSize,
            font: fontMono,
            color: rgb(0.9, 0.9, 0.9),
        });

        // Event Title - Crisp White Monospace Bold (Centered below intro phrase)
        firstPage.drawText(eventTitle, {
            x: centerX - eventTextWidth / 2,
            y: height * 0.280,
            size: eventFontSize,
            font: fontMonoBold,
            color: rgb(1, 1, 1),
        });

        // 4. Save and Download
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificate-${(certData.recipient_name || "Credential").replace(/\s+/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Advanced PDF Generation failed:", err);
        throw err;
    }
};
