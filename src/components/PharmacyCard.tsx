import React, { useState } from 'react';
import { 
  MapPin, Clock, Phone, Navigation, ArrowRight, CheckCircle2, 
  Star, HeartHandshake, ShieldCheck, Pill, Stethoscope, Droplets, Truck, AlertCircle, Loader2
} from 'lucide-react';
import { Pharmacy } from '../types/pharmacy';
import { formatDistance } from '../utils/distance';
import { openDirectionsToCoordinates } from '../utils/directions';
import { formatExpiryDate, formatRelativeTime } from '../utils/format';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  searchQuery: string;
  isSelected: boolean;
  onSelectOnMap: (pharmacy: Pharmacy) => void;
  onViewDetails: (pharmacy: Pharmacy) => void;
}

export const PharmacyCard: React.FC<PharmacyCardProps> = ({
  pharmacy,
  searchQuery,
  isSelected,
  onSelectOnMap,
  onViewDetails,
}) => {
  // Find matched medicines from search query
  const queryLower = searchQuery.trim().toLowerCase();
  const matchedMedicines = queryLower
    ? pharmacy.sampleMedicines.filter((m) =>
        [m.name, m.genericName, m.brand, m.category, m.strength, m.dosageForm]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(queryLower))
      )
    : [];

  const availableMedicines = pharmacy.sampleMedicines.filter(
    (m) => m.inStock && !m.isExpired && m.stockQuantity > 0
  );

  // Helper icon for services
  const getServiceIcon = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes('delivery')) return <Truck className="w-3.5 h-3.5" />;
    if (s.includes('vaccine') || s.includes('cold chain')) return <Droplets className="w-3.5 h-3.5" />;
    if (s.includes('pressure') || s.includes('emergency')) return <HeartHandshake className="w-3.5 h-3.5" />;
    if (s.includes('prescription')) return <Pill className="w-3.5 h-3.5" />;
    return <ShieldCheck className="w-3.5 h-3.5" />;
  };

  // Google Maps directions always target this pharmacy's saved coordinates.
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [isOpeningDirections, setIsOpeningDirections] = useState(false);

  const handleDirections = async () => {
    if (isOpeningDirections) return;
    setDirectionsError(null);
    setIsOpeningDirections(true);
    try {
      const result = await openDirectionsToCoordinates(pharmacy.coordinates);
      if (!result.ok) {
        setDirectionsError(result.error || 'Could not open directions for this pharmacy.');
      }
    } finally {
      setIsOpeningDirections(false);
    }
  };

  return (
    <article
      id={`pharmacy-card-${pharmacy.id}`}
      className={`group relative bg-white dark:bg-[#162C24] rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col shadow-sm hover:shadow-xl ${
        isSelected
          ? 'border-[#087F5B] dark:border-[#34D399] ring-4 ring-[#087F5B]/20 dark:ring-[#34D399]/20 shadow-lg scale-[1.01]'
          : 'border-emerald-900/10 dark:border-[#24463B] hover:border-[#087F5B]/50 dark:hover:border-[#34D399]/50 hover:-translate-y-1'
      }`}
    >
      {/* Top Visual Thumbnail */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100 dark:bg-[#11231D]">
        <img
          src={pharmacy.imageUrl}
          alt={pharmacy.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = '/src/assets/images/pharmacy_interior_modern_1794119274302.jpg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs shadow-sm backdrop-blur-xs ${
              pharmacy.isOpenNow
                ? pharmacy.is24Hours
                  ? 'bg-[#F59E0B] text-amber-950 border border-amber-300'
                  : 'bg-[#087F5B] text-white border border-emerald-400'
                : 'bg-slate-800 text-slate-200 border border-slate-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                pharmacy.isOpenNow ? 'bg-white animate-soft-pulse' : 'bg-slate-400'
              }`}
            />
            <span>{pharmacy.isOpenNow ? (pharmacy.is24Hours ? 'Open 24/7' : 'Open Now') : 'Closed'}</span>
          </span>

          {/* Distance Indicator Pill */}
          <div className="inline-flex items-center gap-1.5 text-[#20332D] font-extrabold tabular-nums text-xs bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md border border-white/60">
            <Navigation className="w-3.5 h-3.5 text-[#087E9B] shrink-0" />
            <span>{formatDistance(pharmacy.distanceKm)}</span>
          </div>
        </div>

        {/* Bottom Title on Image */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            {pharmacy.reviewCount > 0 ? (
              <>
                <span className="text-[#FCD34D] flex items-center gap-1 text-xs font-extrabold">
                  <Star className="w-3.5 h-3.5 fill-[#FCD34D]" />
                  <span>{pharmacy.rating.toFixed(1)}</span>
                </span>
                <span className="text-white/70 text-xs font-medium">({pharmacy.reviewCount} reviews)</span>
              </>
            ) : (
              <span className="text-[#A7F3D0] text-xs font-extrabold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Registered pharmacy
              </span>
            )}
            <span className="text-white/40">·</span>
            <span className="text-xs text-[#A7F3D0] font-bold">{pharmacy.area}</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight drop-shadow-sm">
            {pharmacy.name}
          </h3>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-3.5">
        
        {/* Full Address */}
        <div className="flex items-start gap-2 text-xs text-[#20332D]/75 dark:text-[#E5F4EE]/75">
          <MapPin className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
          <span className="leading-relaxed line-clamp-2 font-medium">{pharmacy.address}</span>
        </div>

        {/* Hours & Contact Grid with Soft Colorful Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-2xl bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] flex items-center gap-2 text-[#20332D] dark:text-[#E5F4EE] truncate">
            <Clock className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#34D399] shrink-0" />
            <span className="truncate font-semibold">{pharmacy.openingHours}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#EBF7FA] dark:bg-[#142A33] border border-[#087E9B]/20 dark:border-[#1E4554] flex items-center gap-2 text-[#087E9B] dark:text-[#38BDF8] truncate">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <a
              href={`tel:${pharmacy.phone.replace(/[^0-9+]/g, '')}`}
              className="truncate font-bold hover:underline"
            >
              {pharmacy.phone}
            </a>
          </div>
        </div>

        {/* Straight-line distance and stock audit info (no fabricated travel times) */}
        <div className="text-[11px] text-[#20332D]/65 dark:text-[#E5F4EE]/65 space-y-1.5 px-1">
          <div className="flex items-center justify-between">
            <span>Straight-line distance:</span>
            <span
              className="font-extrabold text-[#20332D] dark:text-[#E5F4EE] bg-[#F1FAF6] dark:bg-[#11231D] px-2.5 py-0.5 rounded-lg border border-emerald-900/10 dark:border-[#224538]"
              title="Geometric distance from your selected location, not a driving distance"
            >
              {formatDistance(pharmacy.distanceKm)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              <span className="font-extrabold text-[#087F5B] dark:text-[#34D399]">{availableMedicines.length}</span>{' '}
              medicine{availableMedicines.length === 1 ? '' : 's'} reported available
            </span>
            <span className="shrink-0">Updated: {pharmacy.lastStockAudit || 'No stock updates yet'}</span>
          </div>
        </div>

        {/* Matched Medicine Highlight with Live Stock & Last Updated Time */}
        {queryLower && matchedMedicines.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#D1FAE5]/80 via-[#FEF3C7]/60 to-[#D1FAE5]/80 dark:from-[#064E3B]/40 dark:via-[#451A03]/30 dark:to-[#064E3B]/40 border border-[#087F5B]/30 text-xs shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[#065F46] dark:text-[#6EE7B7] font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0" />
                <span>Found for &ldquo;{queryLower}&rdquo;:</span>
              </div>
              <span className="text-[10px] text-[#B45309] dark:text-[#FCD34D] font-bold">
                Live Stock Data
              </span>
            </div>

            <div className="space-y-1.5">
              {matchedMedicines.map((m) => {
                const expired = m.isExpired === true;
                const lowStock = !expired && m.availabilityStatus === 'low_stock';
                const available = !expired && m.stockQuantity > 0 && m.inStock;
                return (
                  <div
                    key={m.id}
                    className="p-2 bg-white dark:bg-[#162C24] rounded-xl border border-[#087F5B]/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-extrabold text-[#087F5B] dark:text-[#34D399] block truncate">
                        {m.name}{' '}
                        <span className="text-[#20332D]/50 dark:text-[#E5F4EE]/50 font-normal text-[11px]">
                          ({[m.strength, m.dosageForm].filter(Boolean).join(' ') || m.dosage})
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {m.brand || m.genericName ? `${m.brand || m.genericName} · ` : ''}
                        Last reported: {m.lastUpdatedAt ? formatRelativeTime(m.lastUpdatedAt) : m.lastUpdated || 'Not recorded'}
                      </span>
                      {m.expiryDate && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Expiry: {formatExpiryDate(m.expiryDate)}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                        expired
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : available
                            ? lowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-[#D1FAE5] text-[#065F46] dark:bg-[#064E3B] dark:text-[#6EE7B7]'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {expired
                          ? 'Expired'
                          : available
                            ? lowStock
                              ? `Low stock · ${m.stockQuantity}`
                              : `${m.stockQuantity} in stock`
                            : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Service Badges with Colorful Category Tinting & Icons */}
        <div>
          <span className="text-[11px] font-bold text-[#20332D]/50 dark:text-[#E5F4EE]/50 uppercase tracking-wider block mb-1.5">
            Key Services
          </span>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {pharmacy.services.map((service, idx) => {
              const colorSchemes = [
                'bg-[#EBF7F2] dark:bg-[#132B21] text-[#087F5B] dark:text-[#34D399] border-[#087F5B]/25',
                'bg-[#EBF7FA] dark:bg-[#132A33] text-[#087E9B] dark:text-[#38BDF8] border-[#087E9B]/25',
                'bg-[#FEF6EE] dark:bg-[#2B1F17] text-[#B45309] dark:text-[#FCD34D] border-[#F59E0B]/30',
                'bg-[#F6F2FF] dark:bg-[#251B38] text-[#805AD5] dark:text-[#C084FC] border-[#805AD5]/30',
              ];
              const scheme = colorSchemes[idx % colorSchemes.length];

              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border font-bold ${scheme}`}
                >
                  {getServiceIcon(service)}
                  <span>{service}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Card Footer Actions: Directions, Map View & Details */}
        <div className="mt-auto pt-3 border-t border-emerald-900/10 dark:border-[#224538] grid grid-cols-3 gap-2">
          {/* Directions button — opens this pharmacy's saved coordinates */}
          <button
            type="button"
            onClick={() => void handleDirections()}
            disabled={isOpeningDirections}
            className="flex items-center justify-center gap-1 px-2.5 py-2.5 text-xs font-bold text-[#087E9B] dark:text-[#38BDF8] bg-[#EBF7FA] dark:bg-[#142A33] hover:bg-[#CFFAFE] border border-[#087E9B]/25 rounded-2xl transition-all shadow-2xs hover:scale-[1.02] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            title="Open Google Maps directions to this pharmacy's saved pin"
          >
            {isOpeningDirections ? (
              <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">Directions</span>
          </button>

          {/* View on Map */}
          <button
            onClick={() => onSelectOnMap(pharmacy)}
            className="flex items-center justify-center gap-1 px-2.5 py-2.5 text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] bg-[#F1FAF6] dark:bg-[#11231D] hover:bg-[#E2F5EE] border border-emerald-900/10 dark:border-[#285444] rounded-2xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
          >
            <MapPin className="w-3.5 h-3.5 text-[#087F5B] shrink-0" />
            <span className="truncate">Map</span>
          </button>

          {/* View Details */}
          <button
            onClick={() => onViewDetails(pharmacy)}
            className="flex items-center justify-center gap-1 px-2.5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-[#087F5B] to-[#087E9B] hover:opacity-95 rounded-2xl transition-all cursor-pointer shadow-md shadow-[#087F5B]/20 hover:scale-[1.02]"
          >
            <span className="truncate">Details</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {directionsError && (
          <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{directionsError}</span>
          </div>
        )}

      </div>
    </article>
  );
};
