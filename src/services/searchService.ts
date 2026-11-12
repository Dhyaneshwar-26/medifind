import type { MedicineItem, Pharmacy, PharmacySearchParams } from '../types/pharmacy';
import { fetchApprovedPharmacies } from './pharmacyService';

export function medicineMatchesQuery(medicine: MedicineItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [
    medicine.name,
    medicine.genericName,
    medicine.brand,
    medicine.category,
    medicine.strength,
    medicine.dosageForm,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(q));
}

export function isMedicineAvailable(medicine: MedicineItem): boolean {
  return medicine.inStock && medicine.isExpired !== true && medicine.stockQuantity > 0;
}

function matchesOptional(value: string | undefined, filter: string | undefined): boolean {
  if (!filter || filter === 'all') return true;
  return (value || '').trim().toLowerCase() === filter.trim().toLowerCase();
}

export function medicineMatchesFilters(medicine: MedicineItem, params: PharmacySearchParams): boolean {
  if (!medicineMatchesQuery(medicine, params.query)) return false;

  if (!matchesOptional(medicine.brand || medicine.genericName, params.brand)) return false;
  if (!matchesOptional(medicine.strength, params.strength)) return false;
  if (!matchesOptional(medicine.dosageForm, params.dosageForm)) return false;

  const available = isMedicineAvailable(medicine);
  const status = medicine.isExpired ? 'out_of_stock' : medicine.availabilityStatus;

  if (params.availability && params.availability !== 'all' && status !== params.availability) {
    return false;
  }

  if (params.inStockOnly && !available) return false;
  if (params.lowStockOnly && !(medicine.availabilityStatus === 'low_stock' && !medicine.isExpired)) {
    return false;
  }

  return true;
}

export function pharmacyMatchesQuery(pharmacy: Pharmacy, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const medicineMatch = pharmacy.sampleMedicines.some((medicine) => medicineMatchesQuery(medicine, q));
  if (medicineMatch) return true;

  return [pharmacy.name, pharmacy.address, pharmacy.area, pharmacy.district, pharmacy.pinCode]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(q));
}

/**
 * Customer medicine search over the live Supabase directory.
 *
 * Matching covers brand/name, generic name, strength, dosage form and category.
 * Expired medicines and zero-stock medicines are never treated as available.
 * Filtering happens after the approved-pharmacy query so the returned objects
 * keep their full inventory for the details modal; the card component decides
 * which medicines to highlight for the current query.
 */
export function filterPharmacies(
  pharmacies: Pharmacy[],
  params: PharmacySearchParams
): Pharmacy[] {
  const query = params.query.trim();
  const district = params.district && params.district !== 'all' ? params.district : null;
  const hasMedicineFilters = Boolean(
    query ||
      (params.brand && params.brand !== 'all') ||
      (params.strength && params.strength !== 'all') ||
      (params.dosageForm && params.dosageForm !== 'all') ||
      (params.availability && params.availability !== 'all') ||
      params.inStockOnly ||
      params.lowStockOnly
  );
  const hasAttributeFilters = Boolean(
    (params.brand && params.brand !== 'all') ||
      (params.strength && params.strength !== 'all') ||
      (params.dosageForm && params.dosageForm !== 'all') ||
      (params.availability && params.availability !== 'all') ||
      params.inStockOnly ||
      params.lowStockOnly
  );

  return pharmacies.filter((pharmacy) => {
    if (district && pharmacy.district !== district) return false;

    if (hasMedicineFilters) {
      const medicineMatch = pharmacy.sampleMedicines.some((medicine) =>
        medicineMatchesFilters(medicine, params)
      );
      // Preserve existing behaviour: a query can also match pharmacy text.
      // Attribute filters (brand/strength/availability) must match inventory.
      const pharmacyTextMatch =
        Boolean(query) && !hasAttributeFilters
          ? [pharmacy.name, pharmacy.address, pharmacy.area, pharmacy.district, pharmacy.pinCode]
              .filter((value): value is string => Boolean(value))
              .some((value) => value.toLowerCase().includes(query.toLowerCase()))
          : false;

      if (!medicineMatch && !pharmacyTextMatch) return false;
    } else if (!pharmacyMatchesQuery(pharmacy, query)) {
      return false;
    }

    return true;
  });
}

export async function searchApprovedPharmacies(params: PharmacySearchParams): Promise<Pharmacy[]> {
  const pharmacies = await fetchApprovedPharmacies();
  return filterPharmacies(pharmacies, params);
}
