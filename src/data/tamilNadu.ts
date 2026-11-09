/**
 * Tamil Nadu Geography, Districts & Boundary Verification
 * MediFind operates strictly within Tamil Nadu, India.
 */

export interface TamilNaduDistrict {
  id: string;
  name: string;
  headquarters: string;
  lat: number;
  lng: number;
  pinCodePrefix: string;
}

// Complete list of all 38 Revenue Districts of Tamil Nadu with central coordinates
export const TAMIL_NADU_DISTRICTS: TamilNaduDistrict[] = [
  { id: 'chennai', name: 'Chennai', headquarters: 'Chennai', lat: 13.0827, lng: 80.2707, pinCodePrefix: '600' },
  { id: 'coimbatore', name: 'Coimbatore', headquarters: 'Coimbatore', lat: 11.0168, lng: 76.9558, pinCodePrefix: '641' },
  { id: 'madurai', name: 'Madurai', headquarters: 'Madurai', lat: 9.9252, lng: 78.1198, pinCodePrefix: '625' },
  { id: 'tiruchirappalli', name: 'Tiruchirappalli', headquarters: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047, pinCodePrefix: '620' },
  { id: 'salem', name: 'Salem', headquarters: 'Salem', lat: 11.6643, lng: 78.1460, pinCodePrefix: '636' },
  { id: 'tirunelveli', name: 'Tirunelveli', headquarters: 'Tirunelveli', lat: 8.7139, lng: 77.7567, pinCodePrefix: '627' },
  { id: 'erode', name: 'Erode', headquarters: 'Erode', lat: 11.3410, lng: 77.7172, pinCodePrefix: '638' },
  { id: 'vellore', name: 'Vellore', headquarters: 'Vellore', lat: 12.9165, lng: 79.1325, pinCodePrefix: '632' },
  { id: 'thanjavur', name: 'Thanjavur', headquarters: 'Thanjavur', lat: 10.7870, lng: 79.1378, pinCodePrefix: '613' },
  { id: 'chengalpattu', name: 'Chengalpattu', headquarters: 'Chengalpattu', lat: 12.6825, lng: 79.9836, pinCodePrefix: '603' },
  { id: 'tiruvallur', name: 'Tiruvallur', headquarters: 'Tiruvallur', lat: 13.1437, lng: 79.9079, pinCodePrefix: '602' },
  { id: 'kanchipuram', name: 'Kanchipuram', headquarters: 'Kanchipuram', lat: 12.8342, lng: 79.7036, pinCodePrefix: '631' },
  { id: 'dindigul', name: 'Dindigul', headquarters: 'Dindigul', lat: 10.3673, lng: 77.9803, pinCodePrefix: '624' },
  { id: 'cuddalore', name: 'Cuddalore', headquarters: 'Cuddalore', lat: 11.7480, lng: 79.7714, pinCodePrefix: '607' },
  { id: 'dharmapuri', name: 'Dharmapuri', headquarters: 'Dharmapuri', lat: 12.1211, lng: 78.1582, pinCodePrefix: '636' },
  { id: 'kallakurichi', name: 'Kallakurichi', headquarters: 'Kallakurichi', lat: 11.7383, lng: 78.9639, pinCodePrefix: '606' },
  { id: 'kanyakumari', name: 'Kanyakumari', headquarters: 'Nagercoil', lat: 8.1833, lng: 77.4119, pinCodePrefix: '629' },
  { id: 'karur', name: 'Karur', headquarters: 'Karur', lat: 10.9601, lng: 78.0766, pinCodePrefix: '639' },
  { id: 'krishnagiri', name: 'Krishnagiri', headquarters: 'Krishnagiri', lat: 12.5186, lng: 78.2138, pinCodePrefix: '635' },
  { id: 'mayiladuthurai', name: 'Mayiladuthurai', headquarters: 'Mayiladuthurai', lat: 11.1075, lng: 79.6524, pinCodePrefix: '609' },
  { id: 'nagapattinam', name: 'Nagapattinam', headquarters: 'Nagapattinam', lat: 10.7672, lng: 79.8449, pinCodePrefix: '611' },
  { id: 'namakkal', name: 'Namakkal', headquarters: 'Namakkal', lat: 11.2189, lng: 78.1674, pinCodePrefix: '637' },
  { id: 'nilgiris', name: 'Nilgiris', headquarters: 'Udhagamandalam', lat: 11.4102, lng: 76.6950, pinCodePrefix: '643' },
  { id: 'perambalur', name: 'Perambalur', headquarters: 'Perambalur', lat: 11.2342, lng: 78.8820, pinCodePrefix: '621' },
  { id: 'pudukkottai', name: 'Pudukkottai', headquarters: 'Pudukkottai', lat: 10.3797, lng: 78.8208, pinCodePrefix: '622' },
  { id: 'ramanathapuram', name: 'Ramanathapuram', headquarters: 'Ramanathapuram', lat: 9.3639, lng: 78.8395, pinCodePrefix: '623' },
  { id: 'ranipet', name: 'Ranipet', headquarters: 'Ranipet', lat: 12.9274, lng: 79.3330, pinCodePrefix: '632' },
  { id: 'sivaganga', name: 'Sivaganga', headquarters: 'Sivaganga', lat: 9.8433, lng: 78.4809, pinCodePrefix: '630' },
  { id: 'tenkasi', name: 'Tenkasi', headquarters: 'Tenkasi', lat: 8.9594, lng: 77.3150, pinCodePrefix: '627' },
  { id: 'theni', name: 'Theni', headquarters: 'Theni', lat: 10.0104, lng: 77.4768, pinCodePrefix: '625' },
  { id: 'thoothukudi', name: 'Thoothukudi', headquarters: 'Thoothukudi', lat: 8.7642, lng: 78.1348, pinCodePrefix: '628' },
  { id: 'tirupathur', name: 'Tirupathur', headquarters: 'Tirupathur', lat: 12.4958, lng: 78.5678, pinCodePrefix: '635' },
  { id: 'tiruppur', name: 'Tiruppur', headquarters: 'Tiruppur', lat: 11.1085, lng: 77.3411, pinCodePrefix: '641' },
  { id: 'tiruvannamalai', name: 'Tiruvannamalai', headquarters: 'Tiruvannamalai', lat: 12.2253, lng: 79.0747, pinCodePrefix: '606' },
  { id: 'tiruvarur', name: 'Tiruvarur', headquarters: 'Tiruvarur', lat: 10.7725, lng: 79.6365, pinCodePrefix: '610' },
  { id: 'ariyalur', name: 'Ariyalur', headquarters: 'Ariyalur', lat: 11.1401, lng: 79.0786, pinCodePrefix: '621' },
  { id: 'viluppuram', name: 'Viluppuram', headquarters: 'Viluppuram', lat: 11.9401, lng: 79.4861, pinCodePrefix: '605' },
  { id: 'virudhunagar', name: 'Virudhunagar', headquarters: 'Virudhunagar', lat: 9.5872, lng: 77.9579, pinCodePrefix: '626' },
];

