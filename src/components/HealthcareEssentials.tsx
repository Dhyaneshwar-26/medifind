import React from 'react';
import { Pill, HeartPulse, Sparkles, Stethoscope, Clock, ArrowRight, ShieldPlus } from 'lucide-react';
import { PharmacyFilter } from '../types/pharmacy';

interface HealthcareEssentialsProps {
  onSelectCategory: (action: { query?: string; filter?: PharmacyFilter }) => void;
}

export const HealthcareEssentials: React.FC<HealthcareEssentialsProps> = ({
  onSelectCategory,
}) => {
  const categories = [
    {
      id: 'tablets-capsules',
      title: 'Tablets & Capsules',
      subtitle: 'Pain relief, antibiotics & daily fever medications',
      sampleSearch: 'Paracetamol',
      image: '/src/assets/images/hero_medicines_capsules_1794119274190.jpg',
      icon: Pill,
      badge: 'Prescriptions & OTC',
      // Pastel mint background
      cardBg: 'bg-[#EBF7F2] dark:bg-[#152B23]',
      borderClass: 'border-[#087F5B]/25 hover:border-[#087F5B]',
      iconBg: 'bg-[#087F5B] text-white',
      badgeClass: 'bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#6EE7B7] border border-[#087F5B]/30',
      action: { query: 'Paracetamol' },
    },
    {
      id: 'first-aid',
      title: 'First Aid & Trauma',
      subtitle: 'Bandages, antiseptics, gauze & burn treatments',
      sampleSearch: 'First Aid',
      image: '/src/assets/images/first_aid_essentials_1794119276037.jpg',
      icon: HeartPulse,
      badge: 'Emergency Ready',
      // Pastel peach / warm orange background
      cardBg: 'bg-[#FEF6EE] dark:bg-[#2A1F17]',
      borderClass: 'border-[#F59E0B]/30 hover:border-[#F59E0B]',
      iconBg: 'bg-[#F59E0B] text-white',
      badgeClass: 'bg-[#FEF3C7] dark:bg-[#451A03] text-[#92400E] dark:text-[#FCD34D] border border-[#F59E0B]/30',
      action: { query: 'Antiseptic' },
    },
    {
      id: 'personal-care',
      title: 'Personal Care & Hygiene',
      subtitle: 'Eye drops, antiseptic washes & dermatological ointments',
      sampleSearch: 'Eye Lubricant',
      image: '/src/assets/images/healthcare_wellness_1794119276551.jpg',
      icon: Sparkles,
      badge: 'Daily Care',
      // Pastel soft purple background
      cardBg: 'bg-[#F6F2FF] dark:bg-[#251B38]',
      borderClass: 'border-[#805AD5]/30 hover:border-[#805AD5]',
      iconBg: 'bg-[#805AD5] text-white',
      badgeClass: 'bg-[#F3E8FF] dark:bg-[#3B0764] text-[#6B21A8] dark:text-[#D8B4FE] border border-[#805AD5]/30',
      action: { query: 'Eye Lubricant Drops' },
    },
    {
      id: 'healthcare-products',
      title: 'Healthcare Products',
      subtitle: 'Vitamins, minerals, dietary supplements & rehydration ORS',
      sampleSearch: 'Vitamin',
      image: '/src/assets/images/healthcare_wellness_1794119276551.jpg',
      icon: Stethoscope,
      badge: 'Vitamins & Wellness',
      // Pastel aqua background
      cardBg: 'bg-[#EBF7FA] dark:bg-[#142A33]',
      borderClass: 'border-[#087E9B]/30 hover:border-[#087E9B]',
      iconBg: 'bg-[#087E9B] text-white',
      badgeClass: 'bg-[#CFFAFE] dark:bg-[#164E63] text-[#155E75] dark:text-[#67E8F9] border border-[#087E9B]/30',
      action: { query: 'Vitamin' },
    },
    {
      id: 'pharmacy-services',
      title: 'Pharmacy Services',
      subtitle: '24/7 night counters, BP checks, insulin & vaccine cold chain',
      sampleSearch: '24 Hours',
      image: '/src/assets/images/pharmacy_interior_modern_1794119274302.jpg',
      icon: Clock,
      badge: '24/7 Verified',
      // Pastel bright mint/emerald background
      cardBg: 'bg-[#E8FAF4] dark:bg-[#163127]',
      borderClass: 'border-[#087F5B]/35 hover:border-[#087F5B]',
      iconBg: 'bg-[#087F5B] text-white',
      badgeClass: 'bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#6EE7B7] border border-[#087F5B]/30',
      action: { filter: '24hours' as PharmacyFilter },
    },
  ];

  return (
    <section className="py-14 md:py-18 bg-transparent dark:bg-[#0C1814] border-b border-emerald-900/10 dark:border-[#1F3D32] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-extrabold tracking-wider uppercase text-[#087F5B] dark:text-[#34D399] bg-white dark:bg-[#162C24] px-3 py-1 rounded-full border border-[#087F5B]/20 dark:border-[#285444] shadow-2xs">
                Essential Categories
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-bold">
                Tamil Nadu Directory
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#20332D] dark:text-[#E5F4EE] tracking-tight">
              Explore Healthcare Essentials
            </h2>
            <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 mt-1 max-w-xl">
              Browse common healthcare categories and discover local pharmacies that list related supplies.
            </p>
          </div>
          <span className="text-[11px] text-[#20332D]/50 dark:text-[#E5F4EE]/50 font-medium italic">
            *Visual navigation only · Consult your physician for medical advice
          </span>
        </div>

        {/* 5-Column Colourful Pastel Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.action)}
                className={`group relative rounded-3xl border ${cat.cardBg} ${cat.borderClass} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1.5`}
              >
                {/* Visual Thumbnail */}
                <div className="relative h-32 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  
                  {/* Floating Category Icon Button */}
                  <div className={`absolute bottom-2.5 left-2.5 w-9 h-9 rounded-xl ${cat.iconBg} flex items-center justify-center shadow-md`}>
                    <IconComponent className="w-5 h-5 stroke-[2.4]" />
                  </div>

                  {/* Badge */}
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs ${cat.badgeClass}`}>
                    {cat.badge}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <h3 className="text-sm font-extrabold text-[#20332D] dark:text-[#E5F4EE] group-hover:text-[#087F5B] dark:group-hover:text-[#34D399] transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-medium leading-relaxed mt-1 mb-4 line-clamp-2">
                    {cat.subtitle}
                  </p>

                  <div className="mt-auto pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold text-[#087F5B] dark:text-[#34D399] group-hover:translate-x-0.5 transition-transform">
                    <span className="text-[11px]">Explore listings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
