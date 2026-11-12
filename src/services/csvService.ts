import { isValidExpiryDate } from '../utils/format';

export const CSV_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const CSV_TEMPLATE_FILENAME = 'medifind-inventory-template.csv';

export const CSV_COLUMNS = [
  'medicine_name',
  'brand',
  'strength',
  'dosage_form',
  'quantity',
  'price',
  'expiry_date',
] as const;

export interface ParsedCsvRow {
  rowNumber: number;
  name: string;
  brand: string;
  strength: string;
  dosageForm: string;
  quantity: number;
  price: string;
  expiryDate: string | null;
  raw: Record<string, string>;
}

export interface CsvRowError {
  rowNumber: number;
  name: string;
  message: string;
}

export interface CsvValidationResult {
  rows: ParsedCsvRow[];
  errors: CsvRowError[];
  validRows: ParsedCsvRow[];
}

export function buildCsvTemplate(): string {
  return [
    CSV_COLUMNS.join(','),
    '',
    '# Instructions:',
    '# - medicine_name, strength, dosage_form and quantity are required.',
    '# - quantity must be a whole number >= 0.',
    '# - expiry_date is optional. Accepted formats: YYYY-MM-DD or DD/MM/YYYY.',
    '# - price is optional text, e.g. 34 or Rs. 34.',
    '# - Rows are matched to this pharmacy by medicine name + strength.',
    '# - Existing inventory not listed in this file is never deleted.',
    '#',
    '# Example rows (replace the lines below with your own data):',
    '# Paracetamol,Calpol,650mg,Tablet,120,34,2027-06-30',
    '# Amoxicillin,Mox,500mg,Capsule,40,88,2026-12-15',
    '# Cetirizine,Cetzine,10mg,Tablet,0,22,',
  ].join('\n');
}

export function downloadCsvTemplate(): void {
  const blob = new Blob([buildCsvTemplate()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = CSV_TEMPLATE_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Minimal RFC4180-style CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      // Ignore CR; the following LF ends the row.
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((cells) => cells.map((cell) => cell.trim()))
    .filter((cells) => {
      // Skip blank lines and '#' comment/instruction lines (first filled cell).
      const firstFilled = cells.find((cell) => cell.length > 0);
      return Boolean(firstFilled) && !firstFilled?.startsWith('#');
    });
}

function normaliseHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normaliseExpiry(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isValidExpiryDate(trimmed)) return trimmed;

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    if (isValidExpiryDate(iso)) return iso;
  }

  return null;
}

function normaliseQuantity(value: string): number | null {
  if (!/^\d+(\.0+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function duplicateKey(row: ParsedCsvRow): string {
  // The database catalogue is unique on medicine name + strength, so files must
  // be checked against the same pair (brand is metadata, not part of the key).
  return [row.name, row.strength]
    .map((value) => value.trim().toLowerCase())
    .join('|');
}

export function validateCsv(text: string): CsvValidationResult {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, name: '', message: 'The file is empty.' }], validRows: [] };
  }

  const header = table[0].map(normaliseHeader);
  const missing = CSV_COLUMNS.filter(
    (column) => column === 'brand' || column === 'price' || column === 'expiry_date'
      ? false
      : !header.includes(column)
  );

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          name: '',
          message: `Missing required column(s): ${missing.join(', ')}. Download the template for the accepted format.`,
        },
      ],
      validRows: [],
    };
  }

  const indexOf = (column: string) => header.indexOf(column);
  const rows: ParsedCsvRow[] = [];
  const errors: CsvRowError[] = [];
  const seen = new Map<string, number>();

  for (let i = 1; i < table.length; i += 1) {
    const cells = table[i];
    const get = (column: string) => {
      const index = indexOf(column);
      return index >= 0 ? (cells[index] ?? '').trim() : '';
    };

    const rowNumber = i + 1;
    const name = get('medicine_name');
    const brand = get('brand');
    const strength = get('strength');
    const dosageForm = get('dosage_form');
    const quantityRaw = get('quantity');
    const price = get('price');
    const expiryRaw = get('expiry_date');

    const rowErrors: string[] = [];
    if (!name) rowErrors.push('medicine_name is required');
    if (!strength) rowErrors.push('strength is required');
    if (!dosageForm) rowErrors.push('dosage_form is required');

    const quantity = normaliseQuantity(quantityRaw);
    if (quantity === null) rowErrors.push('quantity must be a whole number >= 0');

    const expiryDate = normaliseExpiry(expiryRaw);
    if (expiryRaw && expiryDate === null) {
      rowErrors.push('expiry_date must be YYYY-MM-DD or DD/MM/YYYY');
    }

    if (rowErrors.length > 0) {
      errors.push({ rowNumber, name: name || '(unnamed)', message: rowErrors.join('; ') });
      continue;
    }

    const parsed: ParsedCsvRow = {
      rowNumber,
      name,
      brand,
      strength,
      dosageForm,
      quantity: quantity as number,
      price,
      expiryDate,
      raw: {
        medicine_name: name,
        brand,
        strength,
        dosage_form: dosageForm,
        quantity: quantityRaw,
        price,
        expiry_date: expiryRaw,
      },
    };

    const key = duplicateKey(parsed);
    const firstRow = seen.get(key);
    if (firstRow !== undefined) {
      errors.push({
        rowNumber,
        name,
        message: `Duplicate of row ${firstRow} (same medicine name and strength).`,
      });
      continue;
    }
    seen.set(key, rowNumber);
    rows.push(parsed);
  }

  return { rows, validRows: rows, errors };
}
