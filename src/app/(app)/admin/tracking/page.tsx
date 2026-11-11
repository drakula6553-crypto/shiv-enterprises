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
  Radio,
  Activity,
  Eye,
  Zap,
  Globe,
  Monitor,
  Smartphone,
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
import {
  getLiveUsersPresence,
  getLiveActivityStream,
  sendUserHeartbeat,
  UserPresence,
  LiveActivityItem,
} from '@/lib/livePresence';
import { formatINR } from '@/lib/utils';

function formatLastSeen(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago (${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`;
    }
    if (diffHours > 0) return `${diffHours}h ago`;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  } catch {
    return 'Offline';
  }
}

export default function AdminTrackingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [billLogs, setBillLogs] = useState<BillActivityLog[]>([]);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseActivityLog[]>([]);
  const [contractorLogs, setContractorLogs] = useState<ContractorActivityLog[]>([]);
  const [liveUsers, setLiveUsers] = useState<UserPresence[]>([]);
  const [activityStream, setActivityStream] = useState<LiveActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'live' | 'bills' | 'expenses' | 'contractors' | 'logins'>('live');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lLogs, bLogs, eLogs, cLogs, presence, stream] = await Promise.all([
        getLoginLogs(),
        getBillActivityLogs(),
        getExpenseActivityLogs(),
        getContractorActivityLogs(),
        getLiveUsersPresence(),
        getLiveActivityStream(),
      ]);
      setLoginLogs(lLogs);
      setBillLogs(bLogs);
      setExpenseLogs(eLogs);
      setContractorLogs(cLogs);
      setLiveUsers(presence);
      setActivityStream(stream);
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
    sendUserHeartbeat('/admin/tracking', 'Operations & Activity Tracking');
  }, [router]);

  // Real-time polling every 5 seconds for live presence
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      try {
        const [presence, stream] = await Promise.all([
          getLiveUsersPresence(),
          getLiveActivityStream(),
        ]);
        setLiveUsers(presence);
        setActivityStream(stream);
      } catch (err) {
        console.warn('Silent live presence refresh failed:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Universal Partner match helper
  const matchesPartner = (username: string) => {
    if (selectedPartnerFilter === 'all') return true;
    return username.toLowerCase() === selectedPartnerFilter.toLowerCase();
  };

  // Filter live users
  const filteredLiveUsers = liveUsers.filter((u) => {
    if (!matchesPartner(u.username)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.userName.toLowerCase().includes(q) ||
      u.currentPageTitle.toLowerCase().includes(q) ||
      u.deviceInfo.toLowerCase().includes(q)
    );
  });

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
  const onlineCount = liveUsers.filter((u) => u.isOnline).length;
  const totalBillAmount = billLogs.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalExpenseAmount = expenseLogs.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalContractorAmount = contractorLogs.reduce((sum, c) => sum + (c.amount || 0), 0);

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `shiv_enterprises_audit_${activeTab}_${Date.now()}.csv`;

    if (activeTab === 'live') {
      headers = ['Username', 'Partner Name', 'Role', 'Status', 'Current Screen', 'Path', 'Device / OS', 'Last Heartbeat'];
      rows = filteredLiveUsers.map((u) => [
        `"${u.username}"`,
        `"${u.userName}"`,
        `"${u.role}"`,
        `"${u.status.toUpperCase()}"`,
        `"${u.currentPageTitle}"`,
        `"${u.currentPage}"`,
        `"${u.deviceInfo}"`,
        `"${new Date(u.lastActiveAt).toLocaleString('en-IN')}"`,
      ]);
    } else if (activeTab === 'bills') {
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
          The Activity Audit &amp; Tracking portal is strictly restricted to Admin (Harsh16). Regular partners do not have access to this section.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 h-9 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold shadow-xs transition-colors"
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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-200">Updated</span>;
      case 'deleted':
      case 'contractor_deleted':
      case 'bill_deleted':
      case 'payment_deleted':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">Deleted</span>;
      case 'payment_recorded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">Payment Recv</span>;
      case 'receipt_uploaded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">Bill Uploaded</span>;
      case 'downloaded_pdf':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800">PDF Export</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700">{action}</span>;
    }
  };

  const renderPartnerPill = (username: string, name: string, role: string) => {
    const isHarsh = username.toLowerCase() === 'harsh16';
    const isGirish = username.toLowerCase() === 'girish1';

    return (
      <div className="flex items-center gap-1.5">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            isHarsh
              ? 'bg-[#0A192F] text-white shadow-2xs'
              : isGirish
              ? 'bg-blue-100 text-blue-800 border border-blue-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          {isHarsh ? 'HP' : isGirish ? 'G' : 'K'}
        </div>
        <div>
          <span className="font-semibold text-neutral-900 block leading-tight">{name}</span>
          <span className="text-[10px] text-neutral-400 font-mono block">@{username}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner with Titanium Blueprint Theme */}
      <div className="bg-[#0A192F] text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-mono tracking-wider font-semibold mb-3">
              <ShieldCheck size={14} className="text-[#38BDF8]" />
              <span>ADMIN COMPLETE OPERATIONS AUDIT TRAIL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Operations &amp; Activity Tracking
              {onlineCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  {onlineCount} Online
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Complete live tracking of active partners, active screens, client tax invoices, purchase expenses, contractor records, and authentication sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:self-start">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-xs font-medium text-slate-200 transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#38BDF8]' : 'text-slate-400'} />
              <span>Refresh</span>
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-xs font-medium shadow-xs transition-all"
            >
              <Download size={13} />
              <span>Export {activeTab.toUpperCase()} CSV</span>
            </button>
          </div>
        </div>

        {/* Current Active Partner Status Pill */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Signed in as:</span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#38BDF8]" />
              {currentUser?.fullName || 'Harsh (Admin)'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-sky-500/20 text-sky-200 border border-sky-500/30">
              Admin / Managing Partner
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Activity size={12} className="animate-pulse" />
              Real-time Heartbeat Active
            </span>
            <span>•</span>
            <span>Last synced: <strong className="text-slate-200">{lastRefreshed || 'Just now'}</strong></span>
            <span>•</span>
            <span>Supabase Cloud (ap-south-1)</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Row: 5 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Live Users Online */}
        <div
          onClick={() => setActiveTab('live')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'live'
              ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-400'
              : 'bg-white border-neutral-200 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Users Online
            </span>
            <Radio size={16} className="text-emerald-600 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums flex items-baseline gap-2">
            <span>{onlineCount}</span>
            <span className="text-xs font-semibold text-emerald-700">Online Now</span>
          </div>
          <p className="text-[11px] text-neutral-600 mt-1 truncate">
            {onlineCount > 0
              ? `${liveUsers.filter((u) => u.isOnline).map((u) => u.userName.split(' ')[0]).join(', ')} active`
              : 'No partners currently active'}
          </p>
        </div>

        {/* Card 2: Bills */}
        <div
          onClick={() => setActiveTab('bills')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'bills'
              ? 'bg-sky-50/70 border-[#0284C7] ring-1 ring-[#0284C7] shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium text-slate-700">Client Bills Tracked</span>
            <FileText size={16} className="text-[#0284C7]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {billLogs.length}
          </div>
          <p className="text-[11px] text-slate-600 mt-1 font-mono">
            Total: {formatINR(totalBillAmount)}
          </p>
        </div>

        {/* Card 3: Expenses */}
        <div
          onClick={() => setActiveTab('expenses')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'expenses'
              ? 'bg-sky-50/70 border-[#0284C7] ring-1 ring-[#0284C7] shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium text-slate-700">Purchases &amp; Expenses</span>
            <Receipt size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {expenseLogs.length}
          </div>
          <p className="text-[11px] text-slate-600 mt-1 font-mono">
            Outflow: {formatINR(totalExpenseAmount)}
          </p>
        </div>

        {/* Card 4: Contractors */}
        <div
          onClick={() => setActiveTab('contractors')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'contractors'
              ? 'bg-sky-50/70 border-[#0284C7] ring-1 ring-[#0284C7] shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium text-slate-700">Contractor Activities</span>
            <Users size={16} className="text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {contractorLogs.length}
          </div>
          <p className="text-[11px] text-slate-600 mt-1 font-mono">
            Transacted: {formatINR(totalContractorAmount)}
          </p>
        </div>

        {/* Card 5: Logins */}
        <div
          onClick={() => setActiveTab('logins')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            activeTab === 'logins'
              ? 'bg-sky-50/70 border-[#0284C7] ring-1 ring-[#0284C7] shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium text-slate-700">Partner Sessions</span>
            <LogIn size={16} className="text-[#0284C7]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {loginLogs.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Harsh16, girish1, kishor2</p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main 5 Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 rounded-lg">
            {/* Live Users Tab */}
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'live'
                  ? 'bg-white text-emerald-950 shadow-sm border border-emerald-200'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Radio size={14} className={activeTab === 'live' ? 'text-emerald-600' : 'text-neutral-400'} />
              <span>Live Users ({onlineCount} Online)</span>
            </button>

            {/* Bills Tab */}
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'bills'
                  ? 'bg-[#0A192F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={14} className={activeTab === 'bills' ? 'text-[#38BDF8]' : 'text-slate-400'} />
              <span>Bills Audit ({filteredBillLogs.length})</span>
            </button>

            {/* Expenses Tab */}
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-[#0A192F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt size={14} className={activeTab === 'expenses' ? 'text-emerald-400' : 'text-slate-400'} />
              <span>Expenses Audit ({filteredExpenseLogs.length})</span>
            </button>

            {/* Contractor Tab */}
            <button
              onClick={() => setActiveTab('contractors')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'contractors'
                  ? 'bg-[#0A192F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} className={activeTab === 'contractors' ? 'text-[#38BDF8]' : 'text-slate-400'} />
              <span>Contractor Audit ({filteredContractorLogs.length})</span>
            </button>

            {/* Logins Tab */}
            <button
              onClick={() => setActiveTab('logins')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'logins'
                  ? 'bg-[#0A192F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn size={14} className={activeTab === 'logins' ? 'text-[#38BDF8]' : 'text-slate-400'} />
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
                className="h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={selectedPartnerFilter}
                onChange={(e) => setSelectedPartnerFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:border-[#0284C7]"
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

      {/* ════════════════════════════════════════════════════════════
          TAB 0: LIVE USERS PRESENCE & REAL-TIME ACTIVITY
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Top Live Status Bar */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <h2 className="text-base font-bold text-neutral-900">
                    Live Partner Presence &amp; Real-Time Activity
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Heartbeat monitoring tracks every partner's current active screen, device, and connection status in real-time.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    autoRefresh
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <Activity size={13} className={autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-neutral-400'} />
                  <span>{autoRefresh ? 'Live Auto-Sync (5s)' : 'Paused'}</span>
                </button>

                <button
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  <span>Ping Now</span>
                </button>
              </div>
            </div>

            {/* Partner Presence Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {filteredLiveUsers.map((user) => {
                const isHarsh = user.username.toLowerCase() === 'harsh16';
                const isGirish = user.username.toLowerCase() === 'girish1';

                return (
                  <div
                    key={user.username}
                    className={`rounded-2xl p-5 border transition-all relative overflow-hidden ${
                      user.isOnline
                        ? 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                        : user.isIdle
                        ? 'bg-slate-50/70 border-slate-200 shadow-xs'
                        : 'bg-white border-slate-200/90 shadow-xs opacity-90'
                    }`}
                  >
                    {/* Top Status Banner */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm relative shadow-xs ${
                            isHarsh
                              ? 'bg-[#0A192F] text-white border border-slate-700'
                              : isGirish
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                              : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                          }`}
                        >
                          {isHarsh ? 'HP' : isGirish ? 'G' : 'K'}
                          {user.isOnline && (
                            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 text-sm">
                              {user.userName}
                            </h3>
                            {isHarsh && <ShieldCheck size={13} className="text-[#0284C7]" />}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            @{user.username}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div>
                        {user.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            ONLINE NOW
                          </span>
                        ) : user.isIdle ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-300">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            AWAY / IDLE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            OFFLINE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role Pill */}
                    <div className="mb-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isHarsh
                            ? 'bg-sky-50 text-sky-900 border border-sky-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="space-y-2.5 text-xs pt-3 border-t border-neutral-100">
                      {/* Current Active Screen */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-0.5">
                          Active Screen
                        </span>
                        <div className="flex items-center gap-1.5 text-neutral-900 font-semibold bg-neutral-50 p-2 rounded-lg border border-neutral-200/70">
                          <Eye size={13} className={user.isOnline ? 'text-emerald-600' : 'text-neutral-400'} />
                          <span className="truncate">{user.currentPageTitle}</span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 mt-0.5 px-1 truncate">
                          Path: {user.currentPage}
                        </div>
                      </div>

                      {/* Device / OS */}
                      <div className="flex justify-between items-center text-neutral-600 pt-1">
                        <span className="text-[11px] text-neutral-500">Device:</span>
                        <span className="font-medium text-neutral-800 text-[11px] truncate max-w-[180px]">
                          {user.deviceInfo}
                        </span>
                      </div>

                      {/* Last Heartbeat */}
                      <div className="flex justify-between items-center text-neutral-600">
                        <span className="text-[11px] text-neutral-500">Heartbeat:</span>
                        <span className={`font-mono text-[11px] font-semibold ${user.isOnline ? 'text-emerald-700' : 'text-neutral-600'}`}>
                          {user.isOnline
                            ? `Active now (${user.secondsAgo}s ago)`
                            : user.isIdle
                            ? `Idle (${Math.floor(user.secondsAgo / 60)}m ago)`
                            : formatLastSeen(user.lastActiveAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Live Activity Stream / Breadcrumbs */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap size={14} className="text-[#0284C7]" />
                  <span>Real-Time Activity &amp; Page Visit Stream</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Live breadcrumbs logged as partners navigate screens and execute operations.
                </p>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                {activityStream.length} event{activityStream.length === 1 ? '' : 's'} logged
              </span>
            </div>

            {activityStream.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                No recent activity breadcrumbs logged yet. As partners navigate, live events will appear here in real time.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto modal-scrollable pr-1">
                {activityStream.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/60 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-neutral-900">{item.userName}</span>
                      <span className="text-neutral-600 font-medium">{item.details}</span>
                      <span className="text-[10px] font-mono text-neutral-400 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                        {item.pagePath}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
                      <span>{item.deviceInfo}</span>
                      <span>
                        {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 1: BILLS AUDIT
      ════════════════════════════════════════════════════════════ */}
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
              className="text-xs text-[#0284C7] font-semibold hover:text-[#0369A1] flex items-center gap-1"
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
                          <span className="text-[11px] text-neutral-400 block truncate max-w-xs">
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

      {/* ════════════════════════════════════════════════════════════
          TAB 2: EXPENSES AUDIT
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Purchases, Site Expenses &amp; Receipt Uploads Audit
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tracks materials bought, equipment hired, fuel expenses, and attached bill photos/PDFs.
              </p>
            </div>
            <Link
              href="/expenses"
              className="text-xs text-[#0284C7] font-semibold hover:text-[#0369A1] flex items-center gap-1"
            >
              <span>View expenses</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {filteredExpenseLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-700">No expense logs match current filters</p>
              <p className="text-xs text-neutral-500 mt-1">
                Any voucher entered by partners will be logged with full details here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Paid To / Vendor</th>
                    <th className="py-3 px-4">Category &amp; Site</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Bill No</th>
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
                        <span className="font-medium text-neutral-800 block">{log.category}</span>
                        <span className="text-[11px] text-neutral-500 block">{log.projectName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 tabular-nums">
                        {formatINR(log.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-600">
                        {log.billNumber || '—'}
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

      {/* ════════════════════════════════════════════════════════════
          TAB 3: CONTRACTOR AUDIT
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'contractors' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Subcontractor &amp; Labour Ledger Audit Trail
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tracks subcontractor creation, trade bills recorded, and kharchi/cash payments.
              </p>
            </div>
            <Link
              href="/contractors"
              className="text-xs text-[#0284C7] font-semibold hover:text-[#0369A1] flex items-center gap-1"
            >
              <span>Manage contractors</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {filteredContractorLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-700">No contractor audit logs match filters</p>
              <p className="text-xs text-neutral-500 mt-1">
                When partners add sub-contractors, record trade bills, or release payments, they appear here.
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

      {/* ════════════════════════════════════════════════════════════
          TAB 4: LOGINS AUDIT
      ════════════════════════════════════════════════════════════ */}
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
                    <th className="py-3 px-4">Live Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLoginLogs.map((log) => {
                    const isHarsh = log.username.toLowerCase() === 'harsh16';
                    const isGirish = log.username.toLowerCase() === 'girish1';
                    const presence = liveUsers.find((u) => u.username.toLowerCase() === log.username.toLowerCase());
                    const isCurrentlyOnline = presence?.isOnline;

                    return (
                      <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isHarsh
                                  ? 'bg-[#0A192F] text-white shadow-2xs'
                                  : isGirish
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              {isHarsh ? 'HP' : isGirish ? 'G' : 'K'}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                {log.userName}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {log.username}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${
                              isHarsh
                                ? 'bg-sky-50 text-sky-900 border border-sky-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isHarsh && <ShieldCheck size={11} className="text-[#0284C7]" />}
                            {log.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-neutral-700 text-[11px]">
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

                        <td className="py-3.5 px-4 text-neutral-600">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Laptop size={13} className="text-neutral-400" />
                            <span>{log.deviceInfo}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isCurrentlyOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ONLINE NOW
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Authenticated
                            </span>
                          )}
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
