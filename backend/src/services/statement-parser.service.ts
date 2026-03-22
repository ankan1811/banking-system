import { parse } from 'csv-parse/sync';

export interface ParsedTransaction {
  name: string;
  amount: number;      // positive = debit (spent), negative = credit (received)
  date: string;        // YYYY-MM-DD
  type: 'debit' | 'credit';
}

// ─── Column mapping per bank ─────────────────────────────────

interface ColumnMap {
  date: number;
  name: number;
  debit: number;
  credit: number;
}

function detectColumns(headers: string[]): ColumnMap | null {
  const lower = headers.map((h) => h.toLowerCase().trim());

  // Try known bank formats first
  const patterns: { match: (h: string[]) => boolean; map: (h: string[]) => ColumnMap }[] = [
    {
      // SBI: Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance
      match: (h) => h.some((c) => c.includes('txn date')) && h.some((c) => c === 'description'),
      map: (h) => ({
        date: h.findIndex((c) => c.includes('txn date')),
        name: h.findIndex((c) => c === 'description'),
        debit: h.findIndex((c) => c === 'debit'),
        credit: h.findIndex((c) => c === 'credit'),
      }),
    },
    {
      // HDFC: Date, Narration, Value Dat, Debit Amount, Credit Amount, Chq/Ref Number, Closing Balance
      match: (h) => h.some((c) => c === 'narration') && h.some((c) => c.includes('debit amount')),
      map: (h) => ({
        date: h.findIndex((c) => c === 'date'),
        name: h.findIndex((c) => c === 'narration'),
        debit: h.findIndex((c) => c.includes('debit amount')),
        credit: h.findIndex((c) => c.includes('credit amount')),
      }),
    },
    {
      // ICICI: S No., Value Date, Transaction Date, Cheque Number, Transaction Remarks, Withdrawal Amount, Deposit Amount, Balance
      match: (h) => h.some((c) => c.includes('transaction remarks')),
      map: (h) => ({
        date: h.findIndex((c) => c.includes('transaction date') || c.includes('value date')),
        name: h.findIndex((c) => c.includes('transaction remarks')),
        debit: h.findIndex((c) => c.includes('withdrawal')),
        credit: h.findIndex((c) => c.includes('deposit')),
      }),
    },
    {
      // Axis: Tran Date, CHQNO, PARTICULARS, DR, CR, BAL, SOL
      match: (h) => h.some((c) => c === 'particulars') && h.some((c) => c === 'dr'),
      map: (h) => ({
        date: h.findIndex((c) => c.includes('tran date') || c === 'date'),
        name: h.findIndex((c) => c === 'particulars'),
        debit: h.findIndex((c) => c === 'dr'),
        credit: h.findIndex((c) => c === 'cr'),
      }),
    },
    {
      // Kotak: Date, Description, Debit, Credit, Balance
      match: (h) => h.some((c) => c === 'description') && h.some((c) => c === 'debit'),
      map: (h) => ({
        date: h.findIndex((c) => c === 'date'),
        name: h.findIndex((c) => c === 'description'),
        debit: h.findIndex((c) => c === 'debit'),
        credit: h.findIndex((c) => c === 'credit'),
      }),
    },
  ];

  for (const p of patterns) {
    if (p.match(lower)) {
      const map = p.map(lower);
      if (map.date >= 0 && map.name >= 0 && (map.debit >= 0 || map.credit >= 0)) {
        return map;
      }
    }
  }

  // Generic fallback: fuzzy match column names
  const dateIdx = lower.findIndex((c) => /\bdate\b/.test(c));
  const nameIdx = lower.findIndex((c) => /description|narration|particulars|remarks|detail/.test(c));
  const debitIdx = lower.findIndex((c) => /debit|withdrawal|dr\b|amount.*dr/.test(c));
  const creditIdx = lower.findIndex((c) => /credit|deposit|cr\b|amount.*cr/.test(c));

  // If there's a single "amount" column (no separate debit/credit)
  if (dateIdx >= 0 && nameIdx >= 0 && debitIdx < 0 && creditIdx < 0) {
    const amountIdx = lower.findIndex((c) => /\bamount\b/.test(c));
    if (amountIdx >= 0) {
      return { date: dateIdx, name: nameIdx, debit: amountIdx, credit: -1 };
    }
  }

  if (dateIdx >= 0 && nameIdx >= 0 && (debitIdx >= 0 || creditIdx >= 0)) {
    return { date: dateIdx, name: nameIdx, debit: debitIdx, credit: creditIdx };
  }

  return null;
}

