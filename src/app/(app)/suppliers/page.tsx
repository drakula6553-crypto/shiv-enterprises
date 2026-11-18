'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  FileText,
  Download,
  Trash2,
  Edit,
  X,
  Check,
  ArrowLeft,
  Landmark,
  QrCode,
  CreditCard,
  Banknote,
  Receipt,
  FileCheck,
  Building2,
  Calendar,
  Hash,
  Eye,
  ExternalLink,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  addSupplierBill,
  deleteSupplierBill,
  addSupplierPayment,
  deleteSupplierPayment,
  getCompanyProfile,
} from '@/lib/storage';
import { formatINR, formatDateIN, todayISO, generateId } from '@/lib/utils';
import { SUPPLIER_CATEGORIES, PAYMENT_MODES } from '@/lib/types';
import type {
  Supplier,
  SupplierBill,
  SupplierPayment,
  SupplierCategory,
  CompanyProfile,
} from '@/lib/types';
import { recordSupplierActivity } from '@/lib/tracking';
import {
  fetchSuppliersFromCloud,
  syncSupplierToCloud,
  deleteSupplierFromCloud,
} from '@/lib/cloudSync';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface LedgerEntry {
  id: string;
  type: 'bill' | 'payment';
  date: string;
  billNumber?: string;
  description: string;
  project?: string;
  vehicleNumber?: string;
  mode?: string;
  reference?: string;
  receiptUrl?: string | null;
  receiptName?: string;
  billAmount: number;
  paidAmount: number;
  balance: number;
}

