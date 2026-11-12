import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Pharmacy, UserLocation } from '../types/pharmacy';
import { LocateFixed, MapPin, Info } from 'lucide-react';
import { formatDistance } from '../utils/distance';
import { checkTamilNaduBoundary, isValidCoordinatePair } from '../utils/tamilNaduBoundary';

interface PharmacyMapProps {
  pharmacies: Pharmacy[];
  userLocation: UserLocation;
  selectedPharmacyId: string | null;
  onSelectPharmacyFromMarker: (pharmacy: Pharmacy) => void;
  onViewDetails: (pharmacy: Pharmacy) => void;
}

const isValidLatLng = (lat: unknown, lng: unknown): boolean => {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);
};

/**
 * A pharmacy may only be plotted when its saved coordinates are finite and
 * inside the Tamil Nadu boundary. Invalid rows are skipped entirely instead of
 * being plotted at a guessed location.
 */
const hasPlottableCoordinates = (
  pharmacy: Pharmacy
): pharmacy is Pharmacy & { coordinates: { lat: number; lng: number } } => {
  const lat = Number(pharmacy?.coordinates?.lat);
  const lng = Number(pharmacy?.coordinates?.lng);
  if (!isValidCoordinatePair(lat, lng)) return false;
  return checkTamilNaduBoundary(lat, lng).inside;
};

