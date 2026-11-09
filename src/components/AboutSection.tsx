import React from 'react';
import { Search, Clock, ShieldCheck, HeartPulse, Compass, CheckCircle2 } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-16 md:py-24 bg-[#FDFBF7] dark:bg-[#0C1814] border-t border-emerald-900/10 dark:border-[#1F3D32] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-extrabold tracking-wider uppercase text-[#087F5B] dark:text-[#34D399] bg-[#EBF7F2] dark:bg-[#162C24] px-3.5 py-1 rounded-full border border-[#087F5B]/20 dark:border-[#285444] shadow-2xs">
            About MediFind
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#20332D] dark:text-[#E5F4EE] tracking-tight mt-3 mb-4 text-balance">
            Making Pharmacy Discovery Simple, Convenient &amp; Accessible
          </h2>
          <p className="text-base sm:text-lg text-[#20332D]/75 dark:text-[#E5F4EE]/75 leading-relaxed text-balance">
            MediFind makes it easier to discover pharmacies around you and explore their listed services. Our goal is to make pharmacy discovery simple, convenient, and accessible across Tamil Nadu.
          </p>
        </div>

        {/* Feature Split with Modern Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          
          {/* Visual Side */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-[#1F3D32] bg-white dark:bg-[#162C24]">
              <img
                src="/src/assets/images/pharmacy_interior_modern_1794119274302.jpg"
                alt="Modern verified community pharmacy interior"
                referrerPolicy="no-referrer"
                className="w-full h-[340px] sm:h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#34D399]">
                  Tamil Nadu Verified Network
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  Connecting Patients to Local Dispensaries
                </h4>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-5 -right-3 sm:right-4 bg-white/95 dark:bg-[#162C24]/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-[#087F5B]/20 dark:border-[#285444] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087F5B] to-[#087E9B] text-white flex items-center justify-center font-bold shadow-xs">
                <HeartPulse className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-[#20332D] dark:text-[#E5F4EE] block">
                  Patient First
                </span>
                <span className="text-[11px] text-[#20332D]/70 dark:text-[#E5F4EE]/70 font-semibold">
                  Transparent Medicine Catalogs
                </span>
              </div>
            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#24463B] shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#087F5B] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#087F5B]/20">
                <Compass className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Proximity &amp; Interactive Map Navigation
                </h3>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 leading-relaxed font-medium">
                  Quickly pinpoint registered pharmacies within walking or driving distance in your Tamil Nadu neighborhood, complete with interactive Leaflet map navigation and live distance recalculation.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#24463B] shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] text-amber-950 flex items-center justify-center shrink-0 shadow-md shadow-[#F59E0B]/20">
                <Search className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Fast Medicine Catalog Search
                </h3>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 leading-relaxed font-medium">
                  Search by medicine brand or generic formulation to immediately discover which neighborhood dispensaries carry your required medication in their live inventory.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#162C24] border border-emerald-900/10 dark:border-[#24463B] shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#087E9B] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#087E9B]/20">
                <Clock className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE] mb-1">
                  Transparent Hours &amp; Listed Services
                </h3>
                <p className="text-xs sm:text-sm text-[#20332D]/70 dark:text-[#E5F4EE]/70 leading-relaxed font-medium">
                  Verify 24/7 emergency availability, oxygen refilling, prescription consultation, home delivery, and cold-chain vaccine storage facilities before traveling.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Region Banner with Rich Gradient */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#087F5B] via-[#087E9B] to-[#087F5B] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-[#087F5B]/20">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <ShieldCheck className="w-6 h-6 text-[#A7F3D0]" />
              <h4 className="text-lg font-extrabold">Community Healthcare Directory</h4>
            </div>
            <p className="text-xs sm:text-sm text-teal-50 max-w-xl leading-relaxed">
              MediFind connects residents to verified local pharmacies. This directory provides structured metadata to streamline patient access and community wellness.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs font-extrabold bg-white/20 text-white px-4 py-2 rounded-2xl border border-white/30 backdrop-blur-xs">
              Tamil Nadu Region
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
