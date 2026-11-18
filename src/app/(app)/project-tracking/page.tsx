'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  FileSpreadsheet,
  FileText,
  Download,
  Share2,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  IndianRupee,
  Calendar,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  Percent,
  HardHat,
  Truck,
  RefreshCw,
  Printer,
  ChevronRight,
  Sparkles,
  X,
  ChevronDown,
  Pencil,
  Sliders,
  DollarSign,
  Scale,
  Users,
} from 'lucide-react';
import {
  getProjectsRA,
  saveProjectRA,
  computeProjectRACalculations,
  exportProjectRAToExcel,
  createNewProjectRA,
  deleteProjectRA,
  CONCRETE_GRADES,
  ProjectRAContract,
  ProjectStage,
  RmcDeductionItem,
  MaterialAdjustmentItem,
} from '@/lib/projectTracking';
import { getCompanyProfile } from '@/lib/storage';
import type { CompanyProfile } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import ProjectRAPrintable from '@/components/ProjectRAPrintable';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export default function ProjectTrackingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRAContract[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('roshan-nager-borivali');
  const [activeTab, setActiveTab] = useState<'milestones' | 'reconciliation' | 'rmc' | 'subcontractors' | 'preview'>('milestones');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>(['s-14', 's-15']); // Default 12th & 13th slab
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── Site Management State ─────────────────────────────────────
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [newSiteProjectName, setNewSiteProjectName] = useState('');
  const [newSiteBuilderName, setNewSiteBuilderName] = useState('');
  const [newSiteContractDate, setNewSiteContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSiteArea, setNewSiteArea] = useState('60000');
  const [newSiteLabourRate, setNewSiteLabourRate] = useState('600');
  const [newSiteMaterialRate, setNewSiteMaterialRate] = useState('400');
  const [newSiteCloneStages, setNewSiteCloneStages] = useState(true);

  // Edit Site Parameter State
  const [editSiteBuilder, setEditSiteBuilder] = useState('');
  const [editSiteArea, setEditSiteArea] = useState('');
  const [editSiteLabourRate, setEditSiteLabourRate] = useState('');
  const [editSiteMaterialRate, setEditSiteMaterialRate] = useState('');

  // ─── Milestone Stage Add / Edit Modal State ────────────────────
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [stageDescription, setStageDescription] = useState('');
  const [stagePercentage, setStagePercentage] = useState('');
  const [stageLabourAmount, setStageLabourAmount] = useState('');
  const [stageMaterialAmount, setStageMaterialAmount] = useState('');
  const [stageStatus, setStageStatus] = useState<ProjectStage['status']>('pending');
  const [stageBilledInvoiceNumber, setStageBilledInvoiceNumber] = useState('');
  const [stageNotes, setStageNotes] = useState('');

  // ─── RMC Deductions Modal State ────────────────────────────────
  const [showRmcModal, setShowRmcModal] = useState(false);
  const [editingRmc, setEditingRmc] = useState<RmcDeductionItem | null>(null);
  const [rmcGrade, setRmcGrade] = useState('M-25');
  const [rmcQuantity, setRmcQuantity] = useState('');
  const [rmcRate, setRmcRate] = useState('');
  const [rmcFromDate, setRmcFromDate] = useState('2025-05-04');
  const [rmcToDate, setRmcToDate] = useState('2026-11-01');
  const [rmcNotes, setRmcNotes] = useState('');

  // ─── Subcontractor & Supplier Deductions Modal State ───────────
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<MaterialAdjustmentItem | null>(null);
  const [adjTitle, setAdjTitle] = useState('');
  const [adjBillNumber, setAdjBillNumber] = useState('');
  const [adjType, setAdjType] = useState<'add' | 'deduct'>('deduct');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  // Lock mobile body scroll whenever any popup is open
  useBodyScrollLock(
    showNewSiteModal ||
    showEditSiteModal ||
    showStageModal ||
    showRmcModal ||
    showAdjustmentModal
  );

  // Offscreen printable refs for PDF generation
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = getProjectsRA();
    setProjects(list);
    if (list.length > 0 && !list.find((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(list[0].id);
    }
    setCompanyProfile(getCompanyProfile());
  }, []);

  const project = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Layers className="w-12 h-12 text-neutral-400 mx-auto mb-3 animate-spin" />
          <p className="text-neutral-600">Loading Project RA Tracking...</p>
        </div>
      </div>
    );
  }

  const calc = computeProjectRACalculations(project);

  // Update project helper
  const handleUpdateProject = (updated: ProjectRAContract) => {
    saveProjectRA(updated);
    const updatedList = projects.map((p) => (p.id === updated.id ? updated : p));
    setProjects(updatedList);
    showToast('Changes saved successfully');
  };

  // ─── Site Management Handlers ──────────────────────────────────
  const handleCreateNewSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteProjectName.trim()) {
      alert('Please enter a site / project name.');
      return;
    }
    const created = createNewProjectRA({
      projectName: newSiteProjectName,
      builderName: newSiteBuilderName || 'Builder / Developer',
      billingAreaSqFt: parseFloat(newSiteArea) || 50000,
      labourRate: parseFloat(newSiteLabourRate) || 600,
      materialRate: parseFloat(newSiteMaterialRate) || 400,
      contractDate: newSiteContractDate,
      cloneStandardStages: newSiteCloneStages,
    });

    const updatedList = getProjectsRA();
    setProjects(updatedList);
    setSelectedProjectId(created.id);
    setShowNewSiteModal(false);
    setNewSiteProjectName('');
    setNewSiteBuilderName('');
    showToast(`Site "${created.projectName}" created successfully`);
  };

  const handleOpenEditSite = () => {
    setEditSiteBuilder(project.builderName);
    setEditSiteArea(project.billingAreaSqFt.toString());
    setEditSiteLabourRate(project.labourRate.toString());
    setEditSiteMaterialRate(project.materialRate.toString());
    setShowEditSiteModal(true);
  };

  const handleSaveEditSite = (e: React.FormEvent) => {
    e.preventDefault();
    const newArea = parseFloat(editSiteArea) || project.billingAreaSqFt;
    const newLRate = parseFloat(editSiteLabourRate) || project.labourRate;
    const newMRate = parseFloat(editSiteMaterialRate) || project.materialRate;

    // Recalculate stages amounts based on new area & rates
    const updatedStages = project.stages.map((s) => ({
      ...s,
      labourAmount: Math.round((newArea * newLRate * s.percentage) / 100),
      materialAmount: Math.round((newArea * newMRate * s.percentage) / 100),
    }));

    const updated: ProjectRAContract = {
      ...project,
      builderName: editSiteBuilder.trim() || project.builderName,
      billingAreaSqFt: newArea,
      labourRate: newLRate,
      materialRate: newMRate,
      stages: updatedStages,
    };

    handleUpdateProject(updated);
    setShowEditSiteModal(false);
    showToast('Site parameters updated');
  };

  const handleDeleteSite = (siteId: string) => {
    if (projects.length <= 1) {
      alert('You cannot delete the only remaining site.');
      return;
    }
    const target = projects.find((p) => p.id === siteId);
    if (!confirm(`Are you sure you want to delete "${target?.projectName}"?`)) return;

    deleteProjectRA(siteId);
    const remaining = getProjectsRA();
    setProjects(remaining);
    setSelectedProjectId(remaining[0].id);
    showToast('Site deleted');
  };

  // ─── Milestone Stage Handlers ──────────────────────────────────
  const handleOpenAddStage = () => {
    setEditingStage(null);
    setStageDescription('');
    setStagePercentage('');
    setStageLabourAmount('');
    setStageMaterialAmount('');
    setStageStatus('pending');
    setStageBilledInvoiceNumber('');
    setStageNotes('');
    setShowStageModal(true);
  };

  const handleOpenEditStage = (stage: ProjectStage) => {
    setEditingStage(stage);
    setStageDescription(stage.description);
    setStagePercentage(stage.percentage.toString());
    setStageLabourAmount(stage.labourAmount.toString());
    setStageMaterialAmount(stage.materialAmount.toString());
    setStageStatus(stage.status);
    setStageBilledInvoiceNumber(stage.billedInvoiceNumber || '');
    setStageNotes(stage.notes || '');
    setShowStageModal(true);
  };

  const handlePercentageChange = (val: string) => {
    setStagePercentage(val);
    const num = parseFloat(val);
    if (!isNaN(num) && project) {
      const calcLabour = Math.round((project.billingAreaSqFt * project.labourRate * num) / 100);
      const calcMaterial = Math.round((project.billingAreaSqFt * project.materialRate * num) / 100);
      setStageLabourAmount(calcLabour.toString());
      setStageMaterialAmount(calcMaterial.toString());
    }
  };

  const handleSaveStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageDescription.trim()) {
      alert('Please enter a description for the item.');
      return;
    }
    const pct = parseFloat(stagePercentage) || 0;
    const lAmt = parseFloat(stageLabourAmount) || Math.round((project.billingAreaSqFt * project.labourRate * pct) / 100);
    const mAmt = parseFloat(stageMaterialAmount) || Math.round((project.billingAreaSqFt * project.materialRate * pct) / 100);

    if (editingStage) {
      const updatedStages = project.stages.map((s) => {
        if (s.id !== editingStage.id) return s;
        return {
          ...s,
          description: stageDescription.trim(),
          percentage: pct,
          labourAmount: lAmt,
          materialAmount: mAmt,
          status: stageStatus,
          billedInvoiceNumber: stageBilledInvoiceNumber.trim() || undefined,
          notes: stageNotes.trim() || undefined,
        };
      });
      handleUpdateProject({ ...project, stages: updatedStages });
      showToast('Milestone item updated');
    } else {
      const nextSr = project.stages.length > 0 ? Math.max(...project.stages.map((s) => s.sr)) + 1 : 1;
      const newStage: ProjectStage = {
        id: `s-${Date.now()}`,
        sr: nextSr,
        description: stageDescription.trim(),
        percentage: pct,
        labourAmount: lAmt,
        materialAmount: mAmt,
        status: stageStatus,
        billedInvoiceNumber: stageBilledInvoiceNumber.trim() || undefined,
        notes: stageNotes.trim() || undefined,
      };
      handleUpdateProject({ ...project, stages: [...project.stages, newStage] });
      showToast('New milestone item added');
    }
    setShowStageModal(false);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!confirm('Are you sure you want to delete this milestone item?')) return;
    const filtered = project.stages
      .filter((s) => s.id !== stageId)
      .map((s, idx) => ({ ...s, sr: idx + 1 }));
    handleUpdateProject({ ...project, stages: filtered });
    showToast('Milestone item removed');
  };

  // Toggle stage completion
  const handleToggleStageStatus = (stageId: string) => {
    const nextStages = project.stages.map((s) => {
      if (s.id !== stageId) return s;
      let nextStatus: ProjectStage['status'] = 'pending';
      if (s.status === 'pending') nextStatus = 'completed_pending';
      else if (s.status === 'completed_pending') nextStatus = 'completed_billed';
      else if (s.status === 'completed_billed') nextStatus = 'pending';

      return {
        ...s,
        status: nextStatus,
        notes:
          nextStatus === 'completed_pending'
            ? 'Submission of The Bill is Pending'
            : nextStatus === 'completed_billed'
            ? s.notes || 'Billed'
            : '',
      };
    });

    handleUpdateProject({ ...project, stages: nextStages });
  };

  // Stage selection for batch billing
  const handleToggleSelectStage = (id: string) => {
    setSelectedStageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // One-Click Generate Bill in New Bill
  const handleGenerateBillFromSelected = () => {
    const stagesToBill = project.stages.filter((s) => selectedStageIds.includes(s.id));
    if (stagesToBill.length === 0) {
      alert('Please select at least one milestone stage to generate a bill.');
      return;
    }

    const descriptions = stagesToBill.map((s) => s.description).join(' + ');
    const totalPercentage = stagesToBill.reduce((sum, s) => sum + s.percentage, 0);
    const totalLabour = Math.round((calc.totalLabourContract * totalPercentage) / 100);

    const billDraft = {
      clientName: project.builderName,
      projectName: project.projectName,
      particulars: `${descriptions} completed as per Drawing.`,
      amountBeforeTax: totalLabour,
      fromMilestone: true,
      stageIds: selectedStageIds,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('shiv_milestone_bill_draft', JSON.stringify(billDraft));
    }

    router.push('/new-bill?preset=milestone');
  };

  // ─── RMC Deductions Handlers ───────────────────────────────────
  const handleOpenAddRmc = () => {
    setEditingRmc(null);
    setRmcGrade('M-25');
    setRmcQuantity('');
    setRmcRate('2000');
    setRmcFromDate('2025-05-04');
    setRmcToDate('2026-11-01');
    setRmcNotes('');
    setShowRmcModal(true);
  };

  const handleOpenEditRmc = (rmc: RmcDeductionItem) => {
    setEditingRmc(rmc);
    setRmcGrade(rmc.grade);
    setRmcQuantity(rmc.quantityCuM.toString());
    setRmcRate(rmc.rate.toString());
    setRmcFromDate(rmc.fromDate || '2025-05-04');
    setRmcToDate(rmc.toDate || '2026-11-01');
    setRmcNotes(rmc.notes || '');
    setShowRmcModal(true);
  };

  const handleSaveRmc = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(rmcQuantity) || 0;
    const rate = parseFloat(rmcRate) || 0;
    if (qty <= 0) {
      alert('Please enter a valid concrete quantity.');
      return;
    }
    if (rate <= 0) {
      alert('Please enter a valid concrete rate.');
      return;
    }
    const amount = Math.round(qty * rate);

    if (editingRmc) {
      const updatedRmc = project.rmcDeductions.map((item) => {
        if (item.id !== editingRmc.id) return item;
        return {
          ...item,
          grade: rmcGrade,
          quantityCuM: qty,
          rate,
          amount,
          fromDate: rmcFromDate || undefined,
          toDate: rmcToDate || undefined,
          notes: rmcNotes.trim() || undefined,
        };
      });
      handleUpdateProject({ ...project, rmcDeductions: updatedRmc });
      showToast('Concrete deduction updated');
    } else {
      const newRmc: RmcDeductionItem = {
        id: `rmc-${Date.now()}`,
        grade: rmcGrade,
        quantityCuM: qty,
        rate,
        amount,
        fromDate: rmcFromDate || undefined,
        toDate: rmcToDate || undefined,
        notes: rmcNotes.trim() || undefined,
      };
      handleUpdateProject({ ...project, rmcDeductions: [...project.rmcDeductions, newRmc] });
      showToast('New concrete deduction added');
    }
    setShowRmcModal(false);
  };

  const handleDeleteRmc = (rmcId: string) => {
    if (!confirm('Are you sure you want to delete this RMC deduction?')) return;
    const filtered = project.rmcDeductions.filter((item) => item.id !== rmcId);
    handleUpdateProject({ ...project, rmcDeductions: filtered });
    showToast('Concrete deduction removed');
  };

  // ─── Subcontractor & Supplier Deductions Handlers ──────────────
  const handleOpenAddAdjustment = () => {
    setEditingAdjustment(null);
    setAdjTitle('');
    setAdjBillNumber('');
    setAdjType('deduct'); // Default deduction
    setAdjAmount('');
    setAdjNotes('');
    setShowAdjustmentModal(true);
  };

  const handleOpenEditAdjustment = (adj: MaterialAdjustmentItem) => {
    setEditingAdjustment(adj);
    setAdjTitle(adj.title);
    setAdjBillNumber(adj.billNumber || '');
    setAdjType(adj.type);
    setAdjAmount(adj.amount.toString());
    setAdjNotes(adj.notes || '');
    setShowAdjustmentModal(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjTitle.trim()) {
      alert('Please enter subcontractor / supplier title.');
      return;
    }
    const amt = parseFloat(adjAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (editingAdjustment) {
      const updated = project.materialAdjustments.map((a) => {
        if (a.id !== editingAdjustment.id) return a;
        return {
          ...a,
          title: adjTitle.trim(),
          billNumber: adjBillNumber.trim() || undefined,
          type: adjType,
          amount: amt,
          notes: adjNotes.trim() || undefined,
        };
      });
      handleUpdateProject({ ...project, materialAdjustments: updated });
      showToast('Adjustment updated');
    } else {
      const newAdj: MaterialAdjustmentItem = {
        id: `adj-${Date.now()}`,
        title: adjTitle.trim(),
        billNumber: adjBillNumber.trim() || undefined,
        type: adjType,
        amount: amt,
        notes: adjNotes.trim() || undefined,
      };
      handleUpdateProject({ ...project, materialAdjustments: [...project.materialAdjustments, newAdj] });
      showToast('Subcontractor / supplier adjustment added');
    }
    setShowAdjustmentModal(false);
  };

  const handleDeleteAdjustment = (adjId: string) => {
    if (!confirm('Are you sure you want to delete this subcontractor / supplier adjustment?')) return;
    const filtered = project.materialAdjustments.filter((a) => a.id !== adjId);
    handleUpdateProject({ ...project, materialAdjustments: filtered });
    showToast('Adjustment removed');
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      exportProjectRAToExcel(project, companyProfile);
      showToast('Excel (.xlsx) file downloaded successfully');
    } catch (err: any) {
      console.error('Excel export error:', err);
      alert('Failed to export Excel: ' + (err?.message || 'Error'));
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const p1 = document.getElementById('project-ra-page-1');
      const p2 = document.getElementById('project-ra-page-2');

      if (!p1 || !p2) {
        throw new Error('Printable page containers not found. Please view Tab: Letterhead Print Preview.');
      }

      // Render Page 1
      const canvas1 = await html2canvas(p1, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });

      // Render Page 2
      const canvas2 = await html2canvas(p2, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
      const pdfHeight2 = (canvas2.height * pdfWidth) / canvas2.width;

      // Add Page 1
      const img1 = canvas1.toDataURL('image/jpeg', 0.95);
      pdf.addImage(img1, 'JPEG', 0, 0, pdfWidth, pdfHeight1);

      // Add Page 2
      pdf.addPage();
      const img2 = canvas2.toDataURL('image/jpeg', 0.95);
      pdf.addImage(img2, 'JPEG', 0, 0, pdfWidth, pdfHeight2);

      const safeName = project.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`${safeName}_RA_Statement_${project.contractDate}.pdf`);
      showToast('2-Page Letterhead PDF downloaded successfully');
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*SHIV ENTERPRISES • RUNNING ACCOUNT (RA) STATEMENT*\n` +
      `*Project:* ${project.projectName}\n` +
      `*Builder:* ${project.builderName}\n` +
      `*Date:* ${project.contractDate}\n\n` +
      `📊 *Physical Progress:* ${calc.totalCompletedPercentage}%\n` +
      `🔨 *1@ Labour Ac. Due:* ₹${calc.labourDueAmount.toLocaleString('en-IN')}\n` +
      `🧱 *2@ Material Ac. Due:* ₹${calc.materialDueAmount.toLocaleString('en-IN')} (incl. RMC deductions)\n` +
      `💰 *TOTAL OUTSTANDING DUE:* ₹${calc.grandTotalDue.toLocaleString('en-IN')}\n\n` +
      `_Kindly process the payment. Official signed RA Statement attached._`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 border border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Header Card with Multi-Site Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 mb-6">
          {/* Site Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-[#0284C7]" />
                <span>Select Site / Project:</span>
              </span>
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="pl-3 pr-8 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] shadow-xs cursor-pointer appearance-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} • {p.builderName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEditSite}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all shadow-xs"
                title="Edit current site rates and area"
              >
                <Sliders size={13} className="text-[#0284C7]" />
                <span>Edit Site Parameters</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewSiteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <Plus size={14} />
                <span>+ New Site / Model</span>
              </button>

              {projects.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteSite(project.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete this site"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0284C7] mb-1">
                <Building2 size={14} />
                <span>Civil Contractor Running Account (RA) Ledger</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {project.projectName}
                <span className="text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300">
                  {project.builderName}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Area: <strong className="text-slate-800">{project.billingAreaSqFt.toLocaleString('en-IN')} sq.ft.</strong> • Turnkey Rate: <strong className="text-slate-800">₹{project.labourRate + project.materialRate}/sq.ft.</strong> (₹{project.labourRate} Labour + ₹{project.materialRate} Material) • Contract Value: <strong className="text-slate-900">₹{formatINR(calc.totalTurnkeyContract)}</strong>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
                title="Download formatted multi-sheet Excel with formulas"
              >
                <FileSpreadsheet size={16} />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white shadow-sm transition-all active:scale-95 disabled:opacity-60"
                title="Download 2-page official contractor letterhead PDF"
              >
                <Download size={16} />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all active:scale-95"
                title="Share executive summary on WhatsApp"
              >
                <Share2 size={15} />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
            {/* Physical Progress */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Physical Progress</span>
                <Percent size={12} className="text-[#0284C7]" />
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {calc.totalCompletedPercentage}%
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#0284C7] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, calc.totalCompletedPercentage)}%` }}
                />
              </div>
            </div>

            {/* Total Work Done Value */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Gross Work Done</span>
                <HardHat size={12} className="text-slate-700" />
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                ₹{formatINR(calc.totalLabourCompletedEarned + calc.totalMaterialCompletedEarned)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                L: ₹{formatINR(calc.totalLabourCompletedEarned)} • M: ₹{formatINR(calc.totalMaterialCompletedEarned)}
              </div>
            </div>

            {/* 1@ Labour Due */}
            <div className="bg-sky-50/70 rounded-xl p-3 border border-sky-200/80">
              <div className="flex items-center justify-between text-[11px] font-semibold text-sky-800 mb-1">
                <span>1@ Labour Due</span>
                <IndianRupee size={12} />
              </div>
              <div className="text-xl font-black text-sky-950 font-mono">
                ₹{calc.labourDueAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-sky-700 mt-1">
                Less Billed: ₹{formatINR(calc.labourBilled)}
              </div>
            </div>

            {/* 2@ Material Due */}
            <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/70">
              <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800 mb-1">
                <span>2@ Material Due</span>
                <Truck size={12} />
              </div>
              <div className="text-xl font-black text-blue-950 font-mono">
                ₹{calc.materialDueAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-blue-700 mt-1">
                RMC Deduct: -₹{formatINR(calc.totalRmcDeductions)}
              </div>
            </div>

            {/* Grand Total Net Outstanding */}
            <div className="col-span-2 md:col-span-1 bg-emerald-600 text-white rounded-xl p-3 shadow-sm border border-emerald-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-100">
                <span>Total Net Due (1@+2@)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              </div>
              <div className="text-2xl font-black font-mono">
                ₹{calc.grandTotalDue.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-100 font-medium truncate">
                Shiv Enterprises Net Receivable
              </div>
            </div>
          </div>

          {/* Quick Bill Trigger Alert if Pending Stages Selected */}
          {selectedStageIds.length > 0 && (
            <div className="mt-4 bg-sky-50 border border-sky-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#0284C7] flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-sky-900">
                    {selectedStageIds.length} Milestone Stage{selectedStageIds.length > 1 ? 's' : ''} Selected
                  </div>
                  <div className="text-[11px] text-sky-800">
                    Ready to generate contractor tax invoice for selected milestones.
                  </div>
                </div>
              </div>
              <button
                onClick={handleGenerateBillFromSelected}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
              >
                <span>Generate Tax Invoice</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'milestones'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>1. Milestones Schedule ({project.stages.length})</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full font-mono">
              {calc.billedStagesCount + calc.pendingSubmissionStagesCount}/{project.stages.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'reconciliation'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <IndianRupee size={14} />
            <span>2. RA Statement & Reconciliation</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-mono">
              ₹{formatINR(calc.grandTotalDue)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rmc')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'rmc'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck size={14} />
            <span>3. RMC Deductions ({project.rmcDeductions.length})</span>
            <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded-full font-mono">
              -₹{formatINR(calc.totalRmcDeductions)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subcontractors')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'subcontractors'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={14} />
            <span>4. Subcontractor Deductions ({project.materialAdjustments.length})</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-mono">
              {calc.totalMaterialAdjustments >= 0 ? '+' : '-'}₹{formatINR(Math.abs(calc.totalMaterialAdjustments))}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer size={14} />
            <span>5. Letterhead Print Preview</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: MILESTONES PROGRESS BOARD & STAGES BUILDER
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'milestones' && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="font-semibold text-neutral-700">
                Click status pill to toggle: <strong>Pending ➔ Submission Pending ➔ Billed</strong>. Select rows to auto-generate invoices.
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenAddStage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                >
                  <Plus size={14} />
                  <span>+ Add Milestone Stage</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-700 font-bold uppercase tracking-wider border-b border-neutral-200">
                    <th className="py-3 px-3 text-center w-10">Select</th>
                    <th className="py-3 px-2 text-center w-12">Sr.</th>
                    <th className="py-3 px-4">Milestone Description</th>
                    <th className="py-3 px-3 text-center w-24">Stage %</th>
                    <th className="py-3 px-4 text-right w-36">Labour Amount (₹)</th>
                    <th className="py-3 px-4 text-right w-36">Material Amount (₹)</th>
                    <th className="py-3 px-4 text-center w-40">Status</th>
                    <th className="py-3 px-3 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {project.stages.map((stage) => {
                    const isSelected = selectedStageIds.includes(stage.id);
                    const isBilled = stage.status === 'completed_billed';
                    const isPendingSub = stage.status === 'completed_pending';

                    return (
                      <tr
                        key={stage.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-sky-50/70'
                            : isPendingSub
                            ? 'bg-emerald-50/40'
                            : isBilled
                            ? 'bg-slate-50/50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStage(stage.id)}
                            className="rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7] w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Sr. */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-neutral-500">
                          {stage.sr}
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-4 font-semibold text-neutral-900">
                          <div className="flex items-center gap-2">
                            <span>{stage.description}</span>
                            {stage.billedInvoiceNumber && (
                              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                                {stage.billedInvoiceNumber}
                              </span>
                            )}
                          </div>
                          {stage.notes && (
                            <div className="text-[10px] text-neutral-500 font-normal italic">
                              {stage.notes}
                            </div>
                          )}
                        </td>

                        {/* Percentage */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-800">
                          {stage.percentage}%
                        </td>

                        {/* Labour Amount */}
                        <td className="py-2.5 px-4 text-right font-mono text-neutral-700">
                          ₹{stage.labourAmount.toLocaleString('en-IN')}
                        </td>

                        {/* Material Amount */}
                        <td className="py-2.5 px-4 text-right font-mono text-neutral-700">
                          ₹{stage.materialAmount.toLocaleString('en-IN')}
                        </td>

                        {/* Status Toggle Button */}
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStageStatus(stage.id)}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all ${
                              isBilled
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : isPendingSub
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                            title="Click to advance status"
                          >
                            {isBilled
                              ? `✓ Billed (${stage.billedInvoiceNumber || 'RN'})`
                              : isPendingSub
                              ? 'Submission Pending'
                              : 'Pending'}
                          </button>
                        </td>

                        {/* Edit & Delete Action Buttons */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStage(stage)}
                              className="p-1 text-slate-500 hover:text-[#0284C7] hover:bg-sky-50 rounded transition-colors"
                              title="Edit milestone item"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStage(stage.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete milestone item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-100 font-black text-neutral-900 border-t-2 border-neutral-300">
                    <td colSpan={3} className="py-3 px-4 text-right">
                      Total Milestone Scope ({project.stages.length} Stages):
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {project.stages.reduce((sum, s) => sum + s.percentage, 0).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ₹{calc.totalLabourContract.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ₹{calc.totalMaterialContract.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center font-mono">
                      ₹{calc.totalTurnkeyContract.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 2: RUNNING ACCOUNT (RA) RECONCILIATION
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            {/* Work Completed Summary */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center justify-between">
                <span>1. Completed Milestones Summary (Physical Progress: {calc.totalCompletedPercentage}%)</span>
                <span className="text-xs font-mono text-neutral-500">
                  Labour: ₹{formatINR(calc.totalLabourCompletedEarned)} • Material: ₹{formatINR(calc.totalMaterialCompletedEarned)}
                </span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 font-bold text-neutral-700 uppercase border-b border-neutral-200">
                      <th className="py-2.5 px-3">Work Completed Item</th>
                      <th className="py-2.5 px-2 text-center w-24">Percentage</th>
                      <th className="py-2.5 px-3 text-right w-36">Labour (A) (₹)</th>
                      <th className="py-2.5 px-3 text-right w-36">Material (B) (₹)</th>
                      <th className="py-2.5 px-3 w-48">Status / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {project.stages
                      .filter(
                        (s) =>
                          s.status === 'completed_billed' ||
                          s.status === 'completed_pending'
                      )
                      .map((stage) => {
                        const pct = stage.completedPercentage || stage.percentage;
                        const labour = Math.round((calc.totalLabourContract * pct) / 100);
                        const material = Math.round((calc.totalMaterialContract * pct) / 100);

                        return (
                          <tr key={stage.id} className="hover:bg-neutral-50/60">
                            <td className="py-2 px-3 font-medium text-neutral-900">
                              {stage.description}
                            </td>
                            <td className="py-2 px-2 text-center font-bold font-mono">
                              {pct}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {labour.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {material.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-[11px]">
                              {stage.status === 'completed_pending' ? (
                                <span className="text-emerald-700 font-bold">
                                  Submission of The Bill is Pending
                                </span>
                              ) : (
                                <span className="text-blue-800">
                                  Billed ({stage.billedInvoiceNumber || 'RN'})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-100 font-black text-neutral-900 text-xs border-t-2 border-neutral-300">
                      <td className="py-2.5 px-3">Total Work Completed to Date:</td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        {calc.totalCompletedPercentage}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{calc.totalLabourCompletedEarned.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{calc.totalMaterialCompletedEarned.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 italic text-[11px] text-neutral-500">
                        Physical Scope
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Reconciliation Cards (Labour Due & Material Due) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1@ Labour Account Due Card */}
              <div className="bg-white rounded-2xl border border-sky-200/80 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-black text-sky-950 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>1@ Labour Account Due</span>
                  <span className="text-xs font-semibold text-slate-500">Rate: ₹{project.labourRate}/sq.ft.</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Total Labour Work Done ({calc.totalCompletedPercentage}%):</span>
                    <strong className="font-mono text-sm">₹{calc.totalLabourCompletedEarned.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-slate-700">
                    <div>
                      <span className="font-medium text-rose-700">Less: Labour Bills Submitted:</span>
                      <div className="text-[10px] text-slate-400">Total Billed to Date</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-rose-700 font-mono font-bold">-₹</span>
                      <input
                        type="number"
                        value={project.labourBilledAmount}
                        onChange={(e) =>
                          handleUpdateProject({
                            ...project,
                            labourBilledAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-36 text-right font-mono font-bold text-rose-700 border border-slate-300 rounded px-2 py-1 text-xs focus:ring-[#0284C7]"
                      />
                    </div>
                  </div>

                  <div className="bg-sky-50 border border-sky-300 rounded-xl p-4 flex justify-between items-center mt-4">
                    <div>
                      <div className="text-xs font-black uppercase text-sky-950">
                        1@ Labour Ac. Due Amount
                      </div>
                      <div className="text-[10px] text-sky-800">
                        Ready to demand from {project.builderName}
                      </div>
                    </div>
                    <div className="text-2xl font-black font-mono text-sky-950">
                      ₹{calc.labourDueAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2@ Material Account Due Card */}
              <div className="bg-white rounded-2xl border border-blue-200/80 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-black text-blue-950 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>2@ Material Account Due</span>
                  <span className="text-xs font-semibold text-neutral-500">Rate: ₹{project.materialRate}/sq.ft.</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-600">Total Material Work Done ({calc.totalCompletedPercentage}%):</span>
                    <strong className="font-mono text-sm">₹{calc.totalMaterialCompletedEarned.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-100">
                    <span className="font-medium text-red-700">Less: Material Submitted Bills:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-red-700 font-mono font-bold">-₹</span>
                      <input
                        type="number"
                        value={project.materialBilledAmount}
                        onChange={(e) =>
                          handleUpdateProject({
                            ...project,
                            materialBilledAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-36 text-right font-mono font-bold text-red-700 border border-neutral-300 rounded px-2 py-1 text-xs focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 text-neutral-700">
                    <div>
                      <span className="font-medium text-red-700">Less: Total RMC Deductions:</span>
                      <div className="text-[10px] text-neutral-400">Concrete Grades ({project.rmcDeductions.length} Entries)</div>
                    </div>
                    <span className="font-mono font-bold text-red-700">
                      -₹{calc.totalRmcDeductions.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 text-neutral-800 font-semibold">
                    <span>Material Balance Subtotal:</span>
                    <span className="font-mono">₹{calc.materialBalanceBeforeAdj.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Adjustments */}
                  {project.materialAdjustments.map((adj) => (
                    <div key={adj.id} className="flex justify-between items-center py-1 text-emerald-800 font-semibold">
                      <span className="truncate max-w-[240px]">{adj.title}:</span>
                      <span className="font-mono">
                        {adj.type === 'add' ? '+' : '-'}₹{adj.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}

                  <div className="bg-blue-100/70 border border-blue-300 rounded-xl p-4 flex justify-between items-center mt-4">
                    <div>
                      <div className="text-xs font-black uppercase text-blue-950">
                        2@ Total Material Ac. Due
                      </div>
                      <div className="text-[10px] text-blue-800">
                        Balance after RMC & Supplier Offset
                      </div>
                    </div>
                    <div className="text-2xl font-black font-mono text-blue-950">
                      ₹{calc.materialDueAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Grand Total Due Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-emerald-200">
                  Total Due Labour 1@ + 2@ Material Ac. Amount is
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono mt-1">
                  ₹{calc.grandTotalDue.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-emerald-100 mt-1">
                  Shiv Enterprises Total Net Outstanding Balance
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2.5 bg-white text-emerald-950 rounded-xl font-bold text-xs shadow hover:bg-neutral-100 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Download size={15} />
                  <span>Download Statement PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 3: RMC CONCRETE DEDUCTIONS (GRADE, QTY, RATE MANAGEMENT)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'rmc' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <Truck size={18} className="text-[#0284C7]" />
                    <span>{project.projectName} RMC Deductions</span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Ready Mix Concrete supplied by builder. Change grade, quantity, or rate to recompute deductions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenAddRmc}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                  >
                    <Plus size={14} />
                    <span>+ Add Concrete Deduction</span>
                  </button>
                  <div className="text-right pl-3 border-l border-slate-200">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Total Deducted</div>
                    <div className="text-lg font-black font-mono text-red-700">
                      ₹{calc.totalRmcDeductions.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 font-bold text-neutral-700 uppercase border-b border-neutral-200">
                      <th className="py-2.5 px-3 w-12 text-center">Sr.</th>
                      <th className="py-2.5 px-4 w-40">Concrete Grade</th>
                      <th className="py-2.5 px-4 text-right w-44">Quantity (cu.mtr)</th>
                      <th className="py-2.5 px-4 text-right w-44">Rate (₹ / cu.mtr)</th>
                      <th className="py-2.5 px-4 text-right w-44">Total Amount (₹)</th>
                      <th className="py-2.5 px-3 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {project.rmcDeductions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No RMC concrete deductions recorded yet for this site. Click &quot;+ Add Concrete Deduction&quot; above.
                        </td>
                      </tr>
                    ) : (
                      project.rmcDeductions.map((rmc, i) => (
                        <tr key={rmc.id} className="hover:bg-neutral-50/60">
                          <td className="py-2.5 px-3 text-center font-bold text-neutral-500">
                            {i + 1}
                          </td>
                          <td className="py-2.5 px-4 font-black text-neutral-900 text-sm">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 font-mono text-xs border border-sky-300">
                              {rmc.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold">
                            {rmc.quantityCuM.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold">
                            ₹{rmc.rate.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-red-700 text-sm">
                            ₹{rmc.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditRmc(rmc)}
                                className="p-1 text-slate-500 hover:text-[#0284C7] hover:bg-sky-50 rounded transition-colors"
                                title="Edit concrete grade, qty, or rate"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRmc(rmc.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete deduction"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-100 font-black text-neutral-900 text-xs border-t-2 border-neutral-300">
                      <td colSpan={4} className="py-3 px-4 text-right">
                        Total Deduction of RMC:
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-red-700 text-sm">
                        ₹{calc.totalRmcDeductions.toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 4: SUBCONTRACTOR & SUPPLIER DEDUCTIONS / ADJUSTMENTS
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'subcontractors' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <Users size={18} className="text-[#0284C7]" />
                    <span>Subcontractor & Supplier Deductions & Pending Bills</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Amounts added back or deducted for supplier / subcontractor payments (e.g. Jamuna Associates).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenAddAdjustment}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                  >
                    <Plus size={14} />
                    <span>+ Add Subcontractor / Supplier Adjustment</span>
                  </button>
                  <div className="text-right pl-3 border-l border-slate-200">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Net Adjustment</div>
                    <div className="text-lg font-black font-mono text-emerald-800">
                      {calc.totalMaterialAdjustments >= 0 ? '+' : '-'}₹{formatINR(Math.abs(calc.totalMaterialAdjustments))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Adjustments List */}
              <div className="space-y-3">
                {project.materialAdjustments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    No subcontractor or supplier adjustments added yet. Click &quot;+ Add Subcontractor / Supplier Adjustment&quot; above.
                  </div>
                ) : (
                  project.materialAdjustments.map((adj) => (
                    <div
                      key={adj.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200 text-xs gap-3 transition-colors"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                              adj.type === 'add'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {adj.type === 'add' ? '+ ADD BACK' : '- DEDUCTION'}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{adj.title}</span>
                          {adj.billNumber && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              Bill #{adj.billNumber}
                            </span>
                          )}
                        </div>
                        {adj.notes && (
                          <div className="text-[11px] text-slate-500 mt-1">{adj.notes}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Amount</span>
                          <span
                            className={`font-mono font-black text-base ${
                              adj.type === 'add' ? 'text-emerald-800' : 'text-rose-700'
                            }`}
                          >
                            {adj.type === 'add' ? '+' : '-'}₹{adj.amount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAdjustment(adj)}
                            className="p-1.5 text-slate-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit adjustment"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAdjustment(adj.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete adjustment"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 5: LETTERHEAD PRINT PREVIEW
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Official Contractor Letterhead Preview (2 Pages)
                </h3>
                <p className="text-xs text-neutral-500">
                  Exact visual format exported to PDF with Shiv Enterprises 3D logo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Printer size={15} />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Download size={15} />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>

            {/* Letterhead Printable Component */}
            {companyProfile && (
              <div className="overflow-x-auto pb-8">
                <ProjectRAPrintable
                  contract={project}
                  companyProfile={companyProfile}
                  previewRefPage1={page1Ref}
                  previewRefPage2={page2Ref}
                />
              </div>
            )}
          </div>
        )}

        {/* Hidden offscreen printable component for PDF generation when viewing other tabs */}
        {activeTab !== 'preview' && companyProfile && (
          <div className="fixed -left-[9999px] top-0 pointer-events-none">
            <ProjectRAPrintable
              contract={project}
              companyProfile={companyProfile}
              previewRefPage1={page1Ref}
              previewRefPage2={page2Ref}
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODAL 1: CREATE NEW SITE / PROJECT MODEL
      ════════════════════════════════════════════════════════════ */}
      {showNewSiteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewSiteModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <Building2 size={16} className="text-[#38BDF8]" />
                <span>Build New Site / Project Model</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSiteModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleCreateNewSite} className="space-y-4 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site / Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSiteProjectName}
                    onChange={(e) => setNewSiteProjectName(e.target.value)}
                    placeholder="e.g. Harshail Heights Dahisar East"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client / Builder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSiteBuilderName}
                    onChange={(e) => setNewSiteBuilderName(e.target.value)}
                    placeholder="e.g. Harshmaan spaces LLP"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Billing Area (sq.ft.) *
                    </label>
                    <input
                      type="number"
                      required
                      value={newSiteArea}
                      onChange={(e) => setNewSiteArea(e.target.value)}
                      placeholder="60000"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Labour Rate (₹/sq.ft.) *
                    </label>
                    <input
                      type="number"
                      required
                      value={newSiteLabourRate}
                      onChange={(e) => setNewSiteLabourRate(e.target.value)}
                      placeholder="600"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Material Rate (₹/sq.ft.) *
                    </label>
                    <input
                      type="number"
                      required
                      value={newSiteMaterialRate}
                      onChange={(e) => setNewSiteMaterialRate(e.target.value)}
                      placeholder="400"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-sky-950">
                    <span>Turnkey Rate:</span>
                    <span>₹{(parseFloat(newSiteLabourRate) || 0) + (parseFloat(newSiteMaterialRate) || 0)} / sq.ft.</span>
                  </div>
                  <div className="flex justify-between text-sky-800">
                    <span>Total Contract Value:</span>
                    <span className="font-mono font-bold">
                      ₹{formatINR((parseFloat(newSiteArea) || 0) * ((parseFloat(newSiteLabourRate) || 0) + (parseFloat(newSiteMaterialRate) || 0)))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cloneStages"
                    checked={newSiteCloneStages}
                    onChange={(e) => setNewSiteCloneStages(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                  />
                  <label htmlFor="cloneStages" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Copy standard 26 RCC slab &amp; plaster stages template to this new site
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Create Site RA Ledger</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL 2: EDIT ACTIVE SITE PARAMETERS
      ════════════════════════════════════════════════════════════ */}
      {showEditSiteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditSiteModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <Sliders size={16} className="text-[#38BDF8]" />
                <span>Edit Site Parameters • {project.projectName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditSiteModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSaveEditSite} className="space-y-4 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client / Builder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editSiteBuilder}
                    onChange={(e) => setEditSiteBuilder(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Billing Area (sq.ft.)
                    </label>
                    <input
                      type="number"
                      required
                      value={editSiteArea}
                      onChange={(e) => setEditSiteArea(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Labour Rate (₹/sq.ft.)
                    </label>
                    <input
                      type="number"
                      required
                      value={editSiteLabourRate}
                      onChange={(e) => setEditSiteLabourRate(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Material Rate (₹/sq.ft.)
                    </label>
                    <input
                      type="number"
                      required
                      value={editSiteMaterialRate}
                      onChange={(e) => setEditSiteMaterialRate(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Save Site Parameters</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL 3: ADD / EDIT MILESTONE STAGE MODEL
          (Description of item, % of stage, Labour amount, Material amount, Action)
      ════════════════════════════════════════════════════════════ */}
      {showStageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStageModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <Layers size={16} className="text-[#38BDF8]" />
                <span>{editingStage ? 'Edit Milestone Stage' : 'Add Milestone Stage / Item'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowStageModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSaveStage} className="space-y-4 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description of Item *
                  </label>
                  <input
                    type="text"
                    required
                    value={stageDescription}
                    onChange={(e) => setStageDescription(e.target.value)}
                    placeholder="e.g. 19th slab, Underground Tank, or External Plaster"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Percentage of Stage (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={stagePercentage}
                    onChange={(e) => handlePercentageChange(e.target.value)}
                    placeholder="e.g. 2.75"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Typing percentage automatically computes Labour &amp; Material amounts based on {project.billingAreaSqFt.toLocaleString('en-IN')} sq.ft.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Labour Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={stageLabourAmount}
                      onChange={(e) => setStageLabourAmount(e.target.value)}
                      placeholder="Auto-calculated from %"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Material Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={stageMaterialAmount}
                      onChange={(e) => setStageMaterialAmount(e.target.value)}
                      placeholder="Auto-calculated from %"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Stage Status
                    </label>
                    <select
                      value={stageStatus}
                      onChange={(e) => setStageStatus(e.target.value as any)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#0284C7]"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed_pending">Submission Pending</option>
                      <option value="completed_billed">Billed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Billed Invoice Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={stageBilledInvoiceNumber}
                      onChange={(e) => setStageBilledInvoiceNumber(e.target.value)}
                      placeholder="e.g. RN 09 or RS 10"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    placeholder="e.g. Submission of The Bill is Pending"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>{editingStage ? 'Save Changes' : 'Add Milestone Stage'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL 4: ADD / EDIT RMC CONCRETE DEDUCTION
          (Grade, Quantity, Rate, Auto-calculated amount)
      ════════════════════════════════════════════════════════════ */}
      {showRmcModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRmcModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <Truck size={16} className="text-[#38BDF8]" />
                <span>{editingRmc ? 'Edit RMC Concrete Deduction' : 'Add Concrete Deduction'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRmcModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSaveRmc} className="space-y-4 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Concrete Grade *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={rmcGrade}
                      onChange={(e) => setRmcGrade(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:border-[#0284C7]"
                    >
                      {CONCRETE_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g} (Ready Mix Concrete)
                        </option>
                      ))}
                      <option value="Custom">Custom Grade...</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity (cu.mtr) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={rmcQuantity}
                      onChange={(e) => setRmcQuantity(e.target.value)}
                      placeholder="e.g. 105.5"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rate (₹ / cu.mtr) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={rmcRate}
                      onChange={(e) => setRmcRate(e.target.value)}
                      placeholder="e.g. 2037"
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                {/* Auto Calculated Live Amount */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-red-900">Total Deduction Amount:</span>
                  <span className="font-mono font-black text-base text-red-700">
                    ₹{((parseFloat(rmcQuantity) || 0) * (parseFloat(rmcRate) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      From Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={rmcFromDate}
                      onChange={(e) => setRmcFromDate(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      To Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={rmcToDate}
                      onChange={(e) => setRmcToDate(e.target.value)}
                      className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Reference
                  </label>
                  <input
                    type="text"
                    value={rmcNotes}
                    onChange={(e) => setRmcNotes(e.target.value)}
                    placeholder="e.g. Ready Mix Concrete supplied by builder batch 1-12"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>{editingRmc ? 'Save Concrete Changes' : 'Save Concrete Deduction'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL 5: ADD / EDIT SUBCONTRACTOR & SUPPLIER ADJUSTMENT
          (Jamuna Associates, Steel, Cement, etc.)
      ════════════════════════════════════════════════════════════ */}
      {showAdjustmentModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdjustmentModal(false);
          }}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A192F] text-white rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <Users size={16} className="text-[#38BDF8]" />
                <span>
                  {editingAdjustment
                    ? 'Edit Subcontractor / Supplier Adjustment'
                    : 'Add Subcontractor / Supplier Adjustment'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto modal-scrollable p-4 sm:p-5">
              <form onSubmit={handleSaveAdjustment} className="space-y-4 pb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subcontractor / Supplier Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={adjTitle}
                    onChange={(e) => setAdjTitle(e.target.value)}
                    placeholder="e.g. Pending Amount from Submitted Bill (Jamuna Associates)"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bill / Invoice / Challan Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={adjBillNumber}
                    onChange={(e) => setAdjBillNumber(e.target.value)}
                    placeholder="e.g. INV-AMB/2026/1042 or CH-4019"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjType('deduct')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        adjType === 'deduct'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-black text-sm text-rose-600">- DEDUCTION</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        Subcontractor debit note / offset
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjType('add')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        adjType === 'add'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-black text-sm text-emerald-600">+ ADD BACK</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        Pending bill added back
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="e.g. 925291"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    placeholder="e.g. Subcontractor / vendor pending adjustment"
                    className="w-full px-3 h-10 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>
                      {editingAdjustment ? 'Save Adjustment Changes' : 'Save Subcontractor Adjustment'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
