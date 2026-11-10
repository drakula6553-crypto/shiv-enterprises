'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FilePlus,
  FileText,
  ShoppingBag,
  Users,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Building,
  ArrowUpRight,
  Layers,
  IndianRupee,
  Activity,
  HardHat,
} from 'lucide-react';
import { getInvoices, getExpenses } from '@/lib/storage';
import { getProjectsRA, computeProjectRACalculations } from '@/lib/projectTracking';
import { formatINR, formatDateIN } from '@/lib/utils';
import type { Invoice, Expense } from '@/lib/types';

export default function HomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [raProgressPct, setRaProgressPct] = useState<number>(59.75);
  const [raDueAmount, setRaDueAmount] = useState<number>(12893924);

  useEffect(() => {
    setInvoices(getInvoices());
    setExpenses(getExpenses());
    try {
      const projects = getProjectsRA();
      if (projects.length > 0) {
        const calc = computeProjectRACalculations(projects[0]);
        setRaProgressPct(calc.totalCompletedPercentage);
        setRaDueAmount(calc.grandTotalDue);
      }
    } catch {}
  }, []);

  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalReceived = invoices.reduce((acc, inv) => acc + (inv.totalReceived || 0), 0);
  const totalPending = invoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const unpaidCount = invoices.filter((inv) => inv.status !== 'paid').length;

  const collectionPercent = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;

  const recentInvoices = invoices.slice(0, 4);
  const recentExpenses = expenses.slice(0, 4);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto pb-24 md:pb-12 space-y-6">
      {/* Context Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-800 text-[11px] font-semibold tracking-wide mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
            <span>Shiv Enterprises Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-sans">
            Financial &amp; Site Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Civil Contractors • Borivali (W), Mumbai • Turnkey High-Rise RCC &amp; Running Account Ledger
          </p>
        </div>

        {/* Date & Site Status */}
        <div className="flex items-center gap-2 sm:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)] text-xs text-slate-600 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-800">Borivali Sites Active</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid (5 Modules) */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. New Bill (Primary Action) */}
          <Link
            href="/new-bill"
            className="group bg-[#0A192F] hover:bg-[#0D223F] active:bg-[#071324] text-white rounded-2xl p-4 flex flex-col justify-between min-h-[116px] transition-all border border-slate-800 shadow-[0_4px_16px_rgba(10,25,47,0.18)]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300">
                <FilePlus size={16} strokeWidth={2} />
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-sky-300 transition-colors" />
            </div>
            <div>
              <span className="font-bold text-sm block tracking-tight text-white font-sans">
                New Bill
              </span>
              <span className="text-[11px] text-slate-300 block mt-0.5 font-medium">
                Harshmaan &amp; custom
              </span>
            </div>
          </Link>

          {/* 2. Project RA & Milestones (Flagship Ledger) */}
          <Link
            href="/project-tracking"
            className="group bg-gradient-to-br from-[#F0F9FF] to-white hover:from-[#E0F2FE] hover:to-white text-slate-900 rounded-2xl p-4 flex flex-col justify-between min-h-[116px] transition-all border border-sky-200 shadow-[0_2px_12px_rgba(2,132,199,0.06)]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white shadow-sm">
                <Layers size={16} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-md">
                {raProgressPct}% Done
              </span>
            </div>
            <div>
              <span className="font-bold text-sm block tracking-tight text-slate-900 font-sans">
                Project RA Ledger
              </span>
              <span className="text-[11px] text-sky-800 block mt-0.5 font-mono font-semibold">
                Due: ₹{formatINR(raDueAmount)}
              </span>
            </div>
          </Link>

          {/* 3. Bills & Invoices */}
          <Link
            href="/bills"
            className="group bg-white hover:bg-slate-50/80 active:bg-slate-100 text-slate-900 rounded-2xl p-4 flex flex-col justify-between min-h-[116px] transition-all border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <FileText size={16} strokeWidth={1.5} />
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
            <div>
              <span className="font-bold text-sm block tracking-tight text-slate-900 font-sans">
                Bills &amp; Invoices
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                {invoices.length} official bills
              </span>
            </div>
          </Link>

          {/* 4. Purchases & Expenses */}
          <Link
            href="/expenses"
            className="group bg-white hover:bg-slate-50/80 active:bg-slate-100 text-slate-900 rounded-2xl p-4 flex flex-col justify-between min-h-[116px] transition-all border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <ShoppingBag size={16} strokeWidth={1.5} />
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
            <div>
              <span className="font-bold text-sm block tracking-tight text-slate-900 font-sans">
                Purchases &amp; Expenses
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                Materials &amp; fuel vouchers
              </span>
            </div>
          </Link>

          {/* 5. Subcontractors */}
          <Link
            href="/contractors"
            className="group bg-white hover:bg-slate-50/80 active:bg-slate-100 text-slate-900 rounded-2xl p-4 flex flex-col justify-between min-h-[116px] transition-all border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)] col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Users size={16} strokeWidth={1.5} />
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
            <div>
              <span className="font-bold text-sm block tracking-tight text-slate-900 font-sans">
                Subcontractors
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                Labour &amp; trade ledgers
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Financial Health & Clearance Rate Card */}
      <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Financial Summary
            </span>
            <h2 className="text-base font-bold text-slate-900 font-sans">
              Billing &amp; Collection Performance
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Collection Clearance:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 font-mono">
                {collectionPercent}%
              </span>
              <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0284C7] to-[#059669] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, collectionPercent)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Architectural Key Figures */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-5">
          {/* Total Invoiced */}
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Billed (Invoiced)</span>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums font-mono mt-1">
              {formatINR(totalBilled)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-1">{invoices.length} official bills</p>
          </div>

          {/* Collected */}
          <div>
            <span className="text-xs text-slate-500 font-medium block">Collected &amp; Cleared</span>
            <p className="text-xl sm:text-2xl font-bold text-[#059669] tabular-nums font-mono mt-1">
              {formatINR(totalReceived)}
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-1">RTGS / NEFT / Cheques</p>
          </div>

          {/* Outstanding Due */}
          <div>
            <span className="text-xs text-slate-500 font-medium block">Outstanding Balance Due</span>
            <p className="text-xl sm:text-2xl font-bold text-[#DC2626] tabular-nums font-mono mt-1">
              {formatINR(totalPending)}
            </p>
            <p className="text-[11px] text-rose-700/80 mt-1 font-mono">{unpaidCount} bills pending clearance</p>
          </div>

          {/* Outflow */}
          <div>
            <span className="text-xs text-slate-500 font-medium block">Materials &amp; Site Purchases</span>
            <p className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums font-mono mt-1">
              {formatINR(totalExpenses)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-1">{expenses.length} recorded vouchers</p>
          </div>
        </div>
      </section>

      {/* Two Columns: Recent Bills & Recent Purchases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Client Invoices */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
                <FileText size={14} className="text-[#0284C7]" />
                <span>Recent Client Bills</span>
              </h2>
              <Link
                href="/bills"
                className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] flex items-center gap-1 transition-colors"
              >
                <span>View all ({invoices.length})</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/new-bill?edit=${inv.id}`}
                  className="block bg-slate-50/70 hover:bg-slate-100/80 rounded-xl p-3.5 border border-slate-200/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {inv.invoiceNumber}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono bg-white border border-slate-200 text-slate-700">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              inv.status === 'paid'
                                ? 'bg-emerald-600'
                                : inv.status === 'partial'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span>{inv.status}</span>
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-xs mt-1.5 truncate max-w-[220px]">
                        {inv.clientName}
                      </p>
                      {inv.projectName && (
                        <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                          {inv.projectName}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm text-slate-900 tabular-nums font-mono block">
                        ₹{formatINR(inv.grandTotal)}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                        {formatDateIN(inv.invoiceDate)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Purchases & Outflows */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
                <ShoppingBag size={14} className="text-emerald-600" />
                <span>Recent Site Outflows</span>
              </h2>
              <Link
                href="/expenses"
                className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] flex items-center gap-1 transition-colors"
              >
                <span>View all ({expenses.length})</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                          {exp.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateIN(exp.date)}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-xs mt-1.5 truncate max-w-[220px]">
                        {exp.paidTo}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                        {exp.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm text-slate-900 tabular-nums font-mono block">
                        ₹{formatINR(exp.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold mt-0.5 block">
                        {exp.paymentMode}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
