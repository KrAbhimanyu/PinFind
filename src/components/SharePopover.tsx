import React, { useState } from 'react';
import { Product } from '../types';
import { 
  X, Copy, Check, Share2, Send, 
  ExternalLink, Globe 
} from 'lucide-react';
import { formatPrice } from '../utils/formatters';

interface SharePopoverProps {
  product: Product;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const SharePopover: React.FC<SharePopoverProps> = ({
  product,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname}#p/${product.slug}`;
  const shareTitle = `Discover ${product.name} on PinFind`;
  const shareText = `Check out this curated find: ${product.name} - ${product.shortDescription}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        onShowToast('Product link copied to clipboard!');
        setTimeout(() => setCopied(false), 2200);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        onShowToast('Product link copied to clipboard!');
        setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      onShowToast('Could not copy automatically. Please copy the link below.');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        onShowToast('Shared successfully!');
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const openSocial = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const shareTwitter = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    openSocial(tweetUrl);
  };

  const sharePinterest = () => {
    const pinUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(product.imageUrl)}&description=${encodeURIComponent(shareText)}`;
    openSocial(pinUrl);
  };

  const shareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    openSocial(waUrl);
  };

  const shareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openSocial(fbUrl);
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div 
      id="share-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="share-modal-container"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 text-slate-800 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Share this Find</h3>
              <p className="text-xs text-slate-400">Share aesthetic discovery with friends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Mini Preview */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span className="font-semibold text-rose-600">{formatPrice(product.price, product.currency)}</span>
              <span>•</span>
              <span>{product.retailer}</span>
            </div>
          </div>
        </div>

        {/* Quick Copy Link Bar */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
            Direct Shareable URL
          </label>
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <input 
              type="text" 
              readOnly 
              value={shareUrl}
              className="w-full text-xs bg-transparent px-2.5 py-1 text-slate-700 font-mono truncate focus:outline-none select-all"
            />
            <button
              id="share-modal-copy-btn"
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer shadow-xs ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Native Web Share Button (if supported) */}
        {hasNativeShare && (
          <button
            id="share-modal-native-btn"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Open System Share Menu</span>
          </button>
        )}

        {/* Social Share Grid */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Share to Social Channels
          </span>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={shareTwitter}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all text-xs font-semibold cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <span className="font-black text-xs">𝕏</span>
              </div>
              <span className="text-[10px]">X / Twitter</span>
            </button>

            <button
              onClick={sharePinterest}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all text-xs font-semibold cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <span className="font-black text-xs">P</span>
              </div>
              <span className="text-[10px]">Pinterest</span>
            </button>

            <button
              onClick={shareWhatsApp}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all text-xs font-semibold cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <Send className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px]">WhatsApp</span>
            </button>

            <button
              onClick={shareFacebook}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all text-xs font-semibold cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <span className="font-black text-xs">f</span>
              </div>
              <span className="text-[10px]">Facebook</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
