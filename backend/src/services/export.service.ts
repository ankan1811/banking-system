import { getAccount } from './bank.service.js';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

function filterByDateRange(transactions: any[], from: string, to: string) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  return transactions.filter((t) => {
    const d = new Date(t.date || t.createdAt);
    return d >= fromDate && d <= toDate;
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export async function exportCSV(bankRecordId: string, from: string, to: string, userId: string): Promise<Buffer> {
  const { data: account, transactions } = await getAccount(bankRecordId, userId);
  const filtered = filterByDateRange(transactions, from, to);

  const rows = [
    ['Date', 'Name', 'Amount', 'Type', 'Category', 'Payment Channel'],
    ...filtered.map((t) => [
      formatDate(t.date || t.createdAt),
      t.name,
      t.amount < 0 ? `+${Math.abs(t.amount).toFixed(2)}` : `-${t.amount.toFixed(2)}`,
      t.amount < 0 ? 'Credit' : 'Debit',
      (t as any).aiCategory || t.category || 'Other',
      t.paymentChannel || t.channel || '',
    ]),
  ];

  const csv = stringify(rows);
  return Buffer.from(csv);
}

export async function exportPDF(
  bankRecordId: string,
  from: string,
  to: string,
  userId: string
): Promise<Buffer> {
  const { data: account, transactions } = await getAccount(bankRecordId, userId);
  const filtered = filterByDateRange(transactions, from, to);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).fillColor('#1e293b').text("Bank Statement", { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#64748b')
      .text(`Account: ${account.name} (****${account.mask})`, { align: 'center' });
    doc.text(`Period: ${formatDate(from)} – ${formatDate(to)}`, { align: 'center' });
    doc.moveDown(1);

    // Divider
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    // Table header
    const col = { date: 40, name: 110, amount: 380, type: 440, category: 480 };
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text('DATE', col.date, doc.y, { width: 65 });
    doc.text('DESCRIPTION', col.name, doc.y - doc.currentLineHeight(), { width: 260 });
    doc.text('AMOUNT', col.amount, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' });
    doc.text('CATEGORY', col.category, doc.y - doc.currentLineHeight(), { width: 80 });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.3);

    // Rows
    let totalDebits = 0;
    let totalCredits = 0;
    for (const t of filtered) {
      if (doc.y > 750) {
        doc.addPage();
        doc.moveDown(0.5);
      }
      const isCredit = t.amount < 0;
      const absAmt = Math.abs(t.amount);
      if (isCredit) totalCredits += absAmt; else totalDebits += absAmt;

      const y = doc.y;
      doc.fontSize(8).fillColor('#1e293b');
      doc.text(formatDate(t.date || t.createdAt), col.date, y, { width: 65 });
      doc.text(t.name, col.name, y, { width: 260, ellipsis: true });
      doc.fillColor(isCredit ? '#10b981' : '#ef4444')
        .text(`${isCredit ? '+' : '-'}$${absAmt.toFixed(2)}`, col.amount, y, { width: 55, align: 'right' });
      doc.fillColor('#64748b')
        .text(((t as any).aiCategory || t.category || 'Other').slice(0, 14), col.category, y, { width: 80 });
      doc.moveDown(0.5);
    }

    // Summary footer
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#1e293b');
    doc.text(`Total Debits: $${totalDebits.toFixed(2)}`, { align: 'right' });
    doc.fillColor('#10b981').text(`Total Credits: $${totalCredits.toFixed(2)}`, { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(7).fillColor('#94a3b8')
      .text(`Generated on ${new Date().toLocaleDateString('en-US')} · ${filtered.length} transactions`, { align: 'center' });

    doc.end();
  });
}
