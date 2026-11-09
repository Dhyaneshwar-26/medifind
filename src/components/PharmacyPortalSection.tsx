import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Package,
  Plus,
  Trash2,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  Eye,
  LogIn,
  UserPlus,
  Store,
  Lock,
  Mail,
  User,
  Hash,
  Info,
  ArrowRight,
  Loader2,
  Database,
} from 'lucide-react';
import {
  CatalogueMedicineOption,
  MedicineItem,
  PharmacyPortalTab,
} from '../types/pharmacy';
import type { UsePharmacyAuthResult } from '../hooks/usePharmacyAuth';
import { MASTER_MEDICINE_CATALOG } from '../data/pharmacies';
import { TAMIL_NADU_DISTRICTS, isInsideTamilNadu, isValidTamilNaduPinCode } from '../data/tamilNadu';
import { describeSupabaseError } from '../lib/supabase';
import { fetchMedicineCatalogue } from '../services/medicineService';
import {
  addInventoryItem,
  adjustInventoryQuantity,
  removeInventoryItem,
  setInventoryAvailability,
} from '../services/inventoryService';

interface PharmacyPortalSectionProps {
  auth: UsePharmacyAuthResult;
  onReturnToCustomerView: () => void;
  onPharmaciesChanged?: () => void;
  initialTab?: PharmacyPortalTab;
}

function catalogueOptionKey(option: CatalogueMedicineOption): string {
  return option.id || `${option.name}|${option.strength}`;
}

