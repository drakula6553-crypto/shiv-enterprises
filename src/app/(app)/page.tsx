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
} from 'lucide-react';
import { getInvoices, getExpenses } from '@/lib/storage';
import { formatINR, formatDateIN } from '@/lib/utils';
import type { Invoice, Expense } from '@/lib/types';

export default function HomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setInvoices(getInvoices());
    setExpenses(getExpenses());
  }, []);

  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalReceived = invoices.reduce((acc, inv) => acc + (inv.totalReceived || 0), 0);
  const totalPending = invoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const unpaidCount = invoices.filter((inv) => inv.status !== 'paid').length;

  const collectionPercent = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;

  const recentInvoices = invoices.slice(0, 3);
  const recentExpenses = expenses.slice(0, 3);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-12">
      {/* Context Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[11px] font-medium tracking-wide mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>Shiv Enterprises Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
            Financial & Site Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Civil Contractors • Borivali (W), Mumbai • Live Ledger & GST Tax Invoicing
          </p>
        </div>

        {/* Date & Site Status */}
        <div className="flex items-center gap-2 sm:self-center">
          <div className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-xs text-neutral-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-neutral-800">Borivali Sites Active</span>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <section className="mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* New Bill (Primary Action) */}
          <Link
            href="/new-bill"
            className="group relative bg-[#0B0F17] hover:bg-[#131926] active:bg-[#070A0F] text-white rounded-xl p-4 flex flex-col justify-between min-h-[108px] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/[0.08] action-press"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FilePlus size={16} strokeWidth={2} />
              </div>
              <ArrowUpRight size={14} className="text-neutral-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div>
              <span className="font-semibold text-sm block tracking-tight text-white">
                New Bill
              </span>
              <span className="text-[11px] text-neutral-400 block mt-0.5">
                Harshmaan & custom
              </span>
            </div>
          </Link>

          {/* Bills & Invoices */}
          <Link
            href="/bills"
            className="group bg-white hover:bg-neutral-50/80 active:bg-neutral-100 text-neutral-900 rounded-xl p-4 flex flex-col justify-between min-h-[108px] transition-all border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] action-press"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                <FileText size={16} strokeWidth={1.5} />
              </div>
              <ArrowUpRight size={14} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
            </div>
            <div>
              <span className="font-semibold text-sm block tracking-tight text-neutral-900">
                Bills & Invoices
              </span>
              <span className="text-[11px] text-neutral-500 block mt-0.5">
                Track payments & PDF
              </span>
            </div>
          </Link>

          {/* Purchases & Expenses */}
          <Link
            href="/expenses"
            className="group bg-white hover:bg-neutral-50/80 active:bg-neutral-100 text-neutral-900 rounded-xl p-4 flex flex-col justify-between min-h-[108px] transition-all border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] action-press"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                <ShoppingBag size={16} strokeWidth={1.5} />
              </div>
              <ArrowUpRight size={14} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
            </div>
            <div>
              <span className="font-semibold text-sm block tracking-tight text-neutral-900">
                Purchases & Expenses
              </span>
              <span className="text-[11px] text-neutral-500 block mt-0.5">
                Materials & petty cash
              </span>
            </div>
          </Link>

          {/* Subcontractor Ledgers */}
          <Link
            href="/contractors"
            className="group bg-white hover:bg-neutral-50/80 active:bg-neutral-100 text-neutral-900 rounded-xl p-4 flex flex-col justify-between min-h-[108px] transition-all border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] action-press"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                <Users size={16} strokeWidth={1.5} />
              </div>
              <ArrowUpRight size={14} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
            </div>
            <div>
              <span className="font-semibold text-sm block tracking-tight text-neutral-900">
                Subcontractors
              </span>
              <span className="text-[11px] text-neutral-500 block mt-0.5">
                Work bills & ledgers
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Financial Health & Clearance Rate Banner */}
      <section className="mb-8 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
              Financial Summary
            </span>
            <h2 className="text-base font-bold text-neutral-900">
              Billing & Collection Performance
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500">Collection Clearance:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-neutral-900 font-mono">
                {collectionPercent}%
              </span>
              <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, collectionPercent)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Key Figures */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-5">
          <div>
            <span className="text-xs text-neutral-500 block">Total Billed (Invoiced)</span>
            <p className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums font-mono mt-1">
              {formatINR(totalBilled)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">{invoices.length} official bills</p>
          </div>

          <div>
            <span className="text-xs text-neutral-500 block">Collected & Cleared</span>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums font-mono mt-1">
              {formatINR(totalReceived)}
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-1">RTGS / NEFT / Cheques</p>
          </div>

          <div>
            <span className="text-xs text-neutral-500 block">Outstanding Due</span>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 tabular-nums font-mono mt-1">
              {formatINR(totalPending)}
            </p>
            <p className="text-[11px] text-rose-700/80 mt-1">{unpaidCount} bills pending</p>
          </div>

          <div>
            <span className="text-xs text-neutral-500 block">Materials & Purchases</span>
            <p className="text-xl sm:text-2xl font-bold text-neutral-800 tabular-nums font-mono mt-1">
              {formatINR(totalExpenses)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">{expenses.length} site entries</p>
          </div>
        </div>
      </section>

      {/* Two Columns: Recent Bills & Recent Purchases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Client Invoices */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">
              Recent Client Bills
            </h2>
            <Link
              href="/bills"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 nav-transition"
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
                className="block bg-white rounded-xl p-4 border border-neutral-200/80 hover:border-neutral-300 shadow-[0_1px_3px_rgba(0,0,0,0.02)] nav-transition action-press"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-neutral-900 font-mono">
                        {inv.invoiceNumber}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            inv.status === 'paid'
                              ? 'bg-emerald-600'
                              : inv.status === 'partial'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="capitalize">{inv.status}</span>
                      </span>
                    </div>
                    <p className="font-medium text-neutral-800 text-xs mt-1.5 truncate max-w-[220px]">
                      {inv.clientName}
                    </p>
                    {inv.projectName && (
                      <p className="text-[11px] text-neutral-400 truncate max-w-[220px]">
                        {inv.projectName}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-sm text-neutral-900 tabular-nums font-mono block">
                      {formatINR(inv.grandTotal)}
                    </span>
                    <span className="text-[11px] text-neutral-400 block font-mono mt-0.5">
                      {formatDateIN(inv.invoiceDate)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Purchases & Outflows */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono">
              Recent Purchases & Outflows
            </h2>
            <Link
              href="/expenses"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 nav-transition"
            >
              <span>View all ({expenses.length})</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-xl p-4 border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md font-mono">
                        {exp.category}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {formatDateIN(exp.date)}
                      </span>
                    </div>
                    <p className="font-medium text-neutral-800 text-xs mt-1.5 truncate max-w-[220px]">
                      {exp.paidTo}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate max-w-[220px]">
                      {exp.description}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-sm text-neutral-900 tabular-nums font-mono block">
                      {formatINR(exp.amount)}
                    </span>
                    <span className="text-[11px] text-neutral-400 uppercase font-mono mt-0.5 block">
                      {exp.paymentMode}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
