'use client';

import React from 'react';
import type { CompanyProfile } from '@/lib/types';
import {
  ProjectRAContract,
  computeProjectRACalculations,
} from '@/lib/projectTracking';
import ShivLogo from './ShivLogo';
import { formatINR } from '@/lib/utils';

interface ProjectRAPrintableProps {
  contract: ProjectRAContract;
  companyProfile: CompanyProfile;
  previewRefPage1?: React.RefObject<HTMLDivElement>;
  previewRefPage2?: React.RefObject<HTMLDivElement>;
}

export default function ProjectRAPrintable({
  contract,
  companyProfile,
  previewRefPage1,
  previewRefPage2,
}: ProjectRAPrintableProps) {
  const calc = computeProjectRACalculations(contract);

  return (
    <div className="flex flex-col gap-8 print:gap-0">
      {/* ════════════════════════════════════════════════════════════
          PAGE 1: MODE OF PAYMENT (SCHEDULE OF RATES)
      ════════════════════════════════════════════════════════════ */}
      <div
        ref={previewRefPage1}
        id="project-ra-page-1"
        className="w-[800px] min-h-[1130px] bg-white text-neutral-900 p-8 shadow-md border border-neutral-200 mx-auto print:shadow-none print:border-none print:p-6 print:m-0 print:w-full flex flex-col justify-between"
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
      >
        <div>
          {/* Top Letterhead Header */}
          <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-3 mb-3">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-neutral-700">
                GSTIN: {companyProfile.gstin || '27AAIFH6459C1ZA'}
              </div>
              <div className="text-[11px] font-bold tracking-wider text-neutral-700">
                PAN NO: {companyProfile.panNo || 'ACQFS7564P'}
              </div>
            </div>
            <ShivLogo />
          </div>

          {/* Document Title */}
          <div className="text-center my-3">
            <h2 className="text-[17px] font-black uppercase tracking-wider underline">
              {contract.projectName} (Mode of payment)
            </h2>
            <div className="text-xs font-semibold text-neutral-600 mt-1">
              Civil Contractor Schedule of Rates & Payment Milestones
            </div>
          </div>

          {/* Reference Meta Box */}
          <div className="flex justify-between items-center bg-neutral-100/80 border border-neutral-400 px-3 py-2 text-xs mb-3 font-semibold">
            <div>
              <span className="text-neutral-600">Client / Builder:</span>{' '}
              <strong className="text-neutral-900 uppercase">{contract.builderName}</strong>
            </div>
            <div>
              <span className="text-neutral-600">Date:</span>{' '}
              <strong className="text-neutral-900">{contract.contractDate}</strong>
            </div>
          </div>

          {/* Area & Rates Summary Table */}
          <div className="border border-neutral-900 mb-4 text-xs">
            <div className="grid grid-cols-4 bg-neutral-200 font-bold border-b border-neutral-900 p-1.5 text-center">
              <div>Billing Area (sq.ft.)</div>
              <div>Labour Rate</div>
              <div>Material Rate</div>
              <div>Total Turnkey Rate</div>
            </div>
            <div className="grid grid-cols-4 p-1.5 text-center font-semibold">
              <div>{contract.billingAreaSqFt.toLocaleString('en-IN')} sq.ft.</div>
              <div>₹{contract.labourRate}/sq.ft. (₹{formatINR(calc.totalLabourContract)})</div>
              <div>₹{contract.materialRate}/sq.ft. (₹{formatINR(calc.totalMaterialContract)})</div>
              <div className="font-bold text-neutral-950">₹{contract.labourRate + contract.materialRate}/sq.ft. (₹{formatINR(calc.totalTurnkeyContract)})</div>
            </div>
          </div>

          {/* Milestones Schedule Table */}
          <table className="w-full border-collapse border border-neutral-900 text-[11px] leading-tight">
            <thead>
              <tr className="bg-neutral-200 font-bold text-neutral-950 border-b border-neutral-900">
                <th className="border border-neutral-900 px-1.5 py-1 text-center w-8">Sr.</th>
                <th className="border border-neutral-900 px-2 py-1 text-left">Description of Item</th>
                <th className="border border-neutral-900 px-2 py-1 text-center w-24">Percentage</th>
                <th className="border border-neutral-900 px-2 py-1 text-right w-32">Labour Amount</th>
                <th className="border border-neutral-900 px-2 py-1 text-right w-32">Material amount</th>
              </tr>
            </thead>
            <tbody>
              {contract.stages.map((stage) => {
                const isCompleted =
                  stage.status === 'completed_billed' ||
                  stage.status === 'completed_pending';
                const isPending = stage.status === 'completed_pending';

                return (
                  <tr
                    key={stage.id}
                    className={`border-b border-neutral-400 ${
                      isPending
                        ? 'bg-emerald-50/70 font-semibold'
                        : isCompleted
                        ? 'bg-amber-50/50'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <td className="border border-neutral-900 px-1.5 py-0.5 text-center">{stage.sr}</td>
                    <td className="border border-neutral-900 px-2 py-0.5 font-medium">
                      {stage.description}
                      {stage.billedInvoiceNumber && (
                        <span className="ml-1 text-[9px] text-blue-800 font-bold">
                          [{stage.billedInvoiceNumber}]
                        </span>
                      )}
                    </td>
                    <td className="border border-neutral-900 px-2 py-0.5 text-center font-bold">
                      {stage.percentage}%
                    </td>
                    <td className="border border-neutral-900 px-2 py-0.5 text-right font-medium">
                      {stage.labourAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="border border-neutral-900 px-2 py-0.5 text-right font-medium">
                      {stage.materialAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-200 font-black text-neutral-950 border-t-2 border-neutral-900 text-xs">
                <td colSpan={2} className="border border-neutral-900 px-2 py-1.5 text-right">
                  Total % and Amount
                </td>
                <td className="border border-neutral-900 px-2 py-1.5 text-center">100%</td>
                <td className="border border-neutral-900 px-2 py-1.5 text-right">
                  {calc.totalLabourContract.toLocaleString('en-IN')}
                </td>
                <td className="border border-neutral-900 px-2 py-1.5 text-right">
                  {calc.totalMaterialContract.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer / Partner Stamp */}
        <div className="mt-4 pt-3 border-t border-neutral-400 flex justify-between items-end text-xs">
          <div>
            <div className="font-bold text-[10px] text-neutral-600 uppercase">
              Registered Office:
            </div>
            <div className="text-[10px] text-neutral-700">
              {companyProfile.address || 'Borivali (West), Mumbai - 400092'}
            </div>
          </div>
          <div className="text-center min-w-[160px]">
            <div className="font-bold uppercase tracking-wider mb-8">
              For SHIV ENTERPRISES
            </div>
            <div className="border-t border-neutral-900 pt-1 font-bold text-[11px] uppercase">
              {companyProfile.signatoryTitle || 'PARTNER'}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          PAGE 2: LABOUR & MATERIAL RA STATEMENT & RMC DEDUCTION
      ════════════════════════════════════════════════════════════ */}
      <div
        ref={previewRefPage2}
        id="project-ra-page-2"
        className="w-[800px] min-h-[1130px] bg-white text-neutral-900 p-8 shadow-md border border-neutral-200 mx-auto print:shadow-none print:border-none print:p-6 print:m-0 print:w-full flex flex-col justify-between"
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
      >
        <div>
          {/* Top Letterhead Header */}
          <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-3 mb-3">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-neutral-700">
                GSTIN: {companyProfile.gstin || '27AAIFH6459C1ZA'}
              </div>
              <div className="text-[11px] font-bold tracking-wider text-neutral-700">
                PAN NO: {companyProfile.panNo || 'ACQFS7564P'}
              </div>
            </div>
            <ShivLogo />
          </div>

          {/* Document Title */}
          <div className="text-center my-2">
            <h2 className="text-[17px] font-black uppercase tracking-wider underline">
              {contract.projectName} Labour And Material Ac.
            </h2>
            <div className="text-xs font-semibold text-neutral-600 mt-0.5">
              Running Account (RA) Statement & Reconciliation Ledger • Date: {contract.contractDate}
            </div>
          </div>

          {/* Area & Rate Summary Bar */}
          <div className="border border-neutral-900 text-xs mb-3">
            <div className="grid grid-cols-4 bg-neutral-200 font-bold border-b border-neutral-900 p-1.5 text-center">
              <div>Billing Area (sq.ft.)</div>
              <div>Labour Rate</div>
              <div>Material Rate</div>
              <div>Contract Turnkey Value</div>
            </div>
            <div className="grid grid-cols-4 p-1 text-center font-semibold text-[11px]">
              <div>{contract.billingAreaSqFt.toLocaleString('en-IN')}</div>
              <div>{contract.labourRate} (₹{formatINR(calc.totalLabourContract)})</div>
              <div>{contract.materialRate} (₹{formatINR(calc.totalMaterialContract)})</div>
              <div className="font-bold">₹{formatINR(calc.totalTurnkeyContract)}</div>
            </div>
          </div>

          {/* Work Completed Milestones Table */}
          <div className="mb-3">
            <table className="w-full border-collapse border border-neutral-900 text-[10.5px] leading-tight">
              <thead>
                <tr className="bg-neutral-200 font-bold text-neutral-950 border-b border-neutral-900">
                  <th className="border border-neutral-900 px-2 py-1 text-left">Work completed</th>
                  <th className="border border-neutral-900 px-1 py-1 text-center w-20">Percentage</th>
                  <th className="border border-neutral-900 px-2 py-1 text-right w-28">Labour (A)</th>
                  <th className="border border-neutral-900 px-2 py-1 text-right w-28">Material (B)</th>
                  <th className="border border-neutral-900 px-2 py-1 text-left w-44">Status / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {contract.stages
                  .filter(
                    (s) =>
                      s.status === 'completed_billed' ||
                      s.status === 'completed_pending'
                  )
                  .map((stage) => {
                    const pct = stage.completedPercentage || stage.percentage;
                    const labour = Math.round((calc.totalLabourContract * pct) / 100);
                    const material = Math.round((calc.totalMaterialContract * pct) / 100);
                    const isPending = stage.status === 'completed_pending';

                    return (
                      <tr
                        key={stage.id}
                        className={`border-b border-neutral-400 ${
                          isPending ? 'bg-emerald-50/70 font-semibold' : 'bg-neutral-50/60'
                        }`}
                      >
                        <td className="border border-neutral-900 px-2 py-0.5">{stage.description}</td>
                        <td className="border border-neutral-900 px-1 py-0.5 text-center font-bold">
                          {pct}%
                        </td>
                        <td className="border border-neutral-900 px-2 py-0.5 text-right">
                          {labour.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-neutral-900 px-2 py-0.5 text-right">
                          {material.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-neutral-900 px-2 py-0.5 text-[10px]">
                          {isPending ? (
                            <span className="text-emerald-800 font-bold">
                              Submission of The Bill is Pending
                            </span>
                          ) : (
                            <span className="text-blue-900">
                              Billed ({stage.billedInvoiceNumber || 'RN'})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-200 font-black text-neutral-950 border-t-2 border-neutral-900 text-xs">
                  <td className="border border-neutral-900 px-2 py-1 text-right">Total</td>
                  <td className="border border-neutral-900 px-1 py-1 text-center">
                    {calc.totalCompletedPercentage}%
                  </td>
                  <td className="border border-neutral-900 px-2 py-1 text-right">
                    {calc.totalLabourCompletedEarned.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-neutral-900 px-2 py-1 text-right">
                    {calc.totalMaterialCompletedEarned.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-neutral-900 px-2 py-1 text-[10px] italic">
                    Physical Progress
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Running Reconciliation Box (Labour & Material Account Due) */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            {/* 1@ Labour Account Box */}
            <div className="border border-neutral-900 p-2 bg-amber-50/40">
              <div className="font-black border-b border-neutral-900 pb-1 mb-1.5 flex justify-between">
                <span>1@ Labour Account Due</span>
                <span className="text-neutral-600">Rate ₹600/sq.ft.</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Gross Labour Work Done:</span>
                  <strong className="font-mono">₹{calc.totalLabourCompletedEarned.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Less: Labour Bills Submitted (RN 08):</span>
                  <span className="font-mono text-red-700">-₹{calc.labourBilled.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-neutral-800 pt-1 flex justify-between font-black text-xs text-neutral-950 bg-amber-100/60 p-1 rounded">
                  <span>1@ Labour Ac. Due:</span>
                  <span className="font-mono">₹{calc.labourDueAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* 2@ Material Account Box */}
            <div className="border border-neutral-900 p-2 bg-blue-50/40">
              <div className="font-black border-b border-neutral-900 pb-1 mb-1.5 flex justify-between">
                <span>2@ Material Account Due</span>
                <span className="text-neutral-600">Rate ₹400/sq.ft.</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Gross Material Work Done:</span>
                  <strong className="font-mono">₹{calc.totalMaterialCompletedEarned.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Less: Material Submitted Bills:</span>
                  <span className="font-mono text-red-700">-₹{calc.materialBilled.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Less: Total RMC Deductions:</span>
                  <span className="font-mono text-red-700">-₹{calc.totalRmcDeductions.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-neutral-800 font-semibold text-[10.5px]">
                  <span>Material Balance Subtotal:</span>
                  <span className="font-mono">₹{calc.materialBalanceBeforeAdj.toLocaleString('en-IN')}</span>
                </div>
                {contract.materialAdjustments.map((adj) => (
                  <div key={adj.id} className="flex justify-between text-emerald-800 font-semibold text-[10px]">
                    <span className="truncate max-w-[210px]">{adj.title}:</span>
                    <span className="font-mono">
                      {adj.type === 'add' ? '+' : '-'}₹{adj.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div className="border-t border-neutral-800 pt-1 flex justify-between font-black text-xs text-neutral-950 bg-blue-100/60 p-1 rounded">
                  <span>2@ Material Ac. Due Amount:</span>
                  <span className="font-mono">₹{calc.materialDueAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RMC Deductions Detail Table */}
          <div className="mb-3">
            <div className="font-black text-xs uppercase mb-1">
              Roshan Nager RMC Deduction (Ready Mix Concrete Supplied by Builder)
            </div>
            <table className="w-full border-collapse border border-neutral-900 text-[10.5px] leading-tight">
              <thead>
                <tr className="bg-neutral-200 font-bold text-neutral-950 border-b border-neutral-900">
                  <th className="border border-neutral-900 px-1 py-1 text-center w-8">Sr.</th>
                  <th className="border border-neutral-900 px-2 py-1 text-left">Concrete Grade</th>
                  <th className="border border-neutral-900 px-2 py-1 text-right w-32">Quantity (cu.mtr)</th>
                  <th className="border border-neutral-900 px-2 py-1 text-right w-24">Rate (₹)</th>
                  <th className="border border-neutral-900 px-2 py-1 text-right w-32">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {contract.rmcDeductions.map((rmc, i) => (
                  <tr key={rmc.id} className="border-b border-neutral-400">
                    <td className="border border-neutral-900 px-1 py-0.5 text-center">{i + 1}</td>
                    <td className="border border-neutral-900 px-2 py-0.5 font-bold">{rmc.grade}</td>
                    <td className="border border-neutral-900 px-2 py-0.5 text-right font-mono">
                      {rmc.quantityCuM.toLocaleString('en-IN')}
                    </td>
                    <td className="border border-neutral-900 px-2 py-0.5 text-right font-mono">
                      {rmc.rate.toLocaleString('en-IN')}
                    </td>
                    <td className="border border-neutral-900 px-2 py-0.5 text-right font-mono font-medium">
                      {rmc.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-200 font-bold text-xs">
                  <td colSpan={4} className="border border-neutral-900 px-2 py-1 text-right">
                    Total Deduction of RMC:
                  </td>
                  <td className="border border-neutral-900 px-2 py-1 text-right font-mono font-black">
                    ₹{calc.totalRmcDeductions.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grand Total Net Outstanding Card */}
          <div className="bg-emerald-100/90 border-2 border-emerald-800 p-3 text-center my-2 rounded">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Total Due Labour 1@ + 2@ Material Ac. Amount is
            </div>
            <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
              ₹{calc.grandTotalDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] italic text-emerald-800 mt-0.5">
              (One Crore Twenty-Eight Lakh Ninety-Three Thousand Nine Hundred Twenty-Four Only)
            </div>
          </div>
        </div>

        {/* Footer / Partner Stamp */}
        <div className="mt-3 pt-2 border-t border-neutral-400 flex justify-between items-end text-xs">
          <div>
            <div className="font-bold text-[10px] text-neutral-600 uppercase">
              Bank Details & RTGS/NEFT:
            </div>
            <div className="text-[10px] text-neutral-700">
              {companyProfile.bankName} • A/C: {companyProfile.accountNumber} • IFSC: {companyProfile.ifscCode}
            </div>
          </div>
          <div className="text-center min-w-[160px]">
            <div className="font-bold uppercase tracking-wider mb-8">
              For SHIV ENTERPRISES
            </div>
            <div className="border-t border-neutral-900 pt-1 font-bold text-[11px] uppercase">
              {companyProfile.signatoryTitle || 'PARTNER'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
