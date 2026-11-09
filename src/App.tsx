/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HealthcareEssentials } from './components/HealthcareEssentials';
import { PharmacyList } from './components/PharmacyList';
import { PharmacyMap } from './components/PharmacyMap';
import { PharmacyDetailsModal } from './components/PharmacyDetailsModal';
import { LocationSelectorModal } from './components/LocationSelectorModal';
import { PharmacyPortalSection } from './components/PharmacyPortalSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';

import { INITIAL_TAMIL_NADU_CENTER } from './data/pharmacies';
import { isInsideTamilNadu } from './data/tamilNadu';
import { Pharmacy, UserLocation, PharmacyFilter, SortOption, ActiveView } from './types/pharmacy';
import { calculateDistanceKm } from './utils/distance';
import { usePharmacyAuth } from './hooks/usePharmacyAuth';
import { fetchApprovedPharmacies } from './services/pharmacyService';
import { medicineMatchesQuery } from './services/searchService';
import { describeSupabaseError } from './lib/supabase';
import {
  List,
  Map as MapIcon,
  Sun,
  Moon,
  Store,
  ArrowRight,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Database,
  Loader2,
} from 'lucide-react';

export default function App() {
  // Theme state (Dark/Light mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('medifind_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync theme with document element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('medifind_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('medifind_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Real Supabase auth session. The portal renders the login/register screens
  // until this hook reports an authenticated pharmacy owner.
  const auth = usePharmacyAuth();
  const loggedInPharmacy = auth.pharmacy;

  // User Views & Roles: 'customer' vs 'pharmacy-portal'
  const [activeView, setActiveView] = useState<ActiveView>('customer');

  // Live pharmacy directory loaded from Supabase. It intentionally starts empty
  // so no fictional/sample pharmacy is ever rendered.
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);

  const loadPharmacies = useCallback(async () => {
    if (!auth.configured) {
      setPharmacies([]);
      setPharmacyError(null);
      setIsLoadingPharmacies(false);
      return;
    }

    setIsLoadingPharmacies(true);
    try {
      const rows = await fetchApprovedPharmacies();
      // The query already restricts to approved rows; this second guard keeps
      // any explicitly-labelled demo row out of the public customer directory.
      setPharmacies(rows.filter((pharmacy) => pharmacy.isDemo !== true));
      setPharmacyError(null);
    } catch (err) {
      setPharmacies([]);
      setPharmacyError(describeSupabaseError(err));
    } finally {
      setIsLoadingPharmacies(false);
    }
  }, [auth.configured]);

  useEffect(() => {
    void loadPharmacies();
  }, [loadPharmacies]);

  // 1. Location state (Strictly Tamil Nadu)
  const [userLocation, setUserLocation] = useState<UserLocation>(INITIAL_TAMIL_NADU_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // 2. Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PharmacyFilter>('all');
  const [activeSort, setActiveSort] = useState<SortOption>('distance');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>('all');

  // 3. Selection & Modal state
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [detailedPharmacy, setDetailedPharmacy] = useState<Pharmacy | null>(null);

  // 4. Mobile view toggle (List vs Map)
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  // Request browser geolocation with Tamil Nadu boundary validation
  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus({
        type: 'error',
        message: 'Geolocation is not supported by your browser. Please select a Tamil Nadu district manually.',
      });
      return;
    }

    setIsLocating(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const latitude = Number(position.coords?.latitude);
        const longitude = Number(position.coords?.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocationStatus({
            type: 'error',
            message: 'Invalid GPS coordinates received. Please select a Tamil Nadu district manually.',
          });
          return;
        }

        // Verify if coordinates are strictly within Tamil Nadu boundary
        const inTamilNadu = isInsideTamilNadu(latitude, longitude);

        if (!inTamilNadu) {
          setUserLocation({
            lat: latitude,
            lng: longitude,
            name: 'Outside Tamil Nadu',
            isLive: true,
            isOutsideTamilNadu: true,
          });
          setLocationStatus({
            type: 'error',
            message: 'MediFind is currently available only in Tamil Nadu.',
          });
        } else {
          setUserLocation({
            lat: latitude,
            lng: longitude,
            name: `Device GPS (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`,
            isLive: true,
            isOutsideTamilNadu: false,
          });
          setLocationStatus({
            type: 'success',
            message: `Tamil Nadu location verified (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E). Distances updated!`,
          });
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. Please select your Tamil Nadu district manually below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setLocationStatus({
          type: 'error',
          message: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Manual Tamil Nadu Area / District selection
  const handleSelectArea = (area: { name: string; lat: number; lng: number; district?: string }) => {
    setUserLocation({
      lat: area.lat,
      lng: area.lng,
      name: area.name,
      district: area.district,
      isLive: false,
      isOutsideTamilNadu: false,
    });
    setLocationStatus({
      type: 'info',
      message: `Set search location to ${area.name}.`,
    });
  };

  // Compute distances for each pharmacy from current user location
  // Restrict display: only pharmacies inside Tamil Nadu are included
  const pharmaciesWithDistance = useMemo(() => {
    // If user is detected outside Tamil Nadu, do not display pharmacies outside Tamil Nadu
    if (userLocation.isOutsideTamilNadu) {
      return [];
    }

    return pharmacies
      .filter(
        (p) =>
          p.coordinates &&
          Number.isFinite(p.coordinates.lat) &&
          Number.isFinite(p.coordinates.lng) &&
          isInsideTamilNadu(p.coordinates.lat, p.coordinates.lng)
      )
      .map((pharmacy) => {
        const distanceKm = calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          pharmacy.coordinates.lat,
          pharmacy.coordinates.lng
        );
        return {
          ...pharmacy,
          distanceKm,
        };
      });
  }, [pharmacies, userLocation]);

  // Filter & Sort pharmacies
  const filteredAndSortedPharmacies = useMemo(() => {
    let result = [...pharmaciesWithDistance];

    // Medicine search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((pharmacy) => {
        const medMatch = pharmacy.sampleMedicines.some((medicine) =>
          medicineMatchesQuery(medicine, query)
        );
        const nameMatch = pharmacy.name.toLowerCase().includes(query);
        const areaMatch = pharmacy.area.toLowerCase().includes(query);
        const districtMatch = pharmacy.district.toLowerCase().includes(query);
        const addressMatch = pharmacy.address.toLowerCase().includes(query);
        return medMatch || nameMatch || areaMatch || districtMatch || addressMatch;
      });
    }

    // Secondary filters
    if (activeFilter === 'open') {
      result = result.filter((p) => p.isOpenNow);
    } else if (activeFilter === 'nearest') {
      result = result.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    } else if (activeFilter === '24hours') {
      result = result.filter((p) => p.is24Hours);
    }

    // Sorting
    result.sort((a, b) => {
      if (activeSort === 'distance') {
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      }
      if (activeSort === 'rating') {
        return b.rating - a.rating;
      }
      if (activeSort === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [pharmaciesWithDistance, searchQuery, activeFilter, activeSort]);

  // Handler when a pharmacy marker is clicked on the map
  const handleSelectPharmacyFromMarker = (pharmacy: Pharmacy) => {
    setSelectedPharmacyId(pharmacy.id);
    const cardEl = document.getElementById(`pharmacy-card-${pharmacy.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handler when "View on Map" is clicked on a pharmacy card
  const handleSelectPharmacyOnMap = (pharmacy: Pharmacy) => {
    setSelectedPharmacyId(pharmacy.id);
    setMobileTab('map');
  };

  // Navigation scroll helper
  const handleNavigate = (sectionId: string) => {
    if (activeView !== 'customer') {
      setActiveView('customer');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Category card click handler
  const handleCategorySelect = (action: { query?: string; filter?: PharmacyFilter }) => {
    if (action.query) {
      setSearchQuery(action.query);
    }
    if (action.filter) {
      setActiveFilter(action.filter);
    }
    handleNavigate('pharmacies');
  };

  const hasRegisteredPharmacies = pharmacies.length > 0;
  const showDirectoryEmptyState =
    auth.configured && !isLoadingPharmacies && !pharmacyError && !hasRegisteredPharmacies;

  return (
    <div className="min-h-screen flex flex-col bg-[#F1FAF6] dark:bg-[#0C1814] text-[#20332D] dark:text-[#E5F4EE] font-sans selection:bg-[#087F5B]/20 selection:text-[#087F5B] transition-colors duration-200">
      
      {/* Top Navigation */}
      <Navbar
        userLocation={userLocation}
        onOpenLocationSelector={() => setIsLocationModalOpen(true)}
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        loggedInPharmacy={loggedInPharmacy}
        activeView={activeView}
        onOpenPharmacyPortal={() => setActiveView('pharmacy-portal')}
        onOpenCustomerView={() => setActiveView('customer')}
      />

      {/* Role Banner if logged in and currently exploring customer view */}
      {loggedInPharmacy && activeView === 'customer' && (
        <div className="bg-[#087F5B] text-white py-2 px-4 shadow-sm flex items-center justify-between text-xs font-bold">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-soft-pulse" />
              <span>
                You are viewing customer search. Logged in as <strong>{loggedInPharmacy.name}</strong> ({loggedInPharmacy.district})
              </span>
            </div>
            <button
              onClick={() => setActiveView('pharmacy-portal')}
              className="px-3 py-1 bg-white text-[#087F5B] hover:bg-teal-50 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <span>Back to Store Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN VIEW SWITCHER: SEPARATE PHARMACY PORTAL VS CUSTOMER HOMEPAGE */}
      {/* ========================================================================= */}
      {activeView === 'pharmacy-portal' ? (
        <PharmacyPortalSection
          auth={auth}
          onReturnToCustomerView={() => setActiveView('customer')}
          onPharmaciesChanged={() => {
            void loadPharmacies();
          }}
        />
      ) : (
        /* CUSTOMER INTERFACE */
        <>
          {/* Outside Tamil Nadu Alert Banner if detected */}
          {userLocation.isOutsideTamilNadu && (
            <div className="bg-amber-500 text-slate-950 px-4 py-3.5 text-xs sm:text-sm font-bold shadow-md">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-slate-950" />
                  <span>
                    <strong>MediFind is currently available only in Tamil Nadu.</strong> We detected your coordinates outside Tamil Nadu.
                  </span>
                </div>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="px-3.5 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-extrabold hover:bg-slate-900 transition-all cursor-pointer shrink-0"
                >
                  Select a Tamil Nadu District Manually
                </button>
              </div>
            </div>
          )}

          {/* Hero Section */}
          <Hero
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={(q) => {
              setSearchQuery(q);
              handleNavigate('pharmacies');
            }}
            onClearSearch={() => setSearchQuery('')}
            userLocation={userLocation}
            onRequestGeolocation={handleRequestGeolocation}
            isLocating={isLocating}
            locationStatus={locationStatus}
            onDismissStatus={() => setLocationStatus(null)}
            onOpenLocationSelector={() => setIsLocationModalOpen(true)}
            onOpenPharmacyAuth={() => setActiveView('pharmacy-portal')}
            onOpenOwnerDashboard={() => setActiveView('pharmacy-portal')}
            loggedInPharmacy={loggedInPharmacy}
          />

          {/* Explore Healthcare Essentials (Pastel Category Cards) */}
          <HealthcareEssentials onSelectCategory={handleCategorySelect} />

          {/* Main Directory & Map Section */}
          <main id="pharmacies" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-18">
            
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-extrabold tracking-wider uppercase text-[#087F5B] dark:text-[#34D399] bg-white dark:bg-[#162C24] px-3 py-1 rounded-full border border-[#087F5B]/20 dark:border-[#285444] shadow-2xs">
                    Customer Medicine Finder
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-bold">
                    Tamil Nadu Pharmacy Network
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#20332D] dark:text-[#E5F4EE] tracking-tight">
                  Nearby Pharmacies &amp; Medicine Stock
                </h2>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-1">
                  Check stock levels and calculate travel distances from your reference pin at{' '}
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="font-bold text-[#087F5B] dark:text-[#34D399] underline decoration-[#087F5B]/40 hover:decoration-[#087F5B] cursor-pointer"
                  >
                    {userLocation.name}
                  </button>
                </p>
              </div>

              {/* Mobile Tab Switcher (List vs Map) */}
              <div className="flex lg:hidden items-center p-1.5 bg-[#F1FAF6] dark:bg-[#162C24] rounded-2xl border border-emerald-900/10 dark:border-[#285444] self-start sm:self-auto shadow-2xs">
                <button
                  onClick={() => setMobileTab('list')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mobileTab === 'list'
                      ? 'bg-[#087F5B] text-white shadow-sm'
                      : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087F5B]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Results ({filteredAndSortedPharmacies.length})</span>
                </button>
                <button
                  onClick={() => setMobileTab('map')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mobileTab === 'map'
                      ? 'bg-[#087E9B] text-white shadow-sm'
                      : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087E9B]'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Map View</span>
                </button>
              </div>
            </div>

            {/* Supabase configuration warning */}
            {!auth.configured && (
              <div className="mb-8 p-6 rounded-3xl bg-white dark:bg-[#162C24] border border-amber-300 dark:border-amber-800 shadow-sm max-w-3xl mx-auto">
                <div className="flex items-start gap-3">
                  <Database className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                      Supabase is not configured
                    </h3>
                    <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 leading-relaxed">
                      Add <code className="font-bold">VITE_SUPABASE_URL</code> and{' '}
                      <code className="font-bold">VITE_SUPABASE_ANON_KEY</code> (or{' '}
                      <code className="font-bold">VITE_SUPABASE_PUBLISHABLE_KEY</code>) to{' '}
                      <code className="font-bold">.env.local</code>, then restart the dev server. The
                      directory stays empty until a real backend is connected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* If user is outside Tamil Nadu notice */}
            {userLocation.isOutsideTamilNadu ? (
              <div className="p-10 rounded-3xl bg-white dark:bg-[#162C24] border border-amber-300 dark:border-amber-800 text-center space-y-4 max-w-2xl mx-auto my-8">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="text-xl font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                  MediFind is currently available only in Tamil Nadu
                </h3>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 max-w-md mx-auto">
                  To view pharmacies and check medicine availability, please select a Tamil Nadu district (such as Chennai, Coimbatore, Madurai, or Salem).
                </p>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="px-6 py-3 bg-[#087F5B] hover:bg-[#076B4D] text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#087F5B]/20 transition-all cursor-pointer"
                >
                  Choose a Tamil Nadu District
                </button>
              </div>
            ) : isLoadingPharmacies ? (
              <div className="p-10 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#24463B] text-center space-y-3 max-w-2xl mx-auto my-8 shadow-sm">
                <Loader2 className="w-10 h-10 text-[#087F5B] dark:text-[#34D399] mx-auto animate-spin" />
                <h3 className="text-lg font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                  Loading registered pharmacies
                </h3>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                  Fetching live pharmacy and inventory records from Supabase.
                </p>
              </div>
            ) : pharmacyError ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#162C24] border border-rose-300 dark:border-rose-900/60 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-sm">
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-lg font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                  Could not load the pharmacy directory
                </h3>
                <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 max-w-lg mx-auto break-words">
                  {pharmacyError}
                </p>
                <button
                  onClick={() => void loadPharmacies()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F5B] hover:bg-[#076B4D] text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
              </div>
            ) : showDirectoryEmptyState ? (
              <div className="p-10 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#24463B] text-center space-y-4 max-w-2xl mx-auto my-8 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF7F2] dark:bg-[#132A21] text-[#087F5B] dark:text-[#34D399] flex items-center justify-center mx-auto">
                  <Store className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                  No pharmacies registered yet
                </h3>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 max-w-md mx-auto leading-relaxed">
                  MediFind only lists real pharmacies that have registered and published their inventory.
                  Once an owner registers, their store and medicine stock will appear here automatically.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveView('pharmacy-portal')}
                    className="px-6 py-3 bg-[#087F5B] hover:bg-[#076B4D] text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#087F5B]/20 transition-all cursor-pointer"
                  >
                    Register Your Pharmacy
                  </button>
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-[#087F5B] dark:text-[#34D399] bg-[#EBF7F2] dark:bg-[#132A21] border border-[#087F5B]/30 rounded-2xl transition-all cursor-pointer"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Change Search District</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Two-Column Responsive Split */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Pharmacy Results Feed */}
                <div
                  className={`lg:col-span-7 xl:col-span-7 ${
                    mobileTab === 'list' ? 'block' : 'hidden lg:block'
                  }`}
                >
                  <PharmacyList
                    pharmacies={filteredAndSortedPharmacies}
                    allCount={pharmacies.length}
                    searchQuery={searchQuery}
                    onClearSearch={() => setSearchQuery('')}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    activeSort={activeSort}
                    onSortChange={setActiveSort}
                    selectedPharmacyId={selectedPharmacyId}
                    onSelectPharmacyOnMap={handleSelectPharmacyOnMap}
                    onViewDetails={(pharmacy) => setDetailedPharmacy(pharmacy)}
                    onQuickSearch={(query) => setSearchQuery(query)}
                  />
                </div>

                {/* Right Column: Interactive Leaflet Map */}
                <div
                  className={`lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 ${
                    mobileTab === 'map' ? 'block' : 'hidden lg:block'
                  }`}
                >
                  <div className="h-[520px] lg:h-[700px] w-full">
                    <PharmacyMap
                      pharmacies={filteredAndSortedPharmacies}
                      userLocation={userLocation}
                      selectedPharmacyId={selectedPharmacyId}
                      onSelectPharmacyFromMarker={handleSelectPharmacyFromMarker}
                      onViewDetails={(pharmacy) => setDetailedPharmacy(pharmacy)}
                    />
                  </div>
                </div>

              </div>
            )}

          </main>

          {/* About Section */}
          <AboutSection />

          {/* Contact Section */}
          <ContactSection />

          {/* Footer */}
          <Footer onNavigate={handleNavigate} />
        </>
      )}

      {/* Floating Quick Dark/Light Mode Switcher Button (Always accessible) */}
      <aside 
        aria-label="Theme Switcher"
        className="fixed bottom-5 left-5 z-40 bg-white/95 dark:bg-[#162C24]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-emerald-900/10 dark:border-[#285444] flex items-center gap-2 text-xs font-bold hover:scale-105 transition-all"
      >
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-1.5 text-[#20332D] dark:text-[#E5F4EE] cursor-pointer"
          title="Click to toggle Light and Dark Mode"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-[#F59E0B]" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#087E9B]" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </aside>

      {/* Pharmacy Details Modal */}
      <PharmacyDetailsModal
        pharmacy={detailedPharmacy}
        onClose={() => setDetailedPharmacy(null)}
        onFocusOnMap={(pharmacy) => {
          setSelectedPharmacyId(pharmacy.id);
          setMobileTab('map');
          handleNavigate('pharmacies');
        }}
      />

      {/* Location Selector Modal */}
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectArea={handleSelectArea}
        onRequestLiveLocation={handleRequestGeolocation}
      />

    </div>
  );
}
