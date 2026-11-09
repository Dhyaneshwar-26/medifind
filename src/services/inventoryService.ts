import { describeSupabaseError, requireSupabase } from '../lib/supabase';
import type { InventoryRow } from '../types/database';
import type { InventoryMedicineInput, MedicineItem } from '../types/pharmacy';
import { availabilityFromQuantity } from '../utils/format';
import { findOrCreateMedicine } from './medicineService';

export interface InventoryUpdateInput {
  stockQuantity: number;
  price?: string;
}

export async function addInventoryItem(
  pharmacyId: string,
  input: InventoryMedicineInput
): Promise<InventoryRow> {
  const client = requireSupabase();
  const medicine = input.medicineId
    ? { id: input.medicineId }
    : await findOrCreateMedicine(input);

  const quantity = Math.max(0, Math.round(Number(input.stockQuantity) || 0));

  const { data, error } = await client
    .from('inventory')
    .upsert(
      {
        pharmacy_id: pharmacyId,
        medicine_id: medicine.id,
        stock_quantity: quantity,
        availability_status: availabilityFromQuantity(quantity),
        price: input.price?.trim() || null,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'pharmacy_id,medicine_id' }
    )
    .select('*')
    .single();

  if (error) throw new Error(describeSupabaseError(error));
  return data as InventoryRow;
}

export async function updateInventoryItem(
  inventoryId: string,
  input: InventoryUpdateInput
): Promise<InventoryRow> {
  const client = requireSupabase();
  const quantity = Math.max(0, Math.round(Number(input.stockQuantity) || 0));

  const { data, error } = await client
    .from('inventory')
    .update({
      stock_quantity: quantity,
      availability_status: availabilityFromQuantity(quantity),
      ...(input.price !== undefined ? { price: input.price.trim() || null } : {}),
      last_updated: new Date().toISOString(),
    })
    .eq('id', inventoryId)
    .select('*')
    .single();

  if (error) throw new Error(describeSupabaseError(error));
  return data as InventoryRow;
}

export async function adjustInventoryQuantity(
  item: Pick<MedicineItem, 'id' | 'stockQuantity'>,
  delta: number
): Promise<InventoryRow> {
  const nextQuantity = Math.max(0, Number(item.stockQuantity || 0) + delta);
  return updateInventoryItem(item.id, { stockQuantity: nextQuantity });
}

export async function setInventoryAvailability(
  item: Pick<MedicineItem, 'id' | 'stockQuantity'>,
  inStock: boolean
): Promise<InventoryRow> {
  const nextQuantity = inStock ? Math.max(1, Number(item.stockQuantity || 0)) : 0;
  return updateInventoryItem(item.id, { stockQuantity: nextQuantity });
}

export async function removeInventoryItem(inventoryId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('inventory').delete().eq('id', inventoryId);
  if (error) throw new Error(describeSupabaseError(error));
}
