import React from 'react';
import { Pharmacy, PharmacyFilter, SortOption } from '../types/pharmacy';
import { PharmacyCard } from './PharmacyCard';
import { ArrowUpDown, X, SearchX, Sparkles } from 'lucide-react';

interface PharmacyListProps {
  pharmacies: Pharmacy[];
  allCount: number;
  searchQuery: string;
  onClearSearch: () => void;
  activeFilter: PharmacyFilter;
  onFilterChange: (filter: PharmacyFilter) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedPharmacyId: string | null;
  onSelectPharmacyOnMap: (pharmacy: Pharmacy) => void;
  onViewDetails: (pharmacy: Pharmacy) => void;
  onQuickSearch: (query: string) => void;
}

export const PharmacyList: React.FC<PharmacyListProps> = ({
  pharmacies,
  allCount,
  searchQuery,
  onClearSearch,
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange,
  selectedPharmacyId,
  onSelectPharmacyOnMap,
  onViewDetails,
  onQuickSearch,
}) => {
  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Active Search Notification Banner */}
      {searchQuery && (
        <div className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-[#D1FAE5] via-[#EBF7FA] to-[#D1FAE5] dark:from-[#064E3B]/60 dark:via-[#132A33]/60 dark:to-[#064E3B]/60 border border-[#087F5B]/30 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-xl bg-[#087F5B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[#20332D] dark:text-[#E5F4EE] font-medium">
              Filtering pharmacies listing <span className="font-extrabold text-[#087F5B] dark:text-[#34D399]">&ldquo;{searchQuery}&rdquo;</span>
            </span>
          </div>
          <button
            onClick={onClearSearch}
            className="flex items-center gap-1 text-[#087F5B] dark:text-[#34D399] font-extrabold px-3 py-1.5 rounded-xl bg-white dark:bg-[#162C24] border border-[#087F5B]/30 shadow-2xs hover:bg-[#F1FAF6] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Search</span>
          </button>
        </div>
      )}

      {/* Filter and Sort Toolbar */}
      <div className="bg-white dark:bg-[#162C24] p-3.5 sm:p-4 rounded-3xl border border-emerald-900/10 dark:border-[#24463B] shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Segmented Filter Buttons with Bright Colourful Theme Tokens */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#F1FAF6] dark:bg-[#11231D] rounded-2xl border border-emerald-900/10 dark:border-[#224538] overflow-x-auto max-w-full">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087F5B] dark:hover:text-[#34D399] hover:bg-white/60 dark:hover:bg-[#162C24]'
              }`}
            >
              All ({allCount})
            </button>

            <button
              onClick={() => onFilterChange('open')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'open'
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087F5B] dark:hover:text-[#34D399] hover:bg-white/60 dark:hover:bg-[#162C24]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeFilter === 'open' ? 'bg-white' : 'bg-[#087F5B]'}`} />
              <span>Open Now</span>
            </button>

            <button
              onClick={() => onFilterChange('nearest')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'nearest'
                  ? 'bg-[#F59E0B] text-amber-950 shadow-xs'
                  : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#F59E0B] hover:bg-white/60 dark:hover:bg-[#162C24]'
              }`}
            >
              Nearest First
            </button>

            <button
              onClick={() => onFilterChange('24hours')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === '24hours'
                  ? 'bg-[#805AD5] text-white shadow-xs'
                  : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#805AD5] hover:bg-white/60 dark:hover:bg-[#162C24]'
              }`}
            >
              24/7 Hours
            </button>
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-2 text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#087E9B] shrink-0" />
            <span className="hidden sm:inline font-semibold">Sort:</span>
            <select
              value={activeSort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              aria-label="Sort pharmacies"
              className="px-3 py-1.5 bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] rounded-xl text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] cursor-pointer"
            >
              <option value="distance">Distance (Closest)</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Pharmacy Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Results Counter & Catalog Tag */}
        <div className="flex items-center justify-between text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 pt-2 border-t border-emerald-900/5 dark:border-[#224538]">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-extrabold text-[#087F5B] dark:text-[#34D399] tabular-nums">{pharmacies.length}</span> verified {pharmacies.length === 1 ? 'pharmacy' : 'pharmacies'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#B45309] dark:text-[#FCD34D] bg-[#F59E0B]/15 px-3 py-0.5 rounded-full border border-[#F59E0B]/30">
            Tamil Nadu Directory
          </span>
        </div>
      </div>

      {/* Pharmacy Cards Feed */}
      {pharmacies.length > 0 ? (
        <div className="grid grid-cols-1 gap-5">
          {pharmacies.map((pharmacy) => (
            <PharmacyCard
              key={pharmacy.id}
              pharmacy={pharmacy}
              searchQuery={searchQuery}
              isSelected={selectedPharmacyId === pharmacy.id}
              onSelectOnMap={onSelectPharmacyOnMap}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        /* Empty State with Colorful Pills */
        <div className="bg-white dark:bg-[#162C24] rounded-3xl border border-emerald-900/10 dark:border-[#24463B] p-8 sm:p-10 text-center space-y-4 my-2 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] dark:bg-[#2A2315] text-[#D97706] flex items-center justify-center mx-auto shadow-xs">
            <SearchX className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
              No matching pharmacies found
            </h4>
            <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? `No registered pharmacy in Tamil Nadu currently lists "${searchQuery}" in their live inventory.`
                : 'No pharmacies match the selected filters. Try switching filters or resetting your query.'}
            </p>
          </div>

          {searchQuery && (
            <div className="pt-2">
              <p className="text-xs font-bold text-[#20332D]/70 dark:text-[#E5F4EE]/70 mb-2.5">
                Try searching popular medicines:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Paracetamol', 'Amoxicillin', 'Metformin', 'Cetirizine', 'Pantoprazole', 'Azithromycin'].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => onQuickSearch(sample)}
                    className="px-3.5 py-1.5 text-xs bg-[#F1FAF6] dark:bg-[#11231D] hover:bg-[#E2F5EE] border border-[#087F5B]/30 text-[#087F5B] dark:text-[#34D399] rounded-xl transition-all font-bold cursor-pointer shadow-2xs hover:scale-105"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3">
            <button
              onClick={onClearSearch}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#087F5B] hover:bg-[#076B4D] rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              Reset All Filters &amp; Search
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
