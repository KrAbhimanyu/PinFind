import React, { useRef, useState } from 'react';
import { Board, Product } from '../types';
import { formatPrice } from '../utils/formatters';
import { Download, FileText, Printer, Sparkles, X, Check, Eye } from 'lucide-react';

interface MoodBoardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  products: Product[];
  onShowToast: (msg: string) => void;
}

export const MoodBoardExportModal: React.FC<MoodBoardExportModalProps> = ({
  isOpen,
  onClose,
  board,
  products,
  onShowToast,
}) => {
  const [boardTitle, setBoardTitle] = useState(board?.name || 'Curated Aesthetic Mood Board');
  const [designerNotes, setDesignerNotes] = useState(board?.description || 'Curated aesthetic collection for interior and daily inspiration.');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !board) return null;

  const boardProducts = products.filter(p => board.productIds.includes(p.id));
  const totalValue = boardProducts.reduce((acc, curr) => acc + (curr.price || 0), 0);

  const handlePrintOrPdf = () => {
    setIsExporting(true);
    onShowToast('Preparing high-resolution mood board for print/PDF export...');
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="moodboard-export-modal"
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/40 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Export Mood Board & PDF
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold uppercase tracking-wider">
                  Print Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Generate an editorial presentation sheet for interior design projects, clients, or gifting.
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

        {/* Body / Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Board Presentation Title</label>
              <input
                type="text"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-rose-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Designer Notes / Description</label>
              <input
                type="text"
                value={designerNotes}
                onChange={(e) => setDesignerNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-rose-500"
              />
            </div>
          </div>

          {/* Printable Mood Board Canvas Container */}
          <div className="p-6 md:p-8 rounded-2xl bg-stone-50 border border-stone-200 text-slate-900 shadow-inner print:shadow-none print:border-none print:p-0">
            {/* Editorial Sheet Header */}
            <div className="border-b-2 border-stone-800 pb-4 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-rose-600">
                  PINFIND EDITORIAL LOOKBOOK • CURATED COLLECTION
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold font-serif tracking-tight text-slate-900 mt-1">
                  {boardTitle}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  {designerNotes}
                </p>
              </div>

              <div className="text-left md:text-right flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Value (INR)</span>
                <span className="text-lg font-extrabold text-slate-900">{formatPrice(totalValue, 'INR')}</span>
                <span className="text-[11px] text-slate-500 block">{boardProducts.length} Items Curated</span>
              </div>
            </div>

            {/* Collage Grid */}
            {boardProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-slate-500">No pins in this board yet. Add pins to generate a mood board!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {boardProducts.map((p, idx) => (
                  <div key={p.id} className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs flex flex-col justify-between">
                    <div className="aspect-square rounded-lg overflow-hidden bg-stone-100 mb-2">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-0.5">
                        <span>#{String(idx + 1).padStart(2, '0')}</span>
                        <span>{p.retailer || 'Direct'}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                      <p className="text-[11px] font-extrabold text-rose-600 mt-0.5">
                        {formatPrice(p.price || 0, 'INR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Editorial Sheet Footer */}
            <div className="mt-8 pt-4 border-t border-stone-300 flex items-center justify-between text-[10px] text-slate-400">
              <span>Curated with PinFind Visual Discovery • pinfind.store</span>
              <span>Generated on {new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Use browser &quot;Save as PDF&quot; in print dialog.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePrintOrPdf}
              className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Export PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
