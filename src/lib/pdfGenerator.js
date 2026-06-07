import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => resolve(img);
  img.onerror = (e) => reject(e);
  img.src = url;
});

export const generateGuestVisitPDF = async (guestData) => {
  const doc = new jsPDF('p', 'pt', 'a4');

  // Load Logo Image
  let logoImg = null;
  try {
    logoImg = await loadImage('/IMG_2458.PNG');
  } catch (e) {
    console.warn("Could not load logo image", e);
  }

  // Constants
  const MARGIN = 40;
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const HEADER_HEIGHT = 140; // Space reserved for Logo & Title on every page

  // ── Header Function (Runs on every page) ─────────────────────────
  const drawHeader = (data) => {
    // Draw Logo
    let titleY = MARGIN + 25;
    if (logoImg) {
      const logoHeight = 40;
      const logoWidth = logoHeight * (logoImg.width / logoImg.height);
      doc.addImage(logoImg, 'PNG', (PAGE_WIDTH - logoWidth) / 2, MARGIN, logoWidth, logoHeight);
      titleY = MARGIN + logoHeight + 20; // push title down
    } else {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('COMPANY LOGO', PAGE_WIDTH / 2, MARGIN, { align: 'center' });
    }

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GUEST VISIT REPORT', PAGE_WIDTH / 2, titleY, { align: 'center' });

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(MARGIN, titleY + 15, PAGE_WIDTH - MARGIN, titleY + 15);
  };

  // ── 1. Draw First Page Initial Details ─────────────────────────
  drawHeader(); // Draw header manually for the first page
  let currentY = HEADER_HEIGHT; // Start below the header line

  autoTable(doc, {
    startY: currentY,
    body: [
      ['Guest Name:', guestData.guest_name, 'Picked From:', guestData.picked_from || '—'],
      ['Phone Number:', guestData.phone_number || guestData.mobile_number, 'Picked Time:', guestData.picked_time || '—'],
      ['Address:', guestData.place, 'Donation:', guestData.donation_amount ? `Rs. ${Number(guestData.donation_amount).toLocaleString('en-IN')}` : '—'],
    ],
    theme: 'plain',
    styles: { cellPadding: 2, fontSize: 10, textColor: 0 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 150 },
      2: { fontStyle: 'bold', cellWidth: 80 },
      3: { cellWidth: 150 },
    },
    margin: { left: MARGIN, right: MARGIN }
  });

  currentY = doc.lastAutoTable.finalY + 15; // Space before table

  // ── 2. Draw Table of Visited Places ──────────────────────────────
  const tableData = (guestData.visits || []).map((v, i) => [
    String(i + 1),
    String(v.visited_place || '—'),
    String(v.visit_date || '—'),
    String(v.time_in || '—'),
    String(v.time_out || '—')
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Sl No', 'Visited Place', 'Date', 'Time In', 'Time Out']],
    body: tableData,
    margin: { top: HEADER_HEIGHT, left: MARGIN, right: MARGIN },
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] }, // Emerald color
    didDrawPage: drawHeader, // Auto-draws header on new pages added by table
  });

  currentY = doc.lastAutoTable.finalY + 30;

  // Check if we need a new page for the footer section
  if (currentY + 150 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();
    currentY = HEADER_HEIGHT + 20;
  }

  // ── 3. Return Details & Remarks ──────────────────────────────────
  autoTable(doc, {
    startY: currentY,
    head: [['Return Details', '']],
    body: [
      ['Guest Returned:', guestData.guest_returned || '—'],
      ['Return Date:', guestData.return_date || '—'],
      ['Return Time:', guestData.return_time || '—'],
      ['Handled By:', guestData.handled_by || '—'],
      ['Remarks:', guestData.remarks || '—'],
    ],
    theme: 'plain',
    styles: { cellPadding: 2, fontSize: 10, textColor: 0 },
    headStyles: { fillColor: false, textColor: 0, fontStyle: 'bold', fontSize: 12 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { cellWidth: 300 },
    },
    margin: { left: MARGIN, right: MARGIN },
    didDrawCell: (data) => {
      // Draw a line under the header
      if (data.row.section === 'head' && data.column.index === 0) {
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, data.cell.y + data.cell.height - 2, PAGE_WIDTH - MARGIN, data.cell.y + data.cell.height - 2);
      }
    }
  });

  currentY = doc.lastAutoTable.finalY;

  // Check if we need a new page for signatures
  if (currentY + 100 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();
    currentY = HEADER_HEIGHT + 20;
  }

  // ── 4. Signatures & Footer ───────────────────────────────────────
  currentY += 40;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Staff Signature', MARGIN, currentY);
  
  // Signature line
  doc.setLineWidth(0.5);
  doc.line(MARGIN, currentY - 20, MARGIN + 150, currentY - 20);

  // Generated Date & Time (Bottom Right)
  const now = new Date().toLocaleString('en-IN');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated: ${now}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 30, { align: 'right' });

  // Return the PDF as a Blob so we can upload it to Supabase
  return doc.output('blob');
};
