import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const generateProfessionalReport = async (data, title = "System Report") => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Cover Page
    doc.setFillColor(11, 83, 148); // Brand Navy
    doc.rect(0, 0, width, height, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.text("AWS CLOUD CLUB", width / 2, height / 3, { align: 'center' });

    doc.setFontSize(20);
    doc.text("DDU Nadiad Chapter", width / 2, height / 3 + 15, { align: 'center' });

    doc.setFontSize(25);
    doc.text(title.toUpperCase(), width / 2, height / 2, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.text(`Generated on ${dateStr}`, width / 2, height - 30, { align: 'center' });

    // New Page: Summary
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, width, height, 'F');

    doc.setTextColor(11, 83, 148);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("Executive Summary", 20, 30);

    doc.setDrawColor(0, 194, 255); // Brand Cyan
    doc.setLineWidth(1);
    doc.line(20, 35, width - 20, 35);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    let yPos = 50;
    doc.text(`This report provides a comprehensive overview of the ${title} for the AWS Cloud Club at DDU.`, 20, yPos);
    yPos += 20;

    // Stats Section
    doc.setFont('helvetica', 'bold');
    doc.text("Core Metrics:", 20, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    Object.entries(data).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 30, yPos);
        yPos += 8;
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`AWS Cloud Club DDU - ${title} - Page ${i} of ${pageCount}`, width / 2, height - 10, { align: 'center' });
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
        // 1. Fetch the template PDF
        const response = await fetch('/templates/attendee_template.pdf');
        if (!response.ok) throw new Error("Template not found");
        const existingPdfBytes = await response.arrayBuffer();

        // 2. Load the PDF
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // 3. Draw Dynamic Text - FINAL CALIBRATION
        // Coordinates restored to better matching positions based on user feedback

        // Recipient Name - UPPERCASE & BOLD
        const recipientName = (certData.recipient_name || "Recipient").toUpperCase();
        const nameFontSize = 38;
        const nameTextWidth = font.widthOfTextAtSize(recipientName, nameFontSize);
        firstPage.drawText(recipientName, {
            x: (width - nameTextWidth) / 2,
            y: height * 0.52, // Positioned at ~46% from top
            size: nameFontSize,
            font: font,
            color: rgb(0.77, 0.63, 0.35), // Authentic Gold #C5A059
        });

        // Event Title - Centering & Positioning
        const eventTitle = certData.event_name || certData.events?.title || "AWS Event";
        const eventFontSize = 18;
        const eventTextWidth = font.widthOfTextAtSize(eventTitle, eventFontSize);
        firstPage.drawText(eventTitle, {
            x: (width - eventTextWidth) / 2,
            y: height * 0.38, // Positioned at ~62% from top
            size: eventFontSize,
            font: font,
            color: rgb(0.54, 0.45, 0.33), // Muted Gold #8B7355
        });

        // Date of Issue Label
        firstPage.drawText("DATE OF ISSUE", {
            x: width * 0.85,
            y: height * 0.20,
            size: 7,
            font: font,
            color: rgb(0.77, 0.63, 0.35), // Gold label
        });

        // Date Value
        const eventDate = certData.events?.start_time || certData.events?.date || certData.created_at || Date.now();
        const dateStr = new Date(eventDate).toLocaleDateString('en-US', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        firstPage.drawText(dateStr, {
            x: width * 0.84,
            y: height * 0.18,
            size: 10,
            font: font,
            color: rgb(0.1, 0.1, 0.1),
        });

        // Verification ID Label
        firstPage.drawText("VERIFICATION ID", {
            x: width * 0.85,
            y: height * 0.15,
            size: 7,
            font: font,
            color: rgb(0.77, 0.63, 0.35),
        });

        // Verification ID Value
        const certId = (certData.id || "VERIFY-ID").substring(0, 12).toUpperCase();
        firstPage.drawText(certId, {
            x: width * 0.85,
            y: height * 0.13,
            size: 8,
            font: font,
            color: rgb(0.1, 0.1, 0.1),
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
