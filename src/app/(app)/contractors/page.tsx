'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Plus,
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
} from 'lucide-react';
import {
  getContractors,
  saveContractor,
  deleteContractor,
  addContractorBill,
  addContractorPayment,
  getCompanyProfile,
} from '@/lib/storage';
import { formatINR, formatDateIN, todayISO, generateId } from '@/lib/utils';
import { TRADE_OPTIONS, PAYMENT_MODES } from '@/lib/types';
import type { Contractor, ContractorBill, ContractorPayment, CompanyProfile } from '@/lib/types';
import { recordContractorActivity } from '@/lib/tracking';

interface LedgerEntry {
  id: string;
  type: 'bill' | 'payment';
  date: string;
  description: string;
  project?: string;
  mode?: string;
  billAmount: number;
  paidAmount: number;
  balance: number;
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Search & Trade Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');

  // Active Contractor Ledger View
  const [activeLedgerContractor, setActiveLedgerContractor] = useState<Contractor | null>(null);
  const ledgerPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Modals state
  const [showAddContractorModal, setShowAddContractorModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cTrade, setCTrade] = useState('Mason');
  const [cAddress, setCAddress] = useState('');
  const [cNotes, setCNotes] = useState('');

  // Record Bill Modal
  const [billModalContractor, setBillModalContractor] = useState<Contractor | null>(null);
  const [billDate, setBillDate] = useState(todayISO());
  const [billProject, setBillProject] = useState('');
  const [billDesc, setBillDesc] = useState('');
  const [billAmount, setBillAmount] = useState('');

  // Record Payment Modal
  const [payModalContractor, setPayModalContractor] = useState<Contractor | null>(null);
  const [payDate, setPayDate] = useState(todayISO());
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<ContractorPayment['mode']>('upi');
  const [payNotes, setPayNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const list = getContractors();
    setContractors(list);
    setCompanyProfile(getCompanyProfile());

    if (activeLedgerContractor) {
      const refreshed = list.find((c) => c.id === activeLedgerContractor.id);
      if (refreshed) setActiveLedgerContractor(refreshed);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Summaries
  const totalBilledAll = contractors.reduce((acc, c) => acc + (c.totalBilled || 0), 0);
  const totalPaidAll = contractors.reduce((acc, c) => acc + (c.totalPaid || 0), 0);
  const totalPayableAll = contractors.reduce((acc, c) => acc + (c.balance || 0), 0);

  // Filtered Contractors
  const filteredContractors = contractors.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.trade.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q));

    const matchTrade = selectedTrade === 'all' || c.trade === selectedTrade;

