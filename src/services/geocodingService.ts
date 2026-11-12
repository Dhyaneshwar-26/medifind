/**
 * Address geocoding for pharmacy registration / profile editing.
 *
 * Uses the public OpenStreetMap Nominatim search API. The app never invents a
 * fallback coordinate: if the address cannot be resolved the caller must show
 * an error and let the owner place the pin manually.
 */
import { TAMIL_NADU_DISTRICTS } from '../data/tamilNadu';
import { checkTamilNaduBoundary, isValidCoordinatePair } from '../utils/tamilNaduBoundary';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_TIMEOUT_MS = 9000;
/** Nominatim asks clients to make at most one request per second. */
const ATTEMPT_DELAY_MS = 1100;
const MAX_ATTEMPTS = 4;

export interface GeocodeLocation {
  lat: number;
  lng: number;
  displayName: string;
  /** The simplified query that produced this match. */
  query: string;
}

export interface GeocodeResult {
  location: GeocodeLocation | null;
  attempts: string[];
  error?: string;
  outsideTamilNadu?: boolean;
}

export interface PharmacyAddressParts {
  address: string;
  area?: string;
  district?: string;
  pinCode?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name?: string;
}

function normalizeText(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,+/g, ',')
    .replace(/^,|,$/g, '')
    .trim();
}

/**
 * Removes door/plot number segments ("Old No. 66/1", "New No. 42") so a
 * detailed Indian address can still match its street/locality.
 */
function stripDoorNumbers(value: string): string {
  return value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => {
      if (/^(old|new)?\s*(no\.?|number|plot|door)\s*[\d/]/i.test(segment)) return false;
      if (/^[\d/]+\s*[a-z]?$/i.test(segment)) return false;
      return true;
    })
    .join(', ');
}

export function buildGeocodeQueries(input: PharmacyAddressParts): string[] {
  const queries: string[] = [];
  const fullAddress = normalizeText(input.address || '');

  if (fullAddress) {
    queries.push(fullAddress);
    const withoutDoorNumbers = stripDoorNumbers(fullAddress);
    if (withoutDoorNumbers && withoutDoorNumbers !== fullAddress) {
      queries.push(withoutDoorNumbers);
    }
  }

  const area = normalizeText(input.area || '');
  const district = normalizeText(input.district || '');
  const pinCode = normalizeText(input.pinCode || '');

  const locality = [area, district].filter(Boolean).join(', ');
  if (locality) {
    queries.push([locality, pinCode, 'Tamil Nadu', 'India'].filter(Boolean).join(', '));
    queries.push([locality, 'Tamil Nadu', 'India'].filter(Boolean).join(', '));
  }

  // Preserve order while removing duplicates / empty entries.
  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))].slice(0, MAX_ATTEMPTS);
}

function extractPlaces(payload: unknown): NominatimPlace[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter((item): item is NominatimPlace => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.lat === 'string' && typeof candidate.lon === 'string';
  });
}

async function requestPlaces(query: string): Promise<NominatimPlace[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'in');
    url.searchParams.set('accept-language', 'en');
    url.searchParams.set('q', query);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });

    if (response.status === 429) {
      throw new Error(
        'Address lookup is temporarily rate-limited. Wait a moment, then try again or place the pin manually.'
      );
    }
    if (!response.ok) {
      throw new Error(
        `Address lookup failed (HTTP ${response.status}). Place the pin manually on the map.`
      );
    }

    return extractPlaces(await response.json());
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Address lookup timed out. Place the pin manually on the map.');
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Could not reach the address lookup service. Check your internet connection and place the pin manually.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempts to geocode a pharmacy address, preferring matches inside Tamil Nadu.
 * A match outside Tamil Nadu is reported as an error, never silently used.
 */
