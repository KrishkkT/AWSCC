import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

export const generateCertificatePDF = async (certElement, fileName = "certificate.pdf") => {
    const canvas = await html2canvas(certElement, {
        scale: 4, // Higher scale for print quality
        useCORS: true,
        backgroundColor: null
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, (pdf.internal.pageSize.getHeight() - pdfHeight) / 2, pdfWidth, pdfHeight);
    pdf.save(fileName);
};
