import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  AlertCircle,
  CheckCircle2,
  Crosshair,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilNadu';
import {
  geocodePharmacyAddress,
  reverseGeocodePharmacyLocation,
  type ReverseGeocodeAddress,
} from '../services/geocodingService';
import { checkTamilNaduBoundary, isValidCoordinatePair } from '../utils/tamilNaduBoundary';

export interface LocationPickerValue {
  lat: number;
  lng: number;
}

interface LocationPickerMapProps {
  /** Draft pin position. `null` means no pin has been placed yet. */
  value: LocationPickerValue | null;
  /** Pin the owner explicitly confirmed. */
  confirmedValue: LocationPickerValue | null;
  onDraftChange: (value: LocationPickerValue | null) => void;
  onConfirm: (value: LocationPickerValue) => void;
  /** Called after a GPS/manual pin move settles and the address is resolved. */
  onAddressResolved?: (address: ReverseGeocodeAddress) => void;
  address: string;
  area?: string;
  district: string;
  pinCode?: string;
  disabled?: boolean;
}

type LookupState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string | null;
};

const TAMIL_NADU_CENTRE: LocationPickerValue = { lat: 11.1271, lng: 78.6569 };
const COORDINATE_EPSILON = 1e-7;
/** Nominatim asks clients to make at most one request per second. */
const REVERSE_DEBOUNCE_MS = 1100;

