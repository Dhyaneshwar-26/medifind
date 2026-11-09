import React, { useState } from 'react';
import { Cross, MapPin, Menu, X, ArrowUpRight, Sun, Moon, Building2, Store, Search } from 'lucide-react';
import { UserLocation, Pharmacy, ActiveView } from '../types/pharmacy';

interface NavbarProps {
  userLocation: UserLocation;
  onOpenLocationSelector: () => void;
  onNavigate: (sectionId: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  loggedInPharmacy: Pharmacy | null;
  activeView: ActiveView;
  onOpenPharmacyPortal: () => void;
  onOpenCustomerView: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userLocation,
  onOpenLocationSelector,
  onNavigate,
  isDarkMode,
  onToggleDarkMode,
  loggedInPharmacy,
  activeView,
  onOpenPharmacyPortal,
  onOpenCustomerView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    onOpenCustomerView();
    onNavigate(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#11231D]/95 backdrop-blur-md border-b border-emerald-900/10 dark:border-[#1F3D32] transition-colors duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087F5B] via-[#087E9B] to-[#087F5B] text-white flex items-center justify-center shadow-md shadow-[#087F5B]/20 group-hover:scale-105 transition-all">
              <Cross className="w-5 h-5 stroke-[2.8]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-[#20332D] dark:text-[#E5F4EE]">
                  Medi<span className="text-[#087F5B] dark:text-[#10B981]">Find</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-[#087F5B]/15 text-[#087F5B] dark:text-[#34D399] px-2 py-0.5 rounded-full border border-[#087F5B]/30">
                  Tamil Nadu
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#20332D]/80 dark:text-[#E5F4EE]/80">
            <button
              onClick={() => handleNavClick('home')}
              className={`hover:text-[#087F5B] dark:hover:text-[#10B981] transition-colors whitespace-nowrap cursor-pointer ${
                activeView === 'customer' ? 'text-[#087F5B] dark:text-[#10B981]' : ''
              }`}
            >
              Customer Search
            </button>
            <button
              onClick={() => handleNavClick('pharmacies')}
              className="hover:text-[#087F5B] dark:hover:text-[#10B981] transition-colors whitespace-nowrap cursor-pointer"
            >
              Find Pharmacies
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className="hover:text-[#087F5B] dark:hover:text-[#10B981] transition-colors whitespace-nowrap cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('contact')}
              className="hover:text-[#087F5B] dark:hover:text-[#10B981] transition-colors whitespace-nowrap cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Zone 3: Actions & Clearly Visible Pharmacy Portal Button */}
          <div className="hidden sm:flex items-center gap-2.5">
            
            {/* Area indicator */}
            <button
              onClick={onOpenLocationSelector}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#20332D] dark:text-[#E5F4EE] bg-[#F1FAF6] dark:bg-[#162C24] hover:bg-[#E2F5EE] dark:hover:bg-[#1D3A2F] rounded-xl border border-emerald-900/10 dark:border-[#224538] transition-all cursor-pointer max-w-[170px] shadow-2xs"
              title="Change district / area in Tamil Nadu"
            >
              <MapPin className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#10B981] shrink-0" />
              <span className="truncate">{userLocation.name}</span>
            </button>

            {/* Prominent Theme Toggle Pill with Icon & Label */}
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] bg-[#F1FAF6] dark:bg-[#162C24] hover:bg-[#E2F5EE] dark:hover:bg-[#1D3A2F] border border-emerald-900/10 dark:border-[#224538] transition-all cursor-pointer shadow-2xs"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#087E9B]" />
                  <span className="text-[11px]">Dark</span>
                </>
              )}
            </button>

            {/* CLEARLY VISIBLE PHARMACY PORTAL BUTTON (Required by Prompt) */}
            <button
              onClick={onOpenPharmacyPortal}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                activeView === 'pharmacy-portal'
                  ? 'bg-[#087F5B] text-white ring-2 ring-[#087F5B]/30'
                  : 'bg-[#EBF7F2] dark:bg-[#132B21] text-[#087F5B] dark:text-[#34D399] border border-[#087F5B]/40 hover:bg-[#D1FAE5]'
              }`}
            >
              <Building2 className="w-4 h-4 stroke-[2.5]" />
              <span>{loggedInPharmacy ? 'My Store Portal' : 'Pharmacy Portal'}</span>
            </button>

            {/* If in portal, show Customer Search button */}
            {activeView === 'pharmacy-portal' && (
              <button
                onClick={onOpenCustomerView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#162C24] border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#087F5B]" />
                <span>Customer Search</span>
              </button>
            )}

          </div>

          {/* Mobile Header Controls */}
          <div className="flex sm:hidden items-center gap-1.5">
            {/* Theme Switcher on mobile */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-[#20332D] dark:text-[#E5F4EE] rounded-xl bg-[#F1FAF6] dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538]"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#087E9B]" />}
            </button>

            {/* Pharmacy Portal Button on mobile */}
            <button
              onClick={onOpenPharmacyPortal}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                activeView === 'pharmacy-portal'
                  ? 'bg-[#087F5B] text-white border-[#087F5B]'
                  : 'bg-[#EBF7F2] dark:bg-[#132B21] text-[#087F5B] dark:text-[#34D399] border-[#087F5B]/30'
              }`}
              title="Pharmacy Portal"
            >
              <Building2 className="w-4 h-4" />
              <span className="text-[11px] font-extrabold">Portal</span>
            </button>

            {/* Hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#20332D] dark:text-[#E5F4EE] rounded-xl hover:bg-[#F1FAF6] dark:hover:bg-[#162C24] focus:outline-none"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-emerald-900/10 dark:border-[#1F3D32] bg-white dark:bg-[#11231D] px-4 pt-2 pb-4 space-y-2">
          
          {/* Pharmacy Portal Action in Mobile Menu */}
          <div className="py-2 border-b border-emerald-900/5 dark:border-[#1F3D32]">
            <button
              onClick={() => {
                onOpenPharmacyPortal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#087F5B] text-white font-extrabold text-xs shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>Pharmacy Portal (Owner Login &amp; Register)</span>
              </div>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <div className="py-2 border-b border-emerald-900/5 dark:border-[#1F3D32] mb-2">
            <button
              onClick={() => {
                onOpenLocationSelector();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-[#20332D] dark:text-[#E5F4EE] bg-[#F1FAF6] dark:bg-[#162C24] rounded-xl border border-emerald-900/10 dark:border-[#224538]"
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#10B981] shrink-0" />
                <span className="truncate">{userLocation.name}</span>
              </div>
              <span className="text-[11px] text-[#087F5B] dark:text-[#10B981] font-bold shrink-0">Change District</span>
            </button>
          </div>

          <button
            onClick={() => handleNavClick('home')}
            className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-[#20332D] dark:text-[#E5F4EE] hover:bg-[#F1FAF6] dark:hover:bg-[#162C24] hover:text-[#087F5B] rounded-xl transition-colors"
          >
            Customer Medicine Search
          </button>
          <button
            onClick={() => handleNavClick('pharmacies')}
            className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-[#20332D] dark:text-[#E5F4EE] hover:bg-[#F1FAF6] dark:hover:bg-[#162C24] hover:text-[#087F5B] rounded-xl transition-colors"
          >
            Find Pharmacies
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-[#20332D] dark:text-[#E5F4EE] hover:bg-[#F1FAF6] dark:hover:bg-[#162C24] hover:text-[#087F5B] rounded-xl transition-colors"
          >
            About MediFind
          </button>
          <button
            onClick={() => handleNavClick('contact')}
            className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-[#20332D] dark:text-[#E5F4EE] hover:bg-[#F1FAF6] dark:hover:bg-[#162C24] hover:text-[#087F5B] rounded-xl transition-colors"
          >
            Contact
          </button>
        </div>
      )}
    </header>
  );
};