/** Escapes untrusted pharmacy text before it is injected as HTML markup. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Neutral centre of Tamil Nadu, used only as the initial map viewport.
const TAMIL_NADU_CENTRE = { lat: 11.1271, lng: 78.6569 };

export const PharmacyMap: React.FC<PharmacyMapProps> = ({
  pharmacies,
  userLocation,
  selectedPharmacyId,
  onSelectPharmacyFromMarker,
  onViewDetails,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersMapRef = useRef<{ [key: string]: L.Marker }>({});
  const prevUserLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Only pharmacies with valid Tamil Nadu coordinates get a marker.
  const plottablePharmacies = useMemo(
    () => pharmacies.filter(hasPlottableCoordinates),
    [pharmacies]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = isValidLatLng(userLocation?.lat, userLocation?.lng)
      ? userLocation.lat
      : TAMIL_NADU_CENTRE.lat;
    const initialLng = isValidLatLng(userLocation?.lat, userLocation?.lng)
      ? userLocation.lng
      : TAMIL_NADU_CENTRE.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    prevUserLocationRef.current = { lat: initialLat, lng: initialLng };

    // Resize observer to handle hidden tabs (e.g. mobile tab toggles)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!userLocation || !isValidLatLng(userLocation.lat, userLocation.lng)) {
      if (userMarkerRef.current && markersLayerRef.current) {
        markersLayerRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    const { lat, lng, name, isLive } = userLocation;

    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #087E9B;
          border: 3.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 0 5px rgba(8, 126, 155, 0.4), 0 4px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px;">
          <div style="font-weight: 800; color: #087E9B; margin-bottom: 2px;">Your Selected Pin</div>
          <div style="color: #20332D; font-weight: 700;">${name || 'Selected Location'}</div>
          <div style="font-size: 10px; color: #087F5B; margin-top: 4px; font-weight: 600;">(${isLive ? 'Live GPS Location' : 'Tamil Nadu Reference'})</div>
        </div>
      `);

      userMarkerRef.current = marker;
    }

    // Only pan if the location genuinely changed from previous, and map container has valid dimensions
    if (prevUserLocationRef.current) {
      const delta =
        Math.abs(prevUserLocationRef.current.lat - lat) +
        Math.abs(prevUserLocationRef.current.lng - lng);

      if (delta > 0.0001) {
        prevUserLocationRef.current = { lat, lng };
        map.invalidateSize();
        const size = map.getSize();
        if (size.x > 0 && size.y > 0) {
          map.panTo([lat, lng], { animate: true });
        } else {
          map.setView([lat, lng], 12);
        }
      }
    } else {
      prevUserLocationRef.current = { lat, lng };
    }
  }, [userLocation]);

  // Update Pharmacy Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    markersMapRef.current = {};

    plottablePharmacies.forEach((pharmacy) => {
      if (!pharmacy?.coordinates || !isValidLatLng(pharmacy.coordinates.lat, pharmacy.coordinates.lng)) {
        return;
      }

      const isSelected = selectedPharmacyId === pharmacy.id;
      const isOpen = pharmacy.isOpenNow;

      // Primary Green: #087F5B, Aqua: #087E9B, Orange: #F59E0B
      const pinBg = isSelected
        ? 'linear-gradient(135deg, #087F5B 0%, #087E9B 100%)'
        : isOpen
        ? pharmacy.is24Hours
          ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
          : 'linear-gradient(135deg, #087F5B 0%, #065F46 100%)'
        : '#4B5563';

      const pinSize = isSelected ? 42 : 36;

      const pharmacyIcon = L.divIcon({
        className: 'custom-pharmacy-pin',
        html: `
          <div style="
            width: ${pinSize}px;
            height: ${pinSize}px;
            background: ${pinBg};
            border: 2.5px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${
              isSelected
                ? '0 8px 18px rgba(8, 127, 91, 0.55), 0 0 0 4px rgba(245, 158, 11, 0.7)'
                : '0 4px 12px rgba(8, 127, 91, 0.35)'
            };
          ">
            <svg style="transform: rotate(45deg); width: 18px; height: 18px; fill: none; stroke: #ffffff; stroke-width: 2.8; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
          </div>
        `,
        iconSize: [pinSize, pinSize],
        iconAnchor: [pinSize / 2, pinSize],
        popupAnchor: [0, -pinSize],
      });

      const marker = L.marker([pharmacy.coordinates.lat, pharmacy.coordinates.lng], {
        icon: pharmacyIcon,
      });

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = 'inherit';
      popupContent.style.fontSize = '12px';
      popupContent.style.lineHeight = '1.4';
      popupContent.style.padding = '4px 2px';

      popupContent.innerHTML = `
        <div style="font-weight: 800; color: #20332D; font-size: 13px; margin-bottom: 2px;">
          ${escapeHtml(pharmacy.name)}
        </div>
        <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
          ${escapeHtml(pharmacy.area)} · <span style="color: #087F5B; font-weight: 800;">${escapeHtml(formatDistance(pharmacy.distanceKm))}</span>
        </div>
        <div style="color: #334155; font-size: 11px; margin-bottom: 8px; line-height: 1.35;">
          ${escapeHtml(pharmacy.address)}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: ${
            isOpen ? (pharmacy.is24Hours ? '#D97706' : '#087F5B') : '#64748b'
          };">
            ${isOpen ? (pharmacy.is24Hours ? '● Open 24/7' : '● Open Now') : '○ Closed'}
          </span>
          <button id="popup-btn-${escapeHtml(pharmacy.id)}" style="
            background: linear-gradient(135deg, #087F5B, #087E9B);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(8, 127, 91, 0.25);
          ">
            View Details
          </button>
        </div>
      `;

      const detailsBtn = popupContent.querySelector(`#popup-btn-${pharmacy.id}`);
      if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onViewDetails(pharmacy);
        });
      }

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        onSelectPharmacyFromMarker(pharmacy);
      });

      markersGroup.addLayer(marker);
      markersMapRef.current[pharmacy.id] = marker;
    });
  }, [plottablePharmacies, selectedPharmacyId, onSelectPharmacyFromMarker, onViewDetails]);

  // Center or open popup when selectedPharmacyId changes
  useEffect(() => {
    if (!selectedPharmacyId) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    const targetMarker = markersMapRef.current[selectedPharmacyId];

    if (targetMarker) {
      const latLng = targetMarker.getLatLng();
      if (latLng && isValidLatLng(latLng.lat, latLng.lng)) {
        map.invalidateSize();
        const size = map.getSize();
        if (size.x > 0 && size.y > 0) {
          map.flyTo([latLng.lat, latLng.lng], 15, { duration: 0.6 });
        } else {
          map.setView([latLng.lat, latLng.lng], 15);
        }
        targetMarker.openPopup();
      }
    }
  }, [selectedPharmacyId]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (isValidLatLng(userLocation?.lat, userLocation?.lng)) {
      map.invalidateSize();
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.panTo([userLocation.lat, userLocation.lng], { animate: true });
      } else {
        map.setView([userLocation.lat, userLocation.lng], 13);
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-3xl overflow-hidden border-2 border-white dark:border-[#224538] shadow-xl bg-slate-100 dark:bg-[#11231D] flex flex-col ring-2 ring-[#087F5B]/10 dark:ring-black/30">
      
      {/* Polished Map Header Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
        <div className="bg-white/95 dark:bg-[#162C24]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-emerald-900/10 dark:border-[#285444] shadow-md flex items-center gap-2.5 pointer-events-auto">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#087F5B] to-[#087E9B] text-white flex items-center justify-center shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                Interactive Tamil Nadu Map
              </span>
              <span className="text-[10px] font-extrabold text-[#087F5B] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#064E3B] px-2 py-0.2 rounded-full border border-[#087F5B]/20">
                {plottablePharmacies.length} Pins
              </span>
            </div>
            <div className="text-[10px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium truncate max-w-[190px]">
              Near {userLocation?.name || 'Tamil Nadu'}
            </div>
          </div>
        </div>

        <button
          onClick={handleRecenter}
          className="bg-white/95 dark:bg-[#162C24]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-emerald-900/10 dark:border-[#285444] shadow-md text-[#20332D] dark:text-[#E5F4EE] hover:text-[#087F5B] dark:hover:text-[#34D399] transition-all pointer-events-auto flex items-center gap-1.5 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95"
          title="Center on current location"
        >
          <LocateFixed className="w-4 h-4 text-[#087E9B]" />
          <span className="hidden sm:inline">Recenter</span>
        </button>
      </div>

      {/* Actual Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] z-10" />

      {/* Map Footer helper badge */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-[11px] pointer-events-none">
        <div className="bg-white/95 dark:bg-[#162C24]/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-900/10 dark:border-[#285444] shadow-md text-[#20332D]/80 dark:text-[#E5F4EE]/80 flex items-center gap-2 pointer-events-auto">
          <Info className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#34D399] shrink-0" />
          <span className="font-semibold">Click any pin to inspect real-time hours &amp; medicine stock</span>
        </div>
      </div>
    </div>
  );
};
