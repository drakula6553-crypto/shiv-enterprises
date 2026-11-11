'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Edit,
  X,
  Check,
  Landmark,
  QrCode,
  CreditCard,
  Banknote,
  Camera,
  FileText,
  Upload,
  Paperclip,
  Eye,
  Download,
  ExternalLink,
  AlertCircle,
  FileCheck,
  FileWarning,
  RefreshCw,
} from 'lucide-react';
import {
  getExpenses,
  saveExpense,
  deleteExpense,
  getCompanyProfile,
  updateExpenseReceipt,
  getTemplates,
  getCustomExpenseCategories,
  saveCustomExpenseCategory,
  deleteCustomExpenseCategory,
} from '@/lib/storage';
import { formatINR, formatDateIN, todayISO, generateId } from '@/lib/utils';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '@/lib/types';
import type { Expense, ExpenseCategory, CompanyProfile } from '@/lib/types';
import { recordExpenseActivity } from '@/lib/tracking';
import {
  uploadReceiptToCloud,
  syncExpenseToCloud,
  deleteExpenseFromCloud,
  fetchExpensesFromCloud,
} from '@/lib/cloudSync';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

// Helper to compress camera/gallery images before storing
function compressImage(file: File): Promise<{ dataUrl: string; name: string; type: 'image' }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, name: file.name, type: 'image' });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ dataUrl: compressedDataUrl, name: file.name, type: 'image' });
      };
      img.onerror = () => resolve({ dataUrl: e.target?.result as string, name: file.name, type: 'image' });
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to read PDF as data URL
function processPdf(file: File): Promise<{ dataUrl: string; name: string; type: 'pdf' }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ dataUrl: e.target?.result as string, name: file.name, type: 'pdf' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'missing' | 'attached'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form Fields
  const [paidTo, setPaidTo] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Materials');
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('Harshail Iris Borivali');
  const [date, setDate] = useState(todayISO());
  const [paymentMode, setPaymentMode] = useState<Expense['paymentMode']>('upi');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Custom Categories
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Receipt in Create/Edit Modal
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string>('');
  const [receiptType, setReceiptType] = useState<'image' | 'pdf'>('image');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick "Upload Afterwards" Modal for an existing expense
  const [quickUploadExpense, setQuickUploadExpense] = useState<Expense | null>(null);
  const [quickReceiptUrl, setQuickReceiptUrl] = useState<string | null>(null);
  const [quickReceiptName, setQuickReceiptName] = useState<string>('');
  const [quickReceiptType, setQuickReceiptType] = useState<'image' | 'pdf'>('image');
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  // Viewer Lightbox Modal for Receipt
  const [viewingReceiptExpense, setViewingReceiptExpense] = useState<Expense | null>(null);

  // Lock body scroll whenever any modal / sub-page is open to prevent background website scrolling
  useBodyScrollLock(showModal || !!quickUploadExpense || !!viewingReceiptExpense);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('');

  const loadData = async (forceCloud = true) => {
    // 1. Instant local render
    setExpenses(getExpenses());
    setCompanyProfile(getCompanyProfile());
    setCustomCategories(getCustomExpenseCategories());

    // 2. Live Cloud fetch from Supabase
    if (forceCloud) {
      setIsSyncingCloud(true);
      try {
        const live = await fetchExpensesFromCloud();
        setExpenses(live);
        setLastSynced(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.warn('Cloud fetch error:', err);
      } finally {
        setIsSyncingCloud(false);
      }
    }
  };

  useEffect(() => {
    loadData(true);

    // Live Realtime listener for cross-device updates (Girish, Kishor, Harsh)
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('expenses-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
          loadData(true);
        })
        .subscribe();

      return () => {
        if (supabase) supabase.removeChannel(channel);
      };
    }
  }, []);

  const allCategories = React.useMemo(() => {
    const fromExpenses = expenses.map((e) => e.category).filter(Boolean);
    return Array.from(new Set([...EXPENSE_CATEGORIES, ...customCategories, ...fromExpenses]));
  }, [expenses, customCategories]);

  const handleAddNewCategory = (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    const updated = saveCustomExpenseCategory(trimmed);
    setCustomCategories(updated);
    setCategory(trimmed);
    setNewCategoryName('');
    setShowAddCategoryInput(false);
    showToast(`Category "${trimmed}" added and selected`);
  };

  const handleRemoveCustomCategory = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove custom category "${catName}"?`)) {
      const updated = deleteCustomExpenseCategory(catName);
      setCustomCategories(updated);
      if (selectedCategory === catName) setSelectedCategory('all');
      if (category === catName) setCategory('Materials');
      showToast(`Category "${catName}" removed`);
    }
  };

  const knownProjects = React.useMemo(() => {
    const tplProjects = getTemplates().flatMap((t) => t.projects || (t.projectName ? [t.projectName] : []));
    const expProjects = expenses.map((e) => e.projectName).filter(Boolean);
    return Array.from(new Set([...tplProjects, ...expProjects])).filter(Boolean);
  }, [expenses]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Summary Metrics
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const materialsSpent = expenses
    .filter((e) => e.category === 'Materials' || e.category === 'Hardware/Pipes')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const machineryTransportSpent = expenses
    .filter((e) => e.category === 'Machinery/Tools' || e.category === 'Transport/Fuel')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const missingBillsCount = expenses.filter((e) => !e.receiptUrl).length;

  // Filtered List
  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      e.paidTo.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.projectName.toLowerCase().includes(q) ||
      (e.billNumber && e.billNumber.toLowerCase().includes(q));

    const matchCategory =
      selectedCategory === 'all' || e.category === selectedCategory;

    const matchReceipt =
      receiptFilter === 'all'
        ? true
        : receiptFilter === 'missing'
        ? !e.receiptUrl
        : Boolean(e.receiptUrl);

    return matchSearch && matchCategory && matchReceipt;
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setPaidTo('');
    setAmount('');
    setCategory('Materials');
    setDescription('');
    setProjectName('Harshail Iris Borivali');
    setDate(todayISO());
    setPaymentMode('upi');
    setBillNumber('');
    setNotes('');
    setReceiptUrl(null);
    setReceiptName('');
    setReceiptType('image');
    setShowModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setPaidTo(exp.paidTo);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setDescription(exp.description);
    setProjectName(exp.projectName);
    setDate(exp.date);
    setPaymentMode(exp.paymentMode);
    setBillNumber(exp.billNumber || '');
    setNotes(exp.notes || '');
    setReceiptUrl(exp.receiptUrl || null);
    setReceiptName(exp.receiptName || (exp.receiptUrl ? 'Attached Bill' : ''));
    setReceiptType(exp.receiptType || (exp.receiptUrl?.startsWith('data:application/pdf') ? 'pdf' : 'image'));
    setShowModal(true);
  };

  // Handle file selection in Create/Edit Modal
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const res = await uploadReceiptToCloud(file);
      setReceiptUrl(res.url);
      setReceiptName(res.name);
      setReceiptType(res.type);
      showToast('Bill document uploaded & ready');
    } catch (err) {
      console.error('File process error:', err);
      alert('Could not process this file. Please try a different photo or PDF.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl(null);
    setReceiptName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid purchase amount');
      return;
    }
    if (!paidTo.trim()) {
      alert('Please enter who was paid');
      return;
    }

    const newExp: Expense = {
      id: editingExpense ? editingExpense.id : generateId(),
      paidTo: paidTo.trim(),
      amount: amt,
      category,
      description: description.trim() || category,
      projectName: projectName.trim() || 'General',
      date,
      paymentMode,
      billNumber: billNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'paid',
      receiptUrl: receiptUrl || null,
      receiptName: receiptName || undefined,
      receiptType: receiptUrl ? receiptType : undefined,
      createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveExpense(newExp);
    await syncExpenseToCloud(newExp);
    recordExpenseActivity({
      expenseId: newExp.id,
      paidTo: newExp.paidTo,
      category: newExp.category,
      projectName: newExp.projectName,
      amount: newExp.amount,
      billNumber: newExp.billNumber,
      action: editingExpense ? 'updated' : 'created',
    });
    loadData(false);
    setShowModal(false);
    showToast(editingExpense ? 'Purchase voucher updated' : 'Purchase recorded & synced to cloud');
  };

  // Quick Upload Afterwards handlers
  const handleOpenQuickUpload = (exp: Expense) => {
    setQuickUploadExpense(exp);
    setQuickReceiptUrl(exp.receiptUrl || null);
    setQuickReceiptName(exp.receiptName || '');
    setQuickReceiptType(exp.receiptType || (exp.receiptUrl?.startsWith('data:application/pdf') ? 'pdf' : 'image'));
  };

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const res = await uploadReceiptToCloud(file);
      setQuickReceiptUrl(res.url);
      setQuickReceiptName(res.name);
      setQuickReceiptType(res.type);
      showToast('Bill document uploaded to cloud');
    } catch (err) {
      console.error('File process error:', err);
      alert('Could not process this file. Please try a different photo or PDF.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSaveQuickReceipt = async () => {
    if (!quickUploadExpense || !quickReceiptUrl) return;

    const updated = updateExpenseReceipt(
      quickUploadExpense.id,
      quickReceiptUrl,
      quickReceiptName || 'Bill Document',
      quickReceiptType
    );

    if (updated) {
      await syncExpenseToCloud(updated);
    }

    recordExpenseActivity({
      expenseId: quickUploadExpense.id,
      paidTo: quickUploadExpense.paidTo,
      category: quickUploadExpense.category,
      projectName: quickUploadExpense.projectName,
      amount: quickUploadExpense.amount,
      billNumber: quickUploadExpense.billNumber,
      action: 'receipt_uploaded',
    });

    loadData(false);
    setQuickUploadExpense(null);
    showToast(`Bill attached & visible to all partners and admin!`);
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (confirm(`Delete purchase entry "${desc}"?`)) {
      const target = expenses.find((e) => e.id === id);
      deleteExpense(id);
      await deleteExpenseFromCloud(id);
      if (target) {
        recordExpenseActivity({
          expenseId: id,
          paidTo: target.paidTo,
          category: target.category,
          projectName: target.projectName,
          amount: target.amount,
          billNumber: target.billNumber,
          action: 'deleted',
        });
      }
      loadData(false);
      showToast('Entry removed from cloud');
    }
  };

  const downloadReceipt = (exp: Expense) => {
    if (!exp.receiptUrl) return;
    const a = document.createElement('a');
    a.href = exp.receiptUrl;
    a.download = exp.receiptName || `Bill_${exp.paidTo.replace(/\s+/g, '_')}_${exp.billNumber || exp.id}.${exp.receiptType === 'pdf' ? 'pdf' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-neutral-700 text-xs font-medium">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 tracking-tight">
              Purchases &amp; expenses
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cloud Synced
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Materials bought, equipment hire, transport and site bill receipts • Shared across all partners &amp; admin
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isSyncingCloud}
            className="px-3 h-9 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-medium flex items-center gap-1.5 shadow-xs transition disabled:opacity-60"
            title="Refresh from Supabase Cloud"
          >
            <RefreshCw size={13} className={isSyncingCloud ? 'animate-spin text-[#0284C7]' : 'text-slate-400'} />
            <span>{isSyncingCloud ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white rounded-xl px-4 h-10 flex items-center gap-1.5 font-medium text-xs touch-target nav-transition action-press shadow-xs"
          >
            <Plus size={16} strokeWidth={2} className="text-white" />
            <span>Record purchase</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 col-span-2 sm:col-span-1 shadow-xs">
          <span className="text-xs text-slate-500 block">Total outflow</span>
          <p className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums mt-1">
            {formatINR(totalSpent)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{expenses.length} vouchers recorded</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Materials</span>
          <p className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums mt-1">
            {formatINR(materialsSpent)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Cement, steel, hardware</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Machinery & fuel</span>
          <p className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums mt-1">
            {formatINR(machineryTransportSpent)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">JCB, transport, diesel</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Bill Photo Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg sm:text-xl font-semibold text-slate-800 tabular-nums">
              {missingBillsCount}
            </span>
            <span className="text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-medium border border-slate-200">
              Pending bill
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Can upload afterwards</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by supplier (Ambuja, Steel), item, site, or bill number..."
            className="w-full pl-10 pr-4 h-10 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 nav-transition"
          />
        </div>

        {/* Bill Receipt Status Quick Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setReceiptFilter('all')}
            className={`px-3 h-7 rounded-md text-xs font-medium nav-transition ${
              receiptFilter === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            All records ({expenses.length})
          </button>

          <button
            type="button"
            onClick={() => setReceiptFilter('missing')}
            className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium nav-transition ${
              receiptFilter === 'missing'
                ? 'bg-[#0A192F] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <FileWarning size={13} />
            <span>Missing Bill Photo ({missingBillsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setReceiptFilter('attached')}
            className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium nav-transition ${
              receiptFilter === 'attached'
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            <FileCheck size={13} className="text-emerald-600" />
            <span>Bill Attached ({expenses.length - missingBillsCount})</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 h-7 rounded-lg text-[11px] font-medium whitespace-nowrap nav-transition ${
              selectedCategory === 'all'
                ? 'bg-neutral-800 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            All categories
          </button>

          {allCategories.map((cat) => {
            const count = expenses.filter((e) => e.category === cat).length;
            const isCustom = !EXPENSE_CATEGORIES.includes(cat as any);
            const isSelected = selectedCategory === cat;
            return (
              <div
                key={cat}
                className={`inline-flex items-center rounded-lg text-[11px] font-medium whitespace-nowrap nav-transition border ${
                  isSelected
                    ? 'bg-neutral-800 text-white border-neutral-800'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="px-3 h-7 flex items-center"
                >
                  {cat} {count > 0 ? `(${count})` : ''}
                </button>
                {isCustom && count === 0 && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCustomCategory(cat, e)}
                    className="pr-2 text-neutral-400 hover:text-red-500 font-bold"
                    title={`Delete custom category "${cat}"`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-neutral-200 text-center">
          <p className="text-sm font-medium text-neutral-900 mb-1">No purchase records found</p>
          <p className="text-xs text-neutral-500 mb-4">
            Record materials purchased, fuel, equipment hire, and site payments
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl px-4 h-10 font-medium text-xs nav-transition action-press shadow-xs"
          >
            <Plus size={16} /> Record first purchase
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((exp) => {
            const hasReceipt = Boolean(exp.receiptUrl);
            const isPdf = exp.receiptType === 'pdf' || exp.receiptUrl?.startsWith('data:application/pdf');

            return (
              <div
                key={exp.id}
                className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 nav-transition shadow-xs"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                        {exp.category}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {formatDateIN(exp.date)}
                      </span>
                      {exp.billNumber && (
                        <span className="text-[11px] font-mono font-semibold text-neutral-700 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200">
                          #{exp.billNumber}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-neutral-900 text-sm mt-1.5 leading-snug">
                      {exp.paidTo}
                    </h3>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-semibold text-base sm:text-lg text-neutral-900 tabular-nums block">
                      {formatINR(exp.amount)}
                    </span>
                    <span className="text-[11px] text-neutral-500 uppercase mt-0.5 block">
                      {PAYMENT_MODES[exp.paymentMode] || exp.paymentMode}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-snug my-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  {exp.description}
                </p>

                {/* Bill Photo / PDF Section (Key Feature) */}
                <div className="my-2.5 pt-2 border-t border-neutral-100">
                  {hasReceipt ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50/60 border border-emerald-200/80">
                      <div className="flex items-center gap-2.5">
                        {isPdf ? (
                          <div className="w-8 h-8 rounded-md bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                            <FileText size={16} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-neutral-200 overflow-hidden shrink-0 border border-neutral-300">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={exp.receiptUrl!}
                              alt="Receipt thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-neutral-900">
                              {isPdf ? 'Vendor Bill (PDF)' : 'Bill Photo Attached'}
                            </span>
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-medium">
                              Verified
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500 font-mono truncate max-w-xs block">
                            {exp.receiptName || (isPdf ? 'Invoice_document.pdf' : 'Receipt_photo.jpg')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingReceiptExpense(exp)}
                          className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-white hover:bg-neutral-50 border border-neutral-200 text-[11px] font-semibold text-neutral-800 shadow-2xs nav-transition"
                        >
                          <Eye size={12} className="text-neutral-500" />
                          <span>View {isPdf ? 'PDF' : 'Photo'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadReceipt(exp)}
                          className="p-1.5 rounded-md hover:bg-white text-neutral-600 hover:text-neutral-900 nav-transition"
                          title="Download document"
                        >
                          <Download size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenQuickUpload(exp)}
                          className="p-1.5 rounded-md hover:bg-white text-neutral-500 hover:text-neutral-900 nav-transition"
                          title="Replace document"
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300">
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <FileWarning size={15} className="text-slate-500 shrink-0" />
                        <span>Bill document not generated / pending upload</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickUpload(exp)}
                        className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-[11px] font-semibold shadow-xs nav-transition"
                      >
                        <Camera size={12} />
                        <span>+ Upload Bill Photo / PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <span>Site: {exp.projectName}</span>
                    {exp.notes && (
                      <span className="text-neutral-400 truncate max-w-xs">
                        • {exp.notes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(exp)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md nav-transition"
                      title="Edit purchase"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id, exp.description)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md nav-transition"
                      title="Delete purchase"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record / Edit Purchase Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Non-scrolling Sticky Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                {editingExpense ? 'Edit purchase voucher' : 'Record purchase / expense'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dedicated Mobile Touch Scroll Area */}
            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSaveExpense} className="space-y-4 pb-6">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Paid to / Supplier name *
                </label>
                <input
                  type="text"
                  required
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  placeholder="e.g. Ambuja Cement Agency, Riddhi Siddhi Steel"
                  className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 85000"
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 font-medium text-base text-neutral-900 tabular-nums focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700">
                    Expense category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                    className="text-[11px] font-semibold text-neutral-900 hover:text-black flex items-center gap-1 transition"
                  >
                    <Plus size={12} />
                    <span>Add category</span>
                  </button>
                </div>

                {showAddCategoryInput && (
                  <div className="mb-2 p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-2">
                    <span className="text-[11px] font-medium text-neutral-700 block">
                      Enter new expense category name:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Scaffolding, Steel, Centering, Marble..."
                        className="flex-1 px-2.5 h-8 rounded border border-neutral-300 text-xs text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCategory(newCategoryName);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewCategory(newCategoryName)}
                        className="px-3 h-8 text-xs font-semibold rounded bg-neutral-900 hover:bg-black text-white transition"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        className="px-2.5 h-8 text-xs font-medium rounded border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddCategoryInput(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add new category...</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Description / Item details
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 200 bags OPC 53 Grade cement"
                  className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Site / Project
                  </label>
                  <input
                    type="text"
                    list="site-projects-datalist"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Harshail Iris Borivali"
                    className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <datalist id="site-projects-datalist">
                    {knownProjects.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Bill / Voucher number
                  </label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. INV-8821"
                    className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 font-mono focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Payment mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'bank_transfer', label: 'Bank transfer', icon: Landmark },
                    { mode: 'upi', label: 'UPI / GPay', icon: QrCode },
                    { mode: 'cheque', label: 'Cheque', icon: CreditCard },
                    { mode: 'cash', label: 'Cash', icon: Banknote },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMode === m.mode;
                    return (
                      <button
                        key={m.mode}
                        type="button"
                        onClick={() => setPaymentMode(m.mode as any)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left nav-transition ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                            : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon size={14} className={isSelected ? 'text-white' : 'text-neutral-500'} />
                        <span className="text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ATTACH BILL PHOTO OR PDF (NEW FEATURE) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-[#0284C7]" />
                    <span>Upload Bill / Receipt Photo or PDF</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Optional • Can upload later)
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {receiptUrl ? (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {receiptType === 'pdf' ? (
                        <div className="w-9 h-9 rounded-md bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                          <FileText size={18} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={receiptUrl}
                            alt="Receipt preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <span className="text-xs font-semibold text-slate-900 block truncate">
                          {receiptName || (receiptType === 'pdf' ? 'Bill_Document.pdf' : 'Receipt_Photo.jpg')}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check size={11} /> File ready to save
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 h-7 rounded border border-slate-200 hover:bg-slate-100 text-[11px] text-slate-700 font-medium nav-transition"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded nav-transition"
                        title="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isProcessingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3.5 rounded-xl border border-dashed border-sky-300 hover:border-[#0284C7] bg-sky-50/20 hover:bg-sky-50/40 flex flex-col items-center justify-center gap-1.5 text-center nav-transition group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-500/10 text-[#0284C7] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Upload size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">
                        {isProcessingFile ? 'Processing document...' : 'Click to take photo or choose PDF'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Supports camera snap, JPG, PNG, or vendor PDF bills
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Delivered by truck MH-04-1234"
                  className="w-full px-3 h-9 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-medium rounded-xl text-xs nav-transition action-press flex items-center justify-center gap-2 shadow-xs"
                >
                  <Check size={16} />
                  <span>{editingExpense ? 'Save changes' : 'Save purchase voucher'}</span>
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* QUICK UPLOAD AFTERWARDS MODAL */}
      {quickUploadExpense && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickUploadExpense(null);
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[88dvh] border border-neutral-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white shrink-0">
              <div>
                <h3 className="font-semibold text-sm">Attach Bill Document Afterwards</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {quickUploadExpense.paidTo} • {formatINR(quickUploadExpense.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickUploadExpense(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-md nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto modal-scrollable flex-1">
              <input
                ref={quickFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleQuickFileChange}
                className="hidden"
              />

              {quickReceiptUrl ? (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <div className="flex items-center gap-3">
                    {quickReceiptType === 'pdf' ? (
                      <div className="w-12 h-12 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                        <FileText size={24} />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-neutral-200 overflow-hidden shrink-0 border border-neutral-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={quickReceiptUrl}
                          alt="Bill preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <span className="text-xs font-semibold text-neutral-900 block truncate">
                        {quickReceiptName || (quickReceiptType === 'pdf' ? 'Bill_Document.pdf' : 'Receipt_Photo.jpg')}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-mono block mt-0.5">
                        {quickReceiptType === 'pdf' ? 'PDF Invoice' : 'Camera / Image Photo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => quickFileInputRef.current?.click()}
                      className="px-3 h-8 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 nav-transition"
                    >
                      Choose Different File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickReceiptUrl(null);
                        setQuickReceiptName('');
                      }}
                      className="px-3 h-8 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 nav-transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingFile}
                  onClick={() => quickFileInputRef.current?.click()}
                  className="w-full p-6 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/30 hover:bg-sky-50/60 flex flex-col items-center justify-center gap-2 text-center nav-transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/15 text-[#0284C7] flex items-center justify-center">
                    <Camera size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {isProcessingFile ? 'Processing...' : 'Upload Photo or PDF of Bill'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Camera photo, gallery screenshot, or PDF document
                    </span>
                  </div>
                </button>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickUploadExpense(null)}
                  className="px-4 h-9 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!quickReceiptUrl}
                  onClick={handleSaveQuickReceipt}
                  className="px-4 h-9 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Save Bill to Voucher</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT VIEWER / LIGHTBOX MODAL */}
      {viewingReceiptExpense && viewingReceiptExpense.receiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingReceiptExpense(null);
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white shrink-0">
              <div>
                <h3 className="font-semibold text-sm">
                  {viewingReceiptExpense.receiptName || 'Attached Bill Document'}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Paid to {viewingReceiptExpense.paidTo} • {formatINR(viewingReceiptExpense.amount)} • {formatDateIN(viewingReceiptExpense.date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadReceipt(viewingReceiptExpense)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-md nav-transition"
                  title="Download file"
                >
                  <Download size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceiptExpense(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-md nav-transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-y-auto modal-scrollable p-4 flex items-center justify-center bg-neutral-100 min-h-[300px]">
              {viewingReceiptExpense.receiptType === 'pdf' || viewingReceiptExpense.receiptUrl.startsWith('data:application/pdf') ? (
                <div className="text-center p-8 bg-white rounded-xl border border-neutral-200 max-w-md space-y-4">
                  <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">
                      {viewingReceiptExpense.receiptName || 'Vendor Bill (PDF)'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      PDF Document is attached to this purchase voucher.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <a
                      href={viewingReceiptExpense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800"
                    >
                      <ExternalLink size={14} />
                      <span>Open PDF in New Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadReceipt(viewingReceiptExpense)}
                      className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg border border-neutral-300 bg-white text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={viewingReceiptExpense.receiptUrl}
                  alt="Full receipt"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-neutral-200 bg-white flex items-center justify-between text-xs shrink-0">
              <span className="text-neutral-500 font-mono text-[11px]">
                Site: {viewingReceiptExpense.projectName} {viewingReceiptExpense.billNumber ? `• Bill #${viewingReceiptExpense.billNumber}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setViewingReceiptExpense(null)}
                className="px-4 h-8 rounded-lg bg-neutral-900 text-white text-xs font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
