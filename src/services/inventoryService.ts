import { describeSupabaseError, requireSupabase } from '../lib/supabase';
import type { InventoryHistoryRow, InventoryRow } from '../types/database';
import type { InventoryMedicineInput, MedicineItem } from '../types/pharmacy';
import { availabilityFromQuantity, DEFAULT_LOW_STOCK_THRESHOLD } from '../utils/format';
import { findOrCreateMedicine } from './medicineService';

export type InventoryChangeSource = 'manual' | 'csv_import' | 'system';

export interface InventoryUpdateInput {
  stockQuantity: number;
  price?: string;
  expiryDate?: string | null;
  lowStockThreshold?: number;
  lastChangeSource?: InventoryChangeSource;
}

function normaliseQuantity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function normaliseThreshold(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LOW_STOCK_THRESHOLD;
  return Math.max(0, Math.round(parsed));
}

function normaliseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

interface DatabaseErrorShape {
  message?: string;
  details?: string;
  code?: string;
}

/**
 * True when the database has not had migration 0006 applied yet (missing
 * expiry/threshold columns or the inventory_history table). The app then keeps
 * basic stock/price management working instead of failing the whole flow.
 */
export function isInventoryExtensionSchemaError(error: unknown): boolean {
  const candidate = error as DatabaseErrorShape | null;
  if (!candidate) return false;
  if (candidate.code === '42703' || candidate.code === 'PGRST204' || candidate.code === '42P01') {
    return true;
  }
  const text = `${candidate.message ?? ''} ${candidate.details ?? ''}`;
  return (
    /expiry_date|low_stock_threshold|last_change_source|inventory_history/.test(text) &&
    /column|schema|relation|does not exist|not found/i.test(text)
  );
}

export function inventoryRowToMedicineItem(
  row: InventoryRow,
  medicine: {
    id: string;
    name: string;
    generic_name: string | null;
    category: string;
    strength: string | null;
    dosage_form: string | null;
    prescription_required: boolean;
    default_price: string | null;
  }
): MedicineItem {
  const quantity = normaliseQuantity(row.stock_quantity);
  const threshold = normaliseThreshold(row.low_stock_threshold);
  const price = row.price || medicine.default_price || '';
  const strength = medicine.strength || '';
  const dosageForm = medicine.dosage_form || '';
  const expired = row.expiry_date ? new Date(`${row.expiry_date}T00:00:00`) < new Date(new Date().toDateString()) : false;

  return {
    id: row.id,
    inventoryId: row.id,
    medicineId: medicine.id,
    name: medicine.name,
    genericName: medicine.generic_name || undefined,
    brand: medicine.generic_name || undefined,
    category: medicine.category,
    dosage: [strength, dosageForm].filter(Boolean).join(' ') || 'Standard dose',
    strength: strength || undefined,
    dosageForm: dosageForm || undefined,
    prescriptionRequired: Boolean(medicine.prescription_required),
    samplePrice: price || undefined,
    price: price || undefined,
    stockQuantity: quantity,
    inStock: !expired && quantity > 0,
    availabilityStatus: expired ? 'out_of_stock' : availabilityFromQuantity(quantity, threshold),
    lowStockThreshold: threshold,
    expiryDate: row.expiry_date,
    isExpired: expired,
    lastUpdatedAt: row.last_updated,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
  };
}

