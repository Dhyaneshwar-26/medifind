import React from 'react';
import {
  Pharmacy,
  PharmacyFilter,
  SortOption,
  PharmacyAdvancedFilters,
} from '../types/pharmacy';
import { PharmacyCard } from './PharmacyCard';
import { ArrowUpDown, X, SearchX, Sparkles, SlidersHorizontal, RotateCcw } from 'lucide-react';

interface FilterOptions {
  districts: string[];
  brands: string[];
  strengths: string[];
  dosageForms: string[];
}

interface PharmacyListProps {
  pharmacies: Pharmacy[];
  allCount: number;
  searchQuery: string;
  onClearSearch: () => void;
  activeFilter: PharmacyFilter;
  onFilterChange: (filter: PharmacyFilter) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  advancedFilters: PharmacyAdvancedFilters;
  onAdvancedFiltersChange: (filters: PharmacyAdvancedFilters) => void;
  filterOptions: FilterOptions;
  onResetFilters: () => void;
  selectedPharmacyId: string | null;
  onSelectPharmacyOnMap: (pharmacy: Pharmacy) => void;
  onViewDetails: (pharmacy: Pharmacy) => void;
  onQuickSearch: (query: string) => void;
}

const selectClass =
  'w-full px-2.5 py-1.5 bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] rounded-xl text-[11px] font-bold text-[#20332D] dark:text-[#E5F4EE] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] cursor-pointer truncate';

const labelClass =
  'block text-[10px] font-extrabold uppercase tracking-wider text-[#20332D]/55 dark:text-[#E5F4EE]/55 mb-1';

export const PharmacyList: React.FC<PharmacyListProps> = ({
  pharmacies,
  allCount,
  searchQuery,
  onClearSearch,
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange,
  advancedFilters,
  onAdvancedFiltersChange,
  filterOptions,
  onResetFilters,
  selectedPharmacyId,
  onSelectPharmacyOnMap,
  onViewDetails,
  onQuickSearch,
}) => {
  const [showFilters, setShowFilters] = React.useState(false);

  const update = <K extends keyof PharmacyAdvancedFilters>(
    key: K,
    value: PharmacyAdvancedFilters[K]
  ) => {
    onAdvancedFiltersChange({ ...advancedFilters, [key]: value });
  };

  const activeFilterCount = [
    advancedFilters.district !== 'all',
    advancedFilters.maxDistanceKm > 0,
    advancedFilters.brand !== 'all',
    advancedFilters.strength !== 'all',
    advancedFilters.dosageForm !== 'all',
    advancedFilters.availability !== 'all',
    advancedFilters.lowStockOnly,
  ].filter(Boolean).length;

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
              <option value="recent">Recently Updated Stock</option>
              <option value="available">Available Medicines</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Pharmacy Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Advanced filters toggle */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-900/5 dark:border-[#224538]">
          <button
            onClick={() => setShowFilters((current) => !current)}
            aria-expanded={showFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] text-[#20332D] dark:text-[#E5F4EE] hover:text-[#087F5B] dark:hover:text-[#34D399] transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Medicine Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#087F5B] text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>

          {(activeFilterCount > 0 || searchQuery) && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#087F5B] dark:text-[#34D399] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 rounded-2xl bg-[#F1FAF6]/60 dark:bg-[#11231D]/60 border border-emerald-900/5 dark:border-[#224538] p-3">
            <div>
              <label className={labelClass} htmlFor="filter-district">District</label>
              <select
                id="filter-district"
                value={advancedFilters.district}
                onChange={(e) => update('district', e.target.value)}
                className={selectClass}
              >
                <option value="all">All districts</option>
                {filterOptions.districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="filter-distance">Nearby distance</label>
              <select
                id="filter-distance"
                value={advancedFilters.maxDistanceKm}
                onChange={(e) => update('maxDistanceKm', Number(e.target.value))}
                className={selectClass}
              >
                <option value={0}>Any distance</option>
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="filter-brand">Brand</label>
              <select
                id="filter-brand"
                value={advancedFilters.brand}
                onChange={(e) => update('brand', e.target.value)}
                className={selectClass}
              >
                <option value="all">All brands</option>
                {filterOptions.brands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="filter-strength">Strength</label>
              <select
                id="filter-strength"
                value={advancedFilters.strength}
                onChange={(e) => update('strength', e.target.value)}
                className={selectClass}
              >
                <option value="all">All strengths</option>
                {filterOptions.strengths.map((strength) => (
                  <option key={strength} value={strength}>{strength}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="filter-dosage">Dosage form</label>
              <select
                id="filter-dosage"
                value={advancedFilters.dosageForm}
                onChange={(e) => update('dosageForm', e.target.value)}
                className={selectClass}
              >
                <option value="all">All forms</option>
                {filterOptions.dosageForms.map((form) => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="filter-availability">Availability</label>
              <select
                id="filter-availability"
                value={advancedFilters.availability}
                onChange={(e) =>
                  update(
                    'availability',
                    e.target.value as PharmacyAdvancedFilters['availability']
                  )
                }
                className={selectClass}
              >
                <option value="all">Any availability</option>
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-end">
              <label className="flex items-center gap-2 px-3 py-2 w-full rounded-xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538] cursor-pointer">
                <input
                  type="checkbox"
                  checked={advancedFilters.lowStockOnly}
                  onChange={(e) => update('lowStockOnly', e.target.checked)}
                  className="rounded text-[#087F5B] focus:ring-[#087F5B]"
                />
                <span className="text-[11px] font-bold text-[#20332D] dark:text-[#E5F4EE]">
                  Low stock only
                </span>
              </label>
            </div>
          </div>
        )}

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
                ? `No pharmacies currently report "${searchQuery}" in stock for the selected filters.`
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
              onClick={onResetFilters}
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
