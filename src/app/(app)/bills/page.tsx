'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  FilePlus,
  Plus,
  Edit,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Landmark,
  QrCode,
  CreditCard,
  Banknote,
  FileText,
  User,
} from 'lucide-react';
import {
  getInvoices,
  getCompanyProfile,
  addInvoicePayment,
  updateInvoicePayment,
  deleteInvoicePayment,
  deleteInvoice,
} from '@/lib/storage';
import { formatINR, formatDateIN, todayISO, generateId } from '@/lib/utils';
import { PAYMENT_MODES } from '@/lib/types';
import type { Invoice, Payment, CompanyProfile } from '@/lib/types';
import InvoicePreview from '@/components/InvoicePreview';
import { recordBillActivity } from '@/lib/tracking';
import {
  fetchInvoicesFromCloud,
  syncInvoiceToCloud,
  deleteInvoiceFromCloud,
} from '@/lib/cloudSync';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function BillsPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  // Expanded payment drawer state: invoiceId -> boolean
  const [expandedBills, setExpandedBills] = useState<Record<string, boolean>>({});

  // Payment modal state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(todayISO());
  const [paymentMode, setPaymentMode] = useState<Payment['mode']>('bank_transfer');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [downloadingBill, setDownloadingBill] = useState<Invoice | null>(null);
  const billExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData(true);

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('invoices-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
          loadData(true);
        })
        .subscribe();

      return () => {
        if (supabase) supabase.removeChannel(channel);
      };
    }
  }, []);

  const loadData = async (forceCloud = false) => {
    setInvoices(getInvoices());
    setCompanyProfile(getCompanyProfile());

    if (forceCloud) {
      try {
        const live = await fetchInvoicesFromCloud();
        setInvoices(live);
      } catch (err) {
        console.warn('Cloud bills fetch error:', err);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Summary calculations
  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalReceived = invoices.reduce((acc, inv) => acc + (inv.totalReceived || 0), 0);
  const totalPending = invoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      (inv.projectName && inv.projectName.toLowerCase().includes(q));

    const matchStatus =
      statusFilter === 'all' ? true : inv.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const toggleDrawer = (id: string) => {
    setExpandedBills((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddPayment = (inv: Invoice) => {
    setActivePaymentInvoice(inv);
    setEditingPayment(null);
    setPaymentAmount(inv.balanceDue > 0 ? String(inv.balanceDue) : '');
    setPaymentDate(todayISO());
    setPaymentMode('bank_transfer');
    setPaymentRef('');
    setPaymentNotes('');
  };

  const handleOpenEditPayment = (inv: Invoice, payment: Payment) => {
    setActivePaymentInvoice(inv);
    setEditingPayment(payment);
    setPaymentAmount(String(payment.amount));
    setPaymentDate(payment.date);
    setPaymentMode(payment.mode);
    setPaymentRef(payment.reference || '');
    setPaymentNotes(payment.notes || '');
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    let updatedInv: Invoice | null = null;

    if (editingPayment) {
      const updatedPayment: Payment = {
        ...editingPayment,
        amount: amt,
        date: paymentDate,
        mode: paymentMode,
        reference: paymentRef.trim(),
        notes: paymentNotes.trim(),
      };
      updatedInv = updateInvoicePayment(activePaymentInvoice.id, updatedPayment);
      recordBillActivity({
        billId: activePaymentInvoice.id,
        invoiceNumber: activePaymentInvoice.invoiceNumber,
        clientName: activePaymentInvoice.clientName,
        grandTotal: amt,
        action: 'payment_recorded',
        notes: `Updated payment of Rs. ${amt.toLocaleString('en-IN')}`,
      });
      showToast('Payment entry updated');
    } else {
      const newPayment: Payment = {
        id: generateId(),
        amount: amt,
        date: paymentDate,
        mode: paymentMode,
        reference: paymentRef.trim(),
        notes: paymentNotes.trim(),
      };
      updatedInv = addInvoicePayment(activePaymentInvoice.id, newPayment);
      recordBillActivity({
        billId: activePaymentInvoice.id,
        invoiceNumber: activePaymentInvoice.invoiceNumber,
        clientName: activePaymentInvoice.clientName,
        grandTotal: amt,
        action: 'payment_recorded',
        notes: `Received Rs. ${amt.toLocaleString('en-IN')} via ${paymentMode.toUpperCase()}`,
      });
      showToast('Payment recorded successfully');
    }

    if (updatedInv) {
      await syncInvoiceToCloud(updatedInv);
    }

    loadData();
    setActivePaymentInvoice(null);
  };

  const handleDeletePayment = async (invoiceId: string, paymentId: string) => {
    if (confirm('Delete this payment entry? The bill balance and status will be recalculated.')) {
      const targetInv = invoices.find((i) => i.id === invoiceId);
      const updated = deleteInvoicePayment(invoiceId, paymentId);
      if (updated) {
        await syncInvoiceToCloud(updated);
      }
      if (targetInv) {
        recordBillActivity({
          billId: invoiceId,
          invoiceNumber: targetInv.invoiceNumber,
          clientName: targetInv.clientName,
          grandTotal: targetInv.grandTotal,
          action: 'payment_deleted',
        });
      }
      loadData();
      showToast('Payment removed');
    }
  };

  const handleDeleteBill = async (id: string, num: string) => {
    if (confirm(`Delete invoice ${num}? This cannot be undone.`)) {
      const targetInv = invoices.find((i) => i.id === id);
      deleteInvoice(id);
      await deleteInvoiceFromCloud(id);
      recordBillActivity({
        billId: id,
        invoiceNumber: num,
        clientName: targetInv?.clientName || 'Deleted Bill',
        grandTotal: targetInv?.grandTotal || 0,
        action: 'deleted',
      });
      loadData();
      showToast(`Bill ${num} deleted`);
    }
  };

  const handleDownloadBillPDF = async (inv: Invoice) => {
    setDownloadingBill(inv);
    // Allow React state to update the offscreen container in DOM
    await new Promise((r) => setTimeout(r, 80));

    try {
      const el = billExportRef.current;
      if (!el) throw new Error('Preview element not ready');

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('Canvas render produced empty dimensions');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${inv.invoiceNumber}_${(inv.clientName || 'Bill').replace(/\s+/g, '_')}.pdf`);
      recordBillActivity({
        billId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        grandTotal: inv.grandTotal,
        action: 'downloaded_pdf',
      });
      showToast(`Downloaded PDF for ${inv.invoiceNumber}`);
    } catch (err: any) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Error'));
    } finally {
      setDownloadingBill(null);
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
            Bills & invoices
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Client billing, payment tracking and ledger balance
          </p>
        </div>
        <Link
          href="/new-bill"
          className="bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white rounded-xl px-4 h-10 flex items-center gap-2 font-medium text-xs touch-target nav-transition action-press shadow-xs"
        >
          <FilePlus size={16} strokeWidth={2} className="text-white" />
          <span>New bill</span>
        </Link>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <span className="text-xs text-neutral-500 block">Total billed</span>
          <p className="text-base sm:text-xl font-semibold text-neutral-900 tabular-nums mt-1">
            {formatINR(totalBilled)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">{invoices.length} bills</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <span className="text-xs text-neutral-500 block">Received</span>
          <p className="text-base sm:text-xl font-semibold text-emerald-700 tabular-nums mt-1">
            {formatINR(totalReceived)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Cleared</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <span className="text-xs text-neutral-500 block">Pending due</span>
          <p className="text-base sm:text-xl font-semibold text-rose-700 tabular-nums mt-1">
            {formatINR(totalPending)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            {invoices.filter((i) => i.status !== 'paid').length} due
          </p>
        </div>
      </div>

      {/* Search & Segmented Filter */}
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
            placeholder="Search bills by client, project, or bill number..."
            className="w-full pl-10 pr-4 h-10 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 nav-transition"
          />
        </div>

        {/* Quiet Segmented Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {[
            { id: 'all', label: `All bills (${invoices.length})` },
            {
              id: 'unpaid',
              label: `Unpaid (${invoices.filter((i) => i.status === 'unpaid').length})`,
            },
            {
              id: 'partial',
              label: `Partially paid (${invoices.filter((i) => i.status === 'partial').length})`,
            },
            {
              id: 'paid',
              label: `Paid (${invoices.filter((i) => i.status === 'paid').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 h-8 rounded-lg text-xs font-medium whitespace-nowrap nav-transition ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bills List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-neutral-200 text-center">
          <p className="text-sm font-medium text-neutral-900 mb-1">No matching bills found</p>
          <p className="text-xs text-neutral-500 mb-4">
            Try a different search query or create a new invoice
          </p>
          <Link
            href="/new-bill"
            className="inline-flex items-center gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl px-4 h-10 font-medium text-xs nav-transition action-press shadow-xs"
          >
            <FilePlus size={16} /> Create bill
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => {
            const isExpanded = !!expandedBills[inv.id];
            const payments = inv.payments || [];

            return (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 nav-transition shadow-xs"
              >
                {/* Bill Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm text-slate-900">
                          {inv.invoiceNumber}
                        </span>
                        {/* Quiet status dot */}
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              inv.status === 'paid'
                                ? 'bg-emerald-600'
                                : inv.status === 'partial'
                                ? 'bg-[#0284C7]'
                                : 'bg-rose-600'
                            }`}
                          />
                          {inv.status === 'partial'
                            ? 'Partially paid'
                            : inv.status === 'paid'
                            ? 'Paid'
                            : 'Unpaid'}
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900 text-sm mt-1 leading-snug">
                        {inv.clientName}
                      </h3>
                      {inv.projectName && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {inv.projectName}
                        </p>
                      )}

                      {/* Partner Creator & Timestamp Tracking */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-medium font-mono text-[10px]">
                          <User size={11} className="text-[#0284C7]" />
                          <span>Created by: {inv.createdBy?.name || 'Partner'}</span>
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          • {inv.createdBy?.timestamp ? new Date(inv.createdBy.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : formatDateIN(inv.invoiceDate)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] text-neutral-500 block font-mono">
                        {formatDateIN(inv.invoiceDate)}
                      </span>
                      {inv.dueDate && (
                        <span className="text-[11px] text-neutral-400 block font-mono mt-0.5">
                          Due: {formatDateIN(inv.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3-Column Financial Breakdown */}
                  <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 my-3 text-center">
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Total bill</span>
                      <span className="font-semibold text-neutral-900 text-xs sm:text-sm tabular-nums">
                        {formatINR(inv.grandTotal)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-neutral-500 block">Received</span>
                      <span className="font-semibold text-emerald-700 text-xs sm:text-sm tabular-nums">
                        {formatINR(inv.totalReceived || 0)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-neutral-500 block">Balance due</span>
                      <span
                        className={`font-semibold text-xs sm:text-sm tabular-nums ${
                          inv.balanceDue > 0 ? 'text-rose-700' : 'text-neutral-400'
                        }`}
                      >
                        {formatINR(inv.balanceDue || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAddPayment(inv)}
                        className="flex items-center gap-1.5 px-3 h-8 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium nav-transition action-press"
                      >
                        <Plus size={14} />
                        <span>Add payment</span>
                      </button>

                      {payments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleDrawer(inv.id)}
                          className="flex items-center gap-1 px-2.5 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-medium nav-transition"
                        >
                          <span>{payments.length} payments</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadBillPDF(inv)}
                        disabled={downloadingBill?.id === inv.id}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md nav-transition"
                        title="Download PDF"
                      >
                        {downloadingBill?.id === inv.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <Download size={15} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/new-bill?edit=${inv.id}`)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md nav-transition"
                        title="View / Edit bill"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBill(inv.id, inv.invoiceNumber)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md nav-transition"
                        title="Delete bill"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment History Drawer */}
                {isExpanded && payments.length > 0 && (
                  <div className="bg-neutral-50 border-t border-neutral-200 p-3 sm:p-4 space-y-2">
                    <p className="text-xs font-medium text-neutral-600 mb-1">
                      Payments received for {inv.invoiceNumber}:
                    </p>

                    <div className="space-y-1.5">
                      {payments.map((p, pIdx) => (
                        <div
                          key={p.id || pIdx}
                          className="bg-white rounded-lg p-3 border border-neutral-200 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-emerald-700 text-xs sm:text-sm tabular-nums">
                                {formatINR(p.amount)}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-neutral-100 text-neutral-600">
                                {PAYMENT_MODES[p.mode] || p.mode}
                              </span>
                            </div>

                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              {formatDateIN(p.date)}
                              {p.reference && <span> • Ref: {p.reference}</span>}
                            </p>
                            {p.notes && (
                              <p className="text-[11px] text-neutral-400 mt-0.5">
                                Note: {p.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayment(inv, p)}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md nav-transition"
                              title="Edit payment"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(inv.id, p.id)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md nav-transition"
                              title="Delete payment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {activePaymentInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-200 shadow-xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white rounded-t-2xl sm:rounded-t-xl">
              <div>
                <h3 className="font-semibold text-sm">
                  {editingPayment ? 'Edit payment' : 'Record payment'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Bill {activePaymentInvoice.invoiceNumber} • {activePaymentInvoice.clientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePaymentInvoice(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-md nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-4 space-y-3.5">
              <div className="p-3 bg-neutral-100 rounded-lg flex items-center justify-between text-xs">
                <span className="text-neutral-600">Pending balance:</span>
                <span className="font-semibold text-rose-700 tabular-nums">
                  {formatINR(activePaymentInvoice.balanceDue)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Amount received (₹) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3 h-10 rounded-lg border border-neutral-300 font-medium text-neutral-900 text-base tabular-nums focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Payment date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Payment mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'bank_transfer', label: 'Bank / RTGS / NEFT', icon: Landmark },
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
                  Reference / UTR / Cheque number
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UTR / Cheque #123456"
                  className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Part payment after 10th slab cube test"
                  className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-medium rounded-xl text-xs nav-transition action-press flex items-center justify-center gap-2 shadow-xs"
                >
                  <Check size={16} />
                  <span>{editingPayment ? 'Save changes' : 'Confirm payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Dedicated Offscreen PDF Export Container */}
      {downloadingBill && companyProfile && (
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '800px',
            zIndex: -9999,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <div ref={billExportRef}>
            <InvoicePreview
              invoice={downloadingBill}
              companyProfile={companyProfile}
            />
          </div>
        </div>
      )}
    </div>
  );
}
