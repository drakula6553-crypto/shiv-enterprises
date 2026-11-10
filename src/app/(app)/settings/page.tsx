'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Phone,
  Mail,
  FileText,
  Landmark,
  QrCode,
  PenTool,
  Upload,
  Check,
  Trash2,
  Download,
  RotateCcw,
  Cloud,
  CloudUpload,
  CloudDownload,
  Database,
  ExternalLink,
} from 'lucide-react';
import {
  getCompanyProfile,
  saveCompanyProfile,
  exportAllData,
  importAllData,
  seedSampleData,
  clearAllData,
} from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { pushAllToSupabase, pullAllFromSupabase } from '@/lib/supabaseSync';
import { readFileAsDataURL } from '@/lib/utils';
import type { CompanyProfile } from '@/lib/types';
import ShivLogo from '@/components/ShivLogo';

export default function SettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handlePushSupabase = async () => {
    setSyncLoading(true);
    setSyncStatusMsg('Pushing local data to Supabase Cloud...');
    const res = await pushAllToSupabase();
    setSyncStatusMsg(res.message);
    setSyncLoading(false);
    setTimeout(() => setSyncStatusMsg(null), 5000);
  };

  const handlePullSupabase = async () => {
    setSyncLoading(true);
    setSyncStatusMsg('Pulling cloud data from Supabase...');
    const res = await pullAllFromSupabase();
    setSyncStatusMsg(res.message);
    setSyncLoading(false);
    if (res.success) {
      setProfile(getCompanyProfile());
    }
    setTimeout(() => setSyncStatusMsg(null), 5000);
  };

  useEffect(() => {
    setProfile(getCompanyProfile());
  }, []);

  if (!profile) {
    return (
      <div className="p-6 text-center text-neutral-500 text-xs">
        Loading settings...
      </div>
    );
  }

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setProfile((prev) => (prev ? { ...prev, logoUrl: dataUrl } : prev));
    } catch (err) {
      alert('Failed to read logo file');
    }
  };

  const handleSignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setProfile((prev) => (prev ? { ...prev, signatureUrl: dataUrl } : prev));
    } catch (err) {
      alert('Failed to read signature file');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    saveCompanyProfile(profile);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleExportData = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shiv_enterprises_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importAllData(content)) {
        setProfile(getCompanyProfile());
        alert('Data backup imported successfully');
      } else {
        alert('Invalid backup file format');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSampleData = () => {
    if (confirm('Reload sample contractor records matching your real letterhead?')) {
      seedSampleData();
      setProfile(getCompanyProfile());
      alert('Sample data reloaded with letterhead details');
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear ALL stored invoices, contractors and profile? This cannot be undone.')) {
      clearAllData();
      setProfile(getCompanyProfile());
      alert('All local data cleared');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-28 md:pb-12">
      {/* Toast Alert */}
      {savedToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-neutral-700 text-xs font-medium">
          <Check size={16} className="text-emerald-400" />
          <span>Profile saved successfully</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 tracking-tight">
          Company profile & settings
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Details appear on your official tax invoice letterhead and contractor statements
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Details */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Building2 size={16} className="text-neutral-500" />
            <h2 className="font-semibold text-neutral-900 text-xs">
              Business & letterhead details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Company name *
              </label>
              <input
                type="text"
                required
                value={profile.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="e.g. SHIV ENTERPRISES"
                className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-neutral-900 font-medium text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Business title / Subtitle *
              </label>
              <input
                type="text"
                value={profile.businessType || ''}
                onChange={(e) => handleChange('businessType', e.target.value)}
                placeholder="e.g. CIVIL CONTRACTORS"
                className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Tagline (under logo)
            </label>
            <input
              type="text"
              value={profile.tagline || ''}
              onChange={(e) => handleChange('tagline', e.target.value)}
              placeholder="e.g. Enduring Structure for Generations"
              className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Office / Registered address
            </label>
            <textarea
              rows={2}
              value={profile.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="K-303, Guru Residency, Dharamdas Road, Borivali (W), Mumbai - 400 092."
              className="w-full p-2.5 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Contact phone number *
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  required
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98692 18032"
                  className="w-full pl-8 pr-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="shiv3enterprises@gmail.com"
                  className="w-full pl-8 pr-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                value={profile.gstin}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                placeholder="27ACQFS7564P1ZW"
                className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 font-mono text-xs uppercase focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                PAN number
              </label>
              <input
                type="text"
                value={profile.panNo || ''}
                onChange={(e) => handleChange('panNo', e.target.value.toUpperCase())}
                placeholder="ACQFS7564P"
                className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 font-mono text-xs uppercase focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Signatory title
              </label>
              <input
                type="text"
                value={profile.signatoryTitle || ''}
                onChange={(e) => handleChange('signatoryTitle', e.target.value.toUpperCase())}
                placeholder="PARTNER"
                className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs uppercase focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Bank & Payment Details */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Landmark size={16} className="text-neutral-500" />
            <h2 className="font-semibold text-neutral-900 text-xs">
              Bank details (for client payments)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Bank name
              </label>
              <input
                type="text"
                value={profile.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Account number
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={profile.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                placeholder="e.g. 50200088192341"
                className="w-full px-3 h-9 rounded-lg border border-neutral-300 font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                IFSC code
              </label>
              <input
                type="text"
                value={profile.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0000290"
                className="w-full px-3 h-9 rounded-lg border border-neutral-300 font-mono text-neutral-900 text-xs uppercase focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={profile.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
                placeholder="e.g. Borivali (West), Mumbai"
                className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              UPI ID
            </label>
            <div className="relative">
              <QrCode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={profile.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="e.g. 9869218032@upi"
                className="w-full pl-8 pr-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Logo & Signature */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <PenTool size={16} className="text-neutral-500" />
            <h2 className="font-semibold text-neutral-900 text-xs">
              Custom logo & signature
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Header logo
              </label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {profile.logoUrl ? (
                <div className="border border-neutral-200 rounded-lg p-3 flex flex-col items-center justify-center bg-neutral-50">
                  <img
                    src={profile.logoUrl}
                    alt="Logo preview"
                    className="max-h-20 max-w-full object-contain mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="text-xs bg-neutral-900 text-white px-2.5 h-7 rounded font-medium nav-transition"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfile((p) => (p ? { ...p, logoUrl: null } : p))}
                      className="text-xs bg-neutral-200 text-neutral-700 px-2.5 h-7 rounded font-medium nav-transition"
                    >
                      Default 3D towers
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-neutral-300 rounded-lg p-3 flex flex-col items-center justify-center bg-neutral-50">
                  <div className="mb-2">
                    <ShivLogo />
                  </div>
                  <p className="text-[11px] text-neutral-500 mb-2 text-center">
                    Using default Shiv Enterprises 3D building logo
                  </p>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-xs bg-neutral-900 text-white px-3 h-8 rounded-lg font-medium nav-transition flex items-center gap-1.5"
                  >
                    <Upload size={14} /> Upload custom logo
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Authorised signature / Rubber stamp
              </label>
              <input
                ref={signInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignUpload}
                className="hidden"
              />
              {profile.signatureUrl ? (
                <div className="border border-neutral-200 rounded-lg p-3 flex flex-col items-center justify-center bg-neutral-50">
                  <img
                    src={profile.signatureUrl}
                    alt="Signature preview"
                    className="max-h-20 max-w-full object-contain mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => signInputRef.current?.click()}
                      className="text-xs bg-neutral-900 text-white px-2.5 h-7 rounded font-medium nav-transition"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfile((p) => (p ? { ...p, signatureUrl: null } : p))}
                      className="text-xs bg-neutral-200 text-neutral-700 px-2.5 h-7 rounded font-medium nav-transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => signInputRef.current?.click()}
                  className="w-full border border-dashed border-neutral-300 rounded-lg p-5 flex flex-col items-center justify-center hover:border-neutral-400 bg-neutral-50 nav-transition"
                >
                  <PenTool size={18} className="text-neutral-400 mb-1" />
                  <span className="text-xs font-medium text-neutral-900">Upload signature or stamp</span>
                  <span className="text-[11px] text-neutral-400">Transparent PNG recommended</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-3">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
            <FileText size={16} className="text-neutral-500" />
            <h2 className="font-semibold text-neutral-900 text-xs">
              Terms & conditions
            </h2>
          </div>

          <textarea
            rows={3}
            value={profile.termsAndConditions}
            onChange={(e) => handleChange('termsAndConditions', e.target.value)}
            placeholder="e.g. 1. Payment due within 15 days. 2. Work certified as per sanctioned drawings."
            className="w-full p-2.5 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
          />
        </div>

        {/* Save button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-medium h-11 px-6 rounded-xl text-xs nav-transition action-press flex items-center justify-center gap-2 shadow-xs"
          >
            <Check size={16} className="text-white" />
            <span>Save company profile</span>
          </button>
        </div>
      </form>

      {/* Supabase Cloud Database & Sync */}
      <div className="mt-8 bg-white rounded-xl p-4 sm:p-5 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Cloud size={16} className="text-[#0284C7]" />
            <h2 className="font-semibold text-slate-900 text-xs">
              Supabase Cloud Database & Multi-Device Sync
            </h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono ${
              isSupabaseConfigured
                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-600' : 'bg-slate-400'
              }`}
            />
            <span>{isSupabaseConfigured ? 'Connected' : 'Offline Storage Active'}</span>
          </span>
        </div>

        {syncStatusMsg && (
          <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-800 font-medium">
            {syncStatusMsg}
          </div>
        )}

        {isSupabaseConfigured ? (
          <div className="space-y-3">
            <p className="text-xs text-neutral-600">
              Your app is linked with Supabase PostgreSQL cloud database. Data syncs across your phone, tablet, and desktop in real-time.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handlePushSupabase}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 h-10 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-medium nav-transition action-press shadow-xs"
              >
                <CloudUpload size={14} className="text-white" />
                <span>{syncLoading ? 'Syncing...' : 'Push Local Data to Cloud'}</span>
              </button>
              <button
                type="button"
                onClick={handlePullSupabase}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 h-10 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-medium nav-transition action-press shadow-xs"
              >
                <CloudDownload size={14} />
                <span>Pull Cloud Data to Device</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Currently running in high-speed local offline mode. To sync bills, payments, and expenses between your mobile phone and laptop, connect your free Supabase project.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
              <p className="text-slate-500 font-sans text-[11px] font-medium uppercase tracking-wider">
                Configuration instructions:
              </p>
              <p className="text-slate-700">1. Create a free project at <span className="text-[#0284C7] underline">supabase.com</span></p>
              <p className="text-neutral-700">2. Run the provided <span className="text-neutral-900 font-bold">supabase-schema.sql</span> script in Supabase SQL Editor</p>
              <p className="text-neutral-700">3. Set <span className="text-neutral-900 font-bold">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="text-neutral-900 font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> in <span className="text-neutral-900 font-bold">.env.local</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Backup & Demo Controls */}
      <div className="mt-8 bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Download size={16} className="text-neutral-500" />
          <h2 className="font-semibold text-neutral-900 text-xs">
            Backup & restore controls
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 h-10 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 nav-transition action-press"
          >
            <Download size={15} /> Export backup (JSON)
          </button>

          <label className="flex items-center justify-center gap-2 h-10 bg-white text-neutral-800 rounded-lg text-xs font-medium hover:bg-neutral-50 border border-neutral-300 nav-transition action-press cursor-pointer">
            <Upload size={15} /> Restore backup file
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleResetSampleData}
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg nav-transition"
          >
            <RotateCcw size={13} /> Reload sample letterhead records
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg nav-transition ml-auto"
          >
            <Trash2 size={13} /> Clear all local data
          </button>
        </div>
      </div>
    </div>
  );
}
