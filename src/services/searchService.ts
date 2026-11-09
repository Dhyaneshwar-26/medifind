import type { MedicineItem, Pharmacy, PharmacySearchParams } from '../types/pharmacy';
import { fetchApprovedPharmacies } from './pharmacyService';

export function medicineMatchesQuery(medicine: MedicineItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [medicine.name, medicine.genericName, medicine.category, medicine.strength, medicine.dosageForm]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(q));
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

  let result = pharmacies.filter((pharmacy) => {
    if (district && pharmacy.district !== district) return false;
    if (!pharmacyMatchesQuery(pharmacy, query)) return false;

    if (params.inStockOnly) {
      const hasStock = query
        ? pharmacy.sampleMedicines.some((medicine) => medicineMatchesQuery(medicine, query) && medicine.inStock)
        : pharmacy.sampleMedicines.some((medicine) => medicine.inStock);
      if (!hasStock) return false;
    }

    return true;
  });

  return result;
}

export async function searchApprovedPharmacies(params: PharmacySearchParams): Promise<Pharmacy[]> {
  const pharmacies = await fetchApprovedPharmacies();
  return filterPharmacies(pharmacies, params);
}