/**
 * Validates whether geographic coordinates (lat, lng) lie within the actual boundary
 * of Tamil Nadu, India.
 *
 * Geographical extremes of Tamil Nadu:
 * - South: ~8.08° N (Cape Comorin, Kanyakumari)
 * - North: ~13.55° N (Gummidipoondi, Tiruvallur border with Andhra Pradesh)
 * - West: ~76.24° E (Nilgiris / Anaimalai Hills bordering Kerala/Karnataka)
 * - East: ~80.35° E (Bay of Bengal coast / Point Calimere / Chennai)
 */
export function isInsideTamilNadu(lat: number, lng: number): boolean {
  // Broad bounding box check
  if (lat < 8.05 || lat > 13.55) {
    return false;
  }
  if (lng < 76.15 || lng > 80.35) {
    return false;
  }

  // Refined border exclusions:
  // Exclude Bengaluru / Karnataka plateau north-west of Krishnagiri (Lat > 12.8° and Lng < 77.7°)
  if (lat > 12.85 && lng < 77.65) {
    return false;
  }

  // Exclude Arabian Sea / Kerala coastal belt south-west of Western Ghats
  // e.g. Trivandrum/Kollam (Lat < 9.1° and Lng < 76.9°)
  if (lat < 9.1 && lng < 76.95) {
    return false;
  }

  // e.g. Kochi/Thrissur coastal plain (Lat between 9.8° and 10.6° and Lng < 76.4°)
  if (lat >= 9.8 && lat <= 10.6 && lng < 76.4) {
    return false;
  }

  return true;
}

/**
 * Looks up a Tamil Nadu district by its official name (case-insensitive).
 */
export function getTamilNaduDistrictByName(name: string): TamilNaduDistrict | null {
  const target = name.trim().toLowerCase();
  if (!target) return null;
  return (
    TAMIL_NADU_DISTRICTS.find(
      (district) =>
        district.name.toLowerCase() === target ||
        district.headquarters.toLowerCase() === target ||
        district.id.toLowerCase() === target
    ) ?? null
  );
}

/**
 * Finds the Tamil Nadu district whose central coordinates are closest to the
 * supplied latitude/longitude. Used to label validated GPS pincodes.
 */
export function findNearestTamilNaduDistrict(
  lat: number,
  lng: number
): TamilNaduDistrict | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let nearest: TamilNaduDistrict | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const district of TAMIL_NADU_DISTRICTS) {
    const dLat = district.lat - lat;
    const dLng = district.lng - lng;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = district;
    }
  }

  return nearest;
}

/**
 * Validates Indian Postal PIN codes for Tamil Nadu state.
 * Tamil Nadu PIN codes range strictly from 600001 to 643253 (all start with digit '6').
 */
export function isValidTamilNaduPinCode(pin: string): boolean {
  const cleaned = pin.trim();
  if (!/^\d{6}$/.test(cleaned)) return false;
  const num = parseInt(cleaned, 10);
  return num >= 600001 && num <= 643999;
}
