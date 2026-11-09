# MediFind – Pharmacy Finder & Medicine Search Website

MediFind is a modern, responsive healthcare discovery web application that enables users to locate nearby pharmacies in Chennai, check listed medicines from sample inventory datasets, and view opening hours, contact details, and locations on an interactive Leaflet/OpenStreetMap interface. This implementation establishes a frontend architecture strictly separated from future backend and database services.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The application will be built strictly as a client-side frontend using a structured mock data repository (`src/data/pharmacies.ts`) and modular TypeScript interfaces (`src/types/pharmacy.ts`). No backend services, databases, or API keys are required for this phase.

- **Confirmed Scope**: Pure frontend discovery directory with interactive map, medicine search, distance calculation, filtering, and pharmacy detail modal.
- **Confirmed Geographic Baseline**: Chennai, Tamil Nadu, India (Default center coordinates: `13.0827° N, 80.2707° E`) with browser geolocation support.
- **Confirmed Map Engine**: Leaflet with OpenStreetMap tiles, supporting marker selection, popups, and bi-directional synchronization with pharmacy cards.
- **Confirmed Data Disclaimer**: Prominent "SAMPLE DEMO DATA" notifications across listings and footer disclaimers clarifying that medicine inventory and operating hours require real-world pharmacy confirmation.

---

### 1. Overview & Core Concept

- **What It Does**: MediFind allows users to search for medicines (e.g., Paracetamol, Amoxicillin, Metformin, Cetirizine), discover which nearby pharmacies list them, view precise distance calculations based on current or manual coordinates, explore pharmacies on an interactive map, and inspect operating hours, contact numbers, and pharmacy services (e.g., 24/7 Service, Home Delivery, Prescription Refill, Diagnostic Testing).
- **Target Audience / Persona**: Patients, caregivers, and everyday citizens seeking urgent or convenient access to medications and health services nearby.
- **Key Value**: Eliminates the guesswork in finding open pharmacies and available medicine listings through a clean, accessible, zero-clutter healthcare directory.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Landing & Discovery**: User lands on the hero section, views the Chennai location indicator, and sees quick-suggested search terms.
2. **Location Acquisition**: User clicks "Use My Location". Browser geolocation prompts for permission. When granted, coordinates update and pharmacies re-sort by distance. If denied, a friendly banner appears with manual area selector fallback (e.g., T. Nagar, Anna Nagar, Adyar, Velachery).
3. **Medicine Search**: User enters a medicine query (e.g., "Paracetamol") in the search input. The result list dynamically filters to pharmacies carrying that medicine, highlighting the matched medicine name.
4. **Card & Map Dual-Sync**: 
   - Clicking "View on Map" on a pharmacy card pans the Leaflet map and opens its popup.
   - Clicking a marker on the map highlights and scrolls the matching pharmacy card into view on the left column.
5. **Detailed Inspection**: Clicking "View Details" opens an accessible slide-over/modal showing operating schedule, services, contact options, full medicine list, and address details.

#### B. Visual Identity & Theme
- **Aesthetic Direction**: Professional, calming, modern healthcare aesthetic. Clean, minimal, and high-trust.
- **Color Palette & Mood (Tailwind v4 tokens)**:
  - *Dominant Neutral (60%)*: Crisp off-white (`bg-slate-50` / `bg-neutral-50`) with white structural cards (`bg-white`).
  - *Structural Surfaces (30%)*: Deep slate for typography (`text-slate-900`, `text-slate-700`), subtle neutral borders (`border-slate-200/80`), quiet secondary text (`text-slate-500`).
  - *Primary Accent (10%)*: Deep pharmacy green (`#0F766E` / `emerald-700` / `teal-800`) paired with soft sage secondary tones (`teal-50` / `emerald-50`) for focused actions and active states.
  - *Semantic Indicators*: Calming green badge for "Open Now" (`emerald-700` text with `emerald-50` background), muted amber/rose for "Closed".
- **Typography & Hierarchy**:
  - Clean neo-grotesque sans-serif (`Inter`, `Plus Jakarta Sans`) with balanced type scale:
  - Hero display: `clamp(2.25rem, 4vw, 3.25rem)` with `text-wrap: balance`.
  - Section titles: `text-2xl font-bold tracking-tight text-slate-900`.
  - Body copy: `text-sm` and `text-base` with generous line-height (`leading-relaxed`).
  - Strict Tabular Numerals: Distances, telephone digits, and hours formatted with `tabular-nums`.
- **Zero-Pill Discipline & Anti-Slop**:
  - No candy badges or static pill tags. Categories and tags use unboxed clean text separated by subtle middots (`·`).
  - Interactive filter controls (All, Open Now, Nearest) use clean segmented tabs with active states.
  - No fake AI scores, pulsing green dots, mechanical slashes (`//`), or decorative gimmick widgets.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Mock Repository Pattern (`src/data/pharmacies.ts`)**
  - *Chosen Approach*: Fictional Chennai pharmacy listings stored in a clean, typed TypeScript data module with query helper functions.
  - *Why*: Enables instant switching to REST/GraphQL API endpoints or Firestore in Phase 2 without rewriting component props or business logic.
  - *Alternatives Considered*: Hardcoding data inside components was rejected for poor maintainability.

