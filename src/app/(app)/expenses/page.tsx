'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  getExpenses,
  saveExpense,
  deleteExpense,
  getCompanyProfile,
} from '@/lib/storage';
import { formatINR, formatDateIN, todayISO, generateId } from '@/lib/utils';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '@/lib/types';
import type { Expense, ExpenseCategory, CompanyProfile } from '@/lib/types';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form Fields
  const [paidTo, setPaidTo] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Materials');
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('Harshail Iris Borivali');
  const [date, setDate] = useState(todayISO());
  const [paymentMode, setPaymentMode] = useState<Expense['paymentMode']>('upi');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setExpenses(getExpenses());
    setCompanyProfile(getCompanyProfile());
  };

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
  const labourMiscSpent = expenses
    .filter(
      (e) =>
        e.category === 'Site Labour' ||
        e.category === 'Site Tea/Food' ||
        e.category === 'Office/Govt' ||
        e.category === 'Other'
    )
    .reduce((sum, e) => sum + (e.amount || 0), 0);

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

    return matchSearch && matchCategory;
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
    setShowModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
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
      createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveExpense(newExp);
    loadData();
    setShowModal(false);
    showToast(editingExpense ? 'Purchase voucher updated' : 'Purchase recorded successfully');
  };

  const handleDeleteExpense = (id: string, desc: string) => {
    if (confirm(`Delete purchase entry "${desc}"?`)) {
      deleteExpense(id);
      loadData();
      showToast('Entry removed');
    }
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
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 tracking-tight">
            Purchases & expenses
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Materials bought, equipment hire, transport and site outflows
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="bg-[#0B0F17] hover:bg-[#151D2A] active:bg-[#070A0F] text-white rounded-lg px-3.5 h-9 flex items-center gap-1.5 font-medium text-xs touch-target nav-transition action-press border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
        >
          <Plus size={16} strokeWidth={1.5} className="text-amber-400" />
          <span>Record purchase</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-neutral-200 col-span-2 sm:col-span-1">
          <span className="text-xs text-neutral-500 block">Total outflow</span>
          <p className="text-lg sm:text-xl font-semibold text-neutral-900 tabular-nums mt-1">
            {formatINR(totalSpent)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">{expenses.length} vouchers</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <span className="text-xs text-neutral-500 block">Materials</span>
          <p className="text-lg sm:text-xl font-semibold text-neutral-900 tabular-nums mt-1">
            {formatINR(materialsSpent)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Cement, steel, hardware</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <span className="text-xs text-neutral-500 block">Machinery & fuel</span>
          <p className="text-lg sm:text-xl font-semibold text-neutral-900 tabular-nums mt-1">
            {formatINR(machineryTransportSpent)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">JCB, transport, diesel</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <span className="text-xs text-neutral-500 block">Site labour & misc</span>
          <p className="text-lg sm:text-xl font-semibold text-neutral-900 tabular-nums mt-1">
            {formatINR(labourMiscSpent)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Daily wages, tea, misc</p>
        </div>
      </div>

      {/* Search & Quiet Category Filter */}
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
            placeholder="Search by supplier (Ambuja, Steel), item, or site..."
            className="w-full pl-10 pr-4 h-10 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 nav-transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 h-8 rounded-lg text-xs font-medium whitespace-nowrap nav-transition ${
              selectedCategory === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            All purchases ({expenses.length})
          </button>

          {EXPENSE_CATEGORIES.map((cat) => {
            const count = expenses.filter((e) => e.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 h-8 rounded-lg text-xs font-medium whitespace-nowrap nav-transition ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                {cat} {count > 0 ? `(${count})` : ''}
              </button>
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
            className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-4 h-9 font-medium text-xs nav-transition action-press"
          >
            <Plus size={16} /> Record first purchase
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 nav-transition"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                      {exp.category}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {formatDateIN(exp.date)}
                    </span>
                    {exp.billNumber && (
                      <span className="text-[11px] font-mono text-neutral-500">
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
          ))}
        </div>
      )}

      {/* Record Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-200 shadow-xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white rounded-t-2xl sm:rounded-t-xl">
              <h3 className="font-semibold text-sm">
                {editingExpense ? 'Edit purchase' : 'Record purchase / expense'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-md nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-4 space-y-3.5">
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
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Expense category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
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
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Harshail Iris Borivali"
                    className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
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

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Delivered by truck MH-04-1234"
                  className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-xs nav-transition action-press flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>{editingExpense ? 'Save changes' : 'Save purchase voucher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
