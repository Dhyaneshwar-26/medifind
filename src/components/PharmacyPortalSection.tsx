import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Download,
  Upload,
  FileSpreadsheet,
  Pencil,
  X,
  CalendarDays,
  History,
  Save,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  MailCheck,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import {
  CatalogueMedicineOption,
  MedicineItem,
  PharmacyPortalTab,
} from '../types/pharmacy';
import type { InventoryHistoryRow } from '../types/database';
import type { UsePharmacyAuthResult } from '../hooks/usePharmacyAuth';
import { MASTER_MEDICINE_CATALOG } from '../data/pharmacies';
import { TAMIL_NADU_DISTRICTS, isValidTamilNaduPinCode } from '../data/tamilNadu';
import { describeSupabaseError } from '../lib/supabase';
import { fetchMedicineCatalogue } from '../services/medicineService';
import type { ReverseGeocodeAddress } from '../services/geocodingService';
import { updatePharmacyProfile } from '../services/pharmacyService';
import { checkTamilNaduBoundary } from '../utils/tamilNaduBoundary';
import { hasValidTamilNaduCoordinates } from '../utils/directions';
import { LocationPickerMap, type LocationPickerValue } from './LocationPickerMap';
import {
  addInventoryItem,
  adjustInventoryQuantity,
  bulkImportInventory,
  fetchInventoryHistory,
  isInventoryExtensionSchemaError,
  removeInventoryItem,
  setInventoryAvailability,
  updateInventoryItem,
  type BulkImportResultRow,
  type BulkImportRow,
} from '../services/inventoryService';
import {
  CSV_MAX_BYTES,
  downloadCsvTemplate,
  validateCsv,
  type CsvValidationResult,
} from '../services/csvService';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  expiryWarningLabel,
  formatExpiryDate,
  formatRelativeTime,
  getExpiryWarningLevel,
  isExpiredDate,
  isExpiringSoonDate,
  isValidExpiryDate,
} from '../utils/format';

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

  // Keep the visible tab in sync with the real authenticated session. Refreshing
  // the same pharmacy (for example after saving a profile) must not kick the
  // owner out of the profile editor.
  const previousPharmacyIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentId = pharmacy?.id ?? null;
    const previousId = previousPharmacyIdRef.current;
    previousPharmacyIdRef.current = currentId;

    if (currentId && previousId !== currentId) {
      setActiveTab('dashboard');
    } else if (!currentId) {
      setActiveTab((current) =>
        current === 'dashboard' || current === 'profile' ? 'login' : current
      );
    }
  }, [pharmacy?.id]);

  // -------------------------------------------------------------
  // 1. LOGIN STATE
  // -------------------------------------------------------------
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot-password request + recovery (set a new password) state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetRequestEmail, setResetRequestEmail] = useState('');
  const [resetRequestMessage, setResetRequestMessage] = useState<string | null>(null);
  const [resetRequestError, setResetRequestError] = useState<string | null>(null);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const isEmailVerified = Boolean(auth.user?.email_confirmed_at);

  const handleRequestPasswordReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setResetRequestError(null);
    setResetRequestMessage(null);

    if (!resetRequestEmail.trim()) {
      setResetRequestError('Enter the email address registered with your pharmacy.');
      return;
    }

    setIsRequestingReset(true);
    try {
      await auth.requestPasswordReset(resetRequestEmail.trim());
      setResetRequestMessage(
        'If that email is registered, a secure password reset link has been sent. Check the inbox and spam folder.'
      );
    } catch (err) {
      setResetRequestError(describeSupabaseError(err));
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMessage(null);

    if (newPassword.length < 6) {
      setRecoveryError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('The two passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await auth.updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryMessage('Password updated. You can continue to your dashboard.');
      showToast('Password updated successfully.');
    } catch (err) {
      setRecoveryError(describeSupabaseError(err));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
  const [regDraftLocation, setRegDraftLocation] = useState<LocationPickerValue | null>(null);
  const [regConfirmedLocation, setRegConfirmedLocation] = useState<LocationPickerValue | null>(null);
  const [regIs24Hours, setRegIs24Hours] = useState(false);
  const [regHours, setRegHours] = useState('8:00 AM – 10:30 PM (Daily)');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Fields the owner edits by hand are never overwritten by reverse geocoding.
  // Untouched fields are filled from the pin after GPS / click / drag.
  const regAddressEditedRef = useRef(false);
  const regAreaEditedRef = useRef(false);
  const regDistrictEditedRef = useRef(false);
  const regPinEditedRef = useRef(false);

  const handleRegAddressResolved = (resolved: ReverseGeocodeAddress) => {
    if (resolved.addressLine && !regAddressEditedRef.current) {
      setRegAddress(resolved.addressLine);
    }
    if (resolved.area && !regAreaEditedRef.current) {
      setRegArea(resolved.area);
    }
    if (resolved.pinCode && !regPinEditedRef.current) {
      setRegPinCode(resolved.pinCode);
    }
    if (resolved.matchedDistrict && !regDistrictEditedRef.current) {
      setRegDistrict(resolved.matchedDistrict);
    }
  };

  const handleDistrictChange = (distName: string) => {
    regDistrictEditedRef.current = true;
    setRegDistrict(distName);
    const districtObj = TAMIL_NADU_DISTRICTS.find((d) => d.name === distName);
    if (districtObj) {
      setRegPinCode(`${districtObj.pinCodePrefix}001`);
    }
    // The old pin belongs to the previous district, so never carry it forward
    // silently. The owner must place and confirm a new pin.
    setRegDraftLocation(null);
    setRegConfirmedLocation(null);
  };

  const handleRegDraftChange = (next: LocationPickerValue | null) => {
    setRegDraftLocation(next);
    // Moving the pin always invalidates a previous confirmation.
    setRegConfirmedLocation(null);
  };

  const handleRegConfirm = (next: LocationPickerValue) => {
    const boundary = checkTamilNaduBoundary(next.lat, next.lng);
    if (!boundary.inside) {
      setRegError(
        'The selected pin is outside Tamil Nadu. Move it inside the state boundary before confirming.'
      );
      return;
    }
    setRegDraftLocation({ lat: next.lat, lng: next.lng });
    setRegConfirmedLocation({ lat: next.lat, lng: next.lng });
    setRegError(null);
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

    // A pharmacy can only be registered with an explicitly confirmed pin.
    if (!regConfirmedLocation) {
      setRegError(
        'Place the pharmacy pin on the map and click "Confirm Location" before registering.'
      );
      return;
    }

    const boundary = checkTamilNaduBoundary(
      regConfirmedLocation.lat,
      regConfirmedLocation.lng
    );
    if (!boundary.inside) {
      setRegError(
        'MediFind operates ONLY within Tamil Nadu. The confirmed pin must be inside the Tamil Nadu boundary.'
      );
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
        latitude: regConfirmedLocation.lat,
        longitude: regConfirmedLocation.lng,
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
      setRegDraftLocation(null);
      setRegConfirmedLocation(null);
    } catch (err) {
      setRegError(describeSupabaseError(err));
    } finally {
      setIsRegistering(false);
    }
  };

  // -------------------------------------------------------------
  // 2b. EDIT PHARMACY PROFILE STATE
  // -------------------------------------------------------------
  const [profileName, setProfileName] = useState('');
  const [profileOwnerName, setProfileOwnerName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileArea, setProfileArea] = useState('');
  const [profileDistrict, setProfileDistrict] = useState<string>('Chennai');
  const [profilePinCode, setProfilePinCode] = useState('');
  const [profileHours, setProfileHours] = useState('');
  const [profileIs24Hours, setProfileIs24Hours] = useState(false);
  const [profileIsOpenNow, setProfileIsOpenNow] = useState(true);
  const [profileDraftLocation, setProfileDraftLocation] = useState<LocationPickerValue | null>(null);
  const [profileConfirmedLocation, setProfileConfirmedLocation] =
    useState<LocationPickerValue | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const profileInitialisedForRef = useRef<string | null>(null);

  // Same manual-edit protection as registration: reverse geocoding fills only
  // fields the owner has not typed into.
  const profileAddressEditedRef = useRef(false);
  const profileAreaEditedRef = useRef(false);
  const profileDistrictEditedRef = useRef(false);
  const profilePinEditedRef = useRef(false);

  const handleProfileAddressResolved = (resolved: ReverseGeocodeAddress) => {
    if (resolved.addressLine && !profileAddressEditedRef.current) {
      setProfileAddress(resolved.addressLine);
    }
    if (resolved.area && !profileAreaEditedRef.current) {
      setProfileArea(resolved.area);
    }
    if (resolved.pinCode && !profilePinEditedRef.current) {
      setProfilePinCode(resolved.pinCode);
    }
    if (resolved.matchedDistrict && !profileDistrictEditedRef.current) {
      setProfileDistrict(resolved.matchedDistrict);
    }
  };

  useEffect(() => {
    if (!pharmacy) return;
    if (profileInitialisedForRef.current === pharmacy.id) return;

    profileInitialisedForRef.current = pharmacy.id;
    profileAddressEditedRef.current = false;
    profileAreaEditedRef.current = false;
    profileDistrictEditedRef.current = false;
    profilePinEditedRef.current = false;
    setProfileName(pharmacy.name);
    setProfileOwnerName(pharmacy.ownerName || '');
    setProfilePhone(pharmacy.phone);
    setProfileEmergencyPhone(pharmacy.emergencyPhone || '');
    setProfileAddress(pharmacy.address);
    setProfileArea(pharmacy.area);
    setProfileDistrict(pharmacy.district || 'Chennai');
    setProfilePinCode(pharmacy.pinCode || '');
    setProfileHours(pharmacy.openingHours);
    setProfileIs24Hours(pharmacy.is24Hours);
    setProfileIsOpenNow(pharmacy.isOpenNow);

    // Load the previously saved pin, but only if it is a valid Tamil Nadu
    // coordinate. A legacy invalid value must not be treated as confirmed.
    const savedLocation = hasValidTamilNaduCoordinates(pharmacy.coordinates)
      ? { lat: pharmacy.coordinates.lat, lng: pharmacy.coordinates.lng }
      : null;
    setProfileDraftLocation(savedLocation);
    setProfileConfirmedLocation(savedLocation);
    setProfileError(null);
    setProfileSuccess(null);
  }, [pharmacy]);

  const handleProfileDistrictChange = (distName: string) => {
    profileDistrictEditedRef.current = true;
    setProfileDistrict(distName);
    const districtObj = TAMIL_NADU_DISTRICTS.find((d) => d.name === distName);
    if (districtObj) {
      setProfilePinCode(`${districtObj.pinCodePrefix}001`);
    }
    // Never keep a confirmation that belongs to the old district.
    setProfileDraftLocation(null);
    setProfileConfirmedLocation(null);
    setProfileSuccess(null);
  };

  const handleProfileDraftChange = (next: LocationPickerValue | null) => {
    setProfileDraftLocation(next);
    setProfileConfirmedLocation(null);
    setProfileSuccess(null);
  };

  const handleProfileConfirm = (next: LocationPickerValue) => {
    const boundary = checkTamilNaduBoundary(next.lat, next.lng);
    if (!boundary.inside) {
      setProfileError(
        'The selected pin is outside Tamil Nadu. Move it inside the state boundary before confirming.'
      );
      return;
    }
    setProfileDraftLocation({ lat: next.lat, lng: next.lng });
    setProfileConfirmedLocation({ lat: next.lat, lng: next.lng });
    setProfileError(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy) return;

    setProfileError(null);
    setProfileSuccess(null);

    if (
      !profileName.trim() ||
      !profileOwnerName.trim() ||
      !profilePhone.trim() ||
      !profileAddress.trim() ||
      !profileArea.trim()
    ) {
      setProfileError('Please complete the pharmacy name, owner name, phone and address fields.');
      return;
    }

    if (!profileConfirmedLocation) {
      setProfileError(
        'Place the pharmacy pin on the map and click "Confirm Location" before saving your profile.'
      );
      return;
    }

    const boundary = checkTamilNaduBoundary(
      profileConfirmedLocation.lat,
      profileConfirmedLocation.lng
    );
    if (!boundary.inside) {
      setProfileError(
        'The confirmed pin must be inside Tamil Nadu. Move the pin and confirm it again.'
      );
      return;
    }

    if (profilePinCode && !isValidTamilNaduPinCode(profilePinCode)) {
      setProfileError('PIN code must be a valid 6-digit Tamil Nadu Postal Code (e.g., 600xxx to 643xxx).');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await updatePharmacyProfile(pharmacy.id, {
        name: profileName.trim(),
        ownerName: profileOwnerName.trim(),
        address: profileAddress.trim(),
        area: profileArea.trim(),
        district: profileDistrict,
        pinCode: profilePinCode.trim(),
        phone: profilePhone.trim(),
        emergencyPhone: profileEmergencyPhone.trim() || undefined,
        latitude: profileConfirmedLocation.lat,
        longitude: profileConfirmedLocation.lng,
        openingHours:
          profileHours.trim() ||
          (profileIs24Hours ? 'Open 24 Hours (Round-the-Clock)' : 'Hours not provided'),
        isOpenNow: profileIsOpenNow,
        is24Hours: profileIs24Hours,
        services: pharmacy.services,
      });

      // Reload the owner context so the customer directory and header use the
      // exact rows Supabase just saved.
      await auth.refreshOwner();
      onPharmaciesChanged?.();

      const savedLocation = hasValidTamilNaduCoordinates(updated.coordinates)
        ? { lat: updated.coordinates.lat, lng: updated.coordinates.lng }
        : { lat: profileConfirmedLocation.lat, lng: profileConfirmedLocation.lng };
      setProfileDraftLocation(savedLocation);
      setProfileConfirmedLocation(savedLocation);
      setProfileSuccess('Pharmacy profile and confirmed map location saved successfully.');
      showToast('Pharmacy profile saved to Supabase.');
    } catch (err) {
      // Never claim success when the update failed.
      setProfileError(describeSupabaseError(err));
    } finally {
      setIsSavingProfile(false);
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
  const [medExpiry, setMedExpiry] = useState('');
  const [medThreshold, setMedThreshold] = useState<number>(DEFAULT_LOW_STOCK_THRESHOLD);

  // Edit-modal state
  const [editingItem, setEditingItem] = useState<MedicineItem | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editPrice, setEditPrice] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editThreshold, setEditThreshold] = useState<number>(DEFAULT_LOW_STOCK_THRESHOLD);
  const [editError, setEditError] = useState<string | null>(null);

  // Inventory filtering, sorting and pagination
  const [inventoryStatus, setInventoryStatus] = useState<
    'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired' | 'expiring'
  >('all');
  const [inventorySort, setInventorySort] = useState<
    'name' | 'qty_desc' | 'qty_asc' | 'recent'
  >('name');
  const [inventoryPage, setInventoryPage] = useState(1);
  const inventoryPageSize = 8;

  // CSV bulk import state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvValidation, setCsvValidation] = useState<CsvValidationResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<BulkImportResultRow[] | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Inventory change history (requires migration 0006; failures stay silent)
  const [history, setHistory] = useState<InventoryHistoryRow[]>([]);
  const [schemaNeedsMigration, setSchemaNeedsMigration] = useState(false);

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
    if (!finalName) {
      setInventoryError('Enter or select a medicine name.');
      return;
    }
    if (medExpiry && !isValidExpiryDate(medExpiry)) {
      setInventoryError('Expiry date must be a valid date in YYYY-MM-DD format.');
      return;
    }

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
        lowStockThreshold: Number(medThreshold) || DEFAULT_LOW_STOCK_THRESHOLD,
        expiryDate: medExpiry || null,
      });

      setIsAddModalOpen(false);
      await refreshAfterInventoryChange(`Added "${finalName}" (${medStrength}) to store inventory.`);

      // Reset the form for the next entry.
      setMedName('');
      setMedGenericName('');
      setSelectedCatalogueId('');
      setMedStockQty(50);
      setMedExpiry('');
      setMedThreshold(DEFAULT_LOW_STOCK_THRESHOLD);
    } catch (err) {
      setInventoryError(describeSupabaseError(err));
    } finally {
      setIsSavingInventory(false);
    }
  };

  const openEditItem = (med: MedicineItem) => {
    setEditingItem(med);
    setEditQty(med.stockQuantity);
    setEditPrice(med.price || med.samplePrice || '');
    setEditExpiry(med.expiryDate || '');
    setEditThreshold(med.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSavingInventory) return;

    if (editExpiry && !isValidExpiryDate(editExpiry)) {
      setEditError('Expiry date must be a valid date in YYYY-MM-DD format.');
      return;
    }

    setIsSavingInventory(true);
    setEditError(null);
    try {
      await updateInventoryItem(editingItem.inventoryId || editingItem.id, {
        stockQuantity: Number(editQty) || 0,
        price: editPrice,
        expiryDate: editExpiry || null,
        lowStockThreshold: Number(editThreshold) || 0,
        lastChangeSource: 'manual',
      });
      setEditingItem(null);
      await refreshAfterInventoryChange(`Updated "${editingItem.name}" inventory.`);
    } catch (err) {
      setEditError(describeSupabaseError(err));
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

  // -------------------------------------------------------------
  // 5. CSV BULK IMPORT
  // -------------------------------------------------------------
  const handleCsvFile = async (file: File | null) => {
    setCsvError(null);
    setImportResults(null);
    setCsvValidation(null);
    setCsvFileName(file ? file.name : null);

    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setCsvError('Please choose a .csv file. Download the template if you need an example.');
      return;
    }
    if (file.size > CSV_MAX_BYTES) {
      setCsvError(
        `File is too large. The maximum CSV size is ${Math.round(CSV_MAX_BYTES / (1024 * 1024))} MB.`
      );
      return;
    }

    try {
      const text = await file.text();
      const result = validateCsv(text);
      setCsvValidation(result);
      if (result.rows.length === 0) {
        setCsvError(
          result.errors.length > 0
            ? 'No valid rows found. Fix the highlighted issues and try again.'
            : 'This file has no medicine rows yet. Add at least one row below the header row and try again.'
        );
      }
    } catch {
      setCsvError('Could not read that file. Please try again.');
    }
  };

  const handleConfirmCsvImport = async () => {
    if (!pharmacy || !csvValidation || csvValidation.validRows.length === 0 || isImporting) return;

    setIsImporting(true);
    setCsvError(null);
    try {
      const rows: BulkImportRow[] = csvValidation.validRows.map((row) => ({
        name: row.name,
        brand: row.brand,
        strength: row.strength,
        dosageForm: row.dosageForm,
        quantity: row.quantity,
        price: row.price,
        expiryDate: row.expiryDate,
      }));

      const results = await bulkImportInventory(pharmacy.id, rows);
      setImportResults(results);
      await refreshAfterInventoryChange('CSV import completed.');
    } catch (err) {
      setCsvError(describeSupabaseError(err));
    } finally {
      setIsImporting(false);
    }
  };

  const closeCsvModal = () => {
    if (isImporting) return;
    setIsCsvModalOpen(false);
    setCsvFileName(null);
    setCsvValidation(null);
    setCsvError(null);
    setImportResults(null);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  // Reset pagination whenever the visible inventory set changes.
  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch, inventoryStatus, inventorySort]);

  // Owner-only inventory history. Fails silently until migration 0006 is applied.
  useEffect(() => {
    if (!pharmacy) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    void fetchInventoryHistory(pharmacy.id, 15)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setHistory([]);
          if (isInventoryExtensionSchemaError(err)) setSchemaNeedsMigration(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pharmacy]);

  // -------------------------------------------------------------
  // 6. DASHBOARD STATISTICS & ALERTS (from real inventory only)
  // -------------------------------------------------------------
  const inventoryItems = pharmacy ? pharmacy.sampleMedicines : [];
  const totalInventoryRecords = inventoryItems.length;
  const totalListedMedicines = new Set(
    inventoryItems.map((m) => `${m.name}|${m.strength || ''}|${m.dosageForm || ''}`.toLowerCase())
  ).size;
  const inStockCount = inventoryItems.filter(
    (m) => m.stockQuantity > 0 && !isExpiredDate(m.expiryDate)
  ).length;
  const lowStockCount = inventoryItems.filter(
    (m) => m.stockQuantity > 0 && !isExpiredDate(m.expiryDate) && m.availabilityStatus === 'low_stock'
  ).length;
  const outOfStockCount = inventoryItems.filter((m) => m.stockQuantity <= 0).length;
  const expiredCount = inventoryItems.filter((m) => isExpiredDate(m.expiryDate)).length;
  const expiringSoonCount = inventoryItems.filter((m) => isExpiringSoonDate(m.expiryDate)).length;
  const recentlyUpdatedCount = inventoryItems.filter(
    (m) => m.lastUpdatedAt && Date.now() - new Date(m.lastUpdatedAt).getTime() <= 24 * 60 * 60 * 1000
  ).length;
  const totalUnits = inventoryItems.reduce((acc, m) => acc + (m.stockQuantity || 0), 0);

  const lowStockAlerts = inventoryItems
    .filter((m) => m.stockQuantity > 0 && !isExpiredDate(m.expiryDate) && m.availabilityStatus === 'low_stock')
    .sort((a, b) => a.stockQuantity - b.stockQuantity);
  const outOfStockAlerts = inventoryItems
    .filter((m) => m.stockQuantity <= 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const expiryAlerts = inventoryItems
    .filter((m) => isExpiredDate(m.expiryDate) || isExpiringSoonDate(m.expiryDate))
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''));

  const filteredInventory = inventoryItems
    .filter((m) => {
      const q = inventorySearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [m.name, m.genericName, m.brand, m.category, m.strength, m.dosageForm]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      switch (inventoryStatus) {
        case 'in_stock':
          return m.stockQuantity > 0 && !isExpiredDate(m.expiryDate);
        case 'low_stock':
          return (
            m.stockQuantity > 0 &&
            !isExpiredDate(m.expiryDate) &&
            m.availabilityStatus === 'low_stock'
          );
        case 'out_of_stock':
          return m.stockQuantity <= 0;
        case 'expired':
          return isExpiredDate(m.expiryDate);
        case 'expiring':
          return isExpiringSoonDate(m.expiryDate);
        default:
          return true;
      }
    })
    .sort((a, b) => {
      if (inventorySort === 'qty_desc') return b.stockQuantity - a.stockQuantity;
      if (inventorySort === 'qty_asc') return a.stockQuantity - b.stockQuantity;
      if (inventorySort === 'recent') {
        return (
          new Date(b.lastUpdatedAt || 0).getTime() - new Date(a.lastUpdatedAt || 0).getTime()
        );
      }
      return a.name.localeCompare(b.name);
    });

  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventory.length / inventoryPageSize));
  const currentInventoryPage = Math.min(inventoryPage, totalInventoryPages);
  const pagedInventory = filteredInventory.slice(
    (currentInventoryPage - 1) * inventoryPageSize,
    currentInventoryPage * inventoryPageSize
  );

  return (
    <div className="min-h-screen bg-transparent dark:bg-[#0C1814] text-[#20332D] dark:text-[#E5F4EE] font-sans pb-24 transition-colors duration-200">
      
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
                  onClick={() => setActiveTab('profile')}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'bg-[#087E9B] text-white shadow-xs'
                      : 'bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] hover:text-[#087E9B]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
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

            {/* Password recovery: shown when Supabase returns a recovery session */}
            {auth.recoveryMode && (
              <div className="max-w-xl mx-auto mb-6 p-6 rounded-3xl bg-white dark:bg-[#162C24] border border-[#087F5B]/30 shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#087F5B] dark:text-[#34D399]" />
                  <h2 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                    Set a new pharmacy password
                  </h2>
                </div>
                <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                  You opened a secure recovery link. Choose a new password for your account.
                </p>

                {recoveryError && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    {recoveryError}
                  </div>
                )}
                {recoveryMessage && (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    {recoveryMessage}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                      New password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                    >
                      {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Update Password</span>
                    </button>
                    <button
                      type="button"
                      onClick={auth.dismissRecovery}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E3B32] rounded-xl cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </form>
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
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE]">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgotPassword((current) => !current);
                              setResetRequestEmail(loginEmail);
                              setResetRequestMessage(null);
                              setResetRequestError(null);
                            }}
                            className="text-[11px] font-bold text-[#087F5B] dark:text-[#34D399] hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
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

                      {showForgotPassword && (
                        <div className="p-4 rounded-2xl bg-[#EBF7FA] dark:bg-[#142A33] border border-[#087E9B]/25 space-y-3">
                          <div className="flex items-center gap-2 text-[#087E9B] dark:text-[#38BDF8]">
                            <KeyRound className="w-4 h-4" />
                            <span className="text-xs font-extrabold">Reset your password</span>
                          </div>
                          <p className="text-[11px] text-[#155E75] dark:text-[#67E8F9] font-medium leading-relaxed">
                            Enter your registered email. Supabase will send a secure reset link valid for a limited time.
                          </p>
                          {resetRequestError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                              {resetRequestError}
                            </div>
                          )}
                          {resetRequestMessage && (
                            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                              {resetRequestMessage}
                            </div>
                          )}
                          <input
                            type="email"
                            value={resetRequestEmail}
                            onChange={(e) => setResetRequestEmail(e.target.value)}
                            placeholder="owner@yourpharmacy.com"
                            autoComplete="email"
                            className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-[#087E9B]/25 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087E9B]/30"
                          />
                          <button
                            type="button"
                            onClick={() => void handleRequestPasswordReset()}
                            disabled={isRequestingReset}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#087E9B] hover:bg-[#076E88] disabled:opacity-60 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                          >
                            {isRequestingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            <span>Send Reset Link</span>
                          </button>
                        </div>
                      )}

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
                          onChange={(e) => {
                            regAddressEditedRef.current = true;
                            setRegAddress(e.target.value);
                          }}
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
                          onChange={(e) => {
                            regAreaEditedRef.current = true;
                            setRegArea(e.target.value);
                          }}
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
                            onChange={(e) => {
                              regPinEditedRef.current = true;
                              setRegPinCode(e.target.value);
                            }}
                            placeholder="600001"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                          Must start with 60xxxx – 64xxxx
                        </span>
                      </div>
                    </div>

                    {/* 6. Interactive pharmacy map pin (mandatory confirmation) */}
                    <LocationPickerMap
                      value={regDraftLocation}
                      confirmedValue={regConfirmedLocation}
                      onDraftChange={handleRegDraftChange}
                      onConfirm={handleRegConfirm}
                      onAddressResolved={handleRegAddressResolved}
                      address={regAddress}
                      area={regArea}
                      district={regDistrict}
                      pinCode={regPinCode}
                      disabled={isRegistering}
                    />

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

                    {!regConfirmedLocation && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Registration is blocked until you place the pin at your pharmacy entrance
                          and click <strong>Confirm Location</strong>.
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isRegistering || !regConfirmedLocation}
                      className="w-full py-3.5 px-4 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#087F5B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
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

            {/* ========================================================================= */}
            {/* SUBVIEW 2b: EDIT PHARMACY PROFILE (saved coordinates + pin confirmation) */}
            {/* ========================================================================= */}
            {activeTab === 'profile' && pharmacy && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="text-center max-w-xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087E9B]/10 text-[#087E9B] dark:text-[#38BDF8] text-xs font-extrabold uppercase tracking-wider mb-3">
                    <Pencil className="w-4 h-4" />
                    <span>Edit Pharmacy Profile</span>
                  </div>
                  <h1 className="text-3xl font-extrabold text-[#20332D] dark:text-[#E5F4EE] tracking-tight">
                    Store Details &amp; Map Location
                  </h1>
                  <p className="text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-2">
                    Update the public store details and re-confirm the exact map pin used by customers
                    for directions.
                  </p>
                </div>

                <div className="bg-white dark:bg-[#162C24] p-6 sm:p-8 rounded-3xl border border-emerald-900/10 dark:border-[#224538] shadow-md">
                  {profileError && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}
                  {!profileConfirmedLocation && (
                    <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200 font-semibold">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>
                        This profile does not have a confirmed map pin yet. Search or click the map,
                        drag the pin to the pharmacy entrance, then click <strong>Confirm Location</strong>{' '}
                        before saving.
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
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
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
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
                            value={profileOwnerName}
                            onChange={(e) => setProfileOwnerName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Pharmacy Contact Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="tel"
                            required
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Emergency Contact (optional)
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="tel"
                            value={profileEmergencyPhone}
                            onChange={(e) => setProfileEmergencyPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                        Complete Shop Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileAddress}
                        onChange={(e) => {
                          profileAddressEditedRef.current = true;
                          setProfileAddress(e.target.value);
                        }}
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
                          value={profileArea}
                          onChange={(e) => {
                            profileAreaEditedRef.current = true;
                            setProfileArea(e.target.value);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                          Tamil Nadu District <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={profileDistrict}
                          onChange={(e) => handleProfileDistrictChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                        >
                          {TAMIL_NADU_DISTRICTS.map((d) => (
                            <option key={d.id} value={d.name}>
                              {d.name} District (TN)
                            </option>
                          ))}
                        </select>
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
                            value={profilePinCode}
                            onChange={(e) => {
                              profilePinEditedRef.current = true;
                              setProfilePinCode(e.target.value);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                        Opening Hours
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={profileHours}
                          onChange={(e) => setProfileHours(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileIs24Hours}
                          onChange={(e) => setProfileIs24Hours(e.target.checked)}
                          className="rounded text-[#087F5B] focus:ring-[#087F5B] w-4 h-4"
                        />
                        <span>Open 24/7</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileIsOpenNow}
                          onChange={(e) => setProfileIsOpenNow(e.target.checked)}
                          className="rounded text-[#087F5B] focus:ring-[#087F5B] w-4 h-4"
                        />
                        <span>Currently open</span>
                      </label>
                    </div>

                    <LocationPickerMap
                      value={profileDraftLocation}
                      confirmedValue={profileConfirmedLocation}
                      onDraftChange={handleProfileDraftChange}
                      onConfirm={handleProfileConfirm}
                      onAddressResolved={handleProfileAddressResolved}
                      address={profileAddress}
                      area={profileArea}
                      district={profileDistrict}
                      pinCode={profilePinCode}
                      disabled={isSavingProfile}
                    />

                    <div className="p-3 rounded-xl bg-[#EBF7FA] dark:bg-[#142A33] border border-[#087E9B]/25 text-[11px] text-[#155E75] dark:text-[#67E8F9] font-medium">
                      <Info className="w-3.5 h-3.5 inline mr-1" />
                      Key services currently published: {pharmacy.services.join(', ') || 'none listed'}.
                      They are preserved when you save this form.
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile || !profileConfirmedLocation}
                      className="w-full py-3.5 px-4 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#087F5B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving profile to Supabase…</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Profile &amp; Confirmed Location</span>
                        </>
                      )}
                    </button>
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

                  {/* Dashboard statistics calculated from this owner's inventory */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/20">
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">Total Medicines</span>
                      <span className="text-2xl font-extrabold tabular-nums">{totalListedMedicines}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">Inventory Records</span>
                      <span className="text-2xl font-extrabold tabular-nums">{totalInventoryRecords}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">In Stock</span>
                      <span className="text-2xl font-extrabold tabular-nums text-emerald-200">{inStockCount}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">Low Stock</span>
                      <span className="text-2xl font-extrabold tabular-nums text-amber-200">{lowStockCount}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">Out of Stock</span>
                      <span className="text-2xl font-extrabold tabular-nums text-rose-200">{outOfStockCount}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">Approaching Expiry</span>
                      <span className="text-2xl font-extrabold tabular-nums text-orange-200">{expiringSoonCount}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">Expired</span>
                      <span className="text-2xl font-extrabold tabular-nums text-rose-200">{expiredCount}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
                      <span className="text-[11px] text-teal-100 font-bold block mb-1">Updated (24h)</span>
                      <span className="text-2xl font-extrabold tabular-nums">{recentlyUpdatedCount}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-100/80 mt-3">
                    Total units currently reported in stock: <strong className="text-white tabular-nums">{totalUnits}</strong>
                  </p>
                </div>

                {/* Email verification gate */}
                {!isEmailVerified && (
                  <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-200 font-semibold">
                      <MailCheck className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Verify your email before managing inventory.</strong> We sent a confirmation
                        link to {auth.user?.email || 'your registered email'}. Until it is verified, stock
                        changes and CSV imports are disabled by Supabase Auth.
                      </span>
                    </div>
                    <button
                      onClick={() => void auth.refreshOwner()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-extrabold rounded-xl shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>I&apos;ve verified</span>
                    </button>
                  </div>
                )}

                {/* Migration 0006 status: basic stock management still works. */}
                {schemaNeedsMigration && (
                  <div className="p-4 rounded-3xl bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 flex items-start gap-2.5 text-xs text-sky-900 dark:text-sky-200 font-semibold">
                    <Database className="w-5 h-5 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                    <span>
                      <strong>Database upgrade required.</strong> Run{' '}
                      <code className="font-extrabold">supabase/migrations/0006_inventory_extensions.sql</code>{' '}
                      in the Supabase SQL editor to enable expiry dates, configurable low-stock
                      thresholds and stock history. Until then basic stock and price updates are saved,
                      but expiry/threshold values are not stored.
                    </span>
                  </div>
                )}

                {/* Automatic stock and expiry alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-[#162C24] p-5 rounded-3xl border border-amber-300/70 dark:border-amber-900/50 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#20332D] dark:text-[#E5F4EE] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Low-stock alerts
                      </h3>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 tabular-nums">
                        {lowStockAlerts.length}
                      </span>
                    </div>
                    {lowStockAlerts.length === 0 ? (
                      <p className="text-[11px] text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                        No medicines are at or below their low-stock threshold.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {lowStockAlerts.slice(0, 8).map((med) => (
                          <li key={med.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-[#20332D] dark:text-[#E5F4EE] truncate">
                              {med.name} <span className="font-medium text-slate-500 dark:text-slate-400">({med.strength})</span>
                            </span>
                            <span className="shrink-0 font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                              {med.stockQuantity} left
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#162C24] p-5 rounded-3xl border border-rose-300/70 dark:border-rose-900/50 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#20332D] dark:text-[#E5F4EE] flex items-center gap-2">
                        <Package className="w-4 h-4 text-rose-500" />
                        Out-of-stock alerts
                      </h3>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 tabular-nums">
                        {outOfStockAlerts.length}
                      </span>
                    </div>
                    {outOfStockAlerts.length === 0 ? (
                      <p className="text-[11px] text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                        Every listed medicine currently has a positive reported quantity.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {outOfStockAlerts.slice(0, 8).map((med) => (
                          <li key={med.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-[#20332D] dark:text-[#E5F4EE] truncate">
                              {med.name} <span className="font-medium text-slate-500 dark:text-slate-400">({med.strength})</span>
                            </span>
                            <span className="shrink-0 font-extrabold text-rose-600 dark:text-rose-400">
                              Out of stock
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#162C24] p-5 rounded-3xl border border-orange-300/70 dark:border-orange-900/50 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#20332D] dark:text-[#E5F4EE] flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-orange-500" />
                        Expiry alerts
                      </h3>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 tabular-nums">
                        {expiryAlerts.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#20332D]/55 dark:text-[#E5F4EE]/55 font-medium">
                      Warning windows: 30 / 15 / 7 days before expiry. Expired stock is never shown as available to customers.
                    </p>
                    {expiryAlerts.length === 0 ? (
                      <p className="text-[11px] text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                        No medicines are within 30 days of expiry.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {expiryAlerts.slice(0, 8).map((med) => {
                          const level = getExpiryWarningLevel(med.expiryDate);
                          return (
                          <li key={med.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-[#20332D] dark:text-[#E5F4EE] truncate">
                              {med.name} <span className="font-medium text-slate-500 dark:text-slate-400">({med.strength})</span>
                            </span>
                            <span className={`shrink-0 font-extrabold text-right ${level === 'expired' ? 'text-rose-600 dark:text-rose-400' : level === 'critical' ? 'text-rose-500 dark:text-rose-300' : level === 'warning' ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-300'}`}>
                              {level === 'expired' ? 'Expired ' : 'Expires '}
                              {formatExpiryDate(med.expiryDate)}
                              <span className="block text-[9px] font-bold uppercase tracking-wide opacity-80">
                                {level === 'expired' ? 'Remove from sale' : expiryWarningLabel(level)}
                              </span>
                            </span>
                          </li>
                          );
                        })}
                      </ul>
                    )}
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
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                        Store Medicine Inventory
                      </h3>
                      <p className="text-xs text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                        Update quantities, expiry dates and low-stock thresholds, or import a CSV file.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      <button
                        onClick={() => downloadCsvTemplate()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] text-xs font-extrabold hover:border-[#087F5B]/40 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV Template</span>
                      </button>

                      <button
                        onClick={() => setIsCsvModalOpen(true)}
                        disabled={!isEmailVerified}
                        title={!isEmailVerified ? 'Verify your email before importing inventory' : 'Import inventory from CSV'}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EBF7FA] dark:bg-[#142A33] text-[#087E9B] dark:text-[#38BDF8] border border-[#087E9B]/25 text-xs font-extrabold hover:border-[#087E9B]/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import CSV</span>
                      </button>

                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={!isEmailVerified}
                        title={!isEmailVerified ? 'Verify your email before adding inventory' : 'Add a medicine manually'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076B4D] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Medicine</span>
                      </button>
                    </div>
                  </div>

                  {/* Search, filter and sort toolbar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="relative lg:col-span-2">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder="Search by medicine, brand, strength or form..."
                        className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#087F5B] dark:text-[#34D399] shrink-0" />
                      <select
                        value={inventoryStatus}
                        onChange={(e) =>
                          setInventoryStatus(e.target.value as typeof inventoryStatus)
                        }
                        aria-label="Filter inventory by stock status"
                        className="w-full px-3 py-2 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 cursor-pointer"
                      >
                        <option value="all">All stock statuses</option>
                        <option value="in_stock">In stock</option>
                        <option value="low_stock">Low stock</option>
                        <option value="out_of_stock">Out of stock</option>
                        <option value="expiring">Approaching expiry</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#087E9B] shrink-0" />
                      <select
                        value={inventorySort}
                        onChange={(e) => setInventorySort(e.target.value as typeof inventorySort)}
                        aria-label="Sort inventory"
                        className="w-full px-3 py-2 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 cursor-pointer"
                      >
                        <option value="name">Name (A–Z)</option>
                        <option value="recent">Recently updated</option>
                        <option value="qty_desc">Quantity (high–low)</option>
                        <option value="qty_asc">Quantity (low–high)</option>
                      </select>
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
                          <th className="py-3.5 px-4 font-bold">Medicine</th>
                          <th className="py-3.5 px-4 font-bold">Strength &amp; Form</th>
                          <th className="py-3.5 px-4 font-bold text-center">Availability</th>
                          <th className="py-3.5 px-4 font-bold text-center">Quantity</th>
                          <th className="py-3.5 px-4 font-bold">Expiry</th>
                          <th className="py-3.5 px-4 font-bold">Last Updated</th>
                          <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-900/5 dark:divide-[#224538]">
                        {pagedInventory.map((med) => {
                          const expiryLevel = getExpiryWarningLevel(med.expiryDate);
                          const expired = expiryLevel === 'expired';
                          const expiring = expiryLevel !== null && expiryLevel !== 'expired';
                          const lowStock = !expired && med.stockQuantity > 0 && med.availabilityStatus === 'low_stock';
                          return (
                          <tr key={med.id} className="hover:bg-[#F1FAF6]/50 dark:hover:bg-[#132A21]/50 transition-colors">
                            
                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-[#20332D] dark:text-[#E5F4EE] text-sm">
                                {med.name}
                              </div>
                              <div className="text-[11px] text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                                {med.brand || med.genericName || 'Pharmaceutical formulation'}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{med.category}</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#20332D] dark:text-[#E5F4EE]">
                                {med.strength || med.dosage}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {med.dosageForm || 'Oral dosage'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => void handleToggleAvailability(med)}
                                disabled={isSavingInventory || !isEmailVerified}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 ${
                                  expired
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                                    : med.inStock
                                      ? lowStock
                                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300'
                                        : 'bg-[#D1FAE5] text-[#065F46] dark:bg-[#064E3B] dark:text-[#6EE7B7] border border-[#087F5B]/30'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                                }`}
                                title="Click to toggle Available vs Unavailable"
                              >
                                <span className={`w-2 h-2 rounded-full ${expired ? 'bg-rose-500' : med.inStock ? (lowStock ? 'bg-amber-500' : 'bg-[#087F5B] dark:bg-[#34D399]') : 'bg-rose-500'}`} />
                                <span>{expired ? 'Expired' : med.inStock ? (lowStock ? 'Low stock' : 'In stock') : 'Out of stock'}</span>
                              </button>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-[#F1FAF6] dark:bg-[#11231D] p-1 rounded-xl border border-emerald-900/10 dark:border-[#224538]">
                                <button
                                  onClick={() => void handleStockDelta(med, -10)}
                                  disabled={isSavingInventory || !isEmailVerified}
                                  className="w-6 h-6 rounded-lg bg-white dark:bg-[#162C24] hover:bg-slate-200 dark:hover:bg-[#1E3B32] text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Decrease 10 units"
                                >
                                  -
                                </button>
                                <span className="w-10 text-center font-extrabold tabular-nums text-xs text-[#20332D] dark:text-[#E5F4EE]">
                                  {med.stockQuantity}
                                </span>
                                <button
                                  onClick={() => void handleStockDelta(med, 10)}
                                  disabled={isSavingInventory || !isEmailVerified}
                                  className="w-6 h-6 rounded-lg bg-white dark:bg-[#162C24] hover:bg-slate-200 dark:hover:bg-[#1E3B32] text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Add 10 units"
                                >
                                  +
                                </button>
                              </div>
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                Threshold: {med.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              {med.expiryDate ? (
                                <span className={`text-[11px] font-bold ${expired ? 'text-rose-600 dark:text-rose-400' : expiring ? 'text-orange-600 dark:text-orange-400' : 'text-[#20332D] dark:text-[#E5F4EE]'}`}>
                                  {formatExpiryDate(med.expiryDate)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">Not provided</span>
                              )}
                              {expired && <span className="block text-[10px] font-bold text-rose-500">Expired</span>}
                              {!expired && expiring && (
                                <span className={`block text-[10px] font-bold ${expiryLevel === 'critical' ? 'text-rose-500 dark:text-rose-300' : expiryLevel === 'warning' ? 'text-orange-500 dark:text-orange-300' : 'text-amber-500 dark:text-amber-300'}`}>
                                  {expiryWarningLabel(expiryLevel)}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="text-[11px] font-medium text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                                {med.lastUpdatedAt ? formatRelativeTime(med.lastUpdatedAt) : med.lastUpdated || 'Not recorded'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => openEditItem(med)}
                                  disabled={isSavingInventory || !isEmailVerified}
                                  className="p-1.5 text-[#087E9B] hover:text-[#076E88] hover:bg-[#EBF7FA] dark:hover:bg-[#142A33] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  title="Edit stock, expiry and threshold"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => void handleRemoveMedicine(med)}
                                  disabled={isSavingInventory || !isEmailVerified}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  title="Remove from inventory"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>

                          </tr>
                          );
                        })}
                        {filteredInventory.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                              {inventoryItems.length === 0
                                ? 'Your inventory is empty. Add your first medicine or import a CSV to publish live stock.'
                                : 'No medicines match the current search and filters.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                      Showing{' '}
                      <strong className="text-[#20332D] dark:text-[#E5F4EE] tabular-nums">
                        {filteredInventory.length === 0 ? 0 : (currentInventoryPage - 1) * inventoryPageSize + 1}–
                        {Math.min(currentInventoryPage * inventoryPageSize, filteredInventory.length)}
                      </strong>{' '}
                      of <strong className="text-[#20332D] dark:text-[#E5F4EE] tabular-nums">{filteredInventory.length}</strong> records
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInventoryPage((page) => Math.max(1, page - 1))}
                        disabled={currentInventoryPage <= 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] font-bold text-[#20332D] dark:text-[#E5F4EE] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>
                      <span className="font-extrabold tabular-nums text-[#20332D] dark:text-[#E5F4EE]">
                        {currentInventoryPage} / {totalInventoryPages}
                      </span>
                      <button
                        onClick={() => setInventoryPage((page) => Math.min(totalInventoryPages, page + 1))}
                        disabled={currentInventoryPage >= totalInventoryPages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] font-bold text-[#20332D] dark:text-[#E5F4EE] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Recent inventory history (owner-only, migration 0006) */}
                  {history.length > 0 && (
                    <div className="pt-4 border-t border-emerald-900/10 dark:border-[#224538]">
                      <h4 className="text-xs font-extrabold text-[#20332D] dark:text-[#E5F4EE] flex items-center gap-2 mb-2">
                        <History className="w-4 h-4 text-[#087E9B] dark:text-[#38BDF8]" />
                        Recent stock updates
                      </h4>
                      <ul className="space-y-1.5">
                        {history.slice(0, 6).map((entry) => {
                          const medicine = inventoryItems.find((item) => item.inventoryId === entry.inventory_id);
                          return (
                            <li key={entry.id} className="flex items-center justify-between gap-3 text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                              <span className="truncate">
                                <strong className="text-[#20332D] dark:text-[#E5F4EE]">{medicine?.name || 'Inventory record'}</strong>{' '}
                                · {entry.change_source === 'csv_import' ? 'CSV import' : 'Manual update'} · qty{' '}
                                {entry.old_quantity ?? '—'} → {entry.new_quantity ?? '—'}
                              </span>
                              <span className="shrink-0 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(entry.created_at)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                    Expiry date (optional)
                  </label>
                  <input
                    type="date"
                    value={medExpiry}
                    disabled={schemaNeedsMigration}
                    onChange={(e) => setMedExpiry(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl disabled:opacity-50"
                  />
                  {schemaNeedsMigration && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block font-semibold">
                      Apply migration 0006 to store expiry dates.
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                    Low-stock threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={medThreshold}
                    disabled={schemaNeedsMigration}
                    onChange={(e) => setMedThreshold(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    At or below this quantity the medicine is low stock.
                  </span>
                </div>
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

      {/* ========================================================================= */}
      {/* MODAL: EDIT INVENTORY RECORD */}
      {/* ========================================================================= */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#162C24] rounded-3xl shadow-2xl border border-emerald-900/10 dark:border-[#285444] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-emerald-900/10 dark:border-[#224538] flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                  Edit inventory record
                </h3>
                <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium">
                  {editingItem.name} · {[editingItem.strength, editingItem.dosageForm].filter(Boolean).join(' ')}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer"
                aria-label="Close edit inventory"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 overflow-y-auto space-y-4">
              {editError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                    Stock quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                    Low-stock threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editThreshold}
                    disabled={schemaNeedsMigration}
                    onChange={(e) => setEditThreshold(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Expiry date (optional)
                </label>
                <input
                  type="date"
                  value={editExpiry}
                  disabled={schemaNeedsMigration}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Expired medicines stay visible here but are never shown as available to customers.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Unit price (optional)
                </label>
                <input
                  type="text"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="e.g. ₹35"
                  className="w-full px-3.5 py-2 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] border border-emerald-900/10 dark:border-[#224538] rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E3B32] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInventory || !isEmailVerified}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-60 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isSavingInventory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CSV BULK INVENTORY IMPORT */}
      {/* ========================================================================= */}
      {isCsvModalOpen && pharmacy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={closeCsvModal}
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-[#162C24] rounded-3xl shadow-2xl border border-emerald-900/10 dark:border-[#285444] overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-emerald-900/10 dark:border-[#224538] flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#087E9B]" />
                  Import inventory from CSV
                </h3>
                <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium mt-1">
                  Uploading a file adds new medicines and updates matching ones. Existing inventory that is not in the file is kept.
                </p>
              </div>
              <button
                onClick={closeCsvModal}
                disabled={isImporting}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer disabled:opacity-50"
                aria-label="Close CSV import"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#EBF7FA] dark:bg-[#142A33] border border-[#087E9B]/25 text-[11px] text-[#155E75] dark:text-[#67E8F9] space-y-1">
                <p className="font-extrabold flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Accepted columns</p>
                <p>medicine_name, brand, strength, dosage_form, quantity, price (optional), expiry_date (optional).</p>
                <p>Dates must be YYYY-MM-DD or DD/MM/YYYY. Quantity is a whole number ≥ 0. Maximum file size: 2 MB.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadCsvTemplate()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] font-extrabold text-[#20332D] dark:text-[#E5F4EE] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download template</span>
                </button>

                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void handleCsvFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-[11px] text-[#20332D] dark:text-[#E5F4EE] file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-[#087E9B] file:text-white file:text-xs file:font-extrabold file:cursor-pointer bg-[#F1FAF6] dark:bg-[#11231D] border border-emerald-900/10 dark:border-[#224538] rounded-xl p-1.5"
                />
              </div>

              {csvFileName && (
                <p className="text-[11px] font-bold text-[#20332D] dark:text-[#E5F4EE]">
                  Selected file: <span className="text-[#087E9B] dark:text-[#38BDF8]">{csvFileName}</span>
                </p>
              )}

              {csvError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold">
                  {csvError}
                </div>
              )}

              {csvValidation && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-extrabold">
                      {csvValidation.validRows.length} valid row{csvValidation.validRows.length === 1 ? '' : 's'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-extrabold">
                      {csvValidation.errors.length} invalid row{csvValidation.errors.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-[11px] text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                      Preview shows the first 10 valid rows.
                    </span>
                  </div>

                  {csvValidation.errors.length > 0 && (
                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 overflow-hidden">
                      <div className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 font-extrabold text-rose-700 dark:text-rose-300">
                        Invalid rows (skipped, never imported silently)
                      </div>
                      <ul className="divide-y divide-rose-100 dark:divide-rose-900/40 max-h-40 overflow-y-auto">
                        {csvValidation.errors.map((error, index) => (
                          <li key={`${error.rowNumber}-${index}`} className="px-3 py-2 text-[11px]">
                            <span className="font-extrabold text-rose-700 dark:text-rose-300">Row {error.rowNumber}: </span>
                            <span className="text-[#20332D] dark:text-[#E5F4EE] font-medium">{error.name || '(no name)'} — {error.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {csvValidation.validRows.length > 0 && (
                    <div className="rounded-2xl border border-emerald-900/10 dark:border-[#224538] overflow-hidden">
                      <div className="px-3 py-2 bg-[#F1FAF6] dark:bg-[#11231D] font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                        Preview
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-white dark:bg-[#162C24] text-[#20332D]/70 dark:text-[#E5F4EE]/70">
                            <tr>
                              <th className="px-3 py-2 font-bold">Row</th>
                              <th className="px-3 py-2 font-bold">Medicine</th>
                              <th className="px-3 py-2 font-bold">Brand</th>
                              <th className="px-3 py-2 font-bold">Strength</th>
                              <th className="px-3 py-2 font-bold">Form</th>
                              <th className="px-3 py-2 font-bold">Qty</th>
                              <th className="px-3 py-2 font-bold">Expiry</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-900/5 dark:divide-[#224538]">
                            {csvValidation.validRows.slice(0, 10).map((row) => (
                              <tr key={row.rowNumber}>
                                <td className="px-3 py-1.5 text-slate-500">{row.rowNumber}</td>
                                <td className="px-3 py-1.5 font-bold text-[#20332D] dark:text-[#E5F4EE]">{row.name}</td>
                                <td className="px-3 py-1.5">{row.brand || '—'}</td>
                                <td className="px-3 py-1.5">{row.strength}</td>
                                <td className="px-3 py-1.5">{row.dosageForm}</td>
                                <td className="px-3 py-1.5 font-bold tabular-nums">{row.quantity}</td>
                                <td className="px-3 py-1.5">{row.expiryDate ? formatExpiryDate(row.expiryDate) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importResults && (
                <div className="rounded-2xl border border-emerald-900/10 dark:border-[#224538] p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-extrabold">
                      {importResults.filter((row) => row.success).length} imported
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-extrabold">
                      {importResults.filter((row) => !row.success).length} failed
                    </span>
                  </div>
                  {importResults.some((row) => !row.success) && (
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {importResults.filter((row) => !row.success).map((row) => (
                        <li key={row.rowNumber} className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                          Row {row.rowNumber} · {row.name} {row.strength}: {row.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-emerald-900/10 dark:border-[#224538] bg-[#F1FAF6] dark:bg-[#11231D] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-[#20332D]/60 dark:text-[#E5F4EE]/60 font-medium">
                Nothing is imported until you confirm.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeCsvModal}
                  disabled={isImporting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#224538] rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {importResults ? 'Done' : 'Cancel'}
                </button>
                {!importResults && (
                  <button
                    type="button"
                    onClick={() => void handleConfirmCsvImport()}
                    disabled={
                      isImporting ||
                      !isEmailVerified ||
                      !csvValidation ||
                      csvValidation.validRows.length === 0
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F5B] hover:bg-[#076B4D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                  >
                    {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Confirm import</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
