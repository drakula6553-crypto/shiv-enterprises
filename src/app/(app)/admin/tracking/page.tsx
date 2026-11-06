'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  User,
  Clock,
  FileText,
  LogIn,
  Crown,
  HardHat,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Laptop,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { getCurrentUser, isUserAdmin, AuthUser, PARTNER_ACCOUNTS } from '@/lib/auth';
import {
  getLoginLogs,
  getBillActivityLogs,
  LoginLog,
  BillActivityLog,
} from '@/lib/tracking';
import { formatINR } from '@/lib/utils';

export default function AdminTrackingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [billLogs, setBillLogs] = useState<BillActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'bills' | 'logins'>('bills');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lLogs, bLogs] = await Promise.all([
        getLoginLogs(),
        getBillActivityLogs(),
      ]);
      setLoginLogs(lLogs);
      setBillLogs(bLogs);
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Error loading tracking data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isUserAdmin(user)) {
      router.replace('/');
      return;
    }
    setCurrentUser(user);
    loadData();
  }, [router]);

  // Filter bills
  const filteredBillLogs = billLogs.filter((b) => {
    if (selectedPartnerFilter === 'all') return true;
    return b.createdByUsername.toLowerCase() === selectedPartnerFilter.toLowerCase();
  });

  // Filter logins
  const filteredLoginLogs = loginLogs.filter((l) => {
    if (selectedPartnerFilter === 'all') return true;
    return l.username.toLowerCase() === selectedPartnerFilter.toLowerCase();
  });

  const exportCSV = () => {
    if (activeTab === 'bills') {
      const headers = ['Bill Number', 'Client Name', 'Grand Total', 'Created By', 'Username', 'Role', 'Date & Time'];
      const rows = filteredBillLogs.map((b) => [
        `"${b.invoiceNumber}"`,
        `"${b.clientName}"`,
        `"${b.grandTotal}"`,
        `"${b.createdByName}"`,
        `"${b.createdByUsername}"`,
        `"${b.createdByRole}"`,
        `"${new Date(b.createdAtTime).toLocaleString('en-IN')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shiv_enterprises_bills_audit_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Username', 'Partner Name', 'Role', 'Login Timestamp', 'Device / OS', 'Status'];
      const rows = filteredLoginLogs.map((l) => [
        `"${l.username}"`,
        `"${l.userName}"`,
        `"${l.role}"`,
        `"${new Date(l.loginAt).toLocaleString('en-IN')}"`,
        `"${l.deviceInfo}"`,
        `"${l.status}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shiv_enterprises_logins_audit_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isAdmin = isUserAdmin(currentUser);

  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-24 p-6 bg-white rounded-2xl border border-neutral-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldCheck size={24} />
        </div>
        <h2 className="text-base font-bold text-neutral-900">Admin Authority Required</h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          The Activity Audit & Tracking portal is strictly restricted to Admin (Harsh16). Regular partners do not have access to this section.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 h-9 rounded-lg bg-[#0B0F17] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-[#0B0F17] text-white rounded-2xl p-6 sm:p-8 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <ShieldCheck size={14} className="text-amber-400" />
              <span>ADMIN & PARTNER AUDIT TRAIL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Operations & Activity Tracking
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Transparent live log of partner sessions, exact bill creation timestamps, and site operations backed by Supabase Cloud.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:self-start">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-neutral-200 transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-amber-400' : 'text-neutral-400'} />
              <span>Refresh</span>
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-[0_2px_10px_rgba(245,158,11,0.25)] transition-all"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Current Active Partner Status Pill */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Signed in as:</span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              {isAdmin ? <Crown size={14} className="text-amber-400" /> : <HardHat size={14} className="text-blue-400" />}
              {currentUser?.fullName || 'Partner'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider ${
              isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {currentUser?.roleTitle || (isAdmin ? 'Admin' : 'Partner')}
            </span>
          </div>

          <div className="text-neutral-400 text-[11px] font-mono">
            Last synced: <span className="text-neutral-200">{lastRefreshed || 'Just now'}</span> • Supabase Cloud (Mumbai)
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Total Bills Tracked</span>
            <FileText size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {billLogs.length}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Logged with exact creator & time</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Partner Sign-ins</span>
            <LogIn size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums">
            {loginLogs.length}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Recorded logins & device audits</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Authorized Partners</span>
            <User size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            3
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Harsh16, girish1, kishor2</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Cloud Database</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-emerald-700 mt-1">
            Connected (Live)
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Supabase ap-south-1</p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg max-w-fit">
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'bills'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <FileText size={14} className={activeTab === 'bills' ? 'text-amber-600' : 'text-neutral-400'} />
              <span>Bill Creation Audit ({filteredBillLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logins')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'logins'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LogIn size={14} className={activeTab === 'logins' ? 'text-emerald-600' : 'text-neutral-400'} />
              <span>Login History ({filteredLoginLogs.length})</span>
            </button>
          </div>

          {/* Partner Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-neutral-400" />
            <span className="text-xs text-neutral-500 font-medium">Filter Partner:</span>
            <select
              value={selectedPartnerFilter}
              onChange={(e) => setSelectedPartnerFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Partners (Everyone)</option>
              <option value="harsh16">Harsh (Admin) • Harsh16</option>
              <option value="girish1">Girish (Partner) • girish1</option>
              <option value="kishor2">Kishor (Partner) • kishor2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      {activeTab === 'bills' ? (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Bill Creation & Modification Audit Log
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Every bill saved or updated is permanently recorded with partner name and exact date & time.
              </p>
            </div>
            <Link
              href="/new-bill"
              className="text-xs text-amber-700 font-semibold hover:text-amber-800 flex items-center gap-1"
            >
              <span>Create new bill</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {filteredBillLogs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-700">No bill logs found</p>
              <p className="text-xs text-neutral-500 mt-1">
                Bills created by Girish, Kishor, or Harsh will appear here automatically with timestamps.
              </p>
              <Link
                href="/new-bill"
                className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#0B0F17] text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
              >
                Create First Bill
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4">Client & Project</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Exact Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredBillLogs.map((log) => {
                    const isHarsh = log.createdByUsername.toLowerCase() === 'harsh16';
                    const isGirish = log.createdByUsername.toLowerCase() === 'girish1';
                    const isKishor = log.createdByUsername.toLowerCase() === 'kishor2';

                    return (
                      <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                          {log.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-neutral-800 block">
                            {log.clientName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-neutral-900 tabular-nums">
                          {formatINR(log.grandTotal)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isHarsh
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isGirish
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              {isHarsh ? 'HP' : isGirish ? 'G' : 'K'}
                            </div>
                            <div>
                              <span className="font-semibold text-neutral-900 block">
                                {log.createdByName}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono block">
                                @{log.createdByUsername} • {log.createdByRole}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.action === 'created'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-600 text-[11px]">
                          {new Date(log.createdAtTime).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200">
            <h2 className="text-sm font-bold text-neutral-900">
              Partner Session & Login History
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tracks every partner login session with device, exact timestamp, and authentication status.
            </p>
          </div>

          {filteredLoginLogs.length === 0 ? (
            <div className="p-12 text-center">
              <LogIn size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-700">No login logs recorded yet</p>
              <p className="text-xs text-neutral-500 mt-1">
                When partners sign in with their credentials, sessions will be logged here in real time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Role Access</th>
                    <th className="py-3 px-4">Login Date & Time</th>
                    <th className="py-3 px-4">Device / Platform</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLoginLogs.map((log) => {
                    const isHarsh = log.username.toLowerCase() === 'harsh16';
                    const isGirish = log.username.toLowerCase() === 'girish1';
                    const isKishor = log.username.toLowerCase() === 'kishor2';

                    return (
                      <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              isHarsh
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isGirish
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              {isHarsh ? 'HP' : isGirish ? 'G' : 'K'}
                            </div>
                            <div>
                              <span className="font-semibold text-neutral-900 block">
                                {log.userName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-neutral-700">
                          {log.username}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            isHarsh
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}>
                            {isHarsh ? <Crown size={11} className="text-amber-600" /> : <HardHat size={11} className="text-neutral-500" />}
                            {log.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-700">
                          {new Date(log.loginAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600 font-mono text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Laptop size={13} className="text-neutral-400" />
                            {log.deviceInfo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Authenticated</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
