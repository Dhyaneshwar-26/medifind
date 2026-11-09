import React, { useState } from 'react';
import { X, MapPin, Check, Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TAMIL_NADU_DISTRICTS, TamilNaduDistrict } from '../data/tamilNadu';
import { CHENNAI_NEIGHBORHOODS } from '../utils/distance';
import { UserLocation } from '../types/pharmacy';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelectArea: (area: { name: string; lat: number; lng: number; district?: string }) => void;
  onRequestLiveLocation: () => void;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectArea,
  onRequestLiveLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'districts' | 'chennai'>('districts');
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const filteredDistricts = TAMIL_NADU_DISTRICTS.filter((d) =>
    d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    d.headquarters.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredChennaiAreas = CHENNAI_NEIGHBORHOODS.filter((area) =>
    area.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#162C24] rounded-3xl shadow-2xl border border-emerald-900/10 dark:border-[#285444] overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-900/10 dark:border-[#224538]">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#087F5B] dark:text-[#34D399]">
                Tamil Nadu Only
              </span>
            </div>
            <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
              Select Your Tamil Nadu Location
            </h3>
            <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium">
              Choose your Tamil Nadu district or detect your live location via GPS
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1F3D32] rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live GPS CTA button inside modal */}
        <div className="p-4 border-b border-emerald-900/10 dark:border-[#224538] bg-[#F1FAF6] dark:bg-[#11231D]">
          <button
            onClick={() => {
              onRequestLiveLocation();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-extrabold text-white bg-[#087F5B] hover:bg-[#076B4D] rounded-2xl shadow-sm transition-all cursor-pointer hover:scale-[1.01]"
          >
            <Navigation className="w-4 h-4" />
            <span>Use Browser Geolocation (Detect Current Location)</span>
          </button>
          <span className="text-[10px] text-center text-[#20332D]/60 dark:text-[#E5F4EE]/60 block mt-1.5">
            Coordinates are verified to ensure you are within Tamil Nadu boundary.
          </span>
        </div>

        {/* Tab Switcher: 38 Districts vs Chennai Neighborhoods */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2 border-b border-emerald-900/10 dark:border-[#224538]">
          <button
            onClick={() => setActiveTab('districts')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'districts'
                ? 'bg-[#087F5B] text-white shadow-2xs'
                : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087F5B]'
            }`}
          >
            Tamil Nadu Districts (38)
          </button>
          <button
            onClick={() => setActiveTab('chennai')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'chennai'
                ? 'bg-[#087F5B] text-white shadow-2xs'
                : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087F5B]'
            }`}
          >
            Chennai Areas
          </button>
        </div>

        {/* Search filter */}
        <div className="px-5 py-2.5 border-b border-emerald-900/10 dark:border-[#224538]">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={
              activeTab === 'districts'
                ? 'Filter Tamil Nadu district (e.g. Coimbatore, Madurai, Salem)...'
                : 'Search Chennai neighborhood (e.g. Adyar, T. Nagar)...'
            }
            className="w-full px-3.5 py-2 text-xs bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] placeholder-[#20332D]/40 dark:placeholder-[#E5F4EE]/40 border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
          />
        </div>

        {/* List Content */}
        <div className="overflow-y-auto p-3 space-y-1 divide-y divide-emerald-900/5 dark:divide-[#224538]">
          {activeTab === 'districts' ? (
            <>
              {filteredDistricts.map((district) => {
                const isSelected =
                  Math.abs(district.lat - currentLocation.lat) < 0.01 &&
                  Math.abs(district.lng - currentLocation.lng) < 0.01;

                return (
                  <button
                    key={district.id}
                    onClick={() => {
                      onSelectArea({
                        name: `${district.name}, Tamil Nadu`,
                        lat: district.lat,
                        lng: district.lng,
                        district: district.name,
                      });
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#D1FAE5] dark:bg-[#132A21] text-[#065F46] dark:text-[#34D399] font-extrabold'
                        : 'hover:bg-[#F1FAF6] dark:hover:bg-[#19352B] text-[#20332D] dark:text-[#E5F4EE] font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#087F5B] dark:text-[#34D399]' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs truncate block font-bold">{district.name} District</span>
                        <span className="text-[10px] text-[#20332D]/55 dark:text-[#E5F4EE]/55">
                          PIN prefix: {district.pinCodePrefix}xxx · HQ: {district.headquarters}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0" />}
                  </button>
                );
              })}
              {filteredDistricts.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  No Tamil Nadu district found matching &ldquo;{searchFilter}&rdquo;.
                </div>
              )}
            </>
          ) : (
            <>
              {filteredChennaiAreas.map((area) => {
                const isSelected =
                  Math.abs(area.lat - currentLocation.lat) < 0.001 &&
                  Math.abs(area.lng - currentLocation.lng) < 0.001;

                return (
                  <button
                    key={area.name}
                    onClick={() => {
                      onSelectArea({
                        name: `${area.name}, Chennai`,
                        lat: area.lat,
                        lng: area.lng,
                        district: 'Chennai',
                      });
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#D1FAE5] dark:bg-[#132A21] text-[#065F46] dark:text-[#34D399] font-extrabold'
                        : 'hover:bg-[#F1FAF6] dark:hover:bg-[#19352B] text-[#20332D] dark:text-[#E5F4EE] font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#087F5B] dark:text-[#34D399]' : 'text-slate-400'}`} />
                      <span className="text-xs truncate">{area.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0" />}
                  </button>
                );
              })}
              {filteredChennaiAreas.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching Chennai neighborhood found.
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-emerald-900/10 dark:border-[#224538] bg-[#F1FAF6] dark:bg-[#11231D] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538] rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
