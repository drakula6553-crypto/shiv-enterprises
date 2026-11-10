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
} from 'lucide-react';
import {
  getProjectsRA,
  saveProjectRA,
  computeProjectRACalculations,
  exportProjectRAToExcel,
  ProjectRAContract,
  ProjectStage,
  RmcDeductionItem,
  MaterialAdjustmentItem,
} from '@/lib/projectTracking';
import { getCompanyProfile } from '@/lib/storage';
import type { CompanyProfile } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import ProjectRAPrintable from '@/components/ProjectRAPrintable';

export default function ProjectTrackingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRAContract[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('roshan-nager-borivali');
  const [activeTab, setActiveTab] = useState<'milestones' | 'reconciliation' | 'rmc' | 'preview'>('milestones');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>(['s-14', 's-15']); // Default 12th & 13th slab
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

    // Save pre-fill intent to session storage and navigate to /new-bill
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
        throw new Error('Printable page containers not found. Please view Tab: Printable Letterhead Preview.');
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
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 mb-6">
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
                Less RN 08: ₹{formatINR(calc.labourBilled)}
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
                    Ready to generate contractor tax invoice (e.g. 12th &amp; 13th slab = ₹19,80,000 + 18% GST).
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
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'milestones'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>1. Milestones Schedule (26 Stages)</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full font-mono">
              {calc.billedStagesCount + calc.pendingSubmissionStagesCount}/26
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
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
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
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
            onClick={() => setActiveTab('preview')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'preview'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer size={14} />
            <span>4. Letterhead Print Preview</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: MILESTONES PROGRESS BOARD
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'milestones' && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="font-semibold text-neutral-700">
                Click status pill to toggle: <strong>Pending ➔ Submission Pending ➔ Billed</strong>. Select rows to auto-generate invoices.
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-blue-900 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Billed ({calc.billedStagesCount})
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Submission Pending ({calc.pendingSubmissionStagesCount})
                </span>
                <span className="inline-flex items-center gap-1.5 text-neutral-500 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" /> Pending ({calc.pendingStagesCount})
                </span>
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
                    <th className="py-3 px-4 text-center w-48">Status / Action</th>
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
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-neutral-800">
                          ₹{stage.labourAmount.toLocaleString('en-IN')}
                        </td>

                        {/* Material Amount */}
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-neutral-800">
                          ₹{stage.materialAmount.toLocaleString('en-IN')}
                        </td>

                        {/* Status Toggle Pill */}
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleStageStatus(stage.id)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all ${
                              isBilled
                                ? 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                                : isPendingSub
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-400 hover:bg-emerald-200 animate-pulse'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                            title="Click to change status"
                          >
                            {isBilled
                              ? `✓ Billed (${stage.billedInvoiceNumber || 'RN'})`
                              : isPendingSub
                              ? '⚡ Bill Pending'
                              : '○ Pending'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-100 font-black text-neutral-900 text-xs border-t-2 border-neutral-300">
                    <td colSpan={3} className="py-3 px-4 text-right">
                      Total 100% Turnkey Scope:
                    </td>
                    <td className="py-3 px-3 text-center">100%</td>
                    <td className="py-3 px-4 text-right font-mono">
                      ₹{calc.totalLabourContract.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ₹{calc.totalMaterialContract.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
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
                  <span className="text-xs font-semibold text-slate-500">Rate: ₹600/sq.ft.</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Total Labour Work Done ({calc.totalCompletedPercentage}%):</span>
                    <strong className="font-mono text-sm">₹{calc.totalLabourCompletedEarned.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-slate-700">
                    <div>
                      <span className="font-medium text-rose-700">Less: Labour Bills Submitted:</span>
                      <div className="text-[10px] text-slate-400">Bills up to RN 08</div>
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
                        Ready to demand from Harshmaan Spaces
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
                  <span className="text-xs font-semibold text-neutral-500">Rate: ₹400/sq.ft.</span>
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
                      <div className="text-[10px] text-neutral-400">Concrete Grades M-15, M-25, M-45</div>
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
                  (One Crore Twenty-Eight Lakh Ninety-Three Thousand Nine Hundred Twenty-Four Only)
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
            TAB 3: RMC DEDUCTIONS & ADJUSTMENTS
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'rmc' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Roshan Nager RMC Deductions (Concrete Supplied by Builder)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Ready Mix Concrete deducted from Material Account between 04-05-2025 to 01-11-2026.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-neutral-500">Total RMC Deducted</div>
                  <div className="text-xl font-black font-mono text-red-700">
                    ₹{calc.totalRmcDeductions.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 font-bold text-neutral-700 uppercase border-b border-neutral-200">
                      <th className="py-2.5 px-3 w-12 text-center">Sr.</th>
                      <th className="py-2.5 px-4">Concrete Grade</th>
                      <th className="py-2.5 px-4 text-right">Quantity (cu.mtr)</th>
                      <th className="py-2.5 px-4 text-right">Rate (₹ / cu.mtr)</th>
                      <th className="py-2.5 px-4 text-right">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {project.rmcDeductions.map((rmc, i) => (
                      <tr key={rmc.id} className="hover:bg-neutral-50/60">
                        <td className="py-2.5 px-3 text-center font-bold text-neutral-500">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-4 font-black text-neutral-900 text-sm">
                          {rmc.grade}
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
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-100 font-black text-neutral-900 text-xs border-t-2 border-neutral-300">
                      <td colSpan={4} className="py-3 px-4 text-right">
                        Total Deduction of RMC:
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-red-700 text-sm">
                        ₹{calc.totalRmcDeductions.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Material Adjustments (Jamuna Associates) */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6">
              <h3 className="text-base font-bold text-neutral-900 mb-2">
                Material Adjustments & Subcontractor Pending Bills
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                Amounts added back or deducted for supplier / subcontractor payments.
              </p>

              <div className="space-y-3">
                {project.materialAdjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs"
                  >
                    <div>
                      <div className="font-bold text-neutral-900">{adj.title}</div>
                      {adj.notes && <div className="text-[11px] text-neutral-500">{adj.notes}</div>}
                    </div>
                    <div className="font-mono font-black text-emerald-800 text-sm">
                      {adj.type === 'add' ? '+' : '-'}₹{adj.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 4: LETTERHEAD PRINT PREVIEW
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
    </div>
  );
}
