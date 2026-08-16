import React from 'react';
import { Pin, ShieldCheck, Heart } from 'lucide-react';
import { CATEGORIES } from '../data/initialProducts';

interface FooterProps {
  onSelectCategory: (cat: string) => void;
  onOpenDisclosure: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onOpenDisclosure }) => {
  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white pt-12 pb-16 text-slate-600 text-xs">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs">
                <Pin className="w-4 h-4 fill-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 font-display">
                Pin<span className="text-rose-600">Find</span>
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-sm">
              A curated Pinterest-style visual product discovery platform. Discover aesthetic workspace setups, Japandi home decor, specialty coffee gear, and mindful essentials.
            </p>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <button
                onClick={onOpenDisclosure}
                className="hover:text-slate-900 underline font-medium cursor-pointer"
              >
                Curation & Store Transparency Policy
              </button>
            </div>
          </div>

          {/* Categories Col */}
          <div className="md:col-span-4 space-y-2.5">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 text-xs">Aesthetic Collections</h4>
            <div className="grid grid-cols-2 gap-1.5 text-slate-500">
              {CATEGORIES.slice(1).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    onSelectCategory(cat);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left hover:text-rose-600 py-1 transition-colors cursor-pointer"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Transparency / Store Notice Col */}
          <div className="md:col-span-3 space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Curation Notice</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              We curate design-forward lifestyle products. All featured items direct you directly to verified official retailer stores.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© 2026 PinFind. Built for aesthetic product discovery & curation.</p>
          <div className="flex items-center gap-4">
            <button onClick={onOpenDisclosure} className="hover:text-slate-700 cursor-pointer">Curation Policy</button>
            <span>•</span>
            <span>Verified Retailer Connections</span>
            <span>•</span>
            <span>Pinterest Cross-Platform Sync</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
