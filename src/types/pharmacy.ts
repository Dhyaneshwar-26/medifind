export type MedicineAvailability = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface MedicineItem {
  id: string;
  /** Supabase `inventory.id` for this pharmacy/medicine pair. */
  inventoryId?: string;
  /** Supabase `medicines.id` for the shared catalogue row. */
  medicineId?: string;
  name: string;
  genericName?: string;
  /** Brand name captured through CSV import / catalogue metadata. */
  brand?: string;
  category: string;
  dosage: string;
  strength?: string;
  dosageForm?: string;
  prescriptionRequired: boolean;
  samplePrice?: string;
  price?: string;
  stockQuantity: number;
  inStock: boolean;
  availabilityStatus?: MedicineAvailability;
  /** Configurable low-stock threshold for this pharmacy/medicine pair. */
  lowStockThreshold?: number;
  /** Optional ISO date (YYYY-MM-DD). */
  expiryDate?: string | null;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  /** ISO timestamp reported by the pharmacy, if available. */
  lastUpdatedAt?: string;
  lastUpdated: string;
  isSample?: boolean;
  createdAt?: string;
}

export interface Pharmacy {
  id: string;
  ownerId?: string;
  name: string;
  ownerName?: string;
  address: string;
  area: string;
  district: string;
  pinCode?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  emergencyPhone?: string;
  openingHours: string;
  isOpenNow: boolean;
  is24Hours: boolean;
  services: string[];
  sampleMedicines: MedicineItem[];
  rating: number;
  reviewCount: number;
  imageUrl: string;
  distanceKm?: number;
  ownerEmail?: string;
  lastStockAudit?: string;
  isApproved?: boolean;
  isDemo?: boolean;
}

export interface UserLocation {
  lat: number;
  lng: number;
  name: string;
  district?: string;
  isLive: boolean;
  isOutsideTamilNadu?: boolean;
}

export interface CatalogMedicineOption {
  name: string;
  genericName: string;
  category: string;
  defaultDosage: string;
  strength: string;
  dosageForm: string;
  prescriptionRequired: boolean;
  defaultPrice: string;
}

/** Catalogue option backed by a live Supabase `medicines` row. */
export interface CatalogueMedicineOption extends CatalogMedicineOption {
  id?: string;
  isSample?: boolean;
}

export interface InventoryMedicineInput {
  /** Existing `medicines.id`. Omit to look up or create the catalogue row. */
  medicineId?: string;
  name: string;
  genericName: string;
  category: string;
  strength: string;
  dosageForm: string;
  prescriptionRequired: boolean;
  defaultPrice: string;
  stockQuantity: number;
  price?: string;
  lowStockThreshold?: number;
  expiryDate?: string | null;
}

export interface PharmacyRegistrationInput {
  email: string;
  password: string;
  ownerName: string;
  pharmacyName: string;
  phone: string;
  emergencyPhone?: string;
  address: string;
  area: string;
  district: string;
  pinCode: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  isOpenNow?: boolean;
  is24Hours: boolean;
  services: string[];
}

export interface PharmacyProfileUpdateInput {
  name: string;
  ownerName: string;
  address: string;
  area: string;
  district: string;
  pinCode: string;
  phone: string;
  emergencyPhone?: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  isOpenNow: boolean;
  is24Hours: boolean;
  services: string[];
}

export interface PharmacySearchParams {
  query: string;
  district?: string;
  brand?: string;
  strength?: string;
  dosageForm?: string;
  availability?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  inStockOnly?: boolean;
  lowStockOnly?: boolean;
  includeExpired?: boolean;
}

export interface PharmacyAdvancedFilters {
  district: string;
  maxDistanceKm: number;
  brand: string;
  strength: string;
  dosageForm: string;
  availability: 'all' | MedicineAvailability;
  lowStockOnly: boolean;
}

export type PharmacyFilter = 'all' | 'open' | 'nearest' | '24hours';
export type PharmacyAvailabilityFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type SortOption = 'distance' | 'rating' | 'name' | 'recent' | 'available';
export type ActiveView = 'customer' | 'pharmacy-portal';
export type PharmacyPortalTab = 'dashboard' | 'login' | 'register' | 'profile';
