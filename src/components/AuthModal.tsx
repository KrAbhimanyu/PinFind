import React, { useState } from 'react';
import { X, Lock, Mail, Shield, User as UserIcon, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'admin-login' | 'register';
  onClose: () => void;
  onSuccess: (user: User) => void;
  onShowToast: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'login' | 'admin-login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        const { user } = await api.register(email, password, name);
        onShowToast(`Welcome, ${user.name}!`);
        onSuccess(user);
        onClose();
      } else {
        const { user } = await api.login(email, password);
        if (mode === 'admin-login' && user.role !== 'ADMIN') {
          setError('This account does not have administrator permissions.');
          setIsLoading(false);
          return;
        }
        onShowToast(user.role === 'ADMIN' ? 'Welcome to Admin Console' : `Welcome back, ${user.name}!`);
        onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="auth-modal-dialog"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-6 text-white ${mode === 'admin-login' ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950' : 'bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                {mode === 'admin-login' ? <ShieldCheck className="w-5 h-5 text-indigo-200" /> : <Lock className="w-5 h-5 text-rose-100" />}
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight">
                  {mode === 'admin-login' ? 'Admin Portal Authentication' : mode === 'register' ? 'Create PinFind Account' : 'Account Sign In'}
                </h3>
                <p className="text-xs text-white/80">
                  {mode === 'admin-login' ? 'Restricted console for verified administrators' : 'Save pins, create boards, and discover trends'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <div className="relative flex items-center">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-2xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'admin-login'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'admin-login' ? 'Access Admin Console' : mode === 'register' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Mode Switcher */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {mode === 'admin-login' ? (
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              ← Back to User Login
            </button>
          ) : mode === 'register' ? (
            <div className="w-full text-center">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="text-rose-600 font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <div>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={() => { setMode('admin-login'); setError(null); }}
                className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Shield className="w-3 h-3" /> Admin Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
