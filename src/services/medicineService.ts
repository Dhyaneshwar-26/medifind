import { describeSupabaseError, requireSupabase } from '../lib/supabase';
import type { MedicineRow } from '../types/database';
import type { CatalogueMedicineOption, InventoryMedicineInput } from '../types/pharmacy';

export function buildCatalogKey(name: string, strength: string): string {
  return `${name.trim().toLowerCase()}|${strength.trim().toLowerCase()}`;
}

function mapMedicineRow(row: MedicineRow): CatalogueMedicineOption {
  const strength = row.strength || '';
  const dosageForm = row.dosage_form || '';
  return {
    id: row.id,
    name: row.name,
    genericName: row.generic_name || '',
    category: row.category,
    defaultDosage: [strength, dosageForm].filter(Boolean).join(' ') || 'Standard dose',
    strength,
    dosageForm,
    prescriptionRequired: Boolean(row.prescription_required),
    defaultPrice: row.default_price || '',
    isSample: Boolean(row.is_sample),
  };
}

export async function fetchMedicineCatalogue(): Promise<CatalogueMedicineOption[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('medicines')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(describeSupabaseError(error));
  return ((data ?? []) as MedicineRow[]).map(mapMedicineRow);
}

/**
 * Finds an existing catalogue row by name + strength, or creates a new
 * custom medicine row for the signed-in pharmacy owner.
 *
 * `medicines.catalog_key` is a generated, unique column in Postgres, so this
 * also guards against duplicate catalogue rows under concurrent writes.
 */
export async function findOrCreateMedicine(input: InventoryMedicineInput): Promise<MedicineRow> {
  const client = requireSupabase();
  const key = buildCatalogKey(input.name, input.strength);

  const { data: existing, error: selectError } = await client
    .from('medicines')
    .select('*')
    .eq('catalog_key', key)
    .maybeSingle();

  if (selectError) throw new Error(describeSupabaseError(selectError));
  if (existing) return existing as MedicineRow;

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(describeSupabaseError(userError));
  if (!user) throw new Error('You must be signed in to add a custom medicine.');

  const newRow = {
    name: input.name.trim(),
    generic_name: input.genericName.trim() || null,
    category: input.category.trim() || 'General',
    strength: input.strength.trim() || null,
    dosage_form: input.dosageForm.trim() || null,
    prescription_required: Boolean(input.prescriptionRequired),
    default_price: input.defaultPrice.trim() || null,
    is_sample: false,
    created_by: user.id,
  };

  const { data: inserted, error: insertError } = await client
    .from('medicines')
    .insert(newRow)
    .select('*')
    .single();

  if (insertError) {
    // Another concurrent request may have inserted the same catalogue key.
    const { data: raced, error: raceError } = await client
      .from('medicines')
      .select('*')
      .eq('catalog_key', key)
      .maybeSingle();
    if (!raceError && raced) return raced as MedicineRow;
    throw new Error(describeSupabaseError(insertError));
  }

  return inserted as MedicineRow;
}
