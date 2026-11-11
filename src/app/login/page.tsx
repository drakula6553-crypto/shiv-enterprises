'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Layers,
  Activity,
  Check,
} from 'lucide-react';
import { signIn, getCurrentUser, PARTNER_ACCOUNTS } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const existing = getCurrentUser();
    if (existing) {
      router.replace('/');
    }
  }, [router]);

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
        }, 500);
      } else {
        setErrorMessage(res.error || 'Invalid username or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (accUsername: string, accPass: string) => {
    setUsername(accUsername);
    setPassword(accPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-slate-100 flex flex-col justify-between selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-[#071324]/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center overflow-hidden p-1 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Shiv Enterprises 3D Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block leading-tight font-sans">
              Shiv Enterprises
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5 tracking-wide">
              Civil Contractors • Borivali (W), Mumbai
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <ShieldCheck size={14} className="text-[#38BDF8]" />
          <span className="hidden sm:inline">Protected Partner Portal</span>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Brand DNA & Architectural Overview (Desktop) */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[11px] font-mono tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              <span>AUTHENTICATED PARTNER ACCESS</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-white leading-tight font-sans">
                Enterprise civil contracts &amp; site operations.
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                Dedicated system for authorized Shiv Enterprises partners. Running account (RA) ledgers, tax invoices, purchase vouchers, and live session audit tracking.
              </p>
            </div>

            {/* Architectural Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 shrink-0 mt-0.5">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Full Operations Audit Trail</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live partner presence tracking, bill creation logs, and timestamped authentication trails.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Layers size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Project RA &amp; Milestone Billing</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Harshmaan Spaces LLP turnkey contract ledger, RMC deductions, and formatted Excel/PDF exports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                  <Activity size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Real-Time Cloud Synchronization</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    High-speed multi-device sync between site mobile phones and office PCs via Supabase.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-[#071324]/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] relative">
              {/* Card Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center p-1.5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Shiv Enterprises Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Partner Sign In</h2>
                    <p className="text-xs text-slate-400">Authorized personnel only</p>
                  </div>
                </div>

                {/* Quick Select Partner Account Chips */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5 font-mono">
                    Quick Partner Select:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('Harsh16', 'Harsh@123')}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                        username.toLowerCase() === 'harsh16'
                          ? 'bg-[#0284C7] border-[#0284C7] text-white shadow-xs'
                          : 'bg-white/[0.04] border-slate-800 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="text-[11px] font-bold block truncate">Harsh</span>
                      <span className="text-[9px] text-slate-400 block truncate">Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSelect('girish1', 'Girish@123')}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                        username.toLowerCase() === 'girish1'
                          ? 'bg-[#0284C7] border-[#0284C7] text-white shadow-xs'
                          : 'bg-white/[0.04] border-slate-800 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="text-[11px] font-bold block truncate">Girish</span>
                      <span className="text-[9px] text-slate-400 block truncate">Partner</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSelect('kishor2', 'Kishor@15')}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                        username.toLowerCase() === 'kishor2'
                          ? 'bg-[#0284C7] border-[#0284C7] text-white shadow-xs'
                          : 'bg-white/[0.04] border-slate-800 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="text-[11px] font-bold block truncate">Kishor</span>
                      <span className="text-[9px] text-slate-400 block truncate">Partner</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error & Success Messages */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <Check size={14} className="shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Username / Partner ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Harsh16 or girish1"
                      className="w-full pl-9 pr-3 h-10 rounded-xl bg-[#0F2238] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-10 h-10 rounded-xl bg-[#0F2238] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
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
                      className="w-3.5 h-3.5 rounded bg-[#0F2238] border-slate-700 text-[#0284C7] focus:ring-[#0284C7]"
                    />
                    <span className="text-xs text-slate-400">
                      Keep me signed in on this device
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-semibold text-xs tracking-wide shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
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
              <div className="mt-5 pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400 font-mono">
                  Registered Partner Accounts: Harsh16, girish1, kishor2
                </p>
              </div>
            </div>

            {/* Mobile Footer Note */}
            <p className="text-center text-[11px] text-slate-500 mt-4 lg:hidden">
              Shiv Enterprises • Civil Contractor Internal Management
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/80 bg-[#071324]/40 text-center text-xs text-slate-500">
        Shiv Enterprises Civil Contractors • K-303, Guru Residency, Borivali (W), Mumbai - 400 092
      </footer>
    </div>
  );
}