export const PharmacyPortalSection: React.FC<PharmacyPortalSectionProps> = ({
  auth,
  onReturnToCustomerView,
  onPharmaciesChanged,
  initialTab = 'login',
}) => {
  const pharmacy = auth.pharmacy;

  // Navigation tab inside portal: 'dashboard' | 'login' | 'register'
  const [activeTab, setActiveTab] = useState<PharmacyPortalTab>(
    pharmacy ? 'dashboard' : initialTab
  );

  // Success / info feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keep the visible tab in sync with the real authenticated session.
  useEffect(() => {
    if (pharmacy) {
      setActiveTab('dashboard');
    } else {
      setActiveTab((current) => (current === 'dashboard' ? 'login' : current));
    }
  }, [pharmacy]);

  // -------------------------------------------------------------
  // 1. LOGIN STATE
  // -------------------------------------------------------------
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await auth.signIn(loginEmail.trim(), loginPassword);
      setLoginPassword('');
      setActiveTab('dashboard');
      showToast('Signed in successfully.');
      onPharmaciesChanged?.();
    } catch (err) {
      setLoginError(describeSupabaseError(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // -------------------------------------------------------------
  // 2. REGISTRATION STATE (Strictly restricted to Tamil Nadu)
  // -------------------------------------------------------------
  const [regName, setRegName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regArea, setRegArea] = useState('');
  const [regDistrict, setRegDistrict] = useState<string>('Chennai');
  const [regPinCode, setRegPinCode] = useState('600001');
  const [regLat, setRegLat] = useState<number>(13.0827);
  const [regLng, setRegLng] = useState<number>(80.2707);
  const [regIs24Hours, setRegIs24Hours] = useState(false);
  const [regHours, setRegHours] = useState('8:00 AM – 10:30 PM (Daily)');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleDistrictChange = (distName: string) => {
    setRegDistrict(distName);
    const districtObj = TAMIL_NADU_DISTRICTS.find((d) => d.name === distName);
    if (districtObj) {
      setRegLat(districtObj.lat);
      setRegLng(districtObj.lng);
      setRegPinCode(`${districtObj.pinCodePrefix}001`);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (
      !regName.trim() ||
      !regOwnerName.trim() ||
      !regEmail.trim() ||
      !regPassword.trim() ||
      !regPhone.trim() ||
      !regAddress.trim() ||
      !regArea.trim()
    ) {
      setRegError('Please complete all required fields.');
      return;
    }

    // Tamil Nadu location verification check
    if (!isInsideTamilNadu(regLat, regLng)) {
      setRegError('MediFind operates ONLY within Tamil Nadu. Coordinates must be located within Tamil Nadu boundary.');
      return;
    }

    // Validate PIN code
    if (regPinCode && !isValidTamilNaduPinCode(regPinCode)) {
      setRegError('PIN code must be a valid 6-digit Tamil Nadu Postal Code (e.g., 600xxx to 643xxx).');
      return;
    }

    setIsRegistering(true);
    try {
      const result = await auth.signUpPharmacy({
        email: regEmail.trim(),
        password: regPassword,
        ownerName: regOwnerName.trim(),
        pharmacyName: regName.trim(),
        phone: regPhone.trim(),
        address: regAddress.trim(),
        area: regArea.trim(),
        district: regDistrict,
        pinCode: regPinCode.trim(),
        latitude: Number(regLat),
        longitude: Number(regLng),
        openingHours: regIs24Hours ? 'Open 24 Hours (Round-the-Clock)' : regHours,
        isOpenNow: true,
        is24Hours: regIs24Hours,
        services: ['Prescription Dispensing', 'First Aid & Dressings', 'Digital Payments Accepted'],
      });

      if (result.requiresEmailConfirmation) {
        setLoginEmail(regEmail.trim());
        setActiveTab('login');
        showToast('Registration received. Confirm your email, then sign in.');
      } else {
        setActiveTab('dashboard');
        showToast(`Successfully registered "${regName.trim()}" in ${regDistrict}, Tamil Nadu!`);
        onPharmaciesChanged?.();
      }

      setRegPassword('');
    } catch (err) {
      setRegError(describeSupabaseError(err));
    } finally {
      setIsRegistering(false);
    }
  };

  // -------------------------------------------------------------
  // 3. MEDICINE CATALOGUE (live Supabase rows, static fallback)
  // -------------------------------------------------------------
  const [catalogue, setCatalogue] = useState<CatalogueMedicineOption[]>(MASTER_MEDICINE_CATALOG);
  const [medCatalogueSelect, setMedCatalogueSelect] = useState<string>(
    catalogueOptionKey(MASTER_MEDICINE_CATALOG[0])
  );

  useEffect(() => {
    if (!auth.configured) return;

    let cancelled = false;
    void fetchMedicineCatalogue()
      .then((rows) => {
        if (!cancelled && rows.length > 0) {
          setCatalogue(rows);
        }
      })
      .catch(() => {
        // The reference catalogue fallback keeps the form usable if the
        // catalogue table is temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [auth.configured]);

  useEffect(() => {
    if (catalogue.length === 0) return;
    setMedCatalogueSelect((current) =>
      catalogue.some((item) => catalogueOptionKey(item) === current)
        ? current
        : catalogueOptionKey(catalogue[0])
    );
  }, [catalogue]);

  const selectedCatalogue = useMemo(
    () => catalogue.find((item) => catalogueOptionKey(item) === medCatalogueSelect) ?? null,
    [catalogue, medCatalogueSelect]
  );

  // -------------------------------------------------------------
  // 4. INVENTORY & DASHBOARD STATE
  // -------------------------------------------------------------
  const [inventorySearch, setInventorySearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [isSavingInventory, setIsSavingInventory] = useState(false);

  // Add Medicine Form Fields
  const [medName, setMedName] = useState('');
  const [medGenericName, setMedGenericName] = useState('');
  const [medStrength, setMedStrength] = useState('650mg');
  const [medDosageForm, setMedDosageForm] = useState('Tablet');
  const [medCategory, setMedCategory] = useState('Pain Relief & Fever');
  const [medStockQty, setMedStockQty] = useState<number>(50);
  const [medPrice, setMedPrice] = useState('');
  const [medRxRequired, setMedRxRequired] = useState(false);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState('');

  const handleCataloguePick = (catalogKey: string) => {
    setMedCatalogueSelect(catalogKey);
    const item = catalogue.find((option) => catalogueOptionKey(option) === catalogKey);
    if (item) {
      setMedName(item.name);
      setMedGenericName(item.genericName);
      setMedStrength(item.strength);
      setMedDosageForm(item.dosageForm);
      setMedCategory(item.category);
      setMedPrice(item.defaultPrice);
      setMedRxRequired(item.prescriptionRequired);
      setSelectedCatalogueId(item.id || '');
    }
  };

  const refreshAfterInventoryChange = async (message: string) => {
    await auth.refreshOwner();
    onPharmaciesChanged?.();
    showToast(message);
  };

  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy || isSavingInventory) return;

    const finalName = medName.trim() || selectedCatalogue?.name || '';
    if (!finalName) return;

    setIsSavingInventory(true);
    setInventoryError(null);
    try {
      await addInventoryItem(pharmacy.id, {
        medicineId: selectedCatalogueId || undefined,
        name: finalName,
        genericName: medGenericName.trim() || finalName,
        category: medCategory,
        strength: medStrength.trim(),
        dosageForm: medDosageForm.trim(),
        prescriptionRequired: medRxRequired,
        defaultPrice: medPrice.trim(),
        stockQuantity: Number(medStockQty) || 0,
        price: medPrice.trim(),
      });

      setIsAddModalOpen(false);
      await refreshAfterInventoryChange(`Added "${finalName}" (${medStrength}) to store inventory.`);

      // Reset the form for the next entry.
      setMedName('');
      setMedGenericName('');
      setSelectedCatalogueId('');
      setMedStockQty(50);
    } catch (err) {
      setInventoryError(describeSupabaseError(err));
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleStockDelta = async (med: MedicineItem, delta: number) => {
    if (!pharmacy || isSavingInventory) return;

    setIsSavingInventory(true);
    setInventoryError(null);
    try {
      await adjustInventoryQuantity(med, delta);
      await refreshAfterInventoryChange('Stock quantity updated.');
    } catch (err) {
      setInventoryError(describeSupabaseError(err));
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleToggleAvailability = async (med: MedicineItem) => {
    if (!pharmacy || isSavingInventory) return;

    setIsSavingInventory(true);
    setInventoryError(null);
    try {
      await setInventoryAvailability(med, !med.inStock);
      await refreshAfterInventoryChange('Medicine availability updated.');
    } catch (err) {
      setInventoryError(describeSupabaseError(err));
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleRemoveMedicine = async (med: MedicineItem) => {
    if (!pharmacy || isSavingInventory) return;
    if (!confirm(`Are you sure you want to remove "${med.name}" from your store inventory?`)) return;

    setIsSavingInventory(true);
    setInventoryError(null);
    try {
      await removeInventoryItem(med.inventoryId || med.id);
      await refreshAfterInventoryChange(`Removed "${med.name}" from inventory.`);
    } catch (err) {
      setInventoryError(describeSupabaseError(err));
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setActiveTab('login');
      onPharmaciesChanged?.();
    } catch (err) {
      showToast(describeSupabaseError(err));
    }
  };

  // Stats calculation
  const totalListedMedicines = pharmacy ? pharmacy.sampleMedicines.length : 0;
  const availableStockCount = pharmacy
    ? pharmacy.sampleMedicines.filter((m) => m.inStock).length
    : 0;
  const unavailableCount = pharmacy
    ? pharmacy.sampleMedicines.filter((m) => !m.inStock).length
    : 0;
  const totalUnits = pharmacy
    ? pharmacy.sampleMedicines.reduce((acc, m) => acc + (m.stockQuantity || 0), 0)
    : 0;

  const filteredInventory = pharmacy
    ? pharmacy.sampleMedicines.filter(
        (m) =>
          m.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
          (m.genericName && m.genericName.toLowerCase().includes(inventorySearch.toLowerCase())) ||
          m.category.toLowerCase().includes(inventorySearch.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-[#F1FAF6] dark:bg-[#0C1814] text-[#20332D] dark:text-[#E5F4EE] font-sans pb-24 transition-colors duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#087F5B] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#A7F3D0] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Portal Navigation Bar */}
      <div className="bg-white dark:bg-[#162C24] border-b border-emerald-900/10 dark:border-[#224538] sticky top-16 z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onReturnToCustomerView}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#087F5B]/10 hover:bg-[#087F5B]/20 text-[#087F5B] dark:text-[#34D399] text-xs font-extrabold transition-all cursor-pointer border border-[#087F5B]/20 hover:scale-105 active:scale-95"
              title="Return to the Customer Medicine Search"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
              <span>← Back to Customer Search</span>
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#087F5B] animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#087F5B] dark:text-[#34D399]">
                Pharmacy Portal (Tamil Nadu Only)
              </span>
            </div>
          </div>

          {/* Tab Navigation buttons */}
          <div className="flex items-center gap-2">
            {pharmacy ? (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'dashboard'
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] hover:text-[#087F5B]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Dashboard ({pharmacy.name.split(' ')[0]})</span>
                </button>

                <button
                  onClick={() => void handleSignOut()}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all cursor-pointer border border-rose-200/50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 p-1 bg-[#F1FAF6] dark:bg-[#11231D] rounded-xl border border-emerald-900/10 dark:border-[#224538]">
                <button
                  onClick={() => setActiveTab('login')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'login'
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087F5B]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Pharmacy Login</span>
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'register'
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'text-[#20332D]/70 dark:text-[#E5F4EE]/70 hover:text-[#087F5B]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Pharmacy</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* Supabase configuration warning */}
        {!auth.configured ? (
          <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-white dark:bg-[#162C24] border border-amber-300 dark:border-amber-800 shadow-sm text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
              <Database className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
              Connect the Supabase backend
            </h1>
            <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 leading-relaxed max-w-lg mx-auto">
              Pharmacy sign-in and registration need a live Supabase project. Add{' '}
              <code className="font-bold">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-bold">VITE_SUPABASE_ANON_KEY</code> (or{' '}
              <code className="font-bold">VITE_SUPABASE_PUBLISHABLE_KEY</code>) to{' '}
              <code className="font-bold">.env.local</code>, then restart the dev server.
            </p>
            <button
              onClick={onReturnToCustomerView}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F5B] hover:bg-[#076B4D] text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Customer Search</span>
            </button>
          </div>
        ) : auth.loading ? (
          <div className="max-w-2xl mx-auto p-10 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538] shadow-sm text-center space-y-3">
            <Loader2 className="w-9 h-9 text-[#087F5B] dark:text-[#34D399] mx-auto animate-spin" />
            <h2 className="text-lg font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
              Checking your pharmacy session
            </h2>
            <p className="text-xs text-[#20332D]/60 dark:text-[#E5F4EE]/60">
              Loading your account and store profile.
            </p>
          </div>
        ) : (
          <>
            {auth.error && (
              <div className="max-w-3xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="flex-1">{auth.error}</span>
                <button
                  onClick={auth.clearError}
                  className="text-rose-500 hover:text-rose-700 font-extrabold shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUBVIEW 1: PHARMACY LOGIN */}
            {/* ========================================================================= */}
            {activeTab === 'login' && !pharmacy && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
                
                {/* Header banner */}
                <div className="text-center max-w-xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087F5B]/10 text-[#087F5B] dark:text-[#34D399] text-xs font-extrabold uppercase tracking-wider mb-3">
                    <Building2 className="w-4 h-4" />
                    <span>Tamil Nadu Pharmacy Partner Network</span>
                  </div>
                  <h1 className="text-3xl font-extrabold text-[#20332D] dark:text-[#E5F4EE] tracking-tight">
                    Pharmacy Owner Sign In
                  </h1>
                  <p className="text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-2">
                    Manage your store profile, update live medicine inventory, and keep patients across Tamil Nadu informed on available stock.
                  </p>
                </div>

                {/* Two column layout: Sign in form + owner access guidance */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Email & Password Form */}
                  <div className="md:col-span-7 bg-white dark:bg-[#162C24] p-6 sm:p-8 rounded-3xl border border-emerald-900/10 dark:border-[#224538] shadow-md">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-emerald-900/10 dark:border-[#224538]">
                      <div>
                        <h2 className="text-lg font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                          Store Credentials
                        </h2>
                        <span className="text-xs text-[#20332D]/60 dark:text-[#E5F4EE]/60">
                          Sign in using your registered Tamil Nadu pharmacy email
                        </span>
                      </div>
                      <Lock className="w-5 h-5 text-[#087F5B]" />
                    </div>

                    {loginError && (
                      <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Registered Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="owner@yourpharmacy.com"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full py-3 px-4 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#087F5B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                      >
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Signing In...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In to Pharmacy Dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <div className="pt-4 border-t border-emerald-900/10 dark:border-[#224538] text-center">
                        <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                          Don&apos;t have an account for your pharmacy?{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('register')}
                            className="font-bold text-[#087F5B] dark:text-[#34D399] underline hover:text-[#065F46] cursor-pointer"
                          >
                            Register your pharmacy now
                          </button>
                        </p>
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Owner access guidance */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="p-4 rounded-3xl bg-[#D1FAE5]/70 dark:bg-[#064E3B]/30 border border-[#087F5B]/30 text-xs text-[#065F46] dark:text-[#6EE7B7]">
                      <div className="flex items-center gap-2 font-extrabold mb-1">
                        <ShieldCheck className="w-4 h-4 text-[#087F5B] dark:text-[#34D399]" />
                        <span>Secure Owner Access</span>
                      </div>
                      <p className="leading-relaxed">
                        Every account is verified through Supabase Auth. Your dashboard only shows the pharmacy linked to your signed-in email.
                      </p>
                    </div>

                    <div className="p-4 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538] shadow-2xs space-y-3">
                      <span className="text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] block">
                        What you can manage:
                      </span>
                      <ul className="space-y-2 text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
                          <span>Live unit counts and in-stock availability</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
                          <span>Catalogue and custom medicine entries</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
                          <span>Store details visible to customers</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-3xl bg-[#EBF7FA] dark:bg-[#142A33] border border-[#087E9B]/25 text-[11px] text-[#155E75] dark:text-[#67E8F9]">
                      <div className="flex items-center gap-2 font-extrabold mb-1">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>New to MediFind?</span>
                      </div>
                      <p className="leading-relaxed">
                        Register your pharmacy with its complete Tamil Nadu address and contact number to open the owner dashboard.
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ========================================================================= */}
            {/* SUBVIEW 2: PHARMACY REGISTRATION (Tamil Nadu Only) */}
            {/* ========================================================================= */}
            {activeTab === 'register' && !pharmacy && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                
                <div className="text-center max-w-xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087F5B]/10 text-[#087F5B] dark:text-[#34D399] text-xs font-extrabold uppercase tracking-wider mb-3">
                    <Store className="w-4 h-4" />
                    <span>Tamil Nadu Pharmacy Registration</span>
                  </div>
                  <h1 className="text-3xl font-extrabold text-[#20332D] dark:text-[#E5F4EE] tracking-tight">
                    Register Your Pharmacy
                  </h1>
                  <p className="text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-2">
                    Join the Tamil Nadu healthcare directory. All registrations are restricted strictly to Tamil Nadu districts.
                  </p>
                </div>

                <div className="bg-white dark:bg-[#162C24] p-6 sm:p-8 rounded-3xl border border-emerald-900/10 dark:border-[#224538] shadow-md">
                  
                  {regError && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                    
                    {/* 1. Pharmacy Name & Owner Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Pharmacy Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="e.g. Apollo Pharmacy / Kaveri Meds"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Owner Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={regOwnerName}
                            onChange={(e) => setRegOwnerName(e.target.value)}
                            placeholder="e.g. Dr. S. K. Sundar"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Email & Phone Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Owner Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="owner@yourpharmacy.com"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Pharmacy Contact Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="tel"
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="+91 98400 12345"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Password */}
                    <div>
                      <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create a secure password"
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                        />
                      </div>
                    </div>

                    {/* 4. Pharmacy Address & Area */}
                    <div>
                      <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                        Complete Shop Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        placeholder="e.g. 142 Gandhi Road, Near Bus Stand"
                        className="w-full px-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                        Area / Locality <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={regArea}
                          onChange={(e) => setRegArea(e.target.value)}
                          placeholder="e.g. T. Nagar, RS Puram, Anna Nagar"
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                        />
                      </div>
                    </div>

                    {/* 5. District (Strictly Tamil Nadu) & PIN Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Tamil Nadu District <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={regDistrict}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                        >
                          {TAMIL_NADU_DISTRICTS.map((d) => (
                            <option key={d.id} value={d.name}>
                              {d.name} District (TN)
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 block">
                          ✓ Restricted to Tamil Nadu&apos;s 38 official districts
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          PIN Code (Tamil Nadu) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={regPinCode}
                            onChange={(e) => setRegPinCode(e.target.value)}
                            placeholder="600001"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                          Must start with 60xxxx – 64xxxx
                        </span>
                      </div>
                    </div>

                    {/* 6. Pharmacy Location Coordinates (Restricted to Tamil Nadu) */}
                    <div className="p-4 rounded-2xl bg-[#EBF7F2] dark:bg-[#132B21] border border-[#087F5B]/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-extrabold text-[#087F5B] dark:text-[#34D399] block">
                            Pharmacy Map Coordinates (Tamil Nadu Boundary Check)
                          </span>
                          <span className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium">
                            Coordinates are auto-centered on {regDistrict}
                          </span>
                        </div>
                        <MapPin className="w-4 h-4 text-[#087F5B] dark:text-[#34D399]" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                            Latitude (° N)
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            required
                            value={regLat}
                            onChange={(e) => setRegLat(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-[#162C24] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                            Longitude (° E)
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            required
                            value={regLng}
                            onChange={(e) => setRegLng(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-[#162C24] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 7. 24/7 Hours Toggle */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="portalReg24Hours"
                        checked={regIs24Hours}
                        onChange={(e) => setRegIs24Hours(e.target.checked)}
                        className="rounded text-[#087F5B] focus:ring-[#087F5B] w-4 h-4"
                      />
                      <label htmlFor="portalReg24Hours" className="text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] cursor-pointer">
                        Open 24/7 (Round-the-clock emergency medical counter)
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full py-3.5 px-4 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#087F5B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating your pharmacy...</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-4 h-4" />
                          <span>Register Pharmacy &amp; Launch Dashboard</span>
                        </>
                      )}
                    </button>

                    <div className="text-center pt-3 border-t border-emerald-900/10 dark:border-[#224538]">
                      <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                        Already registered?{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('login')}
                          className="font-bold text-[#087F5B] dark:text-[#34D399] underline hover:text-[#065F46] cursor-pointer"
                        >
                          Sign In here
                        </button>
                      </p>
                    </div>

                  </form>
                </div>

              </div>
            )}

            {/* Signed in but no pharmacy profile exists yet */}
            {activeTab === 'dashboard' && !pharmacy && auth.user && (
              <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538] shadow-sm text-center space-y-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF7F2] dark:bg-[#132A21] text-[#087F5B] dark:text-[#34D399] flex items-center justify-center mx-auto">
                  <Store className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                  No pharmacy linked to this account
                </h2>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 max-w-md mx-auto leading-relaxed">
                  You are signed in as <strong>{auth.user.email}</strong>, but no pharmacy record is linked to this account yet. Register your pharmacy to create the store profile.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F5B] hover:bg-[#076B4D] text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register Pharmacy</span>
                  </button>
                  <button
                    onClick={() => void auth.refreshOwner()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#087F5B] dark:text-[#34D399] bg-[#EBF7F2] dark:bg-[#132A21] border border-[#087F5B]/30 rounded-2xl transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => void handleSignOut()}
                    className="px-4 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-2xl transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUBVIEW 3: PHARMACY DASHBOARD & INVENTORY MANAGEMENT */}
            {/* ========================================================================= */}
            {activeTab === 'dashboard' && pharmacy && (
              <div className="space-y-8 animate-in fade-in duration-200">
                
                {/* Pharmacy Profile Header Banner */}
                <div className="bg-gradient-to-r from-[#087F5B] via-[#087E9B] to-[#087F5B] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#087F5B]/15">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 text-white px-3 py-0.5 rounded-full border border-white/30 backdrop-blur-xs">
                          Live Store Session
                        </span>
                        <span className="text-teal-200 text-xs font-semibold">
                          Owner: {pharmacy.ownerName || auth.profile?.full_name || 'Registered owner'}
                        </span>
                        <span className="text-white/40">·</span>
                        <span className="text-amber-200 text-xs font-bold">
                          {pharmacy.district}, Tamil Nadu
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                        {pharmacy.name}
                      </h1>
                      <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
                        {pharmacy.address} · PIN: {pharmacy.pinCode || 'Not provided'} · Phone: {pharmacy.phone}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#087F5B] hover:bg-teal-50 font-extrabold text-xs shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Add Medicine to Inventory</span>
                      </button>

                      <button
                        onClick={onReturnToCustomerView}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-xs border border-white/20 transition-all cursor-pointer"
                        title="See how patients view your stock"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Preview as Patient</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Key Stat Cards Requested */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-white/20">
                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15">
                      <span className="text-xs text-teal-100 font-bold block mb-1">Total Medicines Listed</span>
                      <span className="text-3xl font-extrabold tabular-nums">{totalListedMedicines}</span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15">
                      <span className="text-xs text-teal-100 font-bold block mb-1">Available Stock Count</span>
                      <span className="text-3xl font-extrabold tabular-nums text-emerald-200">{availableStockCount}</span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15">
                      <span className="text-xs text-teal-100 font-bold block mb-1">Unavailable Medicine Count</span>
                      <span className="text-3xl font-extrabold tabular-nums text-amber-200">{unavailableCount}</span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15">
                      <span className="text-xs text-teal-100 font-bold block mb-1">Total Units in Stock</span>
                      <span className="text-3xl font-extrabold tabular-nums">{totalUnits}</span>
                    </div>
                  </div>
                </div>

                {/* Live Sync Notice */}
                <div className="p-4 rounded-3xl bg-[#EBF7F2] dark:bg-[#132B21] border border-[#087F5B]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-[#087F5B] dark:text-[#34D399] font-bold">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>
                      Live Sync Active: every stock change is saved to Supabase and appears in the Customer Medicine Search.
                    </span>
                  </div>
                  <button
                    onClick={onReturnToCustomerView}
                    className="text-xs font-extrabold underline text-[#087F5B] dark:text-[#34D399] hover:opacity-80 cursor-pointer shrink-0"
                  >
                    Test in Customer Search →
                  </button>
                </div>

                {/* Inventory Management Section */}
                <div className="bg-white dark:bg-[#162C24] p-6 rounded-3xl border border-emerald-900/10 dark:border-[#224538] shadow-sm space-y-6">
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                        Store Medicine Inventory
                      </h3>
                      <p className="text-xs text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                        Adjust real-time unit counts, toggle in-stock / out-of-stock, or add medicines from the catalogue
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          placeholder="Search store inventory..."
                          className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                        />
                      </div>

                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076B4D] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Medicine</span>
                      </button>
                    </div>
                  </div>

                  {inventoryError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{inventoryError}</span>
                      <button
                        onClick={() => setInventoryError(null)}
                        className="text-rose-500 hover:text-rose-700 font-extrabold shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Inventory Table */}
                  <div className="overflow-x-auto rounded-2xl border border-emerald-900/10 dark:border-[#224538]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D]/80 dark:text-[#E5F4EE]/80 border-b border-emerald-900/10 dark:border-[#224538]">
                        <tr>
                          <th className="py-3.5 px-4 font-bold">Medicine Name</th>
                          <th className="py-3.5 px-4 font-bold">Strength &amp; Dosage Form</th>
                          <th className="py-3.5 px-4 font-bold">Category</th>
                          <th className="py-3.5 px-4 font-bold text-center">Availability</th>
                          <th className="py-3.5 px-4 font-bold text-center">Stock Quantity</th>
                          <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-900/5 dark:divide-[#224538]">
                        {filteredInventory.map((med) => (
                          <tr key={med.id} className="hover:bg-[#F1FAF6]/50 dark:hover:bg-[#132A21]/50 transition-colors">
                            
                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-[#20332D] dark:text-[#E5F4EE] text-sm">
                                {med.name}
                              </div>
                              <div className="text-[11px] text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                                {med.genericName || 'Pharmaceutical formulation'}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#20332D] dark:text-[#E5F4EE]">
                                {med.strength || med.dosage}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {med.dosageForm || 'Oral dosage'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="bg-[#EBF7F2] dark:bg-[#132A21] text-[#087F5B] dark:text-[#34D399] px-2.5 py-0.5 rounded-lg border border-[#087F5B]/20 font-bold text-[11px]">
                                {med.category}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => void handleToggleAvailability(med)}
                                disabled={isSavingInventory}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-60 ${
                                  med.inStock
                                    ? 'bg-[#D1FAE5] text-[#065F46] dark:bg-[#064E3B] dark:text-[#6EE7B7] border border-[#087F5B]/30'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                                }`}
                                title="Click to toggle Available vs Unavailable"
                              >
                                <span className={`w-2 h-2 rounded-full ${med.inStock ? 'bg-[#087F5B] dark:bg-[#34D399]' : 'bg-rose-500'}`} />
                                <span>{med.inStock ? 'In Stock' : 'Marked Unavailable'}</span>
                              </button>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-[#F1FAF6] dark:bg-[#11231D] p-1 rounded-xl border border-emerald-900/10 dark:border-[#224538]">
                                <button
                                  onClick={() => void handleStockDelta(med, -10)}
                                  disabled={isSavingInventory}
                                  className="w-6 h-6 rounded-lg bg-white dark:bg-[#162C24] hover:bg-slate-200 dark:hover:bg-[#1E3B32] text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Decrease 10 units"
                                >
                                  -
                                </button>
                                <span className="w-12 text-center font-extrabold tabular-nums text-xs text-[#20332D] dark:text-[#E5F4EE]">
                                  {med.stockQuantity}
                                </span>
                                <button
                                  onClick={() => void handleStockDelta(med, 10)}
                                  disabled={isSavingInventory}
                                  className="w-6 h-6 rounded-lg bg-white dark:bg-[#162C24] hover:bg-slate-200 dark:hover:bg-[#1E3B32] text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Add 10 units"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => void handleRemoveMedicine(med)}
                                disabled={isSavingInventory}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Remove from inventory"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>

                          </tr>
                        ))}
                        {filteredInventory.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                              {pharmacy.sampleMedicines.length === 0
                                ? 'Your inventory is empty. Add your first medicine to publish live stock.'
                                : 'No matching medicines found in inventory.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            )}
          </>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD MEDICINE (from Catalogue or Custom) */}
      {/* ========================================================================= */}
      {isAddModalOpen && pharmacy && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#162C24] rounded-3xl shadow-2xl border border-emerald-900/10 dark:border-[#285444] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-emerald-900/10 dark:border-[#224538] flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                  Add Medicine to Inventory
                </h3>
                <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium">
                  Search the medicine catalogue or enter custom details
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer"
              >
                <Package className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedicineSubmit} className="p-6 overflow-y-auto space-y-4">
              
              {/* Catalogue Search Selector */}
              <div>
                <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                  Pick from Medicine Catalogue:
                </label>
                <select
                  value={medCatalogueSelect}
                  onChange={(e) => handleCataloguePick(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                >
                  {catalogue.map((item) => (
                    <option key={catalogueOptionKey(item)} value={catalogueOptionKey(item)}>
                      {item.name} ({item.strength} {item.dosageForm}) — {item.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medicine Name */}
              <div>
                <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={medName || selectedCatalogue?.name || ''}
                  onChange={(e) => {
                    setMedName(e.target.value);
                    setSelectedCatalogueId('');
                  }}
                  placeholder="e.g. Paracetamol"
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                />
              </div>

              {/* Strength & Dosage Form (Required fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                    Strength (e.g. 500mg, 10mg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={medStrength}
                    onChange={(e) => {
                      setMedStrength(e.target.value);
                      setSelectedCatalogueId('');
                    }}
                    placeholder="e.g. 650mg"
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                    Dosage Form <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={medDosageForm}
                    onChange={(e) => {
                      setMedDosageForm(e.target.value);
                      setSelectedCatalogueId('');
                    }}
                    className="w-full px-3 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                  >
                    {['Tablet', 'Capsule', 'Syrup', 'Eye Drops', 'Injection', 'Powder Sachet', 'Topical Ointment', 'Inhaler'].map((form) => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Initial Stock Quantity (Units) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={medStockQty}
                  onChange={(e) => setMedStockQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Unit Price (optional)
                </label>
                <input
                  type="text"
                  value={medPrice}
                  onChange={(e) => setMedPrice(e.target.value)}
                  placeholder="e.g. ₹35"
                  className="w-full px-3.5 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Category
                </label>
                <select
                  value={medCategory}
                  onChange={(e) => setMedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                >
                  {[
                    'Pain Relief & Fever',
                    'Antibiotics',
                    'Allergy & Cold',
                    'Antacid & Digestion',
                    'Diabetes Management',
                    'Cardiovascular Care',
                    'Anti-inflammatory',
                    'Respiratory & Allergy',
                    'Vitamins & Bone Health',
                    'Hydration & Gut Care',
                    'First Aid & Wound Care',
                  ].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="portalAddRx"
                  checked={medRxRequired}
                  onChange={(e) => setMedRxRequired(e.target.checked)}
                  className="rounded text-[#087F5B] focus:ring-[#087F5B]"
                />
                <label htmlFor="portalAddRx" className="text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] cursor-pointer">
                  Doctor&apos;s Prescription (Rx) Required
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInventory}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isSavingInventory ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add to Store Stock</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
