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
  Receipt,
  Users,
  Search,
  IndianRupee,
  Building2,
  Paperclip,
} from 'lucide-react';
import { getCurrentUser, isUserAdmin, AuthUser, PARTNER_ACCOUNTS } from '@/lib/auth';
import {
  getLoginLogs,
  getBillActivityLogs,
  getExpenseActivityLogs,
  getContractorActivityLogs,
  LoginLog,
  BillActivityLog,
  ExpenseActivityLog,
  ContractorActivityLog,
} from '@/lib/tracking';
import { formatINR } from '@/lib/utils';

export default function AdminTrackingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [billLogs, setBillLogs] = useState<BillActivityLog[]>([]);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseActivityLog[]>([]);
  const [contractorLogs, setContractorLogs] = useState<ContractorActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'bills' | 'expenses' | 'contractors' | 'logins'>('bills');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lLogs, bLogs, eLogs, cLogs] = await Promise.all([
        getLoginLogs(),
        getBillActivityLogs(),
        getExpenseActivityLogs(),
        getContractorActivityLogs(),
      ]);
      setLoginLogs(lLogs);
      setBillLogs(bLogs);
      setExpenseLogs(eLogs);
      setContractorLogs(cLogs);
      setLastRefreshed(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
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

  // Universal Partner match helper
  const matchesPartner = (username: string) => {
    if (selectedPartnerFilter === 'all') return true;
    return username.toLowerCase() === selectedPartnerFilter.toLowerCase();
  };

  // Filter bills
  const filteredBillLogs = billLogs.filter((b) => {
    if (!matchesPartner(b.createdByUsername)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.invoiceNumber.toLowerCase().includes(q) ||
      b.clientName.toLowerCase().includes(q) ||
      b.createdByName.toLowerCase().includes(q) ||
      b.action.toLowerCase().includes(q)
    );
  });

  // Filter expenses
  const filteredExpenseLogs = expenseLogs.filter((e) => {
    if (!matchesPartner(e.createdByUsername)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.paidTo.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.projectName.toLowerCase().includes(q) ||
      (e.billNumber && e.billNumber.toLowerCase().includes(q)) ||
      e.createdByName.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q)
    );
  });

  // Filter contractors
  const filteredContractorLogs = contractorLogs.filter((c) => {
    if (!matchesPartner(c.createdByUsername)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.contractorName.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.createdByName.toLowerCase().includes(q) ||
      c.action.toLowerCase().includes(q)
    );
  });

  // Filter logins
  const filteredLoginLogs = loginLogs.filter((l) => {
    if (!matchesPartner(l.username)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.username.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.deviceInfo.toLowerCase().includes(q)
    );
  });

  // KPI Calculations
  const totalBillAmount = billLogs.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalExpenseAmount = expenseLogs.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalContractorAmount = contractorLogs.reduce((sum, c) => sum + (c.amount || 0), 0);

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `shiv_enterprises_audit_${activeTab}_${Date.now()}.csv`;

    if (activeTab === 'bills') {
      headers = ['Bill Number', 'Client Name', 'Action', 'Grand Total', 'Created By', 'Username', 'Role', 'Date & Time'];
      rows = filteredBillLogs.map((b) => [
        `"${b.invoiceNumber}"`,
        `"${b.clientName}"`,
        `"${b.action}"`,
        `"${b.grandTotal}"`,
        `"${b.createdByName}"`,
        `"${b.createdByUsername}"`,
        `"${b.createdByRole}"`,
        `"${new Date(b.createdAtTime).toLocaleString('en-IN')}"`,
      ]);
    } else if (activeTab === 'expenses') {
      headers = ['Paid To', 'Category', 'Site / Project', 'Amount (Rs)', 'Bill #', 'Action', 'Recorded By', 'Username', 'Role', 'Date & Time'];
      rows = filteredExpenseLogs.map((e) => [
        `"${e.paidTo}"`,
        `"${e.category}"`,
        `"${e.projectName}"`,
        `"${e.amount}"`,
        `"${e.billNumber || ''}"`,
        `"${e.action}"`,
        `"${e.createdByName}"`,
        `"${e.createdByUsername}"`,
        `"${e.createdByRole}"`,
        `"${new Date(e.createdAtTime).toLocaleString('en-IN')}"`,
      ]);
    } else if (activeTab === 'contractors') {
      headers = ['Contractor Name', 'Trade', 'Action', 'Amount (Rs)', 'Description', 'Recorded By', 'Username', 'Role', 'Date & Time'];
      rows = filteredContractorLogs.map((c) => [
        `"${c.contractorName}"`,
        `"${c.category}"`,
        `"${c.action}"`,
        `"${c.amount || 0}"`,
        `"${c.description.replace(/"/g, '""')}"`,
        `"${c.createdByName}"`,
        `"${c.createdByUsername}"`,
        `"${c.createdByRole}"`,
        `"${new Date(c.createdAtTime).toLocaleString('en-IN')}"`,
      ]);
    } else {
      headers = ['Username', 'Partner Name', 'Role', 'Login Timestamp', 'Device / OS', 'Status'];
      rows = filteredLoginLogs.map((l) => [
        `"${l.username}"`,
        `"${l.userName}"`,
        `"${l.role}"`,
        `"${new Date(l.loginAt).toLocaleString('en-IN')}"`,
        `"${l.deviceInfo}"`,
        `"${l.status}"`,
      ]);
    }

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Format action badge helper
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'created':
      case 'contractor_added':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Created</span>;
      case 'updated':
      case 'contractor_updated':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Updated</span>;
      case 'deleted':
      case 'contractor_deleted':
      case 'bill_deleted':
      case 'payment_deleted':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">Deleted</span>;
      case 'payment_recorded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">Payment</span>;
      case 'bill_recorded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">Work Bill</span>;
      case 'receipt_uploaded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800">Receipt Photo/PDF</span>;
      case 'downloaded_pdf':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">PDF Download</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700">{action}</span>;
    }
  };

  // Render Partner Chip helper
  const renderPartnerPill = (username: string, fullName: string, role: string) => {
    const isHarsh = username.toLowerCase() === 'harsh16';
    const isGirish = username.toLowerCase() === 'girish1';

    return (
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
            isHarsh
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : isGirish
              ? 'bg-blue-100 text-blue-800 border border-blue-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          {isHarsh ? 'HP' : isGirish ? 'G' : 'K'}
        </div>
        <div>
          <span className="font-semibold text-neutral-900 block leading-tight">{fullName}</span>
          <span className="text-[10px] text-neutral-400 font-mono block">
            @{username} • {role}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-[#0B0F17] text-white rounded-2xl p-6 sm:p-8 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <ShieldCheck size={14} className="text-amber-400" />
              <span>ADMIN COMPLETE OPERATIONS AUDIT TRAIL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Operations &amp; Activity Tracking
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Complete live tracking of who created or modified client bills, recorded purchase expenses, attached bill photos/PDFs, managed subcontractor ledgers, and signed in.
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
              <span>Export {activeTab.toUpperCase()} CSV</span>
            </button>
          </div>
        </div>

        {/* Current Active Partner Status Pill */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Signed in as:</span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              {currentUser?.fullName || 'Harsh (Admin)'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Admin / Managing Partner
            </span>
          </div>

          <div className="text-neutral-400 text-[11px] font-mono">
            Last synced: <span className="text-neutral-200">{lastRefreshed || 'Just now'}</span> • Supabase Cloud (ap-south-1)
          </div>
        </div>
      </div>

      {/* KPI Stats Row: 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bills */}
        <div
          onClick={() => setActiveTab('bills')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'bills'
              ? 'bg-amber-50/70 border-amber-300 shadow-sm'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span className="font-medium">Client Bills Tracked</span>
            <FileText size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {billLogs.length}
          </div>
          <p className="text-[11px] text-neutral-600 mt-1 font-mono">
            Total: {formatINR(totalBillAmount)}
          </p>
        </div>

        {/* Expenses */}
        <div
          onClick={() => setActiveTab('expenses')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'expenses'
              ? 'bg-amber-50/70 border-amber-300 shadow-sm'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span className="font-medium">Purchases &amp; Expenses</span>
            <Receipt size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {expenseLogs.length}
          </div>
          <p className="text-[11px] text-neutral-600 mt-1 font-mono">
            Outflow: {formatINR(totalExpenseAmount)}
          </p>
        </div>

        {/* Contractors */}
        <div
          onClick={() => setActiveTab('contractors')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'contractors'
              ? 'bg-amber-50/70 border-amber-300 shadow-sm'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span className="font-medium">Contractor Activities</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {contractorLogs.length}
          </div>
          <p className="text-[11px] text-neutral-600 mt-1 font-mono">
            Transacted: {formatINR(totalContractorAmount)}
          </p>
        </div>

        {/* Logins */}
        <div
          onClick={() => setActiveTab('logins')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'logins'
              ? 'bg-amber-50/70 border-amber-300 shadow-sm'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span className="font-medium">Partner Sessions</span>
            <LogIn size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {loginLogs.length}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Harsh16, girish1, kishor2</p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main 4 Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 rounded-lg">
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'bills'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <FileText size={14} className={activeTab === 'bills' ? 'text-amber-600' : 'text-neutral-400'} />
              <span>Bills Audit ({filteredBillLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Receipt size={14} className={activeTab === 'expenses' ? 'text-emerald-600' : 'text-neutral-400'} />
              <span>Expenses Audit ({filteredExpenseLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('contractors')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'contractors'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Users size={14} className={activeTab === 'contractors' ? 'text-blue-600' : 'text-neutral-400'} />
              <span>Contractor Audit ({filteredContractorLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logins')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'logins'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LogIn size={14} className={activeTab === 'logins' ? 'text-purple-600' : 'text-neutral-400'} />
              <span>Login History ({filteredLoginLogs.length})</span>
            </button>
          </div>

          {/* Partner & Search Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search size={13} className="text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit records..."
                className="h-8 pl-8 pr-2.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-neutral-400" />
              <select
                value={selectedPartnerFilter}
                onChange={(e) => setSelectedPartnerFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Partners</option>
                <option value="harsh16">Harsh (Admin) • Harsh16</option>
                <option value="girish1">Girish (Partner) • girish1</option>
                <option value="kishor2">Kishor (Partner) • kishor2</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Tab */}

      {/* TAB 1: BILLS AUDIT */}
      {activeTab === 'bills' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Bill Creation, Payment &amp; Export Audit Log
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tracks who created, edited, deleted, collected payments on, or downloaded client tax invoices.
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
              <p className="text-sm font-medium text-neutral-700">No bill logs match current filters</p>
              <p className="text-xs text-neutral-500 mt-1">
                Bills created by Girish, Kishor, or Harsh will appear here automatically with timestamps.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Exact Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredBillLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                        {log.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-800 block">
                          {log.clientName}
                        </span>
                        {log.notes && (
                          <span className="text-[10px] text-neutral-500 font-mono block">
                            {log.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 tabular-nums">
                        {formatINR(log.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderPartnerPill(log.createdByUsername, log.createdByName, log.createdByRole)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPENSES AUDIT */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Purchases &amp; Site Outflows Audit Log
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tracks who recorded materials, machinery, labour, tea/food vouchers, or uploaded bill photos/PDF receipts.
              </p>
            </div>
            <Link
              href="/expenses"
              className="text-xs text-amber-700 font-semibold hover:text-amber-800 flex items-center gap-1"
            >
              <span>Manage purchases</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {filteredExpenseLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-700">No purchase activity recorded yet</p>
              <p className="text-xs text-neutral-500 mt-1">
                Any voucher recorded or bill receipt attached by partners will be logged here with exact timestamps.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Paid To / Supplier</th>
                    <th className="py-3 px-4">Category &amp; Site</th>
                    <th className="py-3 px-4">Bill #</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Exact Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredExpenseLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">
                        {log.paidTo}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-neutral-800 block">
                          {log.category}
                        </span>
                        <span className="text-[10px] text-neutral-500 block truncate max-w-xs">
                          Site: {log.projectName || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-600">
                        {log.billNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 tabular-nums">
                        {formatINR(log.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderPartnerPill(log.createdByUsername, log.createdByName, log.createdByRole)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONTRACTORS AUDIT */}
      {activeTab === 'contractors' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Subcontractors &amp; Labour Ledgers Audit Log
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tracks who added contractors, recorded measurement work bills, or released labour payments.
              </p>
            </div>
            <Link
              href="/contractors"
              className="text-xs text-amber-700 font-semibold hover:text-amber-800 flex items-center gap-1"
            >
              <span>View subcontractor ledgers</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {filteredContractorLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-700">No contractor activity recorded yet</p>
              <p className="text-xs text-neutral-500 mt-1">
                When partners add subcontractors or record bills/payments, they will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Contractor</th>
                    <th className="py-3 px-4">Trade</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Exact Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredContractorLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">
                        {log.contractorName}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-700">
                        {log.category}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 tabular-nums">
                        {log.amount > 0 ? formatINR(log.amount) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 max-w-xs truncate">
                        {log.description || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderPartnerPill(log.createdByUsername, log.createdByName, log.createdByRole)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LOGINS AUDIT */}
      {activeTab === 'logins' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200">
            <h2 className="text-sm font-bold text-neutral-900">
              Partner Session &amp; Login History
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
                    <th className="py-3 px-4">Login Date &amp; Time</th>
                    <th className="py-3 px-4">Device / Platform</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLoginLogs.map((log) => {
                    const isHarsh = log.username.toLowerCase() === 'harsh16';
                    const isGirish = log.username.toLowerCase() === 'girish1';

                    return (
                      <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isHarsh
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : isGirish
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
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
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              isHarsh
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                            }`}
                          >
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
