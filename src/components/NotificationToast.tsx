import React from 'react';
import { Sparkles, CheckCircle, Info } from 'lucide-react';

interface NotificationToastProps {
  message: string | null;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div 
      id="notification-toast"
      className="fixed bottom-6 right-6 z-50 pointer-events-none flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 text-xs font-semibold animate-in slide-in-from-bottom-5 fade-in duration-200"
    >
      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};
