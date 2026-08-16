import React from 'react';
import { User } from '../types';
import { ShieldAlert, Lock, ArrowLeft, LogIn } from 'lucide-react';

interface AdminRouteWrapperProps {
  currentUser: User | null;
  isLoading?: boolean;
  onOpenAdminLogin?: () => void;
  onRedirectHome?: () => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminRouteWrapper: React.FC<AdminRouteWrapperProps> = ({
  currentUser,
  isLoading = false,
  onOpenAdminLogin,
  onRedirectHome,
  children,
  fallback,
}) => {
  // If authentication state is currently resolving
  if (isLoading) {
    return (
      <div 
        id="admin-route-loading"
        className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center animate-pulse"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Verifying Administrator Access</h3>
        <p className="text-xs text-slate-400">Please wait while security credentials are confirmed...</p>
      </div>
    );
  }

  // Check for the 'ADMIN' role
  const isAuthorizedAdmin = currentUser !== null && currentUser.role === 'ADMIN';

  if (!isAuthorizedAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        id="admin-access-denied-container"
        className="max-w-lg mx-auto my-16 p-8 sm:p-10 bg-white rounded-3xl border border-slate-200/90 shadow-lg text-center animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-5 border border-rose-200/80 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
          Access Restricted
        </span>

        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-3 mb-2 tracking-tight">
          Administrator Privileges Required
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed max-w-md mx-auto">
          {currentUser
            ? `You are currently signed in as "${currentUser.name}" with the role "${currentUser.role}". This console is strictly reserved for verified Administrators.`
            : 'You must be signed in with an authorized Administrator account to access the catalog management console, publication controls, and analytics.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onRedirectHome && (
            <button
              id="admin-deny-return-btn"
              type="button"
              onClick={onRedirectHome}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Discovery</span>
            </button>
          )}

          {onOpenAdminLogin && (
            <button
              id="admin-deny-login-btn"
              type="button"
              onClick={onOpenAdminLogin}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In as Admin</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Authorized: render protected admin dashboard
  return <>{children}</>;
};
