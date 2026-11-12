/**
 * Google Maps directions helpers.
 *
 * The destination is always the pharmacy's saved latitude/longitude. A customer
 * origin is added only when the browser already has granted geolocation
 * permission; otherwise Google Maps decides the starting point.
 */
import { checkTamilNaduBoundary, isValidCoordinatePair } from './tamilNaduBoundary';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface OpenDirectionsResult {
  ok: boolean;
  error?: string;
  /** Whether the owner's current position was used as the origin. */
  usedOrigin?: boolean;
}

export function hasValidTamilNaduCoordinates(
  coordinates: { lat: unknown; lng: unknown } | null | undefined
): coordinates is Coordinates {
  if (!coordinates) return false;
  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);
  return isValidCoordinatePair(lat, lng) && checkTamilNaduBoundary(lat, lng).inside;
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

/**
 * Builds a Google Maps directions URL. Returns `null` when the pharmacy does
 * not have a usable Tamil Nadu coordinate, so callers can show an error instead
 * of navigating to the wrong place.
 */
export function buildGoogleMapsDirectionsUrl(
  destination: Coordinates | null | undefined,
  origin?: Coordinates | null
): string | null {
  if (!hasValidTamilNaduCoordinates(destination)) return null;

  const params = new URLSearchParams({
    api: '1',
    destination: `${formatCoordinate(destination.lat)},${formatCoordinate(destination.lng)}`,
    travelmode: 'driving',
  });

  if (origin && isValidCoordinatePair(origin.lat, origin.lng)) {
    params.set('origin', `${formatCoordinate(origin.lat)},${formatCoordinate(origin.lng)}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Returns the browser location only when geolocation permission is already
 * granted. It never prompts the customer while they are opening directions.
 */
export async function getGrantedBrowserLocation(timeoutMs = 4000): Promise<Coordinates | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  try {
    if (!navigator.permissions?.query) return null;
    const permission = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    });
    if (permission.state !== 'granted') return null;

    return await new Promise<Coordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude);
          const lng = Number(position.coords.longitude);
          resolve(isValidCoordinatePair(lat, lng) ? { lat, lng } : null);
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
      );
    });
  } catch {
    return null;
  }
}

/**
 * Opens Google Maps directions in a new tab. The tab is opened synchronously
 * inside the click handler so pop-up blockers allow it, then navigated after
 * the (optional) geolocation lookup completes.
 */
export async function openDirectionsToCoordinates(
  destination: Coordinates | null | undefined
): Promise<OpenDirectionsResult> {
  const baseUrl = buildGoogleMapsDirectionsUrl(destination);
  if (!baseUrl) {
    return {
      ok: false,
      error:
        'Directions are unavailable because this pharmacy has no valid confirmed map coordinates. Please call the pharmacy instead.',
    };
  }

  if (typeof window === 'undefined') {
    return { ok: false, error: 'Directions can only be opened in a browser.' };
  }

  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    return {
      ok: false,
      error: 'Your browser blocked the new tab. Allow pop-ups for MediFind and try Directions again.',
    };
  }

  try {
    popup.opener = null;
  } catch {
    // Cross-origin restrictions can make opener read-only; the tab still works.
  }

  try {
    popup.document.title = 'Opening Google Maps directions…';
  } catch {
    // about:blank is normally same-origin; ignore if the browser disagrees.
  }

  const origin = await getGrantedBrowserLocation();

  if (popup.closed) {
    return {
      ok: false,
      error: 'The directions tab was closed before it could open. Please try again.',
    };
  }

  const finalUrl = origin ? buildGoogleMapsDirectionsUrl(destination, origin) : baseUrl;
  popup.location.replace(finalUrl ?? baseUrl);

  return { ok: true, usedOrigin: Boolean(origin) };
}