function samePoint(a: LocationPickerValue | null, b: LocationPickerValue | null): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.lat - b.lat) <= COORDINATE_EPSILON &&
    Math.abs(a.lng - b.lng) <= COORDINATE_EPSILON
  );
}

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-pharmacy-pin',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #087F5B 0%, #087E9B 100%);
        border: 3px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 20px rgba(8, 127, 91, 0.45), 0 0 0 4px rgba(245, 158, 11, 0.45);
      ">
        <svg style="transform: rotate(45deg); width: 19px; height: 19px; fill: none; stroke: #ffffff; stroke-width: 2.8; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24">
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"></path>
          <circle cx="12" cy="10" r="2.5"></circle>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  value,
  confirmedValue,
  onDraftChange,
  onConfirm,
  onAddressResolved,
  address,
  area,
  district,
  pinCode,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const draggingRef = useRef(false);
  const suppressNextPanRef = useRef(false);

  const callbacksRef = useRef({ onDraftChange, onConfirm, onAddressResolved, disabled });
  callbacksRef.current = { onDraftChange, onConfirm, onAddressResolved, disabled };

  /** True only after the owner explicitly placed/moved the pin (GPS, click, drag). */
  const interactionRef = useRef(false);
  const lastReverseKeyRef = useRef<string | null>(null);

  const [lookupState, setLookupState] = useState<LookupState>({ status: 'idle', message: null });
  const [geolocationState, setGeolocationState] = useState<LookupState>({
    status: 'idle',
    message: null,
  });
  const [reverseState, setReverseState] = useState<LookupState>({ status: 'idle', message: null });
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const districtCentre = useMemo<LocationPickerValue>(() => {
    const match = TAMIL_NADU_DISTRICTS.find((item) => item.name === district);
    return match ? { lat: match.lat, lng: match.lng } : TAMIL_NADU_CENTRE;
  }, [district]);

  const initialViewRef = useRef({
    lat: value && isValidCoordinatePair(value.lat, value.lng) ? value.lat : districtCentre.lat,
    lng: value && isValidCoordinatePair(value.lat, value.lng) ? value.lng : districtCentre.lng,
    zoom: value ? 16 : 12,
  });

  const boundary = value ? checkTamilNaduBoundary(value.lat, value.lng) : null;
  const isValidPin = Boolean(boundary?.inside);
  const isConfirmed = isValidPin && samePoint(value, confirmedValue);

  // Create the Leaflet map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initialViewRef.current.lat, initialViewRef.current.lng],
      zoom: initialViewRef.current.zoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      if (callbacksRef.current.disabled) return;
      interactionRef.current = true;
      callbacksRef.current.onDraftChange({
        lat: Number(event.latlng.lat.toFixed(7)),
        lng: Number(event.latlng.lng.toFixed(7)),
      });
    });

    mapRef.current = map;

    // Leaflet needs a second measurement after the browser has laid out the
    // container (especially inside tabs / animated sections), otherwise it
    // can keep a 0x0 viewport and draw nothing.
    const rafId = window.requestAnimationFrame(() => {
      if (!mapRef.current) return;
      map.invalidateSize();
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    // Also recalculate when the picker scrolls into view or its tab becomes
    // visible after being hidden.
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && containerRef.current) {
      intersectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting) && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      intersectionObserver.observe(containerRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Keep the marker in sync with the draft pin (click, drag, geocode, GPS).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!value || !isValidCoordinatePair(value.lat, value.lng)) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      const marker = L.marker([value.lat, value.lng], {
        icon: pinIcon(),
        draggable: !disabled,
        autoPan: true,
        keyboard: false,
      });

      marker.on('dragstart', () => {
        draggingRef.current = true;
      });

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        draggingRef.current = false;
        suppressNextPanRef.current = true;
        interactionRef.current = true;
        callbacksRef.current.onDraftChange({
          lat: Number(position.lat.toFixed(7)),
          lng: Number(position.lng.toFixed(7)),
        });
      });

      marker.addTo(map);
      markerRef.current = marker;
    } else {
      const current = markerRef.current.getLatLng();
      if (
        Math.abs(current.lat - value.lat) > COORDINATE_EPSILON ||
        Math.abs(current.lng - value.lng) > COORDINATE_EPSILON
      ) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      }
      if (disabled) {
        markerRef.current.dragging?.disable();
      } else {
        markerRef.current.dragging?.enable();
      }
    }

    if (suppressNextPanRef.current) {
      suppressNextPanRef.current = false;
    } else {
      map.invalidateSize();
      map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), { duration: 0.4 });
    }
  }, [value, disabled]);

  // When there is no pin yet, follow the selected district.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || value) return;
    map.flyTo([districtCentre.lat, districtCentre.lng], 11, { duration: 0.5 });
  }, [districtCentre, value]);

  // Reverse geocode after a GPS/manual pin move settles. Debounced so dragging
  // and rapid clicks do not flood the Nominatim API. The pin coordinates are
  // never changed here; only the address fields are offered to the parent.
  useEffect(() => {
    if (disabled) return;
    if (!value || !isValidPin) {
      setReverseState({ status: 'idle', message: null });
      return;
    }
    if (!interactionRef.current) return;

    const key = `${value.lat.toFixed(7)},${value.lng.toFixed(7)}`;
    if (key === lastReverseKeyRef.current) return;

    setReverseState({ status: 'loading', message: 'Looking up the address for this pin…' });
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const resolved = await reverseGeocodePharmacyLocation(value.lat, value.lng);
          if (cancelled) return;
          lastReverseKeyRef.current = key;
          callbacksRef.current.onAddressResolved?.(resolved);
          const filled = resolved.addressLine || resolved.displayName;
          setReverseState({
            status: 'success',
            message: `Address filled from this pin: ${filled}. Review or edit any field before confirming.`,
          });
        } catch (err) {
          if (cancelled) return;
          const message =
            err instanceof Error
              ? err.message
              : 'Address lookup failed. The pin coordinates are kept; type the address manually.';
          setReverseState({ status: 'error', message });
        } finally {
          if (!cancelled) interactionRef.current = false;
        }
      })();
    }, REVERSE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, isValidPin, disabled]);

  const handleFindAddress = async () => {
    if (disabled || lookupState.status === 'loading') return;
    setConfirmError(null);
    // A forward-geocoded pin already carries its address; do not immediately
    // reverse geocode and overwrite the text the owner just searched for.
    interactionRef.current = false;
    lastReverseKeyRef.current = null;
    setReverseState({ status: 'idle', message: null });

    if (!address.trim() && !area?.trim()) {
      setLookupState({
        status: 'error',
        message: 'Enter the complete shop address or area first, then try locating it.',
      });
      return;
    }

    setLookupState({ status: 'loading', message: 'Searching the address on OpenStreetMap…' });

    const result = await geocodePharmacyAddress({ address, area, district, pinCode });

    if (result.location) {
      const nextValue = { lat: result.location.lat, lng: result.location.lng };
      callbacksRef.current.onDraftChange(nextValue);
      setLookupState({
        status: 'success',
        message: `Address located with “${result.location.query}”. Drag the pin to the exact entrance, then confirm.`,
      });
    } else {
      setLookupState({
        status: 'error',
        message:
          result.error ||
          'No matching location was found. Click the map to place the pin manually.',
      });
    }
  };

  const handleUseCurrentLocation = () => {
    if (disabled || geolocationState.status === 'loading') return;
    setConfirmError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeolocationState({
        status: 'error',
        message: 'This browser does not support geolocation. Click the map to place the pin manually.',
      });
      return;
    }

    setGeolocationState({
      status: 'loading',
      message: 'Requesting your current location from the browser…',
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        if (!isValidCoordinatePair(lat, lng)) {
          setGeolocationState({
            status: 'error',
            message: 'The browser returned invalid coordinates. Click the map to place the pin manually.',
          });
          return;
        }

        const locationBoundary = checkTamilNaduBoundary(lat, lng);
        if (!locationBoundary.inside) {
          setGeolocationState({
            status: 'error',
            message:
              locationBoundary.reason === 'puducherry_or_karaikal'
                ? 'Your current location is inside the Puducherry/Karaikal enclave. MediFind only accepts Tamil Nadu pharmacy locations.'
                : 'Your current location is outside Tamil Nadu. Click the map to place the pin at the pharmacy entrance.',
          });
          return;
        }

        const accuracy = Math.round(position.coords.accuracy || 0);
        interactionRef.current = true;
        callbacksRef.current.onDraftChange({
          lat: Number(lat.toFixed(7)),
          lng: Number(lng.toFixed(7)),
        });
        setGeolocationState({
          status: 'success',
          message: `Using your browser location${
            accuracy > 0 ? ` (±${accuracy} m)` : ''
          }. Drag the pin to the exact pharmacy entrance, then confirm.`,
        });
      },
      (error) => {
        let message = 'Could not read your current location. Click the map to place the pin manually.';
        if (error.code === error.PERMISSION_DENIED) {
          message =
            'Location permission was denied. Click the map to place the pin manually, or allow location and try again.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Your current location is unavailable right now. Click the map to place the pin manually.';
        } else if (error.code === error.TIMEOUT) {
          message = 'The location request timed out. Click the map to place the pin manually.';
        }
        setGeolocationState({ status: 'error', message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    if (!value || !isValidPin) {
      setConfirmError(
        'Place the pin inside Tamil Nadu before confirming the pharmacy location.'
      );
      return;
    }
    setConfirmError(null);
    callbacksRef.current.onConfirm({ lat: value.lat, lng: value.lng });
  };

  return (
    <div className="p-4 rounded-2xl bg-[#EBF7F2] dark:bg-[#132B21] border border-[#087F5B]/20 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-extrabold text-[#087F5B] dark:text-[#34D399] block">
            Pin the Exact Pharmacy Location (Tamil Nadu only)
          </span>
          <span className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium">
            Search the address, use your current location, or click/drag the map pin. Confirm before saving.
          </span>
        </div>
        <MapPin className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => void handleFindAddress()}
          disabled={disabled || lookupState.status === 'loading'}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 text-white text-[11px] font-extrabold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {lookupState.status === 'loading' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Locate Address on Map</span>
        </button>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={disabled || geolocationState.status === 'loading'}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#162C24] text-[#087F5B] dark:text-[#34D399] border border-[#087F5B]/30 text-[11px] font-extrabold shadow-xs transition-all cursor-pointer hover:bg-[#F1FAF6] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {geolocationState.status === 'loading' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LocateFixed className="w-3.5 h-3.5" />
          )}
          <span>Use My Current Location</span>
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              setConfirmError(null);
              setLookupState({ status: 'idle', message: null });
              setGeolocationState({ status: 'idle', message: null });
              setReverseState({ status: 'idle', message: null });
              interactionRef.current = false;
              lastReverseKeyRef.current = null;
              callbacksRef.current.onDraftChange(null);
            }}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 dark:bg-[#11231D] text-slate-600 dark:text-slate-300 border border-slate-300/70 dark:border-[#285444] text-[11px] font-bold transition-all cursor-pointer hover:bg-white disabled:opacity-60"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove Pin</span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-900/15 dark:border-[#285444] bg-slate-100 dark:bg-[#11231D]">
        <div ref={containerRef} className="w-full h-[350px] sm:h-[400px] z-0" />
      </div>

      {lookupState.message && (
        <div
          className={`p-3 rounded-xl border text-[11px] font-semibold flex items-start gap-2 ${
            lookupState.status === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : lookupState.status === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-[#162C24] border-emerald-900/10 dark:border-[#285444] text-[#20332D] dark:text-[#E5F4EE]'
          }`}
          role="status"
          aria-live="polite"
        >
          {lookupState.status === 'loading' ? (
            <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          ) : lookupState.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{lookupState.message}</span>
        </div>
      )}

      {geolocationState.message && (
        <div
          className={`p-3 rounded-xl border text-[11px] font-semibold flex items-start gap-2 ${
            geolocationState.status === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : geolocationState.status === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-[#162C24] border-emerald-900/10 dark:border-[#285444] text-[#20332D] dark:text-[#E5F4EE]'
          }`}
          role="status"
          aria-live="polite"
        >
          {geolocationState.status === 'loading' ? (
            <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          ) : geolocationState.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{geolocationState.message}</span>
        </div>
      )}

      {reverseState.message && (
        <div
          className={`p-3 rounded-xl border text-[11px] font-semibold flex items-start gap-2 ${
            reverseState.status === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : reverseState.status === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-[#162C24] border-emerald-900/10 dark:border-[#285444] text-[#20332D] dark:text-[#E5F4EE]'
          }`}
          role="status"
          aria-live="polite"
        >
          {reverseState.status === 'loading' ? (
            <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          ) : reverseState.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{reverseState.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538]">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Latitude
          </span>
          <span className="text-xs font-extrabold tabular-nums text-[#20332D] dark:text-[#E5F4EE]">
            {value ? value.lat.toFixed(6) : '—'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538]">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Longitude
          </span>
          <span className="text-xs font-extrabold tabular-nums text-[#20332D] dark:text-[#E5F4EE]">
            {value ? value.lng.toFixed(6) : '—'}
          </span>
        </div>
      </div>

      {!value ? (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>No pin placed yet. Search the address, use your current location, or click the map.</span>
        </div>
      ) : !isValidPin ? (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This pin is outside Tamil Nadu
            {boundary?.reason === 'puducherry_or_karaikal'
              ? ' (Puducherry/Karaikal enclave).'
              : '.'}{' '}
            MediFind only accepts pharmacy locations inside Tamil Nadu. Move the pin until it turns green.
          </span>
        </div>
      ) : isConfirmed ? (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Location confirmed inside Tamil Nadu. Every change to the pin requires confirmation again.
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <Crosshair className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Location not confirmed. Drag the pin to the exact pharmacy entrance, then click Confirm Location.
          </span>
        </div>
      )}

      {confirmError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{confirmError}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={disabled || !isValidPin || isConfirmed}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:cursor-not-allowed ${
          isConfirmed
            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            : 'bg-[#087F5B] hover:bg-[#076B4D] text-white shadow-md shadow-[#087F5B]/20 disabled:opacity-50'
        }`}
      >
        {isConfirmed ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Location Confirmed</span>
          </>
        ) : (
          <>
            <Crosshair className="w-4 h-4" />
            <span>Confirm Location</span>
          </>
        )}
      </button>
    </div>
  );
};