export async function geocodePharmacyAddress(input: PharmacyAddressParts): Promise<GeocodeResult> {
  const attempts = buildGeocodeQueries(input);

  if (attempts.length === 0) {
    return {
      location: null,
      attempts,
      error: 'Enter the pharmacy address or area first, then try locating it on the map.',
    };
  }

  let outsideMatch: GeocodeLocation | null = null;
  let lastError: string | undefined;

  for (let index = 0; index < attempts.length; index += 1) {
    const query = attempts[index];

    if (index > 0) {
      await delay(ATTEMPT_DELAY_MS);
    }

    let places: NominatimPlace[];
    try {
      places = await requestPlaces(query);
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Address lookup failed. Place the pin manually.';
      break;
    }

    for (const place of places) {
      const lat = Number(place.lat);
      const lng = Number(place.lon);
      if (!isValidCoordinatePair(lat, lng)) continue;

      const candidate: GeocodeLocation = {
        lat,
        lng,
        displayName: place.display_name || query,
        query,
      };

      if (checkTamilNaduBoundary(lat, lng).inside) {
        return {
          location: candidate,
          attempts: attempts.slice(0, index + 1),
        };
      }

      if (!outsideMatch) outsideMatch = candidate;
    }
  }

  if (outsideMatch) {
    return {
      location: null,
      attempts,
      outsideTamilNadu: true,
      error: `The address search matched "${outsideMatch.displayName}", which is outside Tamil Nadu. Move the pin to the correct Tamil Nadu location manually.`,
    };
  }

  return {
    location: null,
    attempts,
    error:
      lastError ||
      'No matching location was found for that address. Adjust the address, or click the map to place the pin manually.',
  };
}

/* ------------------------------------------------------------------------- */
/* Reverse geocoding: coordinates -> address parts                            */
/* ------------------------------------------------------------------------- */

export interface ReverseGeocodeAddress {
  lat: number;
  lng: number;
  displayName: string;
  /** Building / house number, only when Nominatim actually returned one. */
  houseNumber?: string;
  /** Street or road name. */
  street?: string;
  /** Neighbourhood / locality. */
  area?: string;
  /** City / town / village. */
  city?: string;
  /** Raw district value returned by Nominatim. */
  district?: string;
  /** The matching one of Tamil Nadu's 38 district names, when recognised. */
  matchedDistrict?: string;
  state?: string;
  /** PIN code, only when Nominatim returned a valid Tamil Nadu PIN. */
  pinCode?: string;
  /** Ready-to-use text for the "Complete Shop Address" field. */
  addressLine?: string;
}

interface NominatimReverseAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  residential?: string;
  footway?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  city_district?: string;
  state_district?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
}

interface NominatimReverseResponse {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimReverseAddress;
  error?: string;
}

/** Common alternate spellings that Nominatim and postal records may return. */
const DISTRICT_ALIASES: Record<string, string> = {
  kancheepuram: 'Kanchipuram',
  kanceepuram: 'Kanchipuram',
  thoothukkudi: 'Thoothukudi',
  tuticorin: 'Thoothukudi',
  tiruchirappalli: 'Tiruchirappalli',
  trichy: 'Tiruchirappalli',
  tirunelveli: 'Tirunelveli',
  tiruppur: 'Tiruppur',
  tiruvallur: 'Tiruvallur',
  thiruvallur: 'Tiruvallur',
  viluppuram: 'Viluppuram',
  villupuram: 'Viluppuram',
  the_nilgiris: 'Nilgiris',
  nilgiris: 'Nilgiris',
  udhagamandalam: 'Nilgiris',
};

function cleanSegment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = normalizeText(value);
  return cleaned || undefined;
}

function matchTamilNaduDistrict(value: string | undefined): string | undefined {
  const raw = cleanSegment(value);
  if (!raw) return undefined;

  const normalized = raw.toLowerCase().replace(/district/g, '').replace(/[^a-z]/g, '');
  if (!normalized) return undefined;

  const alias = DISTRICT_ALIASES[normalized];
  if (alias) return alias;

  const direct = TAMIL_NADU_DISTRICTS.find(
    (item) => item.name.toLowerCase().replace(/[^a-z]/g, '') === normalized
  );
  if (direct) return direct.name;

  // Handle values such as "Chennai Metropolitan Area" or "Tirunelveli Kattabo".
  const prefixed = TAMIL_NADU_DISTRICTS.find((item) => {
    const name = item.name.toLowerCase().replace(/[^a-z]/g, '');
    return name.length >= 5 && (normalized.startsWith(name) || name.startsWith(normalized));
  });
  return prefixed?.name;
}

