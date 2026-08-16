import React from 'react';
import { X, ShieldCheck, CheckCircle2, HeartHandshake, ExternalLink } from 'lucide-react';

interface DisclosureModalProps {
  onClose: () => void;
}

export const AffiliateDisclosureModal: React.FC<DisclosureModalProps> = ({ onClose }) => {
  return (
    <div 
      id="store-disclosure-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="store-disclosure-container"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150 text-slate-800 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Curation & Store Transparency Policy</h2>
              <p className="text-xs text-slate-500">Official Retailer Routing & Editorial Ethics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[65vh] overflow-y-auto pr-2">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-slate-900 space-y-1">
            <h3 className="font-bold flex items-center gap-1.5 text-emerald-950">
              <HeartHandshake className="w-4 h-4 text-emerald-600" /> Direct Merchant Discovery Pledge
            </h3>
            <p className="text-xs text-slate-700">
              PinFind is an aesthetic visual product discovery platform. When you click on the <strong>“Visit Site →”</strong> links to explore products, we connect you directly with verified merchant partner stores with <strong>no extra markup or hidden fees</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">1. Direct Retailer Pricing</h4>
            <p>
              The prices displayed on our pins reflect the merchant’s estimated list prices. You pay the exact same price as visiting the retailer store directly. In many cases, we highlight active seasonal sales and verified catalog items.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">2. Verified Merchant Network</h4>
            <p>
              We catalog curated items from verified merchant platforms including Amazon, Etsy, Nordstrom, Target, West Elm, and specialty boutique creators. Outbound links navigate directly to official product listings.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">3. Editorial Independence</h4>
            <p>
              Our curators hand-select every product based on design excellence, material craftsmanship, ergonomics, and aesthetic harmony. Products are featured based on merit and visual inspiration.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">4. Cross-Platform Pinterest Sync</h4>
            <p>
              Admins and creators can seamlessly sync curated pins directly to Pinterest boards for cohesive cross-platform inspiration and moodboard sharing.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
