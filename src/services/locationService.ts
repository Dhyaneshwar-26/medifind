import {
  findNearestTamilNaduDistrict,
  getTamilNaduDistrictByName,
  isInsideTamilNadu,
  isValidTamilNaduPinCode,
  TAMIL_NADU_DISTRICTS,
  type TamilNaduDistrict,
} from '../data/tamilNadu';
import { checkTamilNaduBoundary, isValidCoordinatePair } from '../utils/tamilNaduBoundary';

export interface LocationValidationResult {
  isValid: boolean;
  message: string;
  district?: TamilNaduDistrict | null;
  reason?: 'invalid_coordinates' | 'outside_tamil_nadu' | 'puducherry_or_karaikal' | 'invalid_district' | 'invalid_pin';
}

/**
 * Validates live GPS coordinates against the Tamil Nadu polygon.
 * Never falls back silently: callers must show the returned message.
 */
export function validateUserCoordinates(lat: number, lng: number): LocationValidationResult {
  if (!isValidCoordinatePair(lat, lng)) {
    return {
      isValid: false,
      reason: 'invalid_coordinates',
      message: 'Invalid GPS coordinates received. Please select a Tamil Nadu district manually.',
    };
  }

  const boundary = checkTamilNaduBoundary(lat, lng);
  if (!boundary.inside) {
    return {
      isValid: false,
      reason: boundary.reason === 'puducherry_or_karaikal' ? 'puducherry_or_karaikal' : 'outside_tamil_nadu',
      message:
        boundary.reason === 'puducherry_or_karaikal'
          ? 'This pin is inside the Puducherry/Karaikal union territory enclave. MediFind currently serves Tamil Nadu only.'
          : 'MediFind is currently available only in Tamil Nadu.',
    };
  }

  const nearest = findNearestTamilNaduDistrict(lat, lng);
  return {
    isValid: true,
    district: nearest,
    message: `Tamil Nadu location verified${nearest ? ` near ${nearest.name} district` : ''} (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E).`,
  };
}

export function validatePharmacyLocation(input: {
  district: string;
  pinCode?: string;
  latitude: number;
  longitude: number;
}): LocationValidationResult {
  const district = getTamilNaduDistrictByName(input.district);
  if (!district) {
    return {
      isValid: false,
      reason: 'invalid_district',
      message: 'Please select one of the 38 official Tamil Nadu districts.',
    };
  }

  if (input.pinCode && !isValidTamilNaduPinCode(input.pinCode)) {
    return {
      isValid: false,
      reason: 'invalid_pin',
      message: 'PIN code must be a valid 6-digit Tamil Nadu postal code (600001–643999).',
    };
  }

  if (!isValidCoordinatePair(input.latitude, input.longitude)) {
    return {
      isValid: false,
      reason: 'invalid_coordinates',
      message: 'Enter valid latitude and longitude values for the pharmacy.',
    };
  }

  if (!isInsideTamilNadu(input.latitude, input.longitude)) {
    return {
      isValid: false,
      reason: 'outside_tamil_nadu',
      message: 'MediFind operates only within Tamil Nadu. The pharmacy coordinates are outside the state boundary.',
    };
  }

  return {
    isValid: true,
    district,
    message: `Location verified inside ${district.name} district, Tamil Nadu.`,
  };
}

export function getDistrictCentre(districtName: string): TamilNaduDistrict | null {
  return getTamilNaduDistrictByName(districtName);
}

export function getManualDistrictOptions(): TamilNaduDistrict[] {
  return TAMIL_NADU_DISTRICTS;
}

export function describeLocationError(result: LocationValidationResult): string {
  return result.message;
}
