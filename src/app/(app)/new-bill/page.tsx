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
  Building2,
  MapPin,
} from 'lucide-react';
import {
  getCompanyProfile,
  getInvoices,
  saveInvoice,
  getInvoice,
  getTemplates,
  saveTemplate,
  getCustomBillCategories,
  saveCustomBillCategory,
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
import { UNIT_OPTIONS, GST_RATES, BILL_PARTICULAR_CATEGORIES } from '@/lib/types';
import type { Invoice, LineItem, CompanyProfile, InvoiceTemplate, InvoiceCreator } from '@/lib/types';
import InvoicePreview from '@/components/InvoicePreview';
import { getCurrentUser } from '@/lib/auth';
import { recordBillActivity } from '@/lib/tracking';
import { syncInvoiceToCloud } from '@/lib/cloudSync';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

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

  // Lock body scroll when mobile letterhead preview is open
  useBodyScrollLock(showMobilePreview);
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

  // Project / Site Sub-division selection state
  const [showAddProjectInput, setShowAddProjectInput] = useState<boolean>(false);
  const [newProjectInput, setNewProjectInput] = useState<string>('');
  const [customProjects, setCustomProjects] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('se_custom_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Custom Bill Particular Categories
  const [customBillCategories, setCustomBillCategories] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return getCustomBillCategories();
  });

  const allBillCategories = React.useMemo(() => {
    return Array.from(new Set([...BILL_PARTICULAR_CATEGORIES, ...customBillCategories]));
  }, [customBillCategories]);

  // Line items state (supports multiple particulars with description, category, and amount)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: generateId(),
      description: '12th and 13th Rcc slab work completed as per Drawing.',
      category: 'RCC Slab Work',
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

        setIsQuickMode(true);
      }
    } else {
      const nextNum = nextInvoiceNumber(existingInvoices, 'RS 09');
      setInvoiceNumber(nextNum);

      // Check for milestone draft from Project RA Tracking
      if (typeof window !== 'undefined') {
        const draftJson = sessionStorage.getItem('shiv_milestone_bill_draft');
        if (draftJson) {
          try {
            const draft = JSON.parse(draftJson);
            sessionStorage.removeItem('shiv_milestone_bill_draft');
            if (draft.clientName) setClientName(draft.clientName);
            if (draft.projectName) setProjectName(draft.projectName);
            if (draft.particulars && draft.amountBeforeTax) {
              setLineItems([
                {
                  id: generateId(),
                  description: draft.particulars,
                  category: 'RCC Slab Work',
                  unit: 'item',
                  quantity: 1,
                  rate: draft.amountBeforeTax,
                  amount: draft.amountBeforeTax,
                },
              ]);
            }
          } catch (e) {
            console.error('Failed to parse milestone bill draft:', e);
          }
        }
      }
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
      setLineItems([
        {
          id: generateId(),
          description: '',
          category: 'General Civil Work',
          unit: 'item',
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ]);
      const nextInvNum = nextInvoiceNumber(getInvoices(), 'INV 01');
      setInvoiceNumber(nextInvNum);
      setIsQuickMode(true);
      showToast('Switched to Custom Bill form');
      return;
    }

    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    setClientName(tpl.clientName);
    setClientPhone(tpl.clientPhone || '');
    setClientAddress(tpl.clientAddress || '');
    setClientGstin(tpl.clientGstin || '');

    // Choose active project from template's projects or default projectName
    const chosenProject =
      tpl.projects && tpl.projects.length > 0
        ? tpl.projects.includes(tpl.projectName)
          ? tpl.projectName
          : tpl.projects[0]
        : tpl.projectName || '';
    setProjectName(chosenProject);

    const prefix = tpl.billPrefix || tpl.seriesPrefix || 'RS';
    const nextSeriesNum = nextInvoiceNumber(getInvoices(), `${prefix} 09`);
    setInvoiceNumber(nextSeriesNum);

    if (tpl.defaultLineItems && tpl.defaultLineItems.length > 0) {
      setLineItems(
        tpl.defaultLineItems.map((li: LineItem) => ({
          ...li,
          id: generateId(),
          category: li.category || 'RCC Slab Work',
        }))
      );
    } else if (tpl.defaultParticulars) {
      setLineItems([
        {
          id: generateId(),
          description: tpl.defaultParticulars,
          category: 'RCC Slab Work',
          unit: 'slab',
          quantity: 1,
          rate: 1980000,
          amount: 1980000,
        },
      ]);
    }

    setGstEnabled(tpl.gstEnabled ?? true);
    setGstRate(tpl.defaultGstRate || tpl.gstRate || 18);
    setIsQuickMode(true);
    showToast(`Applied ${tpl.name} format`);
  };

  // Find active template object
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Active builder project sub-divisions
  const currentBuilderProjects: string[] = React.useMemo(() => {
    if (selectedTemplateId === 'custom') {
      const allTplProjects = templates.flatMap((t) => t.projects || (t.projectName ? [t.projectName] : []));
      const combined = Array.from(new Set([...customProjects, ...allTplProjects])).filter(Boolean);
      return combined.length > 0
        ? combined
        : ['Harshail Iris Roshan Nager Borivali West.', 'Sunrise Enclave Tower B Substructure'];
    }
    if (activeTemplate) {
      if (Array.isArray(activeTemplate.projects) && activeTemplate.projects.length > 0) {
        return activeTemplate.projects;
      }
      return [activeTemplate.projectName].filter(Boolean);
    }
    return [projectName].filter(Boolean);
  }, [selectedTemplateId, activeTemplate, customProjects, templates, projectName]);

  const handleSelectProject = (proj: string) => {
    setProjectName(proj);

    // Save to template so this builder remembers this as the active project
    if (selectedTemplateId && selectedTemplateId !== 'custom') {
      const updated = templates.map((t) => {
        if (t.id === selectedTemplateId) {
          return { ...t, projectName: proj };
        }
        return t;
      });
      setTemplates(updated);
      const targetTpl = updated.find((t) => t.id === selectedTemplateId);
      if (targetTpl) saveTemplate(targetTpl);
    }
    showToast(`Site updated: ${proj}`);
  };

  const handleAddNewProject = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    if (selectedTemplateId === 'custom') {
      const nextCustom = Array.from(new Set([trimmed, ...customProjects]));
      setCustomProjects(nextCustom);
      if (typeof window !== 'undefined') {
        localStorage.setItem('se_custom_projects', JSON.stringify(nextCustom));
      }
      setProjectName(trimmed);
      showToast(`Added custom project: ${trimmed}`);
      return;
    }

    if (activeTemplate) {
      const currentProjects = activeTemplate.projects || [activeTemplate.projectName].filter(Boolean);
      const updatedProjects = Array.from(new Set([trimmed, ...currentProjects]));
      const updatedTpl: InvoiceTemplate = {
        ...activeTemplate,
        projects: updatedProjects,
        projectName: trimmed,
      };
      saveTemplate(updatedTpl);
      setTemplates((prev) => prev.map((t) => (t.id === selectedTemplateId ? updatedTpl : t)));
      setProjectName(trimmed);
      showToast(`Added project for ${activeTemplate.clientName}: ${trimmed}`);
    }
  };

  const handleRemoveProject = (projToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove project "${projToRemove}" from this builder's presets?`)) return;

    if (selectedTemplateId === 'custom') {
      const nextCustom = customProjects.filter((p) => p !== projToRemove);
      setCustomProjects(nextCustom);
      if (typeof window !== 'undefined') {
        localStorage.setItem('se_custom_projects', JSON.stringify(nextCustom));
      }
      if (projectName === projToRemove) setProjectName('');
      showToast(`Removed project: ${projToRemove}`);
      return;
    }

    if (activeTemplate) {
      const currentProjects = activeTemplate.projects || [activeTemplate.projectName].filter(Boolean);
      const updatedProjects = currentProjects.filter((p) => p !== projToRemove);
      const fallback = updatedProjects[0] || '';
      const updatedTpl: InvoiceTemplate = {
        ...activeTemplate,
        projects: updatedProjects,
        projectName: projectName === projToRemove ? fallback : activeTemplate.projectName,
      };
      saveTemplate(updatedTpl);
      setTemplates((prev) => prev.map((t) => (t.id === selectedTemplateId ? updatedTpl : t)));
      if (projectName === projToRemove) {
        setProjectName(fallback);
      }
      showToast(`Removed project: ${projToRemove}`);
    }
  };

  const handleUpdateParticular = (
    id: string,
    field: 'description' | 'amount' | 'category',
    value: any
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'description') {
          return { ...item, description: value };
        }
        if (field === 'category') {
          return { ...item, category: value };
        }
        if (field === 'amount') {
          const num = parseFloat(value) || 0;
          return { ...item, rate: num, amount: num };
        }
        return item;
      })
    );
  };

  const handleAddParticular = () => {
    const newItem: LineItem = {
      id: generateId(),
      description: '',
      category: 'RCC Slab Work',
      unit: 'slab',
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    setLineItems((prev) => [...prev, newItem]);
    showToast('Added new particular row');
  };

  const handleRemoveParticular = (id: string) => {
    if (lineItems.length <= 1) {
      alert('At least one particular is required.');
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Particular removed');
  };

  const handleSaveNewBillCategory = (catName: string, forItemId?: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    const updated = saveCustomBillCategory(trimmed);
    setCustomBillCategories(updated);
    if (forItemId) {
      handleUpdateParticular(forItemId, 'category', trimmed);
    }
    showToast(`Category "${trimmed}" added`);
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

    const user = getCurrentUser();
    const existing = editId ? getInvoice(editId) : null;
    const creatorInfo: InvoiceCreator = user ? {
      username: user.username,
      name: user.displayName || user.fullName,
      role: user.roleTitle || user.role,
      timestamp: new Date().toISOString(),
    } : {
      username: 'Harsh16',
      name: 'Harsh (Admin)',
      role: 'Admin / Managing Partner',
      timestamp: new Date().toISOString(),
    };

    const invoiceToSave: Invoice = {
      ...currentInvoice,
      createdBy: existing?.createdBy || creatorInfo,
      updatedBy: creatorInfo,
    };

    saveInvoice(invoiceToSave);
    syncInvoiceToCloud(invoiceToSave);

    // Record tracking event
    const activeUser = user || {
      id: 'usr_harsh16',
      username: 'Harsh16',
      email: 'harsh16@shiventerprises.com',
      fullName: 'Harsh (Admin)',
      displayName: 'Harsh',
      role: 'admin' as const,
      roleTitle: 'Admin / Managing Partner',
      companyName: 'Shiv Enterprises Civil Contractors',
      avatarInitials: 'HP',
      loginTime: new Date().toISOString(),
    };

    recordBillActivity({
      billId: invoiceToSave.id,
      invoiceNumber: invoiceToSave.invoiceNumber,
      clientName: invoiceToSave.clientName,
      grandTotal: invoiceToSave.grandTotal,
      action: editId ? 'updated' : 'created',
      user: activeUser,
    });

    showToast(editId ? 'Invoice updated successfully' : 'Invoice saved & tracked successfully');
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
      recordBillActivity({
        billId: currentInvoice.id,
        invoiceNumber: currentInvoice.invoiceNumber,
        clientName: currentInvoice.clientName,
        grandTotal: currentInvoice.grandTotal,
        action: 'downloaded_pdf',
      });
      showToast('PDF downloaded successfully');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-44 md:pb-12">
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
                {selectedTemplateId === 'tpl_harshmaan' && projectName
                  ? projectName
                  : 'Harshail Iris Borivali (RS 08 format)'}
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
                {selectedTemplateId === 'tpl_sunrise' && projectName
                  ? projectName
                  : 'Sunrise Enclave Tower B'}
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
                {selectedTemplateId === 'custom' && projectName
                  ? projectName
                  : 'Create bill for any client'}
              </span>
            </div>
          </button>
        </div>

        {/* ─── PROJECT / SITE SUB-DIVISION SELECTOR ─── */}
        <div className="mt-4 pt-4 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0284C7]" />
                <span className="text-xs font-semibold text-slate-900">
                  Select Project / Site Sub-Division
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200/80">
                  {selectedTemplateId === 'custom'
                    ? clientName || 'Custom Client'
                    : activeTemplate?.clientName || 'Builder'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose the project/site this bill is generated for (printed as{' '}
                <strong className="font-mono text-slate-700">&quot;Ref: [Project]&quot;</strong> on official letterhead)
              </p>
            </div>

            {!showAddProjectInput && (
              <button
                type="button"
                onClick={() => setShowAddProjectInput(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100/80 px-2.5 py-1.5 rounded-lg border border-sky-200 transition self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Project / Site</span>
              </button>
            )}
          </div>

          {/* Add New Project Input */}
          {showAddProjectInput && (
            <div className="mb-3.5 p-3 rounded-xl bg-sky-50/70 border border-sky-200 transition">
              <span className="text-[11px] font-semibold text-slate-800 block mb-1.5">
                Add new site / project sub-division for{' '}
                {selectedTemplateId === 'custom'
                  ? clientName || 'this bill'
                  : activeTemplate?.clientName}
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newProjectInput}
                    onChange={(e) => setNewProjectInput(e.target.value)}
                    placeholder="e.g. Harshail Heights Dahisar East or Tower C Wing 2"
                    className="w-full text-xs pl-8 pr-3 h-8 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0284C7] focus:border-[#0284C7]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newProjectInput.trim()) {
                          handleAddNewProject(newProjectInput);
                          setNewProjectInput('');
                          setShowAddProjectInput(false);
                        }
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (newProjectInput.trim()) {
                        handleAddNewProject(newProjectInput);
                        setNewProjectInput('');
                        setShowAddProjectInput(false);
                      }
                    }}
                    className="px-3 h-8 text-xs font-medium rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white transition flex items-center gap-1 shadow-xs"
                  >
                    <Check className="w-3 h-3" />
                    <span>Add &amp; Select</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProjectInput(false);
                      setNewProjectInput('');
                    }}
                    className="px-2.5 h-8 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Project List Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {currentBuilderProjects.map((proj) => {
              const isSelected = projectName.trim().toLowerCase() === proj.trim().toLowerCase();
              return (
                <div
                  key={proj}
                  className={`group inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#0A192F] border-[#0A192F] text-white font-medium shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                  onClick={() => handleSelectProject(proj)}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-[#38BDF8]' : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  />
                  <span className="truncate max-w-[240px] sm:max-w-[340px]">{proj}</span>
                  {isSelected ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0284C7] text-white">
                      Active Ref
                    </span>
                  ) : null}

                  {/* Remove Project Button */}
                  {currentBuilderProjects.length > 1 && (
                    <button
                      type="button"
                      title={`Remove ${proj}`}
                      onClick={(e) => handleRemoveProject(proj, e)}
                      className={`ml-1 p-0.5 rounded transition ${
                        isSelected
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {currentBuilderProjects.length === 0 && (
              <span className="text-xs text-neutral-400 italic">
                No site sub-divisions found. Click &quot;+ Add Project / Site&quot; to add one.
              </span>
            )}
          </div>
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

              {/* PARTICULARS / WORK DONE SECTION */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-900">
                      Particulars / Work done *
                    </label>
                    <span className="text-[11px] text-neutral-500">
                      Write slab casting, RCC, masonry or add multiple work items
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddParticular}
                    className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-[#0A192F] hover:bg-[#0284C7] text-white text-[11px] font-medium shadow-xs transition"
                  >
                    <Plus size={13} />
                    <span>+ Add Particular</span>
                  </button>
                </div>

                {/* List of Particulars */}
                <div className="space-y-3">
                  {lineItems.map((item, index) => {
                    const serialLetter = String.fromCharCode(65 + index); // A, B, C...
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#0A192F] text-white flex items-center justify-center font-bold text-[11px]">
                              {serialLetter}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              Particular #{index + 1}
                            </span>
                            {item.category && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800">
                                {item.category}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveParticular(item.id)}
                                className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition"
                                title="Remove this particular"
                              >
                                <Trash2 size={12} />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Particulars Textarea */}
                        <div>
                          <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                            Work Description *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={item.description}
                            onChange={(e) => handleUpdateParticular(item.id, 'description', e.target.value)}
                            placeholder="e.g. 12th and 13th Rcc slab work completed as per Drawing."
                            className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs font-mono text-neutral-900 leading-snug bg-white focus:outline-none focus:border-neutral-900"
                          />
                        </div>

                        {/* Category & Amount Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-medium text-neutral-700">
                                Work Category
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const custom = prompt('Enter new work category name (e.g. Shuttering, Centering, Plumbing):');
                                  if (custom && custom.trim()) {
                                    handleSaveNewBillCategory(custom.trim(), item.id);
                                  }
                                }}
                                className="text-[10px] text-neutral-900 hover:underline font-medium"
                              >
                                + Add Category
                              </button>
                            </div>
                            <select
                              value={item.category || 'RCC Slab Work'}
                              onChange={(e) => {
                                if (e.target.value === '__add_new__') {
                                  const custom = prompt('Enter new work category name (e.g. Shuttering, Centering, Plumbing):');
                                  if (custom && custom.trim()) {
                                    handleSaveNewBillCategory(custom.trim(), item.id);
                                  }
                                } else {
                                  handleUpdateParticular(item.id, 'category', e.target.value);
                                }
                              }}
                              className="w-full px-2.5 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
                            >
                              {allBillCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                              <option value="__add_new__">+ Add custom category...</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                              Amount before tax (₹) *
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              required
                              value={item.amount || ''}
                              onChange={(e) => handleUpdateParticular(item.id, 'amount', e.target.value)}
                              placeholder="e.g. 1980000"
                              className="w-full px-3 h-9 rounded-lg border border-neutral-300 font-mono font-medium text-neutral-900 text-sm tabular-nums bg-white focus:outline-none focus:border-neutral-900"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Another Particular Button */}
                <button
                  type="button"
                  onClick={handleAddParticular}
                  className="w-full py-2.5 rounded-lg border-2 border-dashed border-neutral-300 hover:border-neutral-400 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 transition flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>+ Add another particular / work item</span>
                </button>
              </div>

              {/* Live Auto Calculations Breakdown */}
              <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between font-semibold text-neutral-800 border-b border-neutral-200/80 pb-2">
                  <span>Particulars breakdown ({lineItems.length}):</span>
                  <span>Amount (₹)</span>
                </div>

                {lineItems.map((item, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const descPreview = item.description.trim() || `Particular #${idx + 1}`;
                  return (
                    <div key={item.id} className="flex justify-between items-start text-neutral-600 gap-2">
                      <span className="truncate max-w-[260px] sm:max-w-[360px]">
                        <strong className="text-neutral-900 mr-1.5">{letter}.</strong>
                        {descPreview}
                        {item.category && (
                          <span className="ml-1.5 text-[10px] font-sans px-1.5 py-0.2 rounded bg-neutral-200/70 text-neutral-700">
                            {item.category}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums whitespace-nowrap">
                        Rs. {(item.amount || 0).toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  );
                })}

                <div className="flex justify-between text-neutral-900 font-bold pt-2 border-t border-neutral-200">
                  <span>Total particulars before tax (A):</span>
                  <span className="tabular-nums">
                    Rs. {subtotal.toLocaleString('en-IN')}.00
                  </span>
                </div>

                {gstEnabled && (
                  <>
                    <div className="flex justify-between text-neutral-600">
                      <span>Add: CGST {(gstRate / 2)}% (B):</span>
                      <span className="font-semibold tabular-nums">
                        Rs. {cgstAmount.toLocaleString('en-IN')}.00
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Add: SGST {(gstRate / 2)}% (C):</span>
                      <span className="font-semibold tabular-nums">
                        Rs. {sgstAmount.toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between font-black text-neutral-900 pt-2 border-t-2 border-neutral-300 text-sm">
                  <span>Total bill amount (round off):</span>
                  <span className="tabular-nums text-neutral-950">
                    Rs. {grandTotal.toLocaleString('en-IN')}.00
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 font-sans italic pt-1 leading-tight">
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
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-medium text-neutral-600 block">
                            Site reference
                          </span>
                          {projectName.trim() &&
                            !currentBuilderProjects.some(
                              (p) => p.trim().toLowerCase() === projectName.trim().toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onClick={() => handleAddNewProject(projectName)}
                                className="text-[10px] text-sky-700 hover:text-sky-800 font-medium flex items-center gap-0.5"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                Save as preset
                              </button>
                            )}
                        </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-700">
                      Site / Project reference
                    </label>
                    {projectName.trim() &&
                      !currentBuilderProjects.some(
                        (p) => p.trim().toLowerCase() === projectName.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={() => handleAddNewProject(projectName)}
                          className="text-[10px] text-sky-700 hover:text-sky-800 font-medium flex items-center gap-0.5"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          Save as preset
                        </button>
                      )}
                  </div>
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
              className="flex items-center justify-center gap-2 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-medium h-11 px-4 rounded-xl text-xs nav-transition action-press shadow-xs"
            >
              <Save size={15} /> Save bill
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center justify-center gap-2 bg-[#0A192F] hover:bg-[#15233E] text-white font-medium h-11 px-4 rounded-xl text-xs nav-transition action-press shadow-xs"
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
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMobilePreview(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-900 text-white shrink-0">
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

            <div className="flex-1 overflow-y-auto modal-scrollable p-2 bg-neutral-100">
              <div className="origin-top" style={{ minWidth: '340px' }}>
                {companyProfile && (
                  <InvoicePreview
                    invoice={currentInvoice}
                    companyProfile={companyProfile}
                  />
                )}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowMobilePreview(false);
                  handleSaveInvoice();
                }}
                className="h-11 bg-[#0284C7] hover:bg-[#0369A1] text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 nav-transition action-press shadow-xs"
              >
                <Save size={14} /> Save
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="h-11 bg-[#0A192F] text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 nav-transition action-press shadow-xs"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Floating Bottom Bar */}
      <div className="fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-xs border-t border-slate-200 md:hidden z-20">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <div className="flex-1">
            <span className="text-[10px] text-slate-500 font-medium block">
              Total bill
            </span>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              ₹ {grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowMobilePreview(true)}
            className="h-10 px-3 bg-slate-100 text-slate-900 rounded-xl border border-slate-200 text-xs font-medium flex items-center gap-1"
          >
            <Eye size={15} />
            <span>View</span>
          </button>

          <button
            type="button"
            onClick={handleSaveInvoice}
            className="flex-1 h-10 bg-[#0284C7] hover:bg-[#0369A1] text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 nav-transition action-press shadow-xs"
          >
            <Save size={15} />
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
