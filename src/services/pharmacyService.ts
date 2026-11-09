import { describeSupabaseError, requireSupabase } from '../lib/supabase';
import type {
  InventoryWithMedicineRow,
  MedicineRow,
  PharmacyRow,
  PharmacyWithInventoryRow,
} from '../types/database';
import type {
  MedicineItem,
  Pharmacy,
  PharmacyProfileUpdateInput,
  PharmacyRegistrationInput,
} from '../types/pharmacy';
import { availabilityFromQuantity, formatRelativeTime, isInStock, safeNumber } from '../utils/format';

const DEFAULT_PHARMACY_IMAGE = '/src/assets/images/pharmacy_interior_modern_1794119274302.jpg';

const PHARMACY_SELECT = `
  id,
  owner_id,
  name,
  owner_name,
  address,
  area,
  district,
  pin_code,
  phone,
  emergency_phone,
  latitude,
  longitude,
  opening_hours,
  is_open_now,
  is_24_hours,
  services,
  rating,
  review_count,
  image_url,
  is_approved,
  is_demo,
  created_at,
  updated_at,
  inventory (
    id,
    pharmacy_id,
    medicine_id,
    stock_quantity,
    availability_status,
    price,
    last_updated,
    created_at,
    medicines (
      id,
      name,
      generic_name,
      category,
      strength,
      dosage_form,
      prescription_required,
      default_price,
      is_sample,
      created_by,
      catalog_key,
      created_at
    )
  )
`;

function unwrapMedicine(value: InventoryWithMedicineRow['medicines']): MedicineRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function mapInventoryRow(row: InventoryWithMedicineRow): MedicineItem | null {
  const medicine = unwrapMedicine(row.medicines);
  if (!medicine) return null;

  const quantity = safeNumber(row.stock_quantity);
  const status = row.availability_status ?? availabilityFromQuantity(quantity);
  const inStock = isInStock(quantity, status);
  const strength = medicine.strength || '';
  const dosageForm = medicine.dosage_form || '';
  const price = row.price || medicine.default_price || '';

  return {
    id: row.id,
    inventoryId: row.id,
    medicineId: medicine.id,
    name: medicine.name,
    genericName: medicine.generic_name || undefined,
    category: medicine.category,
    dosage: [strength, dosageForm].filter(Boolean).join(' ') || 'Standard dose',
    strength: strength || undefined,
    dosageForm: dosageForm || undefined,
    prescriptionRequired: Boolean(medicine.prescription_required),
    samplePrice: price || undefined,
    price: price || undefined,
    stockQuantity: quantity,
    inStock,
    availabilityStatus: status,
    lastUpdated: formatRelativeTime(row.last_updated),
    isSample: Boolean(medicine.is_sample),
  };
}

export function mapPharmacyRow(row: PharmacyWithInventoryRow): Pharmacy {
  const medicines = (row.inventory ?? [])
    .map(mapInventoryRow)
    .filter((item): item is MedicineItem => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name));

  const latestInventoryUpdate = (row.inventory ?? [])
    .map((item) => item.last_updated)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    ownerName: row.owner_name || undefined,
    address: row.address,
    area: row.area,
    district: row.district,
    pinCode: row.pin_code || undefined,
    coordinates: {
      lat: Number(row.latitude),
      lng: Number(row.longitude),
    },
    phone: row.phone,
    emergencyPhone: row.emergency_phone || undefined,
    openingHours: row.opening_hours,
    isOpenNow: Boolean(row.is_open_now),
    is24Hours: Boolean(row.is_24_hours),
    services: Array.isArray(row.services) ? row.services : [],
    sampleMedicines: medicines,
    rating: Number(row.rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    imageUrl: row.image_url || DEFAULT_PHARMACY_IMAGE,
    lastStockAudit: latestInventoryUpdate ? formatRelativeTime(latestInventoryUpdate) : 'No stock updates yet',
    isApproved: Boolean(row.is_approved),
    isDemo: Boolean(row.is_demo),
  };
}

/**
 * Public customer directory. RLS already limits this to approved pharmacies, and
 * the explicit filter documents intent and keeps demo data out of production.
 */
export async function fetchApprovedPharmacies(): Promise<Pharmacy[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pharmacies')
    .select(PHARMACY_SELECT)
    .eq('is_approved', true)
    .order('name', { ascending: true });

  if (error) throw new Error(describeSupabaseError(error));
  return ((data ?? []) as unknown as PharmacyWithInventoryRow[]).map(mapPharmacyRow);
}

export async function fetchMyPharmacy(ownerId: string): Promise<Pharmacy | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pharmacies')
    .select(PHARMACY_SELECT)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) throw new Error(describeSupabaseError(error));
  if (!data) return null;
  return mapPharmacyRow(data as unknown as PharmacyWithInventoryRow);
}

export async function fetchPharmacyById(pharmacyId: string): Promise<Pharmacy | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pharmacies')
    .select(PHARMACY_SELECT)
    .eq('id', pharmacyId)
    .maybeSingle();

  if (error) throw new Error(describeSupabaseError(error));
  if (!data) return null;
  return mapPharmacyRow(data as unknown as PharmacyWithInventoryRow);
}

function registrationToRow(ownerId: string, input: PharmacyRegistrationInput) {
  return {
    owner_id: ownerId,
    name: input.pharmacyName.trim(),
    owner_name: input.ownerName.trim(),
    address: input.address.trim(),
    area: input.area.trim(),
    district: input.district,
    pin_code: input.pinCode.trim() || null,
    phone: input.phone.trim(),
    emergency_phone: input.emergencyPhone?.trim() || null,
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    opening_hours: input.openingHours.trim(),
    is_open_now: Boolean(input.isOpenNow),
    is_24_hours: Boolean(input.is24Hours),
    services: input.services,
    image_url: DEFAULT_PHARMACY_IMAGE,
    is_approved: true,
    is_demo: false,
  };
}

/**
 * Fallback used only when the signup trigger has not already created the
 * pharmacy (for example if the project was migrated with an older trigger).
 */
export async function createPharmacyForOwner(
  ownerId: string,
  input: PharmacyRegistrationInput
): Promise<Pharmacy> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pharmacies')
    .insert(registrationToRow(ownerId, input))
    .select(PHARMACY_SELECT)
    .single();

  if (error) throw new Error(describeSupabaseError(error));
  return mapPharmacyRow(data as unknown as PharmacyWithInventoryRow);
}

export async function updatePharmacyProfile(
  pharmacyId: string,
  input: PharmacyProfileUpdateInput
): Promise<Pharmacy> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pharmacies')
    .update({
      name: input.name.trim(),
      owner_name: input.ownerName.trim(),
      address: input.address.trim(),
      area: input.area.trim(),
      district: input.district,
      pin_code: input.pinCode.trim() || null,
      phone: input.phone.trim(),
      emergency_phone: input.emergencyPhone?.trim() || null,
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
      opening_hours: input.openingHours.trim(),
      is_open_now: Boolean(input.isOpenNow),
      is_24_hours: Boolean(input.is24Hours),
      services: input.services,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pharmacyId)
    .select(PHARMACY_SELECT)
    .single();

  if (error) throw new Error(describeSupabaseError(error));
  return mapPharmacyRow(data as unknown as PharmacyWithInventoryRow);
}
