import React, { useState } from 'react';
import { Product, Board } from '../types';
import { formatPrice } from '../utils/formatters';
import { Code, Copy, Check, ExternalLink, X, Layout, Sparkles } from 'lucide-react';

interface EmbedPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  board?: Board | null;
  onShowToast: (msg: string) => void;
}

export const EmbedPinModal: React.FC<EmbedPinModalProps> = ({
  isOpen,
  onClose,
  product,
  board,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [embedTheme, setEmbedTheme] = useState<'light' | 'dark'>('light');
  const [showPrice, setShowPrice] = useState(true);

  if (!isOpen) return null;

  const targetName = product ? product.name : (board ? board.name : 'Curated Pin');
  const targetImage = product ? product.imageUrl : (board?.coverImage || 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800');
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://pinfind.store';
  const targetLink = product 
    ? `${currentOrigin}/#product-${product.slug || product.id}`
    : `${currentOrigin}/#board-${board?.id}`;

  const embedCode = `<!-- PinFind Embed Widget: ${targetName} -->
<div class="pinfind-widget" data-theme="${embedTheme}" style="max-width:320px;border-radius:18px;overflow:hidden;border:1px solid ${embedTheme === 'dark' ? '#334155' : '#e2e8f0'};background:${embedTheme === 'dark' ? '#0f172a' : '#ffffff'};font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
  <a href="${targetLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;display:block;">
    <div style="width:100%;aspect-ratio:4/3;overflow:hidden;background:#f1f5f9;">
      <img src="${targetImage}" alt="${targetName}" style="width:100%;height:100%;object-fit:cover;" />
    </div>
    <div style="padding:14px 16px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#e11d48;letter-spacing:0.5px;">PinFind Curated</div>
      <div style="font-size:14px;font-weight:700;color:${embedTheme === 'dark' ? '#f8fafc' : '#0f172a'};margin:4px 0 6px 0;line-height:1.3;">${targetName}</div>
      ${product && showPrice ? `<div style="font-size:13px;font-weight:800;color:${embedTheme === 'dark' ? '#f43f5e' : '#e11d48'};">${formatPrice(product.price || 0, 'INR')}</div>` : ''}
    </div>
  </a>
</div>
<script async src="${currentOrigin}/embed.js"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    onShowToast('Embed snippet copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="embed-widget-modal"
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/40 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Embeddable Widget
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                  HTML & JS
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Embed this aesthetic pin or board directly into blogs, Notion, or websites.
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customization controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Theme:</span>
              <div className="flex items-center rounded-lg bg-slate-200 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setEmbedTheme('light')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    embedTheme === 'light' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => setEmbedTheme('dark')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    embedTheme === 'dark' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            {product && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Include Price Tag ({formatPrice(product.price || 0, 'INR')})</span>
              </label>
            )}
          </div>

          {/* Interactive Preview */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              Live Widget Preview
            </h4>
            <div className="p-6 rounded-2xl bg-slate-100/70 border border-slate-200 flex justify-center">
              <div className={`w-72 rounded-2xl overflow-hidden shadow-lg border transition-all ${
                embedTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="aspect-4/3 overflow-hidden bg-slate-200">
                  <img src={targetImage} alt={targetName} className="w-full h-full object-cover" />
                </div>
                <div className="p-3.5">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide block mb-1">
                    PinFind Curated
                  </span>
                  <h5 className="text-xs font-bold truncate">{targetName}</h5>
                  {product && showPrice && (
                    <p className="text-xs font-extrabold text-rose-600 mt-1">
                      {formatPrice(product.price || 0, 'INR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Embed Code Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Copy HTML Code
              </label>
              <button
                onClick={handleCopy}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Snippet'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={5}
              value={embedCode}
              className="w-full p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none select-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Standard compliant responsive iframe widget</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