function joinAddressParts(parts: Array<string | undefined>): string | undefined {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const part of parts) {
    const value = cleanSegment(part);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }

  return unique.length > 0 ? unique.join(', ') : undefined;
}

/**
 * Resolve the address for a confirmed/manual pin using OpenStreetMap Nominatim.
 *
 * The pin coordinates are never changed by this function: if lookup fails the
 * caller keeps the coordinates and lets the owner type the address manually.
 * The PIN code is only returned when Nominatim actually supplies a valid
 * Tamil Nadu PIN — it is never derived or invented.
 */
export async function reverseGeocodePharmacyLocation(
  lat: number,
  lng: number
): Promise<ReverseGeocodeAddress> {
  if (!isValidCoordinatePair(lat, lng)) {
    throw new Error('The pin coordinates are invalid, so the address could not be looked up.');
  }
  if (!checkTamilNaduBoundary(lat, lng).inside) {
    throw new Error('The pin is outside Tamil Nadu, so no address was looked up.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18');
    url.searchParams.set('accept-language', 'en');
    url.searchParams.set('lat', lat.toFixed(7));
    url.searchParams.set('lon', lng.toFixed(7));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });

    if (response.status === 429) {
      throw new Error(
        'Address lookup is temporarily rate-limited. Wait a moment, or type the address manually.'
      );
    }
    if (!response.ok) {
      throw new Error(
        `Address lookup failed (HTTP ${response.status}). Type the address manually.`
      );
    }

    const payload = (await response.json()) as NominatimReverseResponse;
    const address = payload.address;

    if (payload.error || !address) {
      throw new Error('No address details were found for this pin. Type the address manually.');
    }

    const houseNumber = cleanSegment(address.house_number);
    const street =
      cleanSegment(address.road) ||
      cleanSegment(address.pedestrian) ||
      cleanSegment(address.residential) ||
      cleanSegment(address.footway);
    const area =
      cleanSegment(address.neighbourhood) ||
      cleanSegment(address.quarter) ||
      cleanSegment(address.suburb) ||
      cleanSegment(address.city_district) ||
      cleanSegment(address.hamlet) ||
      cleanSegment(address.village) ||
      cleanSegment(address.town) ||
      cleanSegment(address.city);
    const city =
      cleanSegment(address.city) ||
      cleanSegment(address.town) ||
      cleanSegment(address.village) ||
      cleanSegment(address.municipality);
    const district = cleanSegment(address.state_district) || cleanSegment(address.county);
    const matchedDistrict = matchTamilNaduDistrict(district);
    const state = cleanSegment(address.state);
    const rawPostcode = cleanSegment(address.postcode)?.replace(/\s+/g, '');
    // Only accept a real Tamil Nadu PIN that the service actually returned.
    const pinCode = rawPostcode && /^6[0-9]{5}$/.test(rawPostcode) ? rawPostcode : undefined;

    const addressLine =
      houseNumber || street
        ? joinAddressParts([houseNumber, street, area]) ||
          joinAddressParts(payload.display_name?.split(',').slice(0, 3) ?? [])
        : joinAddressParts(payload.display_name?.split(',').slice(0, 3) ?? []) ||
          joinAddressParts([houseNumber, street, area]);

    return {
      lat,
      lng,
      displayName: cleanSegment(payload.display_name) || addressLine || `${lat}, ${lng}`,
      houseNumber,
      street,
      area,
      city,
      district,
      matchedDistrict,
      state,
      pinCode,
      addressLine,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Address lookup timed out. The pin coordinates are kept; type the address manually.');
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Could not reach the address lookup service. The pin coordinates are kept; type the address manually.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
