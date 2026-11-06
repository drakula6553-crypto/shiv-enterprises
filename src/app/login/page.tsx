'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  HardHat,
  CheckCircle2,
  Building2,
  Sparkles,
} from 'lucide-react';
import { signIn, getCurrentUser } from '@/lib/auth';
import ShivLogo from '@/components/ShivLogo';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('admin@shiventerprises.com');
  const [password, setPassword] = useState('Contractor#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, show hint
    const user = getCurrentUser();
    if (user && user.email) {
      setEmail(user.email);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await signIn(email, password);
      if (res.success) {
        setSuccessMessage(`Welcome back, ${res.user?.fullName || 'Partner'}! Redirecting...`);
        setTimeout(() => {
          router.push('/');
        }, 600);
      } else {
        setErrorMessage(res.error || 'Invalid credentials. Please verify your details.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@shiventerprises.com');
    setPassword('Contractor#2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#090D14] text-neutral-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-sm shadow-[0_2px_8px_rgba(245,158,11,0.25)]">
            SE
          </div>
          <div>
            <span className="font-semibold text-sm tracking-wide text-white block">
              Shiv Enterprises
            </span>
            <span className="text-[11px] text-neutral-400 block -mt-0.5">
              Civil Contractors • Borivali (W)
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>Return to Dashboard</span>
          <ArrowRight size={13} />
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Architectural Branding / Value Props (Desktop) */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Civil Contractor Internal Operations</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
                Enterprise billing & site finances, crafted for contractors.
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Sign in to manage GST tax invoices on physical A4 letterheads, track sub-contractor debit/credit ledgers, and audit site material purchases.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="w-7 h-7 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Building2 size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Harshmaan Spaces & Builder Presets</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Generate authentic typewriter A4 letterhead bills with 1-click builder templates.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Subcontractor Ledgers & GST Tracking</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Real-time payment balances, RTGS/NEFT receipts, and automatic round-off math.
                  </p>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>End-to-end encrypted session • Offline storage supported</span>
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
                  Enter your contractor account credentials
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Success Alert */}
              {successMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@shiventerprises.com"
                      className="w-full pl-9 pr-3 h-10 rounded-lg bg-[#181D2A] border border-white/[0.1] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('For demo access, please use the "Quick Fill Demo Owner" button below.')}
                      className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 h-10 rounded-lg bg-[#181D2A] border border-white/[0.1] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
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
                      Remember this device
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs tracking-wide shadow-[0_2px_12px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
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

              {/* Quick Demo Fill Helper */}
              <div className="mt-5 pt-5 border-t border-white/[0.08] text-center">
                <p className="text-[11px] text-neutral-400 mb-2.5">
                  Testing as site owner or supervisor?
                </p>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="w-full h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-200 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Quick Fill Demo Owner Credentials</span>
                </button>
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
