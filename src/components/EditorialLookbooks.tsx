import React, { useState } from 'react';
import { Product, LookbookGuide, FilterState } from '../types';
import { Sparkles, ArrowRight, X, Compass, ChevronRight, Gift } from 'lucide-react';

interface EditorialLookbooksProps {
  products: Product[];
  onApplyGuide: (guide: LookbookGuide) => void;
  activeGuideId: string | null;
  onClearGuide: () => void;
}

export const EDITORIAL_GUIDES: LookbookGuide[] = [
  {
    id: 'guide-desk-minimalist',
    title: 'Minimalist Japanese Zen Workspaces',
    subtitle: 'Warm walnut, matte aluminum, and clutter-free cable organizers.',
    category: 'Desk Setup',
    tag: 'workspace',
    coverImage: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&auto=format&fit=crop&q=80',
    accentColor: 'from-amber-600 to-amber-900',
    badge: 'Curator Top Pick',
    description: 'Elevate your daily focus with artisanal timber accessories, dual-monitor risers, and tactile desk pads designed for prolonged creative flow.',
  },
  {
    id: 'guide-under-999',
    title: 'Aesthetic Steals Under ₹999',
    subtitle: 'High-design home accessories and coffee tools that look 10x their price.',
    category: 'All Pins',
    maxPrice: 999,
    coverImage: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
    accentColor: 'from-rose-600 to-pink-900',
    badge: 'Budget Design',
    description: 'Transform your space without breaking the bank. Handpicked ceramic mugs, linen catch-alls, and sculptural taper candles all under ₹999.',
  },
  {
    id: 'guide-scandi-living',
    title: 'Warm Scandinavian Living Accents',
    subtitle: 'Textured bouclé throws, organic stoneware, and diffused ambient lighting.',
    category: 'Home Decor',
    tag: 'minimalist',
    coverImage: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&auto=format&fit=crop&q=80',
    accentColor: 'from-emerald-700 to-teal-950',
    badge: 'Interior Trends',
    description: 'Harmonize your sanctuary with cozy hygge aesthetics, earthy terracotta vessels, and gentle warm light fixtures.',
  },
  {
    id: 'guide-artisan-barista',
    title: 'Artisan Coffee Nook & Pour-Over Rituals',
    subtitle: 'Precision goose-neck kettles, borosilicate drippers, and ceramic carafes.',
    category: 'Coffee & Kitchen',
    tag: 'coffee',
    coverImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    accentColor: 'from-amber-800 to-stone-900',
    badge: 'Ritual Edit',
    description: 'Craft café-grade pour-overs at home with aesthetic drippers, solid brass tampers, and handcrafted espresso cups.',
  },
];

export const EditorialLookbooks: React.FC<EditorialLookbooksProps> = ({
  products,
  onApplyGuide,
  activeGuideId,
  onClearGuide,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeGuide = EDITORIAL_GUIDES.find(g => g.id === activeGuideId);

  return (
    <div id="editorial-lookbooks-section" className="mb-6">
      {/* Active Guide Banner */}
      {activeGuide ? (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${activeGuide.coverImage})` }} />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Editorial Lookbook: {activeGuide.badge}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2 font-serif">
                {activeGuide.title}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-1">
                {activeGuide.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClearGuide}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Exit Lookbook View</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Header trigger bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="group inline-flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <span className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 group-hover:bg-rose-100 transition-colors">
                <Compass className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-extrabold">Curated Lookbooks & Themed Gift Guides</span>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              4 Themed Collections
            </span>
          </div>

          {/* Collapsible/Expandable Lookbooks Strip */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 transition-all duration-300 ${isOpen ? 'block' : 'hidden md:grid'}`}>
            {EDITORIAL_GUIDES.map((guide) => (
              <div
                key={guide.id}
                onClick={() => onApplyGuide(guide)}
                className="group relative overflow-hidden rounded-2xl p-4 bg-slate-900 text-white cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-slate-800/80 flex flex-col justify-between min-h-[140px]"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-300"
                  style={{ backgroundImage: `url(${guide.coverImage})` }}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${guide.accentColor} opacity-75 group-hover:opacity-85 transition-opacity`} />
                
                <div className="relative z-10">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold tracking-wide uppercase text-white mb-2">
                    {guide.badge}
                  </span>
                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-rose-200 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-[11px] text-slate-200 line-clamp-2 mt-0.5 leading-snug">
                    {guide.subtitle}
                  </p>
                </div>

                <div className="relative z-10 flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-[11px] font-bold text-white/90">
                  <span>Explore Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
