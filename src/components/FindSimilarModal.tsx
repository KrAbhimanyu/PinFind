import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { api } from '../services/api';
import { formatPrice } from '../utils/formatters';
import { Sparkles, Scan, ArrowUpRight, X, Compass, ExternalLink, Bookmark, Check, Loader2 } from 'lucide-react';

interface FindSimilarModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceProduct: Product | null;
  onOpenProduct: (product: Product) => void;
  onSavePin: (productId: string, e: React.MouseEvent) => void;
  isProductSaved: (productId: string) => boolean;
}

export const FindSimilarModal: React.FC<FindSimilarModalProps> = ({
  isOpen,
  onClose,
  sourceProduct,
  onOpenProduct,
  onSavePin,
  isProductSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<Product[]>([]);
  const [matchDetails, setMatchDetails] = useState<{ id: string; score: number; explanation: string }[]>([]);

  useEffect(() => {
    if (!isOpen || !sourceProduct) return;

    let isMounted = true;
    setLoading(true);

    api.findSimilarProducts({
      productId: sourceProduct.id,
      category: sourceProduct.category,
      tags: sourceProduct.tags,
      name: sourceProduct.name,
      shortDescription: sourceProduct.shortDescription,
    })
      .then((res) => {
        if (isMounted) {
          setSimilarItems(res.similarProducts || []);
          setMatchDetails(res.matchDetails || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSimilarItems([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceProduct]);

  if (!isOpen || !sourceProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="find-similar-modal"
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/40 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Visual Lens: Find Similar Aesthetics
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold uppercase tracking-wider">
                  AI Powered
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Finding aesthetic pins with matching silhouettes, materials, and price tags.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source Product Spotlight Strip */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={sourceProduct.imageUrl}
                alt={sourceProduct.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Target Aesthetic Seed
                </span>
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {sourceProduct.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {sourceProduct.category} • {formatPrice(sourceProduct.price || 0, 'INR')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
              {sourceProduct.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Similar Items List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Matching Aesthetic Recommendations
              </h4>
              <span className="text-xs text-slate-400">
                {similarItems.length} Similar Pins
              </span>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-600">
                  Analyzing visual silhouettes and aesthetic tags...
                </p>
              </div>
            ) : similarItems.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-slate-700">No close matches found</h5>
                <p className="text-xs text-slate-500 mt-1">
                  Try exploring our main collection or curated lookbooks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarItems.map((item) => {
                  const detail = matchDetails.find((m) => m.id === item.id);
                  const saved = isProductSaved(item.id);

                  return (
                    <div
                      key={item.id}
                      className="group relative rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
                    >
                      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {detail && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            {detail.score}% Match
                          </div>
                        )}
                        <button
                          onClick={(e) => onSavePin(item.id, e)}
                          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer ${
                            saved
                              ? 'bg-rose-600 text-white'
                              : 'bg-white/80 backdrop-blur-xs text-slate-700 hover:bg-white'
                          }`}
                          title={saved ? 'Saved in collection' : 'Save Pin'}
                        >
                          {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{item.retailer || 'Partner Store'}</p>
                          <h5 
                            onClick={() => {
                              onOpenProduct(item);
                              onClose();
                            }}
                            className="text-xs font-bold text-slate-900 hover:text-rose-600 line-clamp-1 cursor-pointer mt-0.5"
                          >
                            {item.name}
                          </h5>
                          {detail && (
                            <p className="text-[10px] text-emerald-700 font-medium line-clamp-1 mt-1">
                              {detail.explanation}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                          <span className="text-xs font-extrabold text-slate-900">
                            {formatPrice(item.price || 0, 'INR')}
                          </span>
                          <button
                            onClick={() => {
                              onOpenProduct(item);
                              onClose();
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Powered by PinFind AI Visual Discovery Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Lens
          </button>
        </div>
      </div>
    </div>
  );
};
