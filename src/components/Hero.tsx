import React, { useState } from 'react';
import { Search, Navigation, MapPin, AlertCircle, CheckCircle2, X, Sparkles, Pill, ShieldCheck, Clock, Cross, Building2, ArrowRight } from 'lucide-react';
import { UserLocation, Pharmacy } from '../types/pharmacy';
import { POPULAR_SEARCH_SUGGESTIONS } from '../data/pharmacies';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onClearSearch: () => void;
  userLocation: UserLocation;
  onRequestGeolocation: () => void;
  isLocating: boolean;
  locationStatus: { type: 'success' | 'error' | 'info'; message: string } | null;
  onDismissStatus: () => void;
  onOpenLocationSelector: () => void;
  onOpenPharmacyAuth?: () => void;
  onOpenOwnerDashboard?: () => void;
  loggedInPharmacy?: Pharmacy | null;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  userLocation,
  onRequestGeolocation,
  isLocating,
  locationStatus,
  onDismissStatus,
  onOpenLocationSelector,
  onOpenPharmacyAuth,
  onOpenOwnerDashboard,
  loggedInPharmacy,
}) => {
  const [localInput, setLocalInput] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(localInput.trim());
  };

  const handleSuggestionClick = (medName: string) => {
    setLocalInput(medName);
    onSearchChange(medName);
    onSearchSubmit(medName);
  };

  const handleClear = () => {
    setLocalInput('');
    onClearSearch();
  };

  return (
    <section 
      id="home" 
      className="relative pt-10 pb-16 md:pt-16 md:pb-22 overflow-hidden bg-gradient-to-br from-[#087F5B]/10 via-[#087E9B]/10 to-[#F1FAF6] dark:from-[#0C1A15] dark:via-[#11231D] dark:to-[#0C1814] border-b border-emerald-900/10 dark:border-[#1F3D32] transition-colors duration-200"
    >
      {/* Decorative background shapes */}
      <div 
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#087F5B 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      {/* Floating pill & capsule decorative shapes */}
      <div className="absolute top-12 left-10 w-24 h-8 rounded-full bg-gradient-to-r from-[#087F5B]/20 to-[#087E9B]/20 rotate-45 blur-xs pointer-events-none" />
      <div className="absolute bottom-16 left-1/3 w-16 h-6 rounded-full bg-gradient-to-r from-[#F59E0B]/20 to-[#805AD5]/20 -rotate-12 blur-xs pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-28 h-9 rounded-full bg-gradient-to-r from-[#087E9B]/25 to-[#087F5B]/25 rotate-12 blur-xs pointer-events-none" />
      
      {/* Glowing atmospheric circles */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-[#087E9B]/25 to-[#F59E0B]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-tr from-[#087F5B]/25 to-[#805AD5]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Two-Column Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Heading, Search & Controls */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#162C24]/90 border border-[#087F5B]/20 dark:border-[#285444] shadow-xs text-xs font-bold text-[#087F5B] dark:text-[#34D399]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#087F5B] dark:bg-[#34D399] animate-soft-pulse" />
              <span>Smart Chennai Pharmacy Discovery</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-[#B45309] dark:text-[#FCD34D] bg-[#F59E0B]/15 px-2 py-0.5 rounded-full border border-[#F59E0B]/30 font-extrabold">
                10+ Neighborhoods
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#20332D] dark:text-[#E5F4EE] leading-[1.14] text-balance">
              Find Medicines &amp;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#087F5B] via-[#087E9B] to-[#087F5B] dark:from-[#34D399] dark:via-[#38BDF8] dark:to-[#34D399]">
                Pharmacies Near You
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#20332D]/75 dark:text-[#E5F4EE]/75 leading-relaxed max-w-xl">
              Discover nearby pharmacies, explore their listed services and search for medicines in your area.
            </p>

            {/* Location Status Alert (if active) */}
            {locationStatus && (
              <div
                className={`flex items-start gap-3 p-3.5 rounded-2xl text-xs sm:text-sm border transition-all ${
                  locationStatus.type === 'error'
                    ? 'bg-[#FEF3C7] dark:bg-[#2A2315] border-[#F59E0B]/40 text-[#92400E] dark:text-[#FCD34D]'
                    : locationStatus.type === 'success'
                    ? 'bg-[#D1FAE5] dark:bg-[#122A21] border-[#087F5B]/40 text-[#065F46] dark:text-[#6EE7B7]'
                    : 'bg-[#CFFAFE] dark:bg-[#132A32] border-[#087E9B]/40 text-[#155E75] dark:text-[#67E8F9]'
                }`}
              >
                {locationStatus.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{locationStatus.message}</p>
                  {locationStatus.type === 'error' && (
                    <button
                      onClick={onOpenLocationSelector}
                      className="mt-1 font-bold underline hover:opacity-80 block text-xs"
                    >
                      Select an area in Chennai manually →
                    </button>
                  )}
                </div>
                <button
                  onClick={onDismissStatus}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  aria-label="Dismiss message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Prominent Medicine Search Bar Box with Green Search Button */}
            <div className="bg-white dark:bg-[#162C24] p-3 sm:p-4 rounded-3xl shadow-xl shadow-[#087F5B]/10 dark:shadow-black/30 border-2 border-[#087F5B]/20 dark:border-[#285444] ring-4 ring-[#087F5B]/5">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
                
                {/* Search Input Container */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#087F5B] dark:text-[#34D399] pointer-events-none" />
                  <input
                    type="text"
                    value={localInput}
                    onChange={(e) => {
                      setLocalInput(e.target.value);
                      onSearchChange(e.target.value);
                    }}
                    placeholder="Search medicine name (e.g. Paracetamol)"
                    className="w-full pl-10 pr-9 py-3.5 text-sm font-medium text-[#20332D] dark:text-[#E5F4EE] placeholder-[#20332D]/40 dark:placeholder-[#E5F4EE]/40 bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] rounded-2xl focus:bg-white dark:focus:bg-[#162C24] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] transition-all"
                  />
                  {localInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Bright Green Search Button (#087F5B) */}
                <button
                  type="submit"
                  className="px-7 py-3.5 text-sm font-extrabold text-white bg-[#087F5B] hover:bg-[#076B4D] active:bg-[#05573E] rounded-2xl shadow-lg shadow-[#087F5B]/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Search className="w-4 h-4 stroke-[2.8]" />
                  <span>Search</span>
                </button>
              </form>

              {/* Location Controls under Search Bar */}
              <div className="mt-3 pt-3 border-t border-emerald-900/5 dark:border-[#224538] flex flex-wrap items-center justify-between gap-3 text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#34D399] shrink-0" />
                  <span>Area:</span>
                  <button
                    type="button"
                    onClick={onOpenLocationSelector}
                    className="font-bold text-[#087F5B] dark:text-[#34D399] underline decoration-[#087F5B]/40 hover:decoration-[#087F5B] truncate cursor-pointer"
                    title="Change neighborhood"
                  >
                    {userLocation.name}
                  </button>
                  {userLocation.isLive && (
                    <span className="text-[10px] font-extrabold text-[#087F5B] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#132A21] px-2 py-0.5 rounded-full border border-[#087F5B]/20">
                      Live GPS
                    </span>
                  )}
                </div>

                {/* Geolocation Trigger Button */}
                <button
                  type="button"
                  onClick={onRequestGeolocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1FAF6] dark:bg-[#11231D] hover:bg-[#E2F5EE] dark:hover:bg-[#19352B] text-[#087F5B] dark:text-[#34D399] font-bold transition-all cursor-pointer disabled:opacity-50 border border-[#087F5B]/20"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Detecting Location...' : 'Use My Location'}</span>
                </button>
              </div>
            </div>

            {/* Popular Search Suggestions with Warm Accent Colors */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#20332D]/60 dark:text-[#E5F4EE]/60 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Popular:</span>
              </span>
              {POPULAR_SEARCH_SUGGESTIONS.map((med, idx) => {
                const colors = [
                  'bg-white dark:bg-[#162C24] text-[#087F5B] dark:text-[#34D399] border-[#087F5B]/25 hover:border-[#087F5B]',
                  'bg-white dark:bg-[#162C24] text-[#087E9B] dark:text-[#38BDF8] border-[#087E9B]/25 hover:border-[#087E9B]',
                  'bg-white dark:bg-[#162C24] text-[#B45309] dark:text-[#FCD34D] border-[#F59E0B]/25 hover:border-[#F59E0B]',
                  'bg-white dark:bg-[#162C24] text-[#805AD5] dark:text-[#C084FC] border-[#805AD5]/25 hover:border-[#805AD5]',
                ];
                const colorClass = colors[idx % colors.length];

                return (
                  <button
                    key={med}
                    onClick={() => handleSuggestionClick(med)}
                    className={`px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs hover:-translate-y-0.5 hover:shadow-sm ${colorClass}`}
                  >
                    {med}
                  </button>
                );
              })}
            </div>

            {/* Pharmacy Owner Portal Direct Access Banner */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl bg-white/95 dark:bg-[#162C24]/95 border-2 border-[#087F5B]/30 dark:border-[#285444] shadow-md hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087F5B] to-[#087E9B] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-5 h-5 stroke-[2.4]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                        Are you a Pharmacy Owner?
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#087F5B]/15 text-[#087F5B] dark:text-[#34D399] px-2 py-0.5 rounded-full">
                        Owner Portal
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-0.5">
                      {loggedInPharmacy 
                        ? `Logged in as ${loggedInPharmacy.name}. Manage inventory & stock updates.`
                        : 'Access store inventory dashboard, add drugs from catalog & update live stock.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loggedInPharmacy ? onOpenOwnerDashboard : onOpenPharmacyAuth}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#087F5B] via-[#087E9B] to-[#087F5B] text-white text-xs font-extrabold hover:opacity-95 shadow-md shadow-[#087F5B]/20 transition-all cursor-pointer whitespace-nowrap hover:scale-105 active:scale-95 shrink-0"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{loggedInPharmacy ? 'Go to Store Dashboard' : 'Open Pharmacy Portal'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Showcase with Colorful Decorative Shapes */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer decorative gradient aura */}
              <div className="absolute -inset-3 bg-gradient-to-r from-[#087F5B]/30 via-[#087E9B]/30 to-[#F59E0B]/30 rounded-3xl blur-xl opacity-80 pointer-events-none" />

              {/* Main Visual Container */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-[#1F3D32] bg-white dark:bg-[#162C24]">
                <img
                  src="/src/assets/images/hero_medicines_capsules_1794119274190.jpg"
                  alt="Colourful medicine capsules, tablets and pharmaceutical packaging"
                  referrerPolicy="no-referrer"
                  className="w-full h-[320px] sm:h-[380px] lg:h-[430px] object-cover"
                />
                
                {/* Contrast scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                {/* Bottom Overlay Info on Image */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-ping" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#A7F3D0]">
                      Active Medicine Directory
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug drop-shadow-sm">
                    Find genuine medicines, check dosages &amp; locate open Chennai counters.
                  </p>
                </div>
              </div>

              {/* Floating Stat Card 1: Verified Pharmacies */}
              <div className="absolute -top-4 -left-4 sm:-left-6 bg-white/95 dark:bg-[#162C24]/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-[#087F5B]/20 dark:border-[#285444] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087F5B] to-[#087E9B] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#20332D] dark:text-[#E5F4EE] block">
                    Verified Listings
                  </span>
                  <span className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-semibold">
                    100% Chennai Local Data
                  </span>
                </div>
              </div>

              {/* Floating Stat Card 2: 24/7 Hours Support */}
              <div className="absolute -bottom-4 -right-4 sm:-right-6 bg-white/95 dark:bg-[#162C24]/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-[#F59E0B]/30 dark:border-[#285444] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#20332D] dark:text-[#E5F4EE] block">
                    24/7 Emergency
                  </span>
                  <span className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-semibold">
                    Round-the-clock Counters
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