export async function addInventoryItem(
  pharmacyId: string,
  input: InventoryMedicineInput
): Promise<InventoryRow> {
  const client = requireSupabase();
  const medicine = input.medicineId
    ? { id: input.medicineId }
    : await findOrCreateMedicine(input);

  const quantity = normaliseQuantity(input.stockQuantity);
  const threshold = normaliseThreshold(input.lowStockThreshold);

  const basePayload = {
    pharmacy_id: pharmacyId,
    medicine_id: medicine.id,
    stock_quantity: quantity,
    availability_status: availabilityFromQuantity(quantity, threshold),
    price: input.price?.trim() || null,
    last_updated: new Date().toISOString(),
  };

  const fullPayload = {
    ...basePayload,
    low_stock_threshold: threshold,
    expiry_date: normaliseDate(input.expiryDate),
    last_change_source: 'manual',
  };

  let result = await client
    .from('inventory')
    .upsert(fullPayload, { onConflict: 'pharmacy_id,medicine_id' })
    .select('*')
    .single();

  if (result.error && isInventoryExtensionSchemaError(result.error)) {
    result = await client
      .from('inventory')
      .upsert(basePayload, { onConflict: 'pharmacy_id,medicine_id' })
      .select('*')
      .single();
  }

  const { data, error } = result;
  if (error) throw new Error(describeSupabaseError(error));
  return data as InventoryRow;
}

export async function updateInventoryItem(
  inventoryId: string,
  input: InventoryUpdateInput
): Promise<InventoryRow> {
  const client = requireSupabase();
  const quantity = normaliseQuantity(input.stockQuantity);
  const threshold = normaliseThreshold(input.lowStockThreshold);

  const basePayload: Record<string, unknown> = {
    stock_quantity: quantity,
    availability_status: availabilityFromQuantity(quantity, threshold),
    ...(input.price !== undefined ? { price: input.price.trim() || null } : {}),
    last_updated: new Date().toISOString(),
  };

  const fullPayload: Record<string, unknown> = {
    ...basePayload,
    low_stock_threshold: threshold,
    ...(input.expiryDate !== undefined ? { expiry_date: normaliseDate(input.expiryDate) } : {}),
    last_change_source: input.lastChangeSource ?? 'manual',
  };

  let result = await client
    .from('inventory')
    .update(fullPayload)
    .eq('id', inventoryId)
    .select('*')
    .single();

  if (result.error && isInventoryExtensionSchemaError(result.error)) {
    result = await client
      .from('inventory')
      .update(basePayload)
      .eq('id', inventoryId)
      .select('*')
      .single();
  }

  const { data, error } = result;
  if (error) throw new Error(describeSupabaseError(error));
  return data as InventoryRow;
}

export async function adjustInventoryQuantity(
  item: Pick<MedicineItem, 'id' | 'stockQuantity' | 'lowStockThreshold'>,
  delta: number
): Promise<InventoryRow> {
  const nextQuantity = Math.max(0, Number(item.stockQuantity || 0) + delta);
  return updateInventoryItem(item.id, {
    stockQuantity: nextQuantity,
    lowStockThreshold: item.lowStockThreshold,
  });
}

export async function setInventoryAvailability(
  item: Pick<MedicineItem, 'id' | 'stockQuantity' | 'lowStockThreshold'>,
  inStock: boolean
): Promise<InventoryRow> {
  const nextQuantity = inStock ? Math.max(1, Number(item.stockQuantity || 0)) : 0;
  return updateInventoryItem(item.id, {
    stockQuantity: nextQuantity,
    lowStockThreshold: item.lowStockThreshold,
  });
}

export async function removeInventoryItem(inventoryId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('inventory').delete().eq('id', inventoryId);
  if (error) throw new Error(describeSupabaseError(error));
}

export async function fetchInventoryHistory(
  pharmacyId: string,
  limit = 25
): Promise<InventoryHistoryRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('inventory_history')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(describeSupabaseError(error));
  return (data ?? []) as InventoryHistoryRow[];
}

export interface BulkImportRow {
  name: string;
  brand: string;
  strength: string;
  dosageForm: string;
  quantity: number;
  price?: string;
  expiryDate?: string | null;
  category?: string;
}

export interface BulkImportResultRow {
  rowNumber: number;
  name: string;
  strength: string;
  dosageForm: string;
  quantity: number;
  success: boolean;
  error?: string;
}

