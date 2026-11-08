'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Building2,
  Crown,
  HardHat,
} from 'lucide-react';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await signIn(username, password);
      if (res.success && res.user) {
        setSuccessMessage(`Welcome back, ${res.user.fullName}! Redirecting to dashboard...`);
        setTimeout(() => {
          router.push('/');
        }, 600);
      } else {
        setErrorMessage(res.error || 'Invalid username or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D14] text-neutral-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header without any bypass link */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center overflow-hidden p-1 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Shiv Enterprises 3D Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-wide text-white block">
              Shiv Enterprises
            </span>
            <span className="text-[11px] text-neutral-400 block -mt-0.5">
              Civil Contractors • Borivali (W)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
          <ShieldCheck size={14} className="text-amber-400" />
          <span className="hidden sm:inline">Protected Partner Portal</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Architectural Branding / Security Info (Desktop) */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Partner & Admin Access Portal</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
                Enterprise billing control & site operations.
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Dedicated access for authorized Shiv Enterprises partners. Every login and invoice created is tracked with partner identity, date, and exact timestamps.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="w-7 h-7 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Crown size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Admin Activity Tracking</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Harsh has full administrative oversight over all partner sessions, created bills, and site operations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <HardHat size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Partner Authentication</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Individual credentials for partners with cloud database sync on Supabase.
                  </p>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>End-to-end encrypted session • Supabase Cloud Audit Logs</span>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-[#121620] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              {/* Card Header */}
              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                  Secure Access
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Sign in to portal
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Enter your assigned partner username and password
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                  {errorMessage}
                </div>
              )}

              {/* Success Alert */}
              {successMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Username / Partner ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-9 pr-3 h-10 rounded-lg bg-[#181D2A] border border-white/[0.1] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-10 h-10 rounded-lg bg-[#181D2A] border border-white/[0.1] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-[#181D2A] border-white/20 text-amber-500 focus:ring-amber-500/40"
                    />
                    <span className="text-xs text-neutral-400">
                      Keep me signed in on this device
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs tracking-wide shadow-[0_2px_12px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign in to Dashboard</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Note */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
                <p className="text-[11px] text-neutral-400">
                  Access is strictly restricted to authorized Shiv Enterprises partners.
                </p>
              </div>
            </div>

            {/* Mobile Footer Note */}
            <p className="text-center text-[11px] text-neutral-500 mt-4 lg:hidden">
              Shiv Enterprises • Civil Contractor Internal Management
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="px-6 py-4 border-t border-white/[0.06] text-center text-xs text-neutral-500">
        Shiv Enterprises Civil Contractors • K-303, Guru Residency, Borivali (W), Mumbai - 400 092
      </footer>
    </div>
  );
}
