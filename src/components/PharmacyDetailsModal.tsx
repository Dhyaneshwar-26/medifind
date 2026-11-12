import React, { useEffect, useState } from 'react';
import {
  X, MapPin, Clock, Phone, Navigation, ShieldCheck,
  AlertTriangle, Pill, CheckCircle2, Star, Loader2
} from 'lucide-react';
import { Pharmacy } from '../types/pharmacy';
import { formatDistance } from '../utils/distance';
import { openDirectionsToCoordinates } from '../utils/directions';
import { formatExpiryDate, formatRelativeTime } from '../utils/format';

interface PharmacyDetailsModalProps {
  pharmacy: Pharmacy | null;
  onClose: () => void;
  onFocusOnMap: (pharmacy: Pharmacy) => void;
}

export const PharmacyDetailsModal: React.FC<PharmacyDetailsModalProps> = ({
  pharmacy,
  onClose,
  onFocusOnMap,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Directions state. Google Maps always receives this pharmacy's saved coordinates.
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [isOpeningDirections, setIsOpeningDirections] = useState(false);

  // Reset feedback whenever a different pharmacy is opened.
  useEffect(() => {
    setDirectionsError(null);
    setIsOpeningDirections(false);
  }, [pharmacy?.id]);

  const handleDirections = async () => {
    if (!pharmacy || isOpeningDirections) return;
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

  if (!pharmacy) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#162C24] rounded-3xl shadow-2xl border border-emerald-900/10 dark:border-[#285444] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Image Header Banner */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900">
          <img
            src={pharmacy.imageUrl}
            alt={pharmacy.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/src/assets/images/pharmacy_interior_modern_1794119274302.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/20" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/75 backdrop-blur-md text-white rounded-full transition-all cursor-pointer z-10"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Title Overlay */}
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${
                  pharmacy.isOpenNow
                    ? pharmacy.is24Hours
                      ? 'bg-[#F59E0B] text-amber-950'
                      : 'bg-[#087F5B] text-white'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${pharmacy.isOpenNow ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{pharmacy.isOpenNow ? (pharmacy.is24Hours ? 'Open 24/7' : 'Open Now') : 'Closed'}</span>
              </span>
              <span className="text-white/40">·</span>
              {pharmacy.reviewCount > 0 ? (
                <span className="text-xs text-[#FCD34D] font-extrabold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#FCD34D]" />
                  <span>{pharmacy.rating.toFixed(1)}</span> ({pharmacy.reviewCount} reviews)
                </span>
              ) : (
                <span className="text-xs text-[#A7F3D0] font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Registered pharmacy
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight drop-shadow-sm">
              {pharmacy.name}
            </h2>
            <p className="text-xs text-[#A7F3D0] font-bold mt-0.5">
              {pharmacy.area}, Tamil Nadu
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* Key Facts Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#EBF7F2] dark:bg-[#132A21] border border-[#087F5B]/20 text-xs">
              <span className="text-[#087F5B] dark:text-[#34D399] font-bold block mb-1">Straight-line Distance</span>
              <div className="flex items-center gap-1 font-extrabold text-[#20332D] dark:text-[#E5F4EE] text-sm tabular-nums">
                <Navigation className="w-4 h-4 text-[#087F5B] dark:text-[#34D399]" />
                <span>{formatDistance(pharmacy.distanceKm)}</span>
              </div>
              <span className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-1 block font-medium">
                Geometric distance from your selected location, not a driving distance.
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FEF6EE] dark:bg-[#2B1F17] border border-[#F59E0B]/30 text-xs">
              <span className="text-[#B45309] dark:text-[#FCD34D] font-bold block mb-1">Operating Hours</span>
              <div className="flex items-center gap-1 font-extrabold text-[#20332D] dark:text-[#E5F4EE] text-sm">
                <Clock className="w-4 h-4 text-[#F59E0B]" />
                <span className="truncate">{pharmacy.is24Hours ? 'Open 24/7' : 'Standard Hours'}</span>
              </div>
              <span className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-1 block truncate font-medium">
                {pharmacy.openingHours}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#EBF7FA] dark:bg-[#142A33] border border-[#087E9B]/20 text-xs">
              <span className="text-[#087E9B] dark:text-[#38BDF8] font-bold block mb-1">Direct Contact</span>
              <div className="flex items-center gap-1 font-extrabold text-[#20332D] dark:text-[#E5F4EE] text-sm truncate">
                <Phone className="w-4 h-4 text-[#087E9B] shrink-0" />
                <a href={`tel:${pharmacy.phone.replace(/[^0-9+]/g, '')}`} className="truncate hover:text-[#087E9B]">
                  {pharmacy.phone}
                </a>
              </div>
              {pharmacy.emergencyPhone && (
                <span className="text-[11px] text-[#087E9B] font-bold mt-1 block truncate">
                  Emergency: {pharmacy.emergencyPhone}
                </span>
              )}
            </div>
          </div>

          {/* Full Address & Directions */}
          <div className="p-4 rounded-2xl bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#285444] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-[#20332D] dark:text-[#E5F4EE] block">Physical Location</span>
                <p className="text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-0.5 leading-relaxed font-medium">{pharmacy.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleDirections()}
                disabled={isOpeningDirections}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF7FA] dark:bg-[#142A33] hover:bg-[#CFFAFE] text-[#087E9B] dark:text-[#38BDF8] border border-[#087E9B]/30 rounded-xl font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                title="Open Google Maps directions to this pharmacy's saved pin"
              >
                {isOpeningDirections ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>Get Directions</span>
              </button>

              <button
                onClick={() => {
                  onFocusOnMap(pharmacy);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#162C24] hover:bg-[#EBF7F2] text-[#087F5B] dark:text-[#34D399] border border-[#087F5B]/30 rounded-xl font-bold transition-all shadow-2xs cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Show on Map</span>
              </button>
            </div>
          </div>

          {directionsError && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{directionsError}</span>
            </div>
          )}

          {/* Services Offered */}
          <div>
            <h4 className="text-sm font-extrabold text-[#20332D] dark:text-[#E5F4EE] mb-2.5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#087F5B] dark:text-[#34D399]" />
              <span>Available Pharmacy Services</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pharmacy.services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] text-xs text-[#20332D] dark:text-[#E5F4EE] font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0" />
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Listed Medicines with Real-Time Stock Quantities & Last Updated */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-sm font-extrabold text-[#20332D] dark:text-[#E5F4EE] flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#087E9B] dark:text-[#38BDF8]" />
                <span>Stocked Medicine Inventory ({pharmacy.sampleMedicines.length})</span>
              </h4>
              <span className="text-[11px] text-[#B45309] dark:text-[#FCD34D] font-extrabold bg-[#FEF3C7] dark:bg-[#451A03] px-2.5 py-0.5 rounded-full border border-[#F59E0B]/30">
                Live Stock Data
              </span>
            </div>

            <div className="divide-y divide-emerald-900/5 dark:divide-[#224538] border border-emerald-900/10 dark:border-[#224538] rounded-3xl overflow-hidden bg-white dark:bg-[#11231D] text-xs">
              {[...pharmacy.sampleMedicines]
                .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.name.localeCompare(b.name))
                .map((med) => {
                  const expired = med.isExpired === true;
                  const lowStock = !expired && med.availabilityStatus === 'low_stock';
                  const available = !expired && med.stockQuantity > 0 && med.inStock;
                  return (
                    <div key={med.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F1FAF6] dark:hover:bg-[#162C24] transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[#20332D] dark:text-[#E5F4EE] text-sm">{med.name}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-semibold">
                            {[med.strength, med.dosageForm].filter(Boolean).join(' ') || med.dosage}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#20332D]/50 dark:text-[#E5F4EE]/50 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                          {(med.brand || med.genericName) && <span>Brand: {med.brand || med.genericName}</span>}
                          <span>Category: {med.category}</span>
                          {med.expiryDate && (
                            <span className={expired ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                              Expiry: {formatExpiryDate(med.expiryDate)}
                            </span>
                          )}
                          <span className="text-[#087F5B] dark:text-[#34D399] font-medium">
                            Last reported: {med.lastUpdatedAt ? formatRelativeTime(med.lastUpdatedAt) : med.lastUpdated || 'Not recorded'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end mb-1">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            expired
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              : available
                                ? lowStock
                                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                                  : 'bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#6EE7B7]'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}>
                            {expired
                              ? 'Expired · not available'
                              : available
                                ? lowStock
                                  ? `Low stock · ${med.stockQuantity} units`
                                  : `${med.stockQuantity} units available`
                                : 'Out of stock'}
                          </span>
                        </div>
                        {med.samplePrice && (
                          <span className="text-[11px] font-bold text-[#20332D] dark:text-[#E5F4EE] tabular-nums">
                            {med.samplePrice}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {pharmacy.sampleMedicines.length === 0 && (
                <div className="p-6 text-center text-xs text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                  This pharmacy has not reported any medicine inventory yet.
                </div>
              )}
            </div>
          </div>

          {/* Inventory Notice */}
          <div className="p-4 rounded-2xl bg-[#FEF3C7] dark:bg-[#2A2315] border border-[#F59E0B]/30 text-xs text-[#92400E] dark:text-[#FCD34D] flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              <strong>Inventory Notice:</strong> Operating timings, phone contacts, services, and medicine inventories are published by the pharmacy. Always contact the pharmacy directly to confirm real-time drug availability.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-emerald-900/10 dark:border-[#224538] bg-[#F1FAF6] dark:bg-[#11231D] flex items-center justify-between gap-3">
          <a
            href={`tel:${pharmacy.phone.replace(/[^0-9+]/g, '')}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#087F5B] hover:bg-[#076B4D] rounded-xl transition-all shadow-xs"
          >
            <Phone className="w-4 h-4" />
            <span>Call Pharmacy</span>
          </a>

          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] bg-white dark:bg-[#162C24] hover:bg-slate-100 dark:hover:bg-[#1E3B32] border border-emerald-900/10 dark:border-[#224538] rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};