/**
 * Upserts validated CSV rows for one pharmacy.
 *
 * - Never deletes inventory that is absent from the file.
 * - Uses the (pharmacy_id, medicine_id) unique constraint so repeated imports
 *   update instead of duplicating.
 * - Rows are validated before this function is called; any per-row database
 *   failure is reported without aborting already-valid rows.
 */
export async function bulkImportInventory(
  pharmacyId: string,
  rows: BulkImportRow[]
): Promise<BulkImportResultRow[]> {
  const results: BulkImportResultRow[] = [];
  const client = requireSupabase();

  // Snapshot the pharmacy's current inventory once so matching is local to this
  // owner and a medicine with a different dosage form is never overwritten.
  const { data: existingData } = await client
    .from('inventory')
    .select('medicine_id, stock_quantity, medicines (id, name, strength, dosage_form)')
    .eq('pharmacy_id', pharmacyId);

  const normalise = (value: string | null | undefined) =>
    (value || '').trim().toLowerCase();

  const existingByKey = new Map<
    string,
    { medicineId: string; dosageForm: string }
  >();

  (existingData ?? []).forEach((row: unknown) => {
    const record = row as {
      medicine_id?: string;
      medicines?:
        | { id?: string; name?: string; strength?: string | null; dosage_form?: string | null }
        | Array<{ id?: string; name?: string; strength?: string | null; dosage_form?: string | null }>
        | null;
    };
    const medicine = Array.isArray(record.medicines)
      ? record.medicines[0]
      : record.medicines;
    if (!medicine?.name || !record.medicine_id) return;
    const key = `${normalise(medicine.name)}|${normalise(medicine.strength)}`;
    existingByKey.set(key, {
      medicineId: record.medicine_id,
      dosageForm: normalise(medicine.dosage_form),
    });
  });

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    try {
      const matchKey = `${normalise(row.name)}|${normalise(row.strength)}`;
      const existing = existingByKey.get(matchKey);

      if (
        existing &&
        existing.dosageForm &&
        normalise(row.dosageForm) &&
        existing.dosageForm !== normalise(row.dosageForm)
      ) {
        throw new Error(
          `A medicine named "${row.name} ${row.strength}" already exists in your inventory as ${existing.dosageForm}. ` +
            `Adjust the name or strength in the CSV so the ${row.dosageForm} is kept as a separate medicine.`
        );
      }

      const medicine = existing
        ? { id: existing.medicineId }
        : await findOrCreateMedicine({
            name: row.name,
            genericName: row.brand,
            category: row.category?.trim() || 'General',
            strength: row.strength,
            dosageForm: row.dosageForm,
            prescriptionRequired: false,
            defaultPrice: row.price || '',
            stockQuantity: row.quantity,
            price: row.price,
          });

      const basePayload = {
        pharmacy_id: pharmacyId,
        medicine_id: medicine.id,
        stock_quantity: normaliseQuantity(row.quantity),
        availability_status: availabilityFromQuantity(row.quantity),
        price: row.price?.trim() || null,
        last_updated: new Date().toISOString(),
      };

      let result = await client.from('inventory').upsert(
        {
          ...basePayload,
          expiry_date: normaliseDate(row.expiryDate),
          last_change_source: 'csv_import',
        },
        { onConflict: 'pharmacy_id,medicine_id' }
      );

      if (result.error && isInventoryExtensionSchemaError(result.error)) {
        result = await client
          .from('inventory')
          .upsert(basePayload, { onConflict: 'pharmacy_id,medicine_id' });
      }

      if (result.error) throw result.error;

      results.push({
        rowNumber: index + 1,
        name: row.name,
        strength: row.strength,
        dosageForm: row.dosageForm,
        quantity: row.quantity,
        success: true,
      });
    } catch (err) {
      results.push({
        rowNumber: index + 1,
        name: row.name,
        strength: row.strength,
        dosageForm: row.dosageForm,
        quantity: row.quantity,
        success: false,
        error: describeSupabaseError(err),
      });
    }
  }

  return results;
}
