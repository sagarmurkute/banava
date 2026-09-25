import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from './useAuthStore';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    openAuthModal,
    login,
    signUp,
    loginWithGoogle,
    resetPassword,
    isLoading,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (authModalTab === 'login') {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Login failed');
      }
    } else if (authModalTab === 'signup') {
      const res = await signUp(email, password, fullName);
      if (!res.success) {
        setErrorMessage(res.error || 'Signup failed');
      } else {
        setSuccessMessage('Account created successfully!');
      }
    } else if (authModalTab === 'reset') {
      const res = await resetPassword(email);
      if (!res.success) {
        setErrorMessage(res.error || 'Password reset request failed');
      } else {
        setSuccessMessage('Password reset instructions sent to your email!');
      }
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    const res = await loginWithGoogle();
    if (!res.success) {
      setErrorMessage(res.error || 'Google login failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-100 border border-border-default rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-text-primary">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-brand/30">
              B
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {authModalTab === 'login'
                  ? 'Sign in to BANAVA'
                  : authModalTab === 'signup'
                  ? 'Create your account'
                  : 'Reset Password'}
              </h2>
              <p className="text-xs text-text-muted">Cloud sync and project management</p>
            </div>
          </div>
          <button
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-200"
            onClick={closeAuthModal}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border-subtle bg-surface-200/40 p-1">
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === 'login'
                ? 'bg-surface-100 text-brand shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              openAuthModal('login');
            }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === 'signup'
                ? 'bg-surface-100 text-brand shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              openAuthModal('signup');
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs">
              <ShieldCheck size={14} className="flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {authModalTab === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Full Name</label>
              <div className="relative flex items-center">
                <User size={14} className="absolute left-3 text-text-muted" />
                <input
                  type="text"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-surface-200 border border-border-default rounded-lg text-xs text-text-primary outline-none focus:border-brand"
                  placeholder="Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Email Address</label>
            <div className="relative flex items-center">
              <Mail size={14} className="absolute left-3 text-text-muted" />
              <input
                type="email"
                required
                className="w-full pl-9 pr-3 py-2 bg-surface-200 border border-border-default rounded-lg text-xs text-text-primary outline-none focus:border-brand"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {authModalTab !== 'reset' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">Password</label>
                {authModalTab === 'login' && (
                  <button
                    type="button"
                    className="text-[11px] text-brand hover:underline"
                    onClick={() => openAuthModal('reset')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock size={14} className="absolute left-3 text-text-muted" />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3 py-2 bg-surface-200 border border-border-default rounded-lg text-xs text-text-primary outline-none focus:border-brand"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold text-xs transition-all shadow-lg shadow-brand/25 flex items-center justify-center gap-2"
          >
            <span>
              {authModalTab === 'login'
                ? 'Sign In'
                : authModalTab === 'signup'
                ? 'Create Account'
                : 'Send Reset Link'}
            </span>
            <ArrowRight size={14} />
          </button>

          {authModalTab !== 'reset' && (
            <>
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-border-subtle w-full" />
                <span className="bg-surface-100 px-3 text-[11px] text-text-muted absolute">
                  or continue with
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-2 px-4 rounded-lg bg-surface-200 hover:bg-surface-300 text-text-primary font-medium text-xs border border-border-default flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                <span>Google</span>
              </button>
            </>
          )}

          {authModalTab === 'reset' && (
            <button
              type="button"
              className="w-full text-center text-xs text-brand hover:underline mt-2"
              onClick={() => openAuthModal('login')}
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