- **Decision 2: Leaflet + OpenStreetMap for Interactive Mapping**
  - *Chosen Approach*: Install standard `leaflet` and `@types/leaflet` dependencies with lightweight React Leaflet wrapper or custom robust Leaflet container.
  - *Why*: Free, open-source, requires zero external API keys, fully reliable in AI Studio preview sandbox, and provides fluid pan/zoom, custom pins, and popups.
  - *Alternatives Considered*: Google Maps was rejected because it requires external API key configuration which user requested to avoid in this initial phase.

- **Decision 3: Mathematical Haversine Distance Engine**
  - *Chosen Approach*: Real-time client-side calculation using the Haversine formula based on user latitude/longitude and pharmacy coordinates.
  - *Why*: Provides accurate distance recalculation in kilometers as soon as user updates location or grants geolocation.

- **Decision 4: Mobile & Desktop Responsive Two-Column Layout**
  - *Chosen Approach*: Desktop displays a synchronized 50/50 split (Pharmacy results feed on left, sticky interactive Leaflet map on right). Mobile displays responsive tab/toggle ("List View" vs "Map View") to ensure map accessibility without page bloat.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│   (Holds search state, coordinates, active filters, selectedPharmacy)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌──────────────────┐                                 ┌──────────────────┐
│    Navbar.tsx    │                                 │     Hero.tsx     │
│ (Brand, Links,   │                                 │ (Search bar,     │
│  Location badge) │                                 │  Geo CTA, quick) │
└──────────────────┘                                 └──────────────────┘
         │                                                     │
         └──────────────────────────┬──────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌───────────────────────────────────────┐             ┌─────────────────┐
│     Results & Map Split Container     │             │  AboutSection   │
│  ┌─────────────────┬────────────────┐ │             │  & Contact Info │
│  │ PharmacyList    │  PharmacyMap   │ │             └─────────────────┘
│  │ (Cards, filters,│  (Leaflet map, │ │                      │
│  │  distance sort) │   markers, sync│ │             ┌─────────────────┐
│  └─────────────────┴────────────────┘ │             │   Footer.tsx    │
└───────────────────┬───────────────────┘             │  (Disclaimer,   │
                    │                                 │   site links)   │
                    ▼                                 └─────────────────┘
        ┌───────────────────────┐
        │  PharmacyDetailsModal │
        │ (Full hours, services,│
        │  medicine inventory)  │
        └───────────────────────┘
```

#### Data Entities & Schema (`src/types/pharmacy.ts`)
```typescript
export interface MedicineItem {
  id: string;
  name: string;
  category: string;
  prescriptionRequired: boolean;
  samplePriceEstimate?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  image: string;
  address: string;
  area: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  emergencyPhone?: string;
  openingHours: string;
  isOpenNow: boolean;
  services: string[];
  sampleMedicines: MedicineItem[];
  rating: number;
  reviewCount: number;
  is24Hours: boolean;
}
```

#### Step-by-Step Implementation Sequence:
1. **Dependencies Installation**: Install `leaflet`, `@types/leaflet` using batched package installer.
2. **Data & Types**: Create `src/types/pharmacy.ts` and `src/data/pharmacies.ts` containing 8+ realistic fictional Chennai pharmacies across areas like T. Nagar, Anna Nagar, Adyar, Velachery, Nungambakkam, Mylapore, Egmore, and Tambaram.
3. **Core Utility**: Create `src/utils/distance.ts` (Haversine formula calculation and formatted distance strings).
4. **Components Construction**:
   - `Navbar.tsx`: Strict 3-zone contract, responsive mobile drawer, location indicator.
   - `Hero.tsx`: Medicine search input, "Use My Location" geolocation trigger, fallback location picker.
   - `SearchBar.tsx`: Case-insensitive search with autocomplete suggestions and clear button.
   - `PharmacyCard.tsx`: Rich card with opening status, distance, services, matched medicine highlight, and action buttons.
   - `PharmacyList.tsx`: Filter tabs (All, Open Now, Nearest), sort toggles, empty results state.
   - `PharmacyMap.tsx`: Interactive Leaflet map container with custom pharmacy pins, user location marker, and popup sync.
   - `PharmacyDetailsModal.tsx`: Comprehensive modal with operating schedule, full inventory, directions link, and contact info.
   - `AboutSection.tsx` & `ContactSection.tsx`: Explanatory healthcare discovery overview and contact form with feedback.
   - `Footer.tsx`: Prominent medical and sample-data disclaimers, quick links, and branding.
5. **App Integration & Verification**: Assemble in `App.tsx`, test responsive views, verify build and lint with zero errors.