    return matchSearch && matchTrade;
  });

  // Open Add / Edit Contractor modal
  const handleOpenAddContractor = (c?: Contractor) => {
    if (c) {
      setEditingContractor(c);
      setCName(c.name);
      setCPhone(c.phone || '');
      setCTrade(c.trade);
      setCAddress(c.address || '');
      setCNotes(c.notes || '');
    } else {
      setEditingContractor(null);
      setCName('');
      setCPhone('');
      setCTrade('Mason');
      setCAddress('');
      setCNotes('');
    }
    setShowAddContractorModal(true);
  };

  // Save Contractor
  const handleSaveContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) {
      alert('Please enter contractor name');
      return;
    }

    const contractor: Contractor = {
      id: editingContractor ? editingContractor.id : generateId(),
      name: cName.trim(),
      phone: cPhone.trim(),
      trade: cTrade,
      address: cAddress.trim(),
      notes: cNotes.trim(),
      bills: editingContractor ? editingContractor.bills : [],
      payments: editingContractor ? editingContractor.payments : [],
      totalBilled: editingContractor ? editingContractor.totalBilled : 0,
      totalPaid: editingContractor ? editingContractor.totalPaid : 0,
      balance: editingContractor ? editingContractor.balance : 0,
      createdAt: editingContractor ? editingContractor.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveContractor(contractor);
    recordContractorActivity({
      contractorId: contractor.id,
      contractorName: contractor.name,
      category: contractor.trade,
      action: editingContractor ? 'contractor_updated' : 'contractor_added',
      description: contractor.trade + (contractor.phone ? ` • Tel: ${contractor.phone}` : ''),
    });
    setShowAddContractorModal(false);
    loadData();
    showToast(editingContractor ? 'Contractor profile updated' : 'Contractor added successfully');
  };

  // Delete Contractor
  const handleDeleteContractor = (id: string, name: string) => {
    if (confirm(`Delete contractor "${name}" and all ledger history?`)) {
      const target = contractors.find((c) => c.id === id);
      deleteContractor(id);
      recordContractorActivity({
        contractorId: id,
        contractorName: name,
        category: target?.trade || 'General',
        action: 'contractor_deleted',
        amount: target?.balance || 0,
      });
      if (activeLedgerContractor?.id === id) {
        setActiveLedgerContractor(null);
      }
      loadData();
      showToast(`Contractor ${name} deleted`);
    }
  };

  // Open Record Bill modal
  const handleOpenRecordBill = (c: Contractor) => {
    setBillModalContractor(c);
    setBillDate(todayISO());
    setBillProject('Harshail Iris Borivali');
    setBillDesc('');
    setBillAmount('');
  };

  // Save Work Bill
  const handleSaveWorkBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billModalContractor) return;
    const amt = parseFloat(billAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid bill amount.');
      return;
    }

    const newBill: ContractorBill = {
      id: generateId(),
      date: billDate,
      project: billProject.trim() || 'General Site Work',
      description: billDesc.trim() || 'Work done as per site measurements',
      amount: amt,
    };

    addContractorBill(billModalContractor.id, newBill);
    recordContractorActivity({
      contractorId: billModalContractor.id,
      contractorName: billModalContractor.name,
      category: billModalContractor.trade,
      action: 'bill_recorded',
      amount: amt,
      description: `${newBill.project} - ${newBill.description}`,
    });
    setBillModalContractor(null);
    loadData();
    showToast(`Work bill of ${formatINR(amt)} recorded`);
  };

  // Open Record Payment modal
  const handleOpenRecordPayment = (c: Contractor) => {
    setPayModalContractor(c);
    setPayDate(todayISO());
    setPayAmount(c.balance > 0 ? String(c.balance) : '');
    setPayMode('upi');
    setPayNotes('');
  };

  // Save Payment Made
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalContractor) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const newPayment: ContractorPayment = {
      id: generateId(),
      date: payDate,
      amount: amt,
      mode: payMode,
      notes: payNotes.trim(),
    };

    addContractorPayment(payModalContractor.id, newPayment);
    recordContractorActivity({
      contractorId: payModalContractor.id,
      contractorName: payModalContractor.name,
      category: payModalContractor.trade,
      action: 'payment_recorded',
      amount: amt,
      description: `Paid via ${payMode.toUpperCase()}${newPayment.notes ? `: ${newPayment.notes}` : ''}`,
    });
    setPayModalContractor(null);
    loadData();
    showToast(`Payment of ${formatINR(amt)} recorded`);
  };

  // Build combined chronological ledger with running balance
  const buildLedger = (c: Contractor): LedgerEntry[] => {
    const events: Array<{
      id: string;
      type: 'bill' | 'payment';
      date: string;
      description: string;
      project?: string;
      mode?: string;
      amount: number;
    }> = [];

    (c.bills || []).forEach((b) => {
      events.push({
        id: b.id,
        type: 'bill',
        date: b.date,
        description: b.description,
        project: b.project,
        amount: b.amount,
      });
    });

    (c.payments || []).forEach((p) => {
      events.push({
        id: p.id,
        type: 'payment',
        date: p.date,
        description: p.notes || `Payment made via ${PAYMENT_MODES[p.mode] || p.mode}`,
        mode: p.mode,
        amount: p.amount,
      });
    });

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const ledger: LedgerEntry[] = [];

    events.forEach((ev) => {
      if (ev.type === 'bill') {
        running += ev.amount;
        ledger.push({
          id: ev.id,
          type: 'bill',
          date: ev.date,
          description: ev.description,
          project: ev.project,
          billAmount: ev.amount,
          paidAmount: 0,
          balance: running,
        });
      } else {
        running -= ev.amount;
        ledger.push({
          id: ev.id,
          type: 'payment',
          date: ev.date,
          description: ev.description,
          mode: ev.mode,
          billAmount: 0,
          paidAmount: ev.amount,
          balance: running,
        });
      }
    });

    return ledger;
  };

  // Export Contractor Ledger to PDF
  const handleExportLedgerPDF = async (contractor: Contractor) => {
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

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Ledger_${contractor.name.replace(/\s+/g, '_')}_${todayISO()}.pdf`);
      showToast('Contractor ledger PDF downloaded');
    } catch (err: any) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsExportingPdf(false);
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

      {/* VIEW 1: INDIVIDUAL CONTRACTOR LEDGER VIEW */}
      {activeLedgerContractor ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveLedgerContractor(null)}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 p-1.5 -ml-1.5 rounded-md nav-transition"
            >
              <ArrowLeft size={16} />
              <span>Back to contractors</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportLedgerPDF(activeLedgerContractor)}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white px-3 h-8 rounded-lg text-xs font-medium nav-transition action-press"
              >
                <Download size={14} />
                <span>{isExportingPdf ? 'Generating...' : 'Export PDF'}</span>
              </button>
            </div>
          </div>

          {/* Contractor Overview Card */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {activeLedgerContractor.name}
                  </h2>
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                    {activeLedgerContractor.trade}
                  </span>
                </div>
                {activeLedgerContractor.phone && (
                  <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                    <Phone size={13} /> {activeLedgerContractor.phone}
                  </p>
                )}
                {activeLedgerContractor.address && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {activeLedgerContractor.address}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenRecordBill(activeLedgerContractor)}
                  className="px-3 h-8 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium nav-transition action-press"
                >
                  + Record bill
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenRecordPayment(activeLedgerContractor)}
                  className="px-3 h-8 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium nav-transition action-press"
                >
                  + Record pay
                </button>
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-3 rounded-lg border border-neutral-100 mt-4 text-center">
              <div>
                <span className="text-[11px] text-neutral-500 block">Total work billed</span>
                <span className="font-semibold text-neutral-900 text-xs sm:text-sm tabular-nums">
                  {formatINR(activeLedgerContractor.totalBilled)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Total paid</span>
                <span className="font-semibold text-emerald-700 text-xs sm:text-sm tabular-nums">
                  {formatINR(activeLedgerContractor.totalPaid)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Balance due</span>
                <span
                  className={`font-semibold text-xs sm:text-sm tabular-nums ${
                    activeLedgerContractor.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {formatINR(activeLedgerContractor.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Printable Statement Sheet */}
          <div className="bg-white rounded-xl border border-neutral-300 p-4 sm:p-6 overflow-x-auto">
            <div
              ref={ledgerPrintRef}
              className="bg-white text-black p-4 sm:p-6 font-mono text-xs max-w-3xl mx-auto"
            >
              <div className="flex items-start justify-between pb-3 border-b-2 border-black">
                <div>
                  <h3 className="font-bold text-sm font-sans text-neutral-900">
                    {companyProfile?.companyName || 'SHIV ENTERPRISES'}
                  </h3>
                  <p className="text-[11px] font-sans text-neutral-600">
                    {companyProfile?.address}
                  </p>
                  <p className="text-[11px] font-sans text-neutral-600">
                    Tel: {companyProfile?.phone} | GSTIN: {companyProfile?.gstin}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    SUB-CONTRACTOR LEDGER
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Date: {formatDateIN(todayISO())}
                  </span>
                </div>
              </div>

              <div className="my-4 p-3 bg-neutral-50 border border-black flex justify-between items-center text-xs">
                <div>
                  <p>
                    <strong>Contractor:</strong> {activeLedgerContractor.name}
                  </p>
                  <p>
                    <strong>Trade:</strong> {activeLedgerContractor.trade} |{' '}
                    <strong>Phone:</strong> {activeLedgerContractor.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-neutral-500 font-medium">
                    Balance payable
                  </p>
                  <p className="text-sm font-bold text-rose-700 tabular-nums">
                    {formatINR(activeLedgerContractor.balance)}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="border-b border-black bg-neutral-100 font-bold">
                    <th className="border-r border-black p-2 text-center w-24">Date</th>
                    <th className="border-r border-black p-2 text-left">
                      Description / Site / Notes
                    </th>
                    <th className="border-r border-black p-2 text-right w-24">
                      Bill (+)
                    </th>
                    <th className="border-r border-black p-2 text-right w-24">
                      Paid (-)
                    </th>
                    <th className="p-2 text-right w-28">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {buildLedger(activeLedgerContractor).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-neutral-400">
                        No transactions recorded yet
                      </td>
                    </tr>
                  ) : (
                    buildLedger(activeLedgerContractor).map((row, idx) => (
                      <tr key={row.id || idx} className="border-b border-black">
                        <td className="border-r border-black p-2 text-center whitespace-nowrap">
                          {formatDateIN(row.date)}
                        </td>
                        <td className="border-r border-black p-2">
                          <span className="font-medium block">{row.description}</span>
                          {row.project && (
                            <span className="text-[10px] text-neutral-500">
                              Site: {row.project}
                            </span>
                          )}
                          {row.mode && (
                            <span className="text-[10px] text-neutral-500">
                              Mode: {PAYMENT_MODES[row.mode] || row.mode}
                            </span>
                          )}
                        </td>
                        <td className="border-r border-black p-2 text-right font-medium whitespace-nowrap tabular-nums">
                          {row.billAmount > 0 ? formatINR(row.billAmount) : '—'}
                        </td>
                        <td className="border-r border-black p-2 text-right font-medium text-emerald-800 whitespace-nowrap tabular-nums">
                          {row.paidAmount > 0 ? formatINR(row.paidAmount) : '—'}
                        </td>
                        <td className="p-2 text-right font-bold whitespace-nowrap tabular-nums">
                          {formatINR(row.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t-2 border-black bg-neutral-50 text-xs">
                    <td colSpan={2} className="border-r border-black p-2 text-center uppercase">
                      Totals
                    </td>
                    <td className="border-r border-black p-2 text-right tabular-nums">
                      {formatINR(activeLedgerContractor.totalBilled)}
                    </td>
                    <td className="border-r border-black p-2 text-right text-emerald-800 tabular-nums">
                      {formatINR(activeLedgerContractor.totalPaid)}
                    </td>
                    <td className="p-2 text-right font-bold text-rose-800 tabular-nums">
                      {formatINR(activeLedgerContractor.balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-8 pt-4 flex justify-between items-end text-xs">
                <div>
                  <p className="border-t border-black pt-1 px-4 text-center">
                    Contractor signature
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium uppercase font-sans mb-8">
                    For {companyProfile?.companyName || 'SHIV ENTERPRISES'}
                  </p>
                  <p className="border-t border-black pt-1 px-4 text-center font-bold">
                    Authorised signatory
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: CONTRACTORS DIRECTORY */
        <>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 tracking-tight">
                Sub-contractors
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage trades, work done, labour bills and payment ledgers
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddContractor()}
              className="bg-[#0B0F17] hover:bg-[#151D2A] active:bg-[#070A0F] text-white rounded-lg px-3.5 h-9 flex items-center gap-1.5 font-medium text-xs touch-target nav-transition action-press border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
              <UserPlus size={16} strokeWidth={1.5} className="text-amber-400" />
              <span>Add contractor</span>
            </button>
          </div>

          {/* Top Summary Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-500 block">
                  Total payable to all contractors
                </span>
                <p className="text-2xl sm:text-3xl font-semibold text-rose-700 tabular-nums mt-0.5">
                  {formatINR(totalPayableAll)}
                </p>
                <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                  <span>{contractors.length} sub-contractors registered</span>
                  <span>• Total billed: {formatINR(totalBilledAll)}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-neutral-600" />
              </div>
            </div>
          </div>

          {/* Search & Quiet Trade Filter Tabs */}
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
                placeholder="Search contractor by name, trade (Mason, Plumber), or phone..."
                className="w-full pl-10 pr-4 h-10 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 nav-transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedTrade('all')}
                className={`px-3 h-8 rounded-lg text-xs font-medium whitespace-nowrap nav-transition ${
                  selectedTrade === 'all'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                All trades ({contractors.length})
              </button>

              {['Mason', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'RCC Worker'].map(
                (tr) => {
                  const count = contractors.filter((c) => c.trade === tr).length;
                  if (count === 0 && selectedTrade !== tr) return null;
                  return (
                    <button
                      key={tr}
                      type="button"
                      onClick={() => setSelectedTrade(tr)}
                      className={`px-3 h-8 rounded-lg text-xs font-medium whitespace-nowrap nav-transition ${
                        selectedTrade === tr
                          ? 'bg-neutral-900 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                      }`}
                    >
                      {tr} ({count})
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Contractors Cards List */}
          {filteredContractors.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-neutral-200 text-center">
              <p className="text-sm font-medium text-neutral-900 mb-1">No contractors found</p>
              <p className="text-xs text-neutral-500 mb-4">
                Add your sub-contractors and labour teams to track their running accounts
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddContractor()}
                className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-4 h-9 font-medium text-xs nav-transition action-press"
              >
                <UserPlus size={16} /> Add first contractor
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContractors.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 nav-transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-700 font-semibold text-xs">
                        {c.name
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-900 text-sm leading-snug">
                            {c.name}
                          </h3>
                          <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                            {c.trade}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="text-neutral-700 hover:text-neutral-900 font-medium"
                            >
                              {c.phone}
                            </a>
                          )}
                          {c.address && (
                            <span className="text-neutral-400 truncate max-w-[150px] sm:max-w-xs">
                              • {c.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] text-neutral-500 block">
                        Balance due
                      </span>
                      <span
                        className={`font-semibold text-sm sm:text-base tabular-nums block ${
                          c.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatINR(c.balance)}
                      </span>
                      <span className="text-[11px] text-neutral-400 block">
                        {(c.bills || []).length} bills • {(c.payments || []).length} pays
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2 rounded-lg border border-neutral-100 my-3 text-center text-xs">
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Total work billed</span>
                      <span className="font-medium text-neutral-900 tabular-nums">
                        {formatINR(c.totalBilled)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Total paid</span>
                      <span className="font-medium text-emerald-700 tabular-nums">
                        {formatINR(c.totalPaid)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveLedgerContractor(c)}
                        className="flex items-center gap-1.5 px-3 h-8 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium nav-transition action-press"
                      >
                        <FileText size={14} />
                        <span>Ledger statement</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRecordBill(c)}
                        className="flex items-center gap-1 px-2.5 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-medium nav-transition"
                      >
                        <Plus size={14} />
                        <span>Work bill</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRecordPayment(c)}
                        className="flex items-center gap-1 px-2.5 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-medium nav-transition"
                      >
                        <span>Pay</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAddContractor(c)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md nav-transition"
                        title="Edit contractor"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteContractor(c.id, c.name)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md nav-transition"
                        title="Delete contractor"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal 1: Add/Edit Contractor */}
      {showAddContractorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-200 shadow-xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white rounded-t-2xl sm:rounded-t-xl">
              <h3 className="font-semibold text-sm">
                {editingContractor ? 'Edit contractor' : 'Add new contractor'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddContractorModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-md nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContractor} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Contractor name *
                </label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Trade / Work type *
                  </label>
                  <select
                    value={cTrade}
                    onChange={(e) => setCTrade(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
                  >
                    {TRADE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Address / Site camp
                </label>
                <input
                  type="text"
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  placeholder="e.g. Near Old Bus Stand, Borivali West"
                  className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder="e.g. 10 masons team. Experienced in AAC blockwork."
                  className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-xs nav-transition action-press flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>{editingContractor ? 'Save changes' : 'Add contractor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record Work Bill */}
      {billModalContractor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-200 shadow-xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white rounded-t-2xl sm:rounded-t-xl">
              <div>
                <h3 className="font-semibold text-sm">Record work bill</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {billModalContractor.name} ({billModalContractor.trade})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBillModalContractor(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-md nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWorkBill} className="p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Project / Site *
                  </label>
                  <input
                    type="text"
                    required
                    value={billProject}
                    onChange={(e) => setBillProject(e.target.value)}
                    placeholder="e.g. Harshail Iris Borivali"
                    className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Work description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={billDesc}
                  onChange={(e) => setBillDesc(e.target.value)}
                  placeholder="e.g. AAC block masonry 10th floor 4 flats completed"
                  className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Bill amount (₹) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="55000"
                  className="w-full px-3 h-11 rounded-lg border border-neutral-300 font-medium text-base text-neutral-900 tabular-nums focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-xs nav-transition action-press flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>Save work bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Record Payment */}
      {payModalContractor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-200 shadow-xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white rounded-t-2xl sm:rounded-t-xl">
              <div>
                <h3 className="font-semibold text-sm">Record payment to contractor</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {payModalContractor.name} ({payModalContractor.trade})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayModalContractor(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-md nav-transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-4 space-y-3.5">
              <div className="p-3 bg-neutral-100 rounded-lg flex items-center justify-between text-xs">
                <span className="text-neutral-600">Current balance due:</span>
                <span className="font-semibold text-rose-700 tabular-nums">
                  {formatINR(payModalContractor.balance)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Amount paid (₹) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="25000"
                  className="w-full px-3 h-11 rounded-lg border border-neutral-300 font-medium text-base text-neutral-900 tabular-nums focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Payment date *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 h-10 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Payment mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'upi', label: 'UPI / GPay', icon: QrCode },
                    { mode: 'cash', label: 'Cash (Advance)', icon: Banknote },
                    { mode: 'bank_transfer', label: 'Bank / NEFT', icon: Landmark },
                    { mode: 'cheque', label: 'Cheque', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = payMode === m.mode;
                    return (
                      <button
                        key={m.mode}
                        type="button"
                        onClick={() => setPayMode(m.mode as any)}
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
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Weekly labour payment on Saturday"
                  className="w-full px-3 h-9 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg text-xs nav-transition action-press flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>Confirm payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
