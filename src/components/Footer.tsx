import React from 'react';
import { Cross, ShieldAlert } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0D1B16] text-slate-300 border-t border-[#1C362C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#087F5B] to-[#087E9B] text-white flex items-center justify-center shadow-md">
                <Cross className="w-5 h-5 stroke-[2.8]" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Medi<span className="text-[#34D399]">Find</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-medium">
              MediFind makes it easier to discover pharmacies around you and explore their listed services. Our goal is to make pharmacy discovery simple, convenient, and accessible across Tamil Nadu.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-3.5">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#34D399] transition-colors cursor-pointer text-slate-300"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('pharmacies')}
                  className="hover:text-[#34D399] transition-colors cursor-pointer text-slate-300"
                >
                  Find Pharmacies
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#34D399] transition-colors cursor-pointer text-slate-300"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#34D399] transition-colors cursor-pointer text-slate-300"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Coverage Areas */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-3.5">
              Coverage Areas
            </h4>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-300 font-semibold">
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">T. Nagar</span>
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">Anna Nagar</span>
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">Adyar</span>
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">Mylapore</span>
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">Velachery</span>
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">Egmore</span>
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">Nungambakkam</span>
              <span className="bg-[#152B23] px-2.5 py-1 rounded-lg border border-[#24463B]">Tambaram</span>
            </div>
          </div>

        </div>

        {/* Required Medical Disclaimer */}
        <div className="pt-8 border-t border-[#1C362C]">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#132620] border border-[#24463B] flex items-start gap-3.5 text-xs text-slate-300 leading-relaxed mb-6 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-[#FCD34D] block mb-0.5">
                Healthcare Data Disclaimer
              </span>
              <p>
                Medicine listings and pharmacy information are published by registered pharmacies. Actual availability, prices, and operating hours must be confirmed directly with the pharmacy. MediFind does not provide medical advice.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} MediFind. Accessible healthcare navigation in Tamil Nadu.</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#087F5B]" />
              <span>Live Pharmacy Directory</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
