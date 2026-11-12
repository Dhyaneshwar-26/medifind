/**
 * Domain types for the Supabase schema in `supabase/migrations`.
 *
 * These are hand-maintained row/view types (not generated) so the frontend can
 * map database records into the existing UI model without losing type safety.
 */

export type UserRole = 'pharmacy_owner' | 'customer';
export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface PharmacyRow {
  id: string;
  owner_id: string;
  name: string;
  owner_name: string | null;
  address: string;
  area: string;
  district: string;
  pin_code: string | null;
  phone: string;
  emergency_phone: string | null;
  latitude: number;
  longitude: number;
  opening_hours: string;
  is_open_now: boolean;
  is_24_hours: boolean;
  services: string[];
  rating: number;
  review_count: number;
  image_url: string | null;
  is_approved: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineRow {
  id: string;
  name: string;
  generic_name: string | null;
  category: string;
  strength: string | null;
  dosage_form: string | null;
  prescription_required: boolean;
  default_price: string | null;
  is_sample: boolean;
  created_by: string | null;
  catalog_key: string;
  created_at: string;
}

export interface InventoryRow {
  id: string;
  pharmacy_id: string;
  medicine_id: string;
  stock_quantity: number;
  availability_status: AvailabilityStatus;
  price: string | null;
  expiry_date: string | null;
  low_stock_threshold: number;
  last_change_source: 'manual' | 'csv_import' | 'system';
  last_updated: string;
  created_at: string;
}

export interface InventoryHistoryRow {
  id: string;
  inventory_id: string;
  pharmacy_id: string;
  medicine_id: string;
  old_quantity: number | null;
  new_quantity: number | null;
  old_expiry_date: string | null;
  new_expiry_date: string | null;
  change_source: 'manual' | 'csv_import' | 'system';
  changed_by: string | null;
  created_at: string;
}

export interface InventoryWithMedicineRow extends InventoryRow {
  medicines: MedicineRow | MedicineRow[] | null;
}

export interface PharmacyWithInventoryRow extends PharmacyRow {
  inventory: InventoryWithMedicineRow[] | null;
}