// ─── Date normalization ──────────────────────────────────────

function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try common Indian date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, fmt: (m: RegExpMatchArray) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    // YYYY-MM-DD (already standard)
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, fmt: (m: RegExpMatchArray) => m[0] },
    // DD MMM YYYY (e.g., "15 Jan 2024")
    { regex: /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})$/i, fmt: (m: RegExpMatchArray) => {
      const months: Record<string, string> = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
      return `${m[3]}-${months[m[2].toLowerCase().slice(0, 3)]}-${m[1].padStart(2, '0')}`;
    }},
    // MM/DD/YYYY (US format fallback)
    { regex: /^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/, fmt: (m: RegExpMatchArray) => {
      const month = parseInt(m[1]), day = parseInt(m[2]);
      if (month > 12) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // Actually DD/MM
      return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    }},
  ];

  for (const { regex, fmt } of formats) {
    const match = trimmed.match(regex);
    if (match) return fmt(match);
  }

  // Last resort: try native Date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

// ─── Amount parsing ──────────────────────────────────────────

function parseAmount(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = raw.trim().replace(/[₹$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

// ─── Main parser ─────────────────────────────────────────────

export function parseStatement(csvContent: string): ParsedTransaction[] {
  // Parse CSV (handle various delimiters and quoting)
  let records: string[][];
  try {
    records = parse(csvContent, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    throw new Error('Invalid CSV format. Please check the file and try again.');
  }

  if (records.length < 2) {
    throw new Error('CSV file is empty or has no data rows.');
  }

  // Find the header row (first row with enough columns that looks like headers)
  let headerIdx = -1;
  let columns: ColumnMap | null = null;

  for (let i = 0; i < Math.min(records.length, 10); i++) {
    columns = detectColumns(records[i]);
    if (columns) {
      headerIdx = i;
      break;
    }
  }

  if (!columns || headerIdx < 0) {
    throw new Error('Could not detect CSV column format. Supported banks: SBI, HDFC, ICICI, Axis, Kotak, and generic formats with Date, Description, Debit/Credit columns.');
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = headerIdx + 1; i < records.length; i++) {
    const row = records[i];

    const dateStr = row[columns.date];
    const name = row[columns.name];
    const debitStr = columns.debit >= 0 ? row[columns.debit] : '';
    const creditStr = columns.credit >= 0 ? row[columns.credit] : '';

    // Skip empty/summary rows
    if (!dateStr || !name) continue;
    const date = normalizeDate(dateStr);
    if (!date) continue;

    const debitAmt = parseAmount(debitStr);
    const creditAmt = parseAmount(creditStr);

    // If only one "amount" column (no separate credit column)
    if (columns.credit < 0) {
      if (debitAmt === 0) continue;
      transactions.push({
        name: name.trim(),
        amount: Math.abs(debitAmt),
        date,
        type: debitAmt > 0 ? 'debit' : 'credit',
      });
      continue;
    }

    // Separate debit/credit columns
    if (debitAmt > 0) {
      transactions.push({ name: name.trim(), amount: debitAmt, date, type: 'debit' });
    } else if (creditAmt > 0) {
      transactions.push({ name: name.trim(), amount: -creditAmt, date, type: 'credit' });
    }
    // Skip rows where both debit and credit are 0
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in the CSV file.');
  }

  return transactions;
}
