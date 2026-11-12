/**
 * Calculates the great-circle distance between two geographic coordinates
 * in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

export function formatDistance(distanceKm: number | undefined): string {
  if (distanceKm === undefined || isNaN(distanceKm)) {
    return '-- km';
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

// Predefined prominent Chennai neighborhood coordinates for fallback selection
export const CHENNAI_NEIGHBORHOODS = [
  { name: 'Central Chennai (General Hospital Rd)', lat: 13.0827, lng: 80.2707 },
  { name: 'T. Nagar (Panagal Park)', lat: 13.0418, lng: 80.2341 },
  { name: 'Anna Nagar (Roundtana)', lat: 13.085, lng: 80.2101 },
  { name: 'Adyar (Gandhi Nagar)', lat: 13.0012, lng: 80.2565 },
  { name: 'Mylapore (Luz Church Rd)', lat: 13.0336, lng: 80.2676 },
  { name: 'Velachery (Vijayanagar)', lat: 12.9815, lng: 80.218 },
  { name: 'Nungambakkam (Sterling Rd)', lat: 13.0595, lng: 80.2425 },
  { name: 'Egmore (Poonamallee High Rd)', lat: 13.0784, lng: 80.2608 },
  { name: 'Tambaram (GST Road)', lat: 12.9249, lng: 80.1276 },
  { name: 'Kilpauk (Taylor\'s Rd)', lat: 13.079, lng: 80.241 }
];
