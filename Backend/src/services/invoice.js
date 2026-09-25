import PDFDocument from 'pdfkit';

// PDFKit's core fonts have no ₹ glyph, so amounts are printed as "Rs.".
const money = paise => `Rs. ${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Falls back to something sane until the admin fills in the Settings page,
// so an invoice never comes out blank.
const DEFAULT_SETTINGS = { companyName: 'NTSA', companyAddress: '', companyGSTIN: null, companyPhone: null, companyEmail: null, logoUrl: null };

const NAVY = '#062c41';
const TEXT = '#173b4b';
const MUTED = '#6f7f88';
const BORDER = '#dde3e7';
const DANGER = '#c0392b';
const GREEN = '#418568';

/// A short, stable number to print on the invoice -- the order's own id is
/// the source of truth, this is just how it is shown on paper.
export function invoiceNumberFor(order) {
  return `INV-${order.id.slice(-8).toUpperCase()}`;
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/// Renders one order as a tax invoice PDF and writes it straight to `res`
/// (or any writable stream). Works for a customer order, a wholesale order,
/// and a cancelled one -- which gets a stamp across the page, per the
/// client's brief ("uska bill ke upar cancel likha hoga").
export async function streamInvoice(order, settings, res) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  // compress: false -- these are a couple of KB either way, and leaving the
  // content stream readable means the invoice can be sanity-checked (or
  // grepped in a test) without a PDF parser.
  const doc = new PDFDocument({ size: 'A4', margin: 42, compress: false });
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const right = left + pageWidth;
  const logo = await fetchImageBuffer(s.logoUrl);
  const logoWidth = logo ? 70 : 0;

  // ---- letterhead ----
  const headerTop = doc.y;
  if (logo) {
    try { doc.image(logo, right - logoWidth, headerTop, { fit: [logoWidth, 70] }); } catch { /* a corrupt/unsupported file just leaves no logo */ }
  }
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(s.companyName, left, headerTop, { width: pageWidth - logoWidth - 12 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  if (s.companyAddress) doc.text(s.companyAddress, left, doc.y, { width: pageWidth - logoWidth - 12 });
  const contactLine = [s.companyGSTIN && `GSTIN: ${s.companyGSTIN}`, s.companyPhone, s.companyEmail].filter(Boolean).join('   ·   ');
  if (contactLine) doc.text(contactLine, left, doc.y, { width: pageWidth - logoWidth - 12 });

  let y = Math.max(doc.y, headerTop + 70) + 14;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(BORDER).stroke();
  y += 16;

  // ---- title ----
  doc.font('Helvetica-Bold').fontSize(15).fillColor(NAVY).text('TAX INVOICE', left, y);
  y = doc.y + 10;

  // ---- meta (left) and bill-to (right), side by side from the same y ----
  const isWholesale = !!order.vendorId;
  const halfWidth = pageWidth / 2 - 12;
  const billX = left + pageWidth / 2 + 12;
  const a = order.address || {};

  let metaY = y;
  const metaLine = text => { doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(text, left, metaY, { width: halfWidth }); metaY = doc.y + 2; };
  metaLine(`Invoice #: ${invoiceNumberFor(order)}`);
  metaLine(`Order #: ${order.id.slice(-8).toUpperCase()}`);
  metaLine(`Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`);
  metaLine(`Payment: ${order.paymentMethod}${order.deliveredAt ? ` · Delivered ${new Date(order.deliveredAt).toLocaleDateString('en-IN')}` : ''}`);
  metaLine(`Buyer type: ${isWholesale ? 'Wholesale partner' : 'Customer'}`);

  let billY = y;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(NAVY).text('Bill to', billX, billY, { width: halfWidth });
  billY = doc.y + 2;
  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED);
  doc.text(a.name || '—', billX, billY, { width: halfWidth }); billY = doc.y + 1;
  if (a.phone) { doc.text(a.phone, billX, billY, { width: halfWidth }); billY = doc.y + 1; }
  const addressLine = [a.line1, a.city, a.state, a.postalCode].filter(Boolean).join(', ');
  if (addressLine) { doc.text(addressLine, billX, billY, { width: halfWidth }); billY = doc.y + 1; }

  y = Math.max(metaY, billY) + 10;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(BORDER).stroke();
  y += 14;

  // ---- items table ----
  const col = { name: left, qty: right - 200, rate: right - 140, amount: right - 70 };
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY);
  doc.text('Item', col.name, y, { width: col.qty - col.name - 8 });
  doc.text('Qty', col.qty, y, { width: col.rate - col.qty - 8, align: 'right' });
  doc.text('Rate', col.rate, y, { width: col.amount - col.rate - 8, align: 'right' });
  doc.text('Amount', col.amount, y, { width: right - col.amount, align: 'right' });
  y += 16;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(BORDER).stroke();
  y += 8;

  let subtotalPaise = 0;
  for (const item of order.items) {
    const lineTotal = item.unitPaise * item.quantity;
    subtotalPaise += lineTotal;
    const variant = [item.size, item.color].filter(Boolean).join(' · ');
    doc.font('Helvetica').fontSize(9.5).fillColor(TEXT);
    doc.text(item.name, col.name, y, { width: col.qty - col.name - 8 });
    doc.text(String(item.quantity), col.qty, y, { width: col.rate - col.qty - 8, align: 'right' });
    doc.text(money(item.unitPaise), col.rate, y, { width: col.amount - col.rate - 8, align: 'right' });
    doc.text(money(lineTotal), col.amount, y, { width: right - col.amount, align: 'right' });
    let rowBottom = doc.y;
    if (variant) {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(variant, col.name, doc.y, { width: col.qty - col.name - 8 });
      rowBottom = Math.max(rowBottom, doc.y);
    }
    y = rowBottom + 10;
  }
  doc.moveTo(left, y).lineTo(right, y).strokeColor(BORDER).stroke();
  y += 10;

  // ---- totals ----
  const labelX = right - 220, valueWidth = 220;
  const totalsRow = (label, value, { bold = false, color = TEXT } = {}) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5).fillColor(color);
    doc.text(label, labelX, y, { width: 120 });
    doc.text(value, right - valueWidth, y, { width: valueWidth, align: 'right' });
    y += bold ? 16 : 14;
  };
  totalsRow('Subtotal', money(subtotalPaise));
  if (order.discountPaise > 0) totalsRow(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `-${money(order.discountPaise)}`, { color: GREEN });
  totalsRow('Delivery', order.deliveryPaise > 0 ? money(order.deliveryPaise) : 'Free', { color: order.deliveryPaise > 0 ? TEXT : GREEN });
  y += 2;
  doc.moveTo(labelX, y).lineTo(right, y).strokeColor(BORDER).stroke();
  y += 6;
  totalsRow('Total', money(order.totalPaise), { bold: true, color: NAVY });
  y += 20;

  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
    .text('Thank you for shopping with us. This is a computer-generated invoice and needs no signature.', left, y, { width: pageWidth });

  // ---- cancelled stamp, drawn last so it sits over everything ----
  if (order.status === 'CANCELLED') {
    doc.save();
    // Centred on the letterhead-and-items area near the top of the page,
    // not the full page height, so it lands on the invoice rather than the
    // empty space below a short one-item order.
    const stampCenterY = 330;
    doc.rotate(-28, { origin: [doc.page.width / 2, stampCenterY] });
    doc.font('Helvetica-Bold').fontSize(72).fillColor(DANGER).opacity(0.35)
      .text('CANCELLED', 0, stampCenterY - 40, { width: doc.page.width, align: 'center' });
    doc.opacity(1).restore();
  }

  doc.end();
}
