import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jsPDF from 'jspdf';

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
    doc.text("AWS Student Builder Group", width / 2, height / 3, { align: 'center' });

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
    doc.text(`This report provides a comprehensive overview of the ${title} for the AWS Student Builder Group at DDU.`, 20, yPos);
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
        doc.text(`AWS Student Builder Group DDU - ${title} - Page ${i} of ${pageCount}`, width / 2, height - 10, { align: 'center' });
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
        const templateFile = certData.template === 'purple' 
            ? 'attendee_template_purple.pdf' 
            : 'attendee_template_green.pdf';
            
        const response = await fetch(`/templates/${templateFile}`);
        if (!response.ok) throw new Error(`Template not found: ${templateFile}`);
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
        
        // Dynamic font-sizing based on name length to prevent overlap and text clipping
        const nameLength = recipientName.length;
        let nameFontSize = 26;
        if (nameLength > 25) {
            nameFontSize = 16;
        } else if (nameLength > 18) {
            nameFontSize = 20;
        } else if (nameLength > 12) {
            nameFontSize = 23;
        }

        const nameTextWidth = font.widthOfTextAtSize(recipientName, nameFontSize);
        
        // Color selection: Green (#00B77A) for Green template, Black for Purple template
        const isGreenTemplate = certData.template !== 'purple';
        const nameColor = isGreenTemplate ? rgb(0, 0.71, 0.48) : rgb(0, 0, 0);

        firstPage.drawText(recipientName, {
            x: 762.5 - nameTextWidth / 2,
            y: height * 0.40, // Positioned on the right side below "Proudly presented to"
            size: nameFontSize,
            font: font,
            color: nameColor,
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