const COMMON_PROJECTS = [
  'Roshan Nager Borivali west',
  'Harshail Iris Borivali',
  'Harshail Heights Dahisar',
  'Harshail Aura Borivali West',
  'General / Multiple Sites',
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Active Supplier Ledger View
  const [activeLedgerSupplier, setActiveLedgerSupplier] = useState<Supplier | null>(null);
  const ledgerPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Modals state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sCategory, setSCategory] = useState<SupplierCategory>('Cement');
  const [sContactPerson, setSContactPerson] = useState('');
  const [sAddress, setSAddress] = useState('');
  const [sGstin, setSGstin] = useState('');
  const [sBankDetails, setSBankDetails] = useState('');
  const [sNotes, setSNotes] = useState('');

  // Record Bill Modal State
  const [showBillModal, setShowBillModal] = useState(false);
  const [billSupplierId, setBillSupplierId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(todayISO());
  const [billProject, setBillProject] = useState(COMMON_PROJECTS[0]);
  const [billCategory, setBillCategory] = useState<string>('Cement');
  const [billDesc, setBillDesc] = useState('');
  const [billVehicle, setBillVehicle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billReceiptUrl, setBillReceiptUrl] = useState<string | null>(null);
  const [billReceiptName, setBillReceiptName] = useState('');
  const [billReceiptType, setBillReceiptType] = useState<'image' | 'pdf'>('image');
  const [billNotes, setBillNotes] = useState('');

  // Record Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [paySupplierId, setPaySupplierId] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<SupplierPayment['mode']>('bank_transfer');
  const [payBillNumberRef, setPayBillNumberRef] = useState<string>('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Receipt preview modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [previewReceiptName, setPreviewReceiptName] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lock body scroll whenever modal is open
  useBodyScrollLock(
    showAddSupplierModal ||
      showBillModal ||
      showPayModal ||
      !!previewReceiptUrl
  );

  useEffect(() => {
    loadData(true);

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('suppliers-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'suppliers' },
          () => {
            loadData(false);
          }
        )
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async (syncFromCloud = false) => {
    setCompanyProfile(getCompanyProfile());
    if (syncFromCloud) {
      const cloudSuppliers = await fetchSuppliersFromCloud();
      setSuppliers(cloudSuppliers);
      if (activeLedgerSupplier) {
        const refreshed = cloudSuppliers.find((s) => s.id === activeLedgerSupplier.id);
        if (refreshed) setActiveLedgerSupplier(refreshed);
      }
    } else {
      const local = getSuppliers();
      setSuppliers(local);
      if (activeLedgerSupplier) {
        const refreshed = local.find((s) => s.id === activeLedgerSupplier.id);
        if (refreshed) setActiveLedgerSupplier(refreshed);
      }
    }
  };

  // Metrics
  const totalBilled = suppliers.reduce((sum, s) => sum + s.totalBilled, 0);
  const totalPaid = suppliers.reduce((sum, s) => sum + s.totalPaid, 0);
  const totalBalance = suppliers.reduce((sum, s) => sum + s.balance, 0);
  const totalBillsCount = suppliers.reduce((sum, s) => sum + (s.bills || []).length, 0);

  // Filtering
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
      (s.gstin && s.gstin.toLowerCase().includes(q)) ||
      (s.bills || []).some(
        (b) =>
          b.billNumber.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.project.toLowerCase().includes(q)
      );

    const matchesCategory =
      selectedCategory === 'all' || s.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // ─── Add / Edit Supplier Handlers ─────────────────────────
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSName('');
    setSPhone('');
    setSCategory('Cement');
    setSContactPerson('');
    setSAddress('');
    setSGstin('');
    setSBankDetails('');
    setSNotes('');
    setShowAddSupplierModal(true);
  };

  const handleOpenEditSupplier = (s: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSupplier(s);
    setSName(s.name);
    setSPhone(s.phone);
    setSCategory(s.category);
    setSContactPerson(s.contactPerson || '');
    setSAddress(s.address || '');
    setSGstin(s.gstin || '');
    setSBankDetails(s.bankDetails || '');
    setSNotes(s.notes || '');
    setShowAddSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) {
      alert('Please enter supplier or firm name.');
      return;
    }

    if (editingSupplier) {
      const updated: Supplier = {
        ...editingSupplier,
        name: sName.trim(),
        phone: sPhone.trim(),
        category: sCategory,
        contactPerson: sContactPerson.trim() || undefined,
        address: sAddress.trim() || undefined,
        gstin: sGstin.trim().toUpperCase() || undefined,
        bankDetails: sBankDetails.trim() || undefined,
        notes: sNotes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      saveSupplier(updated);
      await syncSupplierToCloud(updated);
      await recordSupplierActivity({
        supplierId: updated.id,
        supplierName: updated.name,
        category: updated.category,
        action: 'supplier_updated',
        description: `Updated supplier profile: ${updated.name}`,
      });
      showToast('Supplier details updated successfully');
    } else {
      const newSupplier: Supplier = {
        id: 'sup_' + generateId(),
        name: sName.trim(),
        phone: sPhone.trim(),
        category: sCategory,
        contactPerson: sContactPerson.trim() || undefined,
        address: sAddress.trim() || undefined,
        gstin: sGstin.trim().toUpperCase() || undefined,
        bankDetails: sBankDetails.trim() || undefined,
        notes: sNotes.trim() || undefined,
        bills: [],
        payments: [],
        totalBilled: 0,
        totalPaid: 0,
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      saveSupplier(newSupplier);
      await syncSupplierToCloud(newSupplier);
      await recordSupplierActivity({
        supplierId: newSupplier.id,
        supplierName: newSupplier.name,
        category: newSupplier.category,
        action: 'supplier_added',
        description: `Registered new supplier: ${newSupplier.name} (${newSupplier.category})`,
      });
      showToast('New supplier registered successfully');
    }

    setShowAddSupplierModal(false);
    loadData(false);
  };

  const handleDeleteSupplier = async (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete supplier "${name}"? All bills and ledger records for this vendor will be removed.`)) {
      return;
    }
    deleteSupplier(id);
    await deleteSupplierFromCloud(id);
    await recordSupplierActivity({
      supplierId: id,
      supplierName: name,
      action: 'supplier_deleted',
      description: `Deleted supplier ${name}`,
    });
    if (activeLedgerSupplier?.id === id) {
      setActiveLedgerSupplier(null);
    }
    showToast('Supplier removed');
    loadData(false);
  };

  // ─── Record Bill Modal Handlers ────────────────────────────
  const handleOpenRecordBill = (supplier?: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetSup = supplier || activeLedgerSupplier || suppliers[0];
    setBillSupplierId(targetSup ? targetSup.id : '');
    setBillCategory(targetSup ? targetSup.category : 'Cement');
    setBillNumber('');
    setBillDate(todayISO());
    setBillProject(COMMON_PROJECTS[0]);
    setBillDesc('');
    setBillVehicle('');
    setBillAmount('');
    setBillReceiptUrl(null);
    setBillReceiptName('');
    setBillNotes('');
    setShowBillModal(true);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    setBillReceiptType(isPdf ? 'pdf' : 'image');
    setBillReceiptName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setBillReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billSupplierId) {
      alert('Please select a supplier.');
      return;
    }
    if (!billNumber.trim()) {
      alert('Please enter a Bill / Invoice / Challan Number.');
      return;
    }
    const amt = parseFloat(billAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid bill amount.');
      return;
    }

    const targetSup = suppliers.find((s) => s.id === billSupplierId);
    if (!targetSup) return;

    const newBill: SupplierBill = {
      id: 'sb_' + generateId(),
      billNumber: billNumber.trim().toUpperCase(),
      date: billDate,
      project: billProject.trim() || 'Roshan Nager Borivali west',
      materialCategory: billCategory,
      description: billDesc.trim() || `${billCategory} Material Supply`,
      amount: amt,
      vehicleNumber: billVehicle.trim().toUpperCase() || undefined,
      receiptUrl: billReceiptUrl,
      receiptName: billReceiptName || undefined,
      receiptType: billReceiptType,
      notes: billNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = addSupplierBill(targetSup.id, newBill);
    if (updated) {
      await syncSupplierToCloud(updated);
      await recordSupplierActivity({
        supplierId: targetSup.id,
        supplierName: targetSup.name,
        category: targetSup.category,
        action: 'bill_recorded',
        billNumber: newBill.billNumber,
        amount: amt,
        description: `Recorded Bill #${newBill.billNumber} for ₹${formatINR(amt)} (${newBill.description})`,
      });
      if (activeLedgerSupplier?.id === targetSup.id) {
        setActiveLedgerSupplier(updated);
      }
      showToast(`Bill #${newBill.billNumber} recorded for ${targetSup.name}`);
    }

    setShowBillModal(false);
    loadData(false);
  };

  const handleDeleteBill = async (billId: string, bNo: string, amount: number) => {
    if (!activeLedgerSupplier) return;
    if (!confirm(`Are you sure you want to delete Bill #${bNo} (₹${formatINR(amount)})?`)) {
      return;
    }
    const updated = deleteSupplierBill(activeLedgerSupplier.id, billId);
    if (updated) {
      await syncSupplierToCloud(updated);
      await recordSupplierActivity({
        supplierId: activeLedgerSupplier.id,
        supplierName: activeLedgerSupplier.name,
        category: activeLedgerSupplier.category,
        action: 'bill_deleted',
        billNumber: bNo,
        amount,
        description: `Deleted Bill #${bNo} of ₹${formatINR(amount)}`,
      });
      setActiveLedgerSupplier(updated);
      showToast(`Bill #${bNo} deleted`);
    }
    loadData(false);
  };

  // ─── Record Payment Modal Handlers ─────────────────────────
  const handleOpenRecordPayment = (supplier?: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetSup = supplier || activeLedgerSupplier || suppliers[0];
    setPaySupplierId(targetSup ? targetSup.id : '');
    setPayDate(todayISO());
    setPayAmount('');
    setPayMode('bank_transfer');
    setPayBillNumberRef('');
    setPayReference('');
    setPayNotes('');
    setShowPayModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplierId) {
      alert('Please select a supplier.');
      return;
    }
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const targetSup = suppliers.find((s) => s.id === paySupplierId);
    if (!targetSup) return;

    const newPayment: SupplierPayment = {
      id: 'sp_' + generateId(),
      date: payDate,
      amount: amt,
      mode: payMode,
      billNumberRef: payBillNumberRef.trim() || undefined,
      reference: payReference.trim() || undefined,
      notes: payNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = addSupplierPayment(targetSup.id, newPayment);
    if (updated) {
      await syncSupplierToCloud(updated);
      await recordSupplierActivity({
        supplierId: targetSup.id,
        supplierName: targetSup.name,
        category: targetSup.category,
        action: 'payment_recorded',
        billNumber: payBillNumberRef.trim() || undefined,
        amount: amt,
        description: `Paid ₹${formatINR(amt)} via ${PAYMENT_MODES[payMode]} ${
          payBillNumberRef ? `against Bill #${payBillNumberRef}` : ''
        }`,
      });
      if (activeLedgerSupplier?.id === targetSup.id) {
        setActiveLedgerSupplier(updated);
      }
      showToast(`Payment of ₹${formatINR(amt)} recorded for ${targetSup.name}`);
    }

    setShowPayModal(false);
    loadData(false);
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (!activeLedgerSupplier) return;
    if (!confirm(`Are you sure you want to delete payment record of ₹${formatINR(amount)}?`)) {
      return;
    }
    const updated = deleteSupplierPayment(activeLedgerSupplier.id, paymentId);
    if (updated) {
      await syncSupplierToCloud(updated);
      await recordSupplierActivity({
        supplierId: activeLedgerSupplier.id,
        supplierName: activeLedgerSupplier.name,
        category: activeLedgerSupplier.category,
        action: 'payment_deleted',
        amount,
        description: `Deleted payment of ₹${formatINR(amount)}`,
      });
      setActiveLedgerSupplier(updated);
      showToast('Payment record removed');
    }
    loadData(false);
  };

  // ─── Build Running Balance Ledger ─────────────────────────
  const getSupplierLedger = (supplier: Supplier): LedgerEntry[] => {
    const rawList: {
      id: string;
      type: 'bill' | 'payment';
      date: string;
      billNumber?: string;
      description: string;
      project?: string;
      vehicleNumber?: string;
      mode?: string;
      reference?: string;
      receiptUrl?: string | null;
      receiptName?: string;
      billAmount: number;
      paidAmount: number;
    }[] = [];

    (supplier.bills || []).forEach((b) => {
      rawList.push({
        id: b.id,
        type: 'bill',
        date: b.date,
        billNumber: b.billNumber,
        description: b.description,
        project: b.project,
        vehicleNumber: b.vehicleNumber,
        receiptUrl: b.receiptUrl,
        receiptName: b.receiptName,
        billAmount: b.amount,
        paidAmount: 0,
      });
    });

    (supplier.payments || []).forEach((p) => {
      rawList.push({
        id: p.id,
        type: 'payment',
        date: p.date,
        billNumber: p.billNumberRef,
        description: p.notes || (p.billNumberRef ? `Payment against Bill #${p.billNumberRef}` : 'Supplier On-Account Payment'),
        mode: p.mode,
        reference: p.reference,
        billAmount: 0,
        paidAmount: p.amount,
      });
    });

    // Sort chronologically ascending
    rawList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    return rawList.map((item) => {
      running += item.billAmount - item.paidAmount;
      return {
        ...item,
        balance: running,
      };
    });
  };

  // ─── Export Statement PDF ─────────────────────────────────
  const handleExportStatementPDF = async (supplier: Supplier) => {
    const el = ledgerPrintRef.current;
    if (!el) return;

    setIsExportingPdf(true);
    try {
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

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let position = 0;
      let heightLeft = imgHeight;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const safeName = supplier.name.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Shiv_Enterprises_Supplier_Statement_${safeName}.pdf`);
      showToast('Supplier statement exported to PDF successfully');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-[#0A192F] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-sky-500/30 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-[#38BDF8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: INDIVIDUAL SUPPLIER LEDGER VIEW */}
      {activeLedgerSupplier ? (
        <div className="space-y-6">
          {/* Header navigation bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveLedgerSupplier(null)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft size={16} />
                <span>All Suppliers</span>
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{activeLedgerSupplier.name}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                    {activeLedgerSupplier.category}
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Supplier Statement & Material Bill Reconciliation
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenRecordBill(activeLedgerSupplier)}
                className="flex items-center gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 h-9 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Plus size={14} />
                <span>+ Record Bill (with Bill #)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenRecordPayment(activeLedgerSupplier)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 h-9 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <CreditCard size={14} />
                <span>Record Payment</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportStatementPDF(activeLedgerSupplier)}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 bg-[#0A192F] hover:bg-[#071324] text-white px-3 h-9 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
              >
                <Download size={14} />
                <span>{isExportingPdf ? 'Exporting...' : 'Export Statement PDF'}</span>
              </button>
            </div>
          </div>

          {/* Supplier Info & Balance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs md:col-span-1 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Supplier Profile
              </div>
              <div className="text-xs space-y-1">
                {activeLedgerSupplier.contactPerson && (
                  <p className="text-slate-700 font-semibold flex items-center gap-1.5">
                    <span className="text-slate-400">Contact:</span> {activeLedgerSupplier.contactPerson}
                  </p>
                )}
                <p className="text-slate-700 font-mono flex items-center gap-1.5">
                  <Phone size={12} className="text-slate-400" />
                  <a href={`tel:${activeLedgerSupplier.phone}`} className="hover:text-[#0284C7]">
                    {activeLedgerSupplier.phone}
                  </a>
                </p>
                {activeLedgerSupplier.gstin && (
                  <p className="text-slate-700 font-mono text-[11px]">
                    <span className="text-slate-400">GSTIN:</span> {activeLedgerSupplier.gstin}
                  </p>
                )}
                {activeLedgerSupplier.address && (
                  <p className="text-slate-500 text-[11px] line-clamp-2">
                    {activeLedgerSupplier.address}
                  </p>
                )}
                {activeLedgerSupplier.bankDetails && (
                  <div className="pt-1 mt-1 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                    <Landmark size={11} className="inline mr-1 text-slate-400" />
                    {activeLedgerSupplier.bankDetails}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Material Billed
              </div>
              <div className="text-xl font-black font-mono text-slate-900 mt-1">
                ₹{formatINR(activeLedgerSupplier.totalBilled)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {(activeLedgerSupplier.bills || []).length} invoices / challans tracked
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Total Paid to Supplier
              </div>
              <div className="text-xl font-black font-mono text-emerald-700 mt-1">
                ₹{formatINR(activeLedgerSupplier.totalPaid)}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">
                {(activeLedgerSupplier.payments || []).length} payment disbursements
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border shadow-xs ${
                activeLedgerSupplier.balance > 0
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-emerald-50/60 border-emerald-200'
              }`}
            >
              <div
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  activeLedgerSupplier.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                Outstanding Balance Payable
              </div>
              <div
                className={`text-2xl font-black font-mono mt-1 ${
                  activeLedgerSupplier.balance > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
                ₹{formatINR(activeLedgerSupplier.balance)}
              </div>
              <div className="text-[10px] text-slate-600 mt-1">
                {activeLedgerSupplier.balance > 0 ? 'Pending vendor payment' : 'All supplier bills settled'}
              </div>
            </div>
          </div>

          {/* Detailed Ledger Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Receipt size={16} className="text-[#0284C7]" />
                  <span>Itemized Supplier Ledger & Bill History</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Every bill number, site delivery, and payment disbursement with running balance
                </p>
              </div>

              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter by Bill # or text..."
                  className="w-full pl-8 pr-3 h-8 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
              </div>
            </div>

            {getSupplierLedger(activeLedgerSupplier).length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No bills or payments recorded yet for this supplier. Click &quot;+ Record Bill (with Bill #)&quot; to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A192F] text-slate-200 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Bill / Invoice No.</th>
                      <th className="py-3 px-4">Project / Site</th>
                      <th className="py-3 px-4">Particulars / Material</th>
                      <th className="py-3 px-4 text-right">Debit (Bill ₹)</th>
                      <th className="py-3 px-4 text-right">Credit (Paid ₹)</th>
                      <th className="py-3 px-4 text-right">Balance (₹)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getSupplierLedger(activeLedgerSupplier)
                      .filter((entry) => {
                        if (!ledgerSearch.trim()) return true;
                        const q = ledgerSearch.toLowerCase();
                        return (
                          (entry.billNumber && entry.billNumber.toLowerCase().includes(q)) ||
                          entry.description.toLowerCase().includes(q) ||
                          (entry.project && entry.project.toLowerCase().includes(q))
                        );
                      })
                      .map((entry) => (
                        <tr
                          key={entry.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            entry.type === 'bill' ? 'bg-white' : 'bg-emerald-50/20'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateIN(entry.date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {entry.type === 'bill' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                Material Bill
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Payment
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {entry.billNumber ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs bg-sky-50 text-sky-800 border border-sky-300 px-2 py-0.5 rounded shadow-2xs">
                                  {entry.billNumber}
                                </span>
                                {entry.receiptUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewReceiptUrl(entry.receiptUrl || null);
                                      setPreviewReceiptName(entry.receiptName || `Bill ${entry.billNumber}`);
                                    }}
                                    title="View attached bill receipt"
                                    className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded"
                                  >
                                    <Eye size={13} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium max-w-[160px] truncate">
                            {entry.project || 'General'}
                          </td>
                          <td className="py-3 px-4 text-slate-800 max-w-[260px]">
                            <div className="font-semibold text-slate-900 leading-tight">
                              {entry.description}
                            </div>
                            {entry.vehicleNumber && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Vehicle: {entry.vehicleNumber}
                              </div>
                            )}
                            {entry.mode && (
                              <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                                Mode: {PAYMENT_MODES[entry.mode] || entry.mode}
                                {entry.reference ? ` (${entry.reference})` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {entry.billAmount > 0 ? `₹${formatINR(entry.billAmount)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {entry.paidAmount > 0 ? `₹${formatINR(entry.paidAmount)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                            ₹{formatINR(entry.balance)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {entry.type === 'bill' ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteBill(entry.id, entry.billNumber || '', entry.billAmount)}
                                title="Delete Bill"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(entry.id, entry.paidAmount)}
                                title="Delete Payment Record"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Offscreen Printable Letterhead Statement */}
          <div className="hidden">
            <div
              ref={ledgerPrintRef}
              className="p-8 bg-white text-slate-900 font-sans max-w-[800px] mx-auto text-xs"
              style={{ width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}
            >
              {/* Shiv Enterprises Letterhead */}
              <div className="border-b-2 border-[#0A192F] pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-[#0A192F] uppercase">
                      {companyProfile?.companyName || 'SHIV ENTERPRISES'}
                    </h1>
                    <p className="text-[10px] font-bold tracking-widest text-[#0284C7] uppercase">
                      {companyProfile?.businessType || 'CIVIL CONTRACTORS & ENGINEERS'}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1 max-w-md whitespace-pre-line">
                      {companyProfile?.address ||
                        '104, Rose Residency CHS, Dixit Road, Vile Parle East, Mumbai - 400057'}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Phone: {companyProfile?.phone || '+91 98692 00000'} | GSTIN:{' '}
                      {companyProfile?.gstin || '27AAIFH6459C1ZA'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-[#0A192F] text-white font-mono text-[10px] font-bold rounded uppercase">
                      SUPPLIER STATEMENT
                    </span>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      Generated: {formatDateIN(todayISO())}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vendor Info Box */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vendor / Supplier:</span>
                  <div className="text-sm font-black text-slate-900">{activeLedgerSupplier.name}</div>
                  <div className="text-[11px] text-slate-600">Category: {activeLedgerSupplier.category}</div>
                  <div className="text-[11px] text-slate-600">Phone: {activeLedgerSupplier.phone}</div>
                  {activeLedgerSupplier.contactPerson && (
                    <div className="text-[11px] text-slate-600">Contact: {activeLedgerSupplier.contactPerson}</div>
                  )}
                  {activeLedgerSupplier.gstin && (
                    <div className="text-[11px] text-slate-700 font-mono">GSTIN: {activeLedgerSupplier.gstin}</div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Total Material Invoiced:</span>
                    <div className="text-sm font-black font-mono">₹{formatINR(activeLedgerSupplier.totalBilled)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 uppercase">Total Amount Paid:</span>
                    <div className="text-sm font-black font-mono text-emerald-700">₹{formatINR(activeLedgerSupplier.totalPaid)}</div>
                  </div>
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">Closing Balance Payable:</span>
                    <div className="text-base font-black font-mono text-rose-800">₹{formatINR(activeLedgerSupplier.balance)}</div>
                  </div>
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full text-left text-[10px] border border-slate-300">
                <thead className="bg-[#0A192F] text-white">
                  <tr>
                    <th className="p-2 border border-slate-800">Date</th>
                    <th className="p-2 border border-slate-800">Type</th>
                    <th className="p-2 border border-slate-800">Bill / Inv #</th>
                    <th className="p-2 border border-slate-800">Project / Description</th>
                    <th className="p-2 border border-slate-800 text-right">Debit (₹)</th>
                    <th className="p-2 border border-slate-800 text-right">Credit (₹)</th>
                    <th className="p-2 border border-slate-800 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {getSupplierLedger(activeLedgerSupplier).map((e) => (
                    <tr key={e.id} className="border-b border-slate-200">
                      <td className="p-2 font-mono whitespace-nowrap">{formatDateIN(e.date)}</td>
                      <td className="p-2 uppercase font-bold">{e.type}</td>
                      <td className="p-2 font-mono font-bold text-blue-900">{e.billNumber || '—'}</td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{e.description}</div>
                        <div className="text-[9px] text-slate-500">{e.project || ''}</div>
                      </td>
                      <td className="p-2 text-right font-mono">{e.billAmount > 0 ? `₹${formatINR(e.billAmount)}` : '—'}</td>
                      <td className="p-2 text-right font-mono text-emerald-700">{e.paidAmount > 0 ? `₹${formatINR(e.paidAmount)}` : '—'}</td>
                      <td className="p-2 text-right font-mono font-bold">₹{formatINR(e.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between items-end">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-600">Supplier Verified & Signed</span>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-900">
                    For {companyProfile?.companyName || 'SHIV ENTERPRISES'}
                  </span>
                  <div className="text-[9px] text-slate-500 uppercase">Partner / Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: SUPPLIERS DIRECTORY & OVERVIEW */
        <div className="space-y-6">
          {/* Top Title Banner */}
          <div className="bg-[#0A192F] text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#0284C7]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/20 text-[#38BDF8] border border-sky-500/30 flex items-center gap-1.5">
                    <Truck size={12} />
                    <span>Materials & Vendor Ledger</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 border border-slate-700">
                    {suppliers.length} Registered Vendors
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Suppliers & Material Bills
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Track vendor purchase invoices with mandatory bill numbers, delivery challans, material receipts, and payment settlements.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenRecordBill()}
                  className="flex items-center gap-2 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white px-4 h-10 rounded-xl text-xs font-bold shadow-lg transition-all"
                >
                  <Plus size={15} />
                  <span>+ Record Bill (with Bill #)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddSupplier}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/5 text-white border border-white/15 px-3.5 h-10 rounded-xl text-xs font-bold transition-all"
                >
                  <Building2 size={15} className="text-[#38BDF8]" />
                  <span>+ New Supplier</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Material Billed
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1">
                ₹{formatINR(totalBilled)}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {totalBillsCount} Invoices & Challans
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                Total Paid to Vendors
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1">
                ₹{formatINR(totalPaid)}
              </div>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">
                Disbursed to suppliers
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
                Outstanding Balance Payable
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-rose-700 mt-1">
                ₹{formatINR(totalBalance)}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Net liability across suppliers
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Suppliers
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-[#0284C7] mt-1">
                {suppliers.length}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Cement, Steel, RMC & Sand
              </span>
            </div>
          </div>

          {/* Search Bar & Category Filter Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by supplier name, phone, GSTIN, Bill # (e.g. INV-AMB, UT-RMC)..."
                  className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] shadow-2xs"
                />
              </div>
            </div>

            {/* Category scrollable pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#0A192F] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Suppliers ({suppliers.length})
              </button>
              {SUPPLIER_CATEGORIES.map((cat) => {
                const count = suppliers.filter((s) => s.category === cat).length;
                if (count === 0 && selectedCategory !== cat) return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-[#0284C7] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suppliers Cards Grid */}
          {filteredSuppliers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              <Truck size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No suppliers matched your search.</p>
              <p className="text-[11px] text-slate-400 mt-1">Try another keyword or register a new supplier above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  onClick={() => setActiveLedgerSupplier(supplier)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-[#0284C7]/40 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-4 sm:p-5">
                    {/* Top Row: Name & Category badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200 mb-1">
                          {supplier.category}
                        </span>
                        <h2 className="text-base font-bold text-slate-900 group-hover:text-[#0284C7] transition-colors leading-snug">
                          {supplier.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditSupplier(supplier, e)}
                          title="Edit Supplier"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSupplier(supplier.id, supplier.name, e)}
                          title="Delete Supplier"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Contact & Phone */}
                    <div className="text-xs text-slate-500 space-y-1 mb-3">
                      {supplier.contactPerson && (
                        <div className="text-slate-700 font-medium">
                          <span className="text-slate-400 text-[11px]">Contact:</span> {supplier.contactPerson}
                        </div>
                      )}
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${supplier.phone}`);
                          }}
                          className="hover:underline text-slate-700"
                        >
                          {supplier.phone}
                        </span>
                      </div>
                      {supplier.gstin && (
                        <div className="font-mono text-[10px] text-slate-500">
                          GSTIN: {supplier.gstin}
                        </div>
                      )}
                    </div>

                    {/* Financial Snapshot */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Billed</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{formatINR(supplier.totalBilled)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block uppercase font-bold">Paid</span>
                        <span className="font-mono font-bold text-emerald-700">
                          ₹{formatINR(supplier.totalPaid)}
                        </span>
                      </div>
                    </div>

                    {/* Net Balance Pill */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Net Due:</span>
                      <span
                        className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                          supplier.balance > 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        ₹{formatINR(supplier.balance)}
                      </span>
                    </div>

                    {/* Recent Bills preview */}
                    {(supplier.bills || []).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          Recent Bills:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(supplier.bills || []).slice(-3).map((b) => (
                            <span
                              key={b.id}
                              className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700"
                              title={`${b.description} (₹${formatINR(b.amount)})`}
                            >
                              #{b.billNumber}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenRecordBill(supplier, e)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-sky-700 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={13} />
                      <span>+ Bill</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenRecordPayment(supplier, e)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <CreditCard size={13} />
                      <span>₹ Pay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveLedgerSupplier(supplier)}
                      className="py-1.5 px-3 rounded-lg bg-[#0A192F] hover:bg-[#071324] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Ledger</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: RECORD MATERIAL BILL ──────────────────── */}
      {showBillModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBillModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <FileText size={16} className="text-[#38BDF8]" />
                <span>Record Material Purchase Bill</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBillModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSaveBill} className="space-y-4 pb-6">
                {/* PROMINENT BILL NUMBER FIELD */}
                <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200">
                  <label className="block text-xs font-bold text-sky-950 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash size={14} className="text-[#0284C7]" />
                      <span>Bill / Invoice / Challan Number *</span>
                    </span>
                    <span className="text-[10px] font-mono text-sky-700 uppercase font-bold">REQUIRED</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. INV-AMB/2026/1042 or CH-8891"
                    className="w-full px-3 h-11 rounded-lg border-2 border-sky-400 bg-white text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 uppercase"
                  />
                  <p className="text-[11px] text-sky-800 mt-1">
                    Enter the exact vendor tax invoice number or delivery challan number for ledger tracking.
                  </p>
                </div>

                {/* Supplier Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Material Supplier *
                  </label>
                  <select
                    required
                    value={billSupplierId}
                    onChange={(e) => {
                      setBillSupplierId(e.target.value);
                      const s = suppliers.find((x) => x.id === e.target.value);
                      if (s) setBillCategory(s.category);
                    }}
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bill Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Material Category
                    </label>
                    <select
                      value={billCategory}
                      onChange={(e) => setBillCategory(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    >
                      {SUPPLIER_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Project / Site */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site / Project Reference *
                  </label>
                  <input
                    type="text"
                    required
                    list="project-list"
                    value={billProject}
                    onChange={(e) => setBillProject(e.target.value)}
                    placeholder="e.g. Roshan Nager Borivali west"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                  <datalist id="project-list">
                    {COMMON_PROJECTS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                {/* Description & Specifications */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Material Particulars & Quantity *
                  </label>
                  <input
                    type="text"
                    required
                    value={billDesc}
                    onChange={(e) => setBillDesc(e.target.value)}
                    placeholder="e.g. 600 Bags OPC 53 Grade Cement or 16mm TMT 14.2 MT"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Delivery Vehicle / Truck No.
                    </label>
                    <input
                      type="text"
                      value={billVehicle}
                      onChange={(e) => setBillVehicle(e.target.value)}
                      placeholder="e.g. MH-04-EL-8841"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Bill Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="e.g. 234000"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                {/* Attach Receipt / Bill Photo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attach Bill Photo / Challan PDF (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleReceiptFileChange}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                  />
                  {billReceiptName && (
                    <div className="mt-1 text-[11px] text-emerald-600 font-medium">
                      ✓ Attached: {billReceiptName}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks / Site Delivery Notes
                  </label>
                  <input
                    type="text"
                    value={billNotes}
                    onChange={(e) => setBillNotes(e.target.value)}
                    placeholder="e.g. Delivered for 13th slab casting, verified by site supervisor"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Save Material Bill (Bill #{billNumber.trim() || '...'})</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: RECORD SUPPLIER PAYMENT ────────────────── */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPayModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-400" />
                <span>Record Payment to Supplier</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSavePayment} className="space-y-4 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={paySupplierId}
                    onChange={(e) => setPaySupplierId(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Due: ₹{formatINR(s.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount Paid (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 200000"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                {/* Against Bill Number selector */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Against Bill Number (Optional)
                  </label>
                  {(() => {
                    const sup = suppliers.find((s) => s.id === paySupplierId);
                    const bills = sup?.bills || [];
                    return (
                      <div className="space-y-2">
                        <select
                          value={payBillNumberRef}
                          onChange={(e) => setPayBillNumberRef(e.target.value)}
                          className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7] bg-white"
                        >
                          <option value="">-- On Account / General Advance --</option>
                          {bills.map((b) => (
                            <option key={b.id} value={b.billNumber}>
                              Bill #{b.billNumber} — {b.description} (₹{formatINR(b.amount)})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500">
                          Select the specific supplier bill number being settled or choose On Account.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'bank_transfer', label: 'Bank (RTGS/NEFT)', icon: Landmark },
                      { key: 'upi', label: 'UPI / GPay / QR', icon: QrCode },
                      { key: 'cheque', label: 'Cheque', icon: Banknote },
                      { key: 'cash', label: 'Site Cash', icon: Banknote },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPayMode(key as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                          payMode === key
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={14} className={payMode === key ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UTR / Cheque No. / Transaction Reference
                  </label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="e.g. NEFT-HDFC261018992 or Cheque #004128"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Part payment against cement supply"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Save Payment Disbursement</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ADD / EDIT SUPPLIER PROFILE ────────────── */}
      {showAddSupplierModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddSupplierModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <Building2 size={16} className="text-[#38BDF8]" />
                <span>{editingSupplier ? 'Edit Supplier Profile' : 'Register New Material Supplier'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSaveSupplier} className="space-y-4 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                    placeholder="e.g. Ambuja Cement Agency (B.K. Traders)"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Material Category *
                    </label>
                    <select
                      value={sCategory}
                      onChange={(e) => setSCategory(e.target.value as SupplierCategory)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    >
                      {SUPPLIER_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={sPhone}
                      onChange={(e) => setSPhone(e.target.value)}
                      placeholder="e.g. 98201 44552"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={sContactPerson}
                      onChange={(e) => setSContactPerson(e.target.value)}
                      placeholder="e.g. Bipin Bhai Patel"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={sGstin}
                      onChange={(e) => setSGstin(e.target.value)}
                      placeholder="e.g. 27AABCB9821K1ZZ"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Godown / Office Address
                  </label>
                  <textarea
                    rows={2}
                    value={sAddress}
                    onChange={(e) => setSAddress(e.target.value)}
                    placeholder="e.g. Godown No. 4, Western Express Highway, Dahisar East, Mumbai"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Account / UPI Details
                  </label>
                  <input
                    type="text"
                    value={sBankDetails}
                    onChange={(e) => setSBankDetails(e.target.value)}
                    placeholder="e.g. HDFC Bank A/c 50200084920199, IFSC HDFC0000142"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Terms
                  </label>
                  <input
                    type="text"
                    value={sNotes}
                    onChange={(e) => setSNotes(e.target.value)}
                    placeholder="e.g. Delivers within 24 hours of PO, 30 days credit terms"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>{editingSupplier ? 'Save Supplier Changes' : 'Register Supplier'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: RECEIPT PREVIEW MODAL ─────────────────── */}
      {previewReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
          onClick={() => setPreviewReceiptUrl(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0A192F] text-white flex items-center justify-between">
              <span className="text-xs font-bold font-mono truncate">{previewReceiptName}</span>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 min-h-[300px]">
              {previewReceiptUrl.startsWith('data:application/pdf') ? (
                <iframe src={previewReceiptUrl} className="w-full h-[60vh] border-0" title="Bill PDF preview" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewReceiptUrl}
                  alt={previewReceiptName}
                  className="max-h-[60vh] object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
