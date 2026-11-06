'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Trash2,
  Save,
  Download,
  Eye,
  Check,
  ArrowLeft,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getCompanyProfile,
  getInvoices,
  saveInvoice,
  getInvoice,
  getTemplates,
  saveTemplate,
} from '@/lib/storage';
import {
  generateId,
  formatINR,
  numberToWords,
  todayISO,
  daysFromNow,
  nextInvoiceNumber,
  calcRoundOff,
} from '@/lib/utils';
import { UNIT_OPTIONS, GST_RATES } from '@/lib/types';
import type { Invoice, LineItem, CompanyProfile, InvoiceTemplate } from '@/lib/types';
import InvoicePreview from '@/components/InvoicePreview';

function InvoiceBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_harshmaan');
  const [isQuickMode, setIsQuickMode] = useState<boolean>(true);
  const [showClientDetails, setShowClientDetails] = useState<boolean>(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Form state
  const [id, setId] = useState<string>(() => generateId());
  const [invoiceNumber, setInvoiceNumber] = useState<string>('RS 09');
  const [invoiceDate, setInvoiceDate] = useState<string>(todayISO());
  const [dueDate, setDueDate] = useState<string>(daysFromNow(15));

  // Client
  const [clientName, setClientName] = useState<string>('Harshmaan spaces LLP');
  const [clientPhone, setClientPhone] = useState<string>('98692 00000');
  const [clientAddress, setClientAddress] = useState<string>(
    '104,Rose residency Chs.Pvt.\nDixit road,\nVile Parle East,\nMumbai- 500057.'
  );
  const [clientGstin, setClientGstin] = useState<string>('27AAIFH6459C1ZA');
  const [projectName, setProjectName] = useState<string>(
    'Harshail Iris Roshan Nager Borivali West.'
  );

  // Quick mode single particulars & amount state
  const [quickParticulars, setQuickParticulars] = useState<string>(
    '12th and 13th Rcc slab work completed as per Drawing.'
  );
  const [quickAmount, setQuickAmount] = useState<string>('1980000');

  // Multi-item support (used in advanced mode)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: generateId(),
      description: '10th and 11th Rcc slab work completed as per Drawing.',
      unit: 'slab',
      quantity: 1,
      rate: 1980000,
      amount: 1980000,
    },
  ]);

  // Tax & Discounts
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const [gstEnabled, setGstEnabled] = useState<boolean>(true);
  const [gstType, setGstType] = useState<'cgst_sgst' | 'igst'>('cgst_sgst');
  const [gstRate, setGstRate] = useState<number>(18);

  const [roundOff, setRoundOff] = useState<boolean>(true);

  // Load existing profile & handle edit mode or template initialization
  useEffect(() => {
    const profile = getCompanyProfile();
    setCompanyProfile(profile);

    const loadedTemplates = getTemplates();
    setTemplates(loadedTemplates);

    const existingInvoices = getInvoices();

    if (editId) {
      const inv = getInvoice(editId);
      if (inv) {
        setId(inv.id);
        setInvoiceNumber(inv.invoiceNumber);
        setInvoiceDate(inv.invoiceDate);
        setDueDate(inv.dueDate || daysFromNow(15));
        setClientName(inv.clientName);
        setClientPhone(inv.clientPhone || '');
        setClientAddress(inv.clientAddress || '');
        setClientGstin(inv.clientGstin || '');
        setProjectName(inv.projectName || '');
        setLineItems(inv.lineItems && inv.lineItems.length > 0 ? inv.lineItems : []);
        setDiscountEnabled(inv.discountEnabled);
        setDiscountType(inv.discountType);
        setDiscountValue(inv.discountValue);
        setGstEnabled(inv.gstEnabled);
        setGstType(inv.gstType);
        setGstRate(inv.gstRate);
        setRoundOff(inv.roundOff);

        if (inv.lineItems && inv.lineItems.length === 1) {
          setIsQuickMode(true);
          setQuickParticulars(inv.lineItems[0].description);
          setQuickAmount(String(inv.lineItems[0].rate || inv.lineItems[0].amount));
        } else {
          setIsQuickMode(false);
        }
      }
    } else {
      const nextNum = nextInvoiceNumber(existingInvoices, 'RS 09');
      setInvoiceNumber(nextNum);
    }
  }, [editId]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (templateId === 'custom') {
      setClientName('');
      setClientPhone('');
      setClientAddress('');
      setClientGstin('');
      setProjectName('');
      setQuickParticulars('');
      setQuickAmount('0');
      setLineItems([
        {
          id: generateId(),
          description: '',
          unit: 'sqft',
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ]);
      const nextInvNum = nextInvoiceNumber(getInvoices(), 'INV 01');
      setInvoiceNumber(nextInvNum);
      setIsQuickMode(false);
      showToast('Switched to Custom Bill form');
      return;
    }

    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    setClientName(tpl.clientName);
    setClientPhone(tpl.clientPhone || '');
    setClientAddress(tpl.clientAddress || '');
    setClientGstin(tpl.clientGstin || '');
    setProjectName(tpl.projectName || '');

    const prefix = tpl.billPrefix || tpl.seriesPrefix || 'RS';
    const nextSeriesNum = nextInvoiceNumber(getInvoices(), `${prefix} 09`);
    setInvoiceNumber(nextSeriesNum);

    if (tpl.defaultLineItems && tpl.defaultLineItems.length > 0) {
      setLineItems(
        tpl.defaultLineItems.map((li: LineItem) => ({
          ...li,
          id: generateId(),
        }))
      );
      if (tpl.defaultLineItems.length === 1) {
        setQuickParticulars(tpl.defaultLineItems[0].description);
        setQuickAmount(String(tpl.defaultLineItems[0].rate || tpl.defaultLineItems[0].amount));
      }
    } else if (tpl.defaultParticulars) {
      setQuickParticulars(tpl.defaultParticulars);
    }

    setGstEnabled(tpl.gstEnabled ?? true);
    setGstRate(tpl.defaultGstRate || tpl.gstRate || 18);
    setIsQuickMode(true);
    showToast(`Applied ${tpl.name} format`);
  };

  const handleQuickParticularsChange = (val: string) => {
    setQuickParticulars(val);
    setLineItems((prev) => [
      {
        id: prev[0]?.id || generateId(),
        description: val,
        unit: prev[0]?.unit || 'slab',
        quantity: 1,
        rate: parseFloat(quickAmount) || 0,
        amount: parseFloat(quickAmount) || 0,
      },
    ]);
  };

  const handleQuickAmountChange = (val: string) => {
    setQuickAmount(val);
    const num = parseFloat(val) || 0;
    setLineItems((prev) => [
      {
        id: prev[0]?.id || generateId(),
        description: quickParticulars,
        unit: prev[0]?.unit || 'slab',
        quantity: 1,
        rate: num,
        amount: num,
      },
    ]);
  };

  // Calculations
  const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);

  let discountAmount = 0;
  if (discountEnabled && discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = parseFloat(((subtotal * discountValue) / 100).toFixed(2));
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  if (gstEnabled && gstRate > 0) {
    if (gstType === 'cgst_sgst') {
      const halfRate = gstRate / 2;
      cgstAmount = parseFloat(((taxableAmount * halfRate) / 100).toFixed(2));
      sgstAmount = parseFloat(((taxableAmount * halfRate) / 100).toFixed(2));
    } else {
      igstAmount = parseFloat(((taxableAmount * gstRate) / 100).toFixed(2));
    }
  }

  const rawTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
  let grandTotal = rawTotal;
  let roundOffAmount = 0;

  if (roundOff) {
    const ro = calcRoundOff(rawTotal);
    grandTotal = ro.rounded;
    roundOffAmount = ro.diff;
  }

  const amountInWords = numberToWords(grandTotal);

  const handleItemChange = (index: number, field: keyof LineItem, val: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'description' || field === 'unit') {
        (item as any)[field] = val;
      } else {
        const numVal = parseFloat(String(val)) || 0;
        (item as any)[field] = numVal;
      }

      item.amount = parseFloat((item.quantity * item.rate).toFixed(2));
      updated[index] = item;
      return updated;
    });
  };

  const handleAddItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        description: '',
        unit: 'sqft',
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) {
      setLineItems([
        {
          id: generateId(),
          description: '',
          unit: 'slab',
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ]);
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const currentInvoice: Invoice = {
    id,
    invoiceNumber: invoiceNumber.trim() || 'RS 09',
    invoiceDate,
    dueDate,
    clientName: clientName.trim(),
    clientPhone: clientPhone.trim(),
    clientAddress: clientAddress.trim(),
    clientGstin: clientGstin.trim(),
    projectName: projectName.trim(),
    lineItems,
    subtotal,
    discountEnabled,
    discountType,
    discountValue,
    discountAmount,
    gstEnabled,
    gstType,
    gstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
    roundOffAmount,
    grandTotal,
    amountInWords,
    status: editId ? (getInvoice(editId)?.status || 'unpaid') : 'unpaid',
    payments: editId ? (getInvoice(editId)?.payments || []) : [],
    totalReceived: editId ? (getInvoice(editId)?.totalReceived || 0) : 0,
    balanceDue: editId
      ? Math.max(0, grandTotal - (getInvoice(editId)?.totalReceived || 0))
      : grandTotal,
    createdAt: editId ? (getInvoice(editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveInvoice = () => {
    if (!clientName.trim()) {
      alert('Please enter Client Name before saving.');
      return;
    }
    saveInvoice(currentInvoice);
    showToast('Invoice saved successfully');
    setTimeout(() => {
      router.push('/bills');
    }, 800);
  };

  const handleDownloadPDF = async () => {
    // Prefer the offscreen container which is guaranteed to have 800px A4 layout on all devices
    const el = exportRef.current || previewRef.current || document.getElementById('invoice-printable-area');
    if (!el) {
      alert('Could not find invoice preview element.');
      return;
    }

    setIsGeneratingPdf(true);
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

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${currentInvoice.invoiceNumber}_${currentInvoice.clientName.replace(/\s+/g, '_')}.pdf`);
      showToast('PDF downloaded successfully');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-28 md:pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-neutral-700 text-xs font-medium">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/bills')}
            className="p-1.5 -ml-1.5 text-neutral-500 hover:text-neutral-900 rounded-md nav-transition"
            title="Back to bills"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 tracking-tight">
              {editId ? 'Edit bill' : 'New bill'}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Generate official contractor tax invoices with letterhead
            </p>
          </div>
        </div>

        {/* Mobile Letterhead Preview Button */}
        <button
          onClick={() => setShowMobilePreview(true)}
          className="lg:hidden flex items-center gap-1.5 bg-neutral-900 text-white px-3 h-8 rounded-lg text-xs font-medium nav-transition action-press"
          title="Preview letterhead"
        >
          <Eye size={14} />
          <span>Letterhead</span>
        </button>
      </div>

      {/* Format Selector */}
      <div className="bg-white rounded-xl p-4 border border-neutral-200 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-neutral-700">
            Select bill format & builder preset
          </span>
          <span className="text-[11px] text-neutral-500">
            Pre-fills client, site reference and GST
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Harshmaan Spaces LLP */}
          <button
            type="button"
            onClick={() => applyTemplate('tpl_harshmaan')}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left nav-transition ${
              selectedTemplateId === 'tpl_harshmaan'
                ? 'border-neutral-900 bg-neutral-50'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="w-8 h-8 rounded bg-neutral-900 text-white flex items-center justify-center font-medium text-xs">
              RS
            </div>
            <div className="overflow-hidden">
              <span className="font-medium text-xs text-neutral-900 block truncate">
                Harshmaan spaces LLP
              </span>
              <span className="text-[11px] text-neutral-500 block truncate">
                Harshail Iris Borivali (RS 08 format)
              </span>
            </div>
          </button>

          {/* Sunrise Realty */}
          <button
            type="button"
            onClick={() => applyTemplate('tpl_sunrise')}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left nav-transition ${
              selectedTemplateId === 'tpl_sunrise'
                ? 'border-neutral-900 bg-neutral-50'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="w-8 h-8 rounded bg-neutral-200 text-neutral-700 flex items-center justify-center font-medium text-xs">
              SR
            </div>
            <div className="overflow-hidden">
              <span className="font-medium text-xs text-neutral-900 block truncate">
                Sunrise Realty
              </span>
              <span className="text-[11px] text-neutral-500 block truncate">
                Sunrise Enclave Tower B
              </span>
            </div>
          </button>

          {/* Custom Blank Bill */}
          <button
            type="button"
            onClick={() => applyTemplate('custom')}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left nav-transition ${
              selectedTemplateId === 'custom'
                ? 'border-neutral-900 bg-neutral-50'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className="w-8 h-8 rounded bg-neutral-200 text-neutral-700 flex items-center justify-center font-medium text-xs">
              +
            </div>
            <div className="overflow-hidden">
              <span className="font-medium text-xs text-neutral-900 block truncate">
                Custom / Blank bill
              </span>
              <span className="text-[11px] text-neutral-500 block truncate">
                Create bill for any client
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left (55%), Live Letterhead Right (45%) on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Mode Form */}
          {isQuickMode ? (
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="text-xs font-semibold text-neutral-900">
                  Quick bill entry • {clientName}
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickMode(false)}
                  className="text-xs text-neutral-600 hover:text-neutral-900 nav-transition"
                >
                  Multi-item form
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Bill number *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. RS 09"
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Bill date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Particulars / Work done *
                </label>
                <textarea
                  rows={2}
                  required
                  value={quickParticulars}
                  onChange={(e) => handleQuickParticularsChange(e.target.value)}
                  placeholder="e.g. 12th and 13th Rcc slab work completed as per Drawing."
                  className="w-full p-3 rounded-lg border border-neutral-300 text-xs font-mono text-neutral-900 leading-snug focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Bill amount before tax (₹) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={quickAmount}
                  onChange={(e) => handleQuickAmountChange(e.target.value)}
                  placeholder="1980000"
                  className="w-full px-3 h-11 rounded-lg border border-neutral-300 font-mono font-medium text-neutral-900 text-base tabular-nums focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Live Auto Calculations Breakdown */}
              <div className="bg-neutral-50 rounded-lg p-3.5 border border-neutral-200 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-neutral-600">
                  <span>Particulars amount (A):</span>
                  <span className="font-semibold tabular-nums">
                    Rs. {parseFloat(quickAmount || '0').toLocaleString('en-IN')}.00
                  </span>
                </div>
                {gstEnabled && (
                  <>
                    <div className="flex justify-between text-neutral-600">
                      <span>Add: CGST 9% (B):</span>
                      <span className="font-semibold tabular-nums">
                        Rs. {cgstAmount.toLocaleString('en-IN')}.00
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Add: SGST 9% (C):</span>
                      <span className="font-semibold tabular-nums">
                        Rs. {sgstAmount.toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-200 text-xs">
                  <span>Total bill amount (round off):</span>
                  <span className="tabular-nums">
                    Rs. {grandTotal.toLocaleString('en-IN')}.00
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-sans italic pt-1 leading-tight">
                  ({amountInWords})
                </p>
              </div>

              {/* Collapsible Client Details */}
              <div className="border-t border-neutral-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClientDetails(!showClientDetails)}
                  className="flex items-center justify-between w-full text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  <span>
                    Client & site details: <strong>{clientName}</strong> ({projectName})
                  </span>
                  {showClientDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showClientDetails && (
                  <div className="mt-3 p-3 bg-neutral-50 rounded-lg text-xs space-y-2 border border-neutral-200">
                    <div>
                      <span className="text-[11px] font-medium text-neutral-600 block mb-0.5">
                        Client name
                      </span>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 h-8 rounded border border-neutral-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-neutral-600 block mb-0.5">
                        Address
                      </span>
                      <textarea
                        rows={2}
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        className="w-full p-2 rounded border border-neutral-300 text-xs font-mono bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] font-medium text-neutral-600 block mb-0.5">
                          Client GSTIN
                        </span>
                        <input
                          type="text"
                          value={clientGstin}
                          onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                          className="w-full px-3 h-8 rounded border border-neutral-300 text-xs font-mono uppercase bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-neutral-600 block mb-0.5">
                          Site reference
                        </span>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full px-3 h-8 rounded border border-neutral-300 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Multi-item Form */
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h2 className="text-xs font-semibold text-neutral-900">
                    Invoice details
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsQuickMode(true)}
                    className="text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    Quick mode
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Bill number *
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 h-9 rounded-lg border border-neutral-300 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Due date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Client & Project Info */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-3">
                <h2 className="text-xs font-semibold text-neutral-900">
                  Client & site information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Client / Company name *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Harshmaan spaces LLP"
                      className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Client phone
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="e.g. 98692 00000"
                      className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Site / Project reference
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Harshail Iris Roshan Nager Borivali West."
                    className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Billing address
                    </label>
                    <textarea
                      rows={2}
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="104,Rose residency Chs.Pvt. Dixit road, Mumbai- 500057."
                      className="w-full p-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Client GSTIN
                    </label>
                    <input
                      type="text"
                      value={clientGstin}
                      onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                      placeholder="27AAIFH6459C1ZA"
                      className="w-full px-3 h-9 rounded-lg border border-neutral-300 font-mono text-xs uppercase focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Items */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-neutral-900">
                    Line items ({lineItems.length})
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-900 hover:bg-neutral-100 px-2.5 h-8 rounded-lg border border-neutral-200 nav-transition"
                  >
                    <Plus size={14} /> Add item
                  </button>
                </div>

                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-neutral-500">
                          Item #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Particulars of work"
                        className="w-full px-3 h-8 rounded-md border border-neutral-300 text-xs text-neutral-900 bg-white"
                      />

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4 sm:col-span-3">
                          <label className="block text-[10px] text-neutral-500 font-medium mb-0.5">
                            Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full px-2 h-8 rounded border border-neutral-300 text-xs bg-white"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 sm:col-span-3">
                          <label className="block text-[10px] text-neutral-500 font-medium mb-0.5">
                            Qty
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-2 h-8 rounded border border-neutral-300 text-xs font-mono bg-white text-right"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-3">
                          <label className="block text-[10px] text-neutral-500 font-medium mb-0.5">
                            Rate (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full px-2 h-8 rounded border border-neutral-300 text-xs font-mono bg-white text-right"
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-3 flex justify-between sm:flex-col items-center sm:items-end">
                          <span className="text-[10px] text-neutral-500 font-medium">
                            Amount
                          </span>
                          <span className="font-semibold text-neutral-900 text-xs tabular-nums">
                            {formatINR(item.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="flex items-center justify-center gap-1.5 bg-[#0B0F17] hover:bg-[#151D2A] active:bg-[#070A0F] text-white font-medium h-10 px-4 rounded-lg text-xs nav-transition action-press border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
              <Save size={15} className="text-amber-400" /> Save bill
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium h-10 px-4 rounded-lg text-xs nav-transition action-press"
            >
              <Download size={15} />
              {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Live Exact Letterhead Preview on Desktop */}
        <div className="hidden lg:block lg:col-span-5 sticky top-20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-700 flex items-center gap-1">
              <Eye size={14} /> Official letterhead preview
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              A4 print format
            </span>
          </div>

          <div className="rounded-xl overflow-hidden border border-neutral-300 bg-neutral-100 max-h-[85vh] overflow-y-auto p-2">
            <div className="transform scale-[0.8] origin-top">
              {companyProfile && (
                <InvoicePreview
                  previewRef={previewRef}
                  invoice={currentInvoice}
                  companyProfile={companyProfile}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fullscreen Preview Modal */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden">
          <div className="bg-white rounded-t-2xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-900 text-white">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span className="font-semibold text-xs">
                  {currentInvoice.invoiceNumber} — Official Letterhead
                </span>
              </div>
              <button
                onClick={() => setShowMobilePreview(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-neutral-100">
              <div className="origin-top" style={{ minWidth: '340px' }}>
                {companyProfile && (
                  <InvoicePreview
                    invoice={currentInvoice}
                    companyProfile={companyProfile}
                  />
                )}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-neutral-200 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMobilePreview(false);
                  handleSaveInvoice();
                }}
                className="h-10 bg-[#0B0F17] hover:bg-[#151D2A] text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 nav-transition action-press border border-white/[0.08]"
              >
                <Save size={14} className="text-amber-400" /> Save
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="h-10 bg-neutral-900 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 nav-transition action-press"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Floating Bottom Bar */}
      <div className="fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-xs border-t border-neutral-200 md:hidden z-20">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <div className="flex-1">
            <span className="text-[10px] text-neutral-500 font-medium block">
              Total bill
            </span>
            <span className="text-sm font-semibold text-neutral-900 tabular-nums">
              ₹ {grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowMobilePreview(true)}
            className="h-10 px-3 bg-neutral-100 text-neutral-900 rounded-lg border border-neutral-200 text-xs font-medium flex items-center gap-1"
          >
            <Eye size={15} />
            <span>View</span>
          </button>

          <button
            type="button"
            onClick={handleSaveInvoice}
            className="flex-1 h-10 bg-[#0B0F17] hover:bg-[#151D2A] text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 nav-transition action-press border border-white/[0.08]"
          >
            <Save size={15} className="text-amber-400" />
            <span>Save bill</span>
          </button>
        </div>
      </div>
      {/* Dedicated Off-Screen Export Container (Always rendered with exact standard A4 dimensions on all devices) */}
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
        {companyProfile && (
          <div ref={exportRef}>
            <InvoicePreview
              invoice={currentInvoice}
              companyProfile={companyProfile}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewBillPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-neutral-500 text-xs">
          Loading invoice builder...
        </div>
      }
    >
      <InvoiceBuilderContent />
    </Suspense>
  );
}
