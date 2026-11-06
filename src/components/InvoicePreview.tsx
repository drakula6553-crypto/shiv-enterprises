'use client';

import React from 'react';
import type { Invoice, CompanyProfile } from '@/lib/types';
import { formatDateIN } from '@/lib/utils';
import ShivLogo from './ShivLogo';

interface InvoicePreviewProps {
  invoice: Partial<Invoice>;
  companyProfile: CompanyProfile;
  previewRef?: React.RefObject<HTMLDivElement>;
  className?: string;
}

/**
 * Format amount matching contractor photo: "Rs.  19,80,000.00"
 */
function formatBillAmount(num: number): string {
  const isNeg = num < 0;
  num = Math.abs(num);

  const [intPart, decPart] = num.toFixed(2).split('.');
  let formatted = '';

  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    formatted = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) {
      formatted = remaining.slice(-2) + ',' + formatted;
      remaining = remaining.slice(0, -2);
    }
    formatted = remaining + ',' + formatted;
  }

  return (isNeg ? '-Rs.  ' : 'Rs.  ') + formatted + '.' + decPart;
}

/**
 * Render text with proper ordinal superscripts (e.g. 10th -> 10ᵗʰ) matching typewriter output
 */
function renderParticularsText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\d+(?:st|nd|rd|th))/gi);
  return parts.map((part, idx) => {
    const match = part.match(/^(\d+)(st|nd|rd|th)$/i);
    if (match) {
      return (
        <span key={idx}>
          {match[1]}
          <sup className="text-[9px] align-super lowercase">{match[2]}</sup>
        </span>
      );
    }
    return part;
  });
}

export default function InvoicePreview({
  invoice,
  companyProfile,
  previewRef,
  className = '',
}: InvoicePreviewProps) {
  const lineItems = invoice.lineItems || [];
  const grandTotal = invoice.grandTotal || 0;
  const subtotal = invoice.subtotal || 0;

  // Alphabetic serial numbers: A, B, C, D...
  const getSerial = (idx: number) => {
    return String.fromCharCode(65 + idx); // A, B, C...
  };

  let nextSerialIdx = lineItems.length;

  return (
    <div
      ref={previewRef}
      id="invoice-printable-area"
      className={`bg-white text-black font-mono mx-auto select-text shadow-xl border border-gray-300 print:shadow-none print:border-0 print:p-0 ${className}`}
      style={{
        width: '100%',
        maxWidth: '800px', // Standard A4 width
        minHeight: '1050px',
        padding: '36px 44px',
        boxSizing: 'border-box',
        background: '#FFFFFF',
        fontFamily: '"Courier New", Courier, Lucida, monospace',
      }}
    >
      {/* ─── 1. TOP HEADER (EXACT REPLICA OF REAL LETTERHEAD) ─── */}
      <div className="flex items-start justify-between gap-4 pb-3">
        {/* Left: Civil Contractors & Address */}
        <div className="max-w-[420px]">
          <h2 className="text-base font-black tracking-wide text-black uppercase font-sans border-b-2 border-black inline-block pb-0.5 mb-1.5">
            {companyProfile.businessType || 'CIVIL CONTRACTORS'}
          </h2>
          <p className="text-[11px] text-gray-800 leading-snug font-sans">
            {companyProfile.address ||
              'K-303, Guru Residency, Dharamdas Road, Borivali (W), Mumbai - 400 092.'}
          </p>
          <p className="text-[11px] text-gray-800 mt-1 font-sans">
            <span className="font-semibold">Tel.:</span>{' '}
            {companyProfile.phone || '+ 91 98692 18032'}&nbsp;&nbsp;&nbsp;
            <span className="font-semibold">Email :</span>
            {companyProfile.email || 'shiv3enterprises@gmail.com'}
          </p>
        </div>

        {/* Right: SHIV ENTERPRISES 3D Architectural Logo */}
        <div className="flex-shrink-0">
          {companyProfile.logoUrl ? (
            <img
              src={companyProfile.logoUrl}
              alt={companyProfile.companyName || 'Logo'}
              className="h-16 w-auto max-w-[170px] object-contain"
            />
          ) : (
            <ShivLogo />
          )}
        </div>
      </div>

      {/* Cyan/Sky Blue Horizontal Divider Bar */}
      <div className="w-full h-[3px] bg-[#38BDF8] mb-6" />

      {/* ─── 2. CLIENT DETAILS (TYPEWRITER STYLE) ─── */}
      <div className="space-y-0.5 text-[13px] leading-relaxed text-black">
        <p className="font-bold">Name Of The Client:</p>
        <p className="font-semibold">{invoice.clientName || 'Harshmaan spaces LLP'}</p>
        {invoice.clientAddress ? (
          <p className="whitespace-pre-line text-[12.5px] leading-snug">
            {invoice.clientAddress}
          </p>
        ) : (
          <>
            <p className="text-[12.5px]">104,Rose residency Chs.Pvt.</p>
            <p className="text-[12.5px]">Dixit road,</p>
            <p className="text-[12.5px]">Vile Parle East,</p>
            <p className="text-[12.5px]">Mumbai- 500057.</p>
          </>
        )}
        <p className="font-bold pt-0.5">
          GSTIN- {invoice.clientGstin || '27AAIFH6459C1ZA'}
        </p>
      </div>

      {/* ─── 3. TAX INVOICE TITLE (CENTERED) ─── */}
      <div className="my-4 text-center">
        <h3 className="text-base font-black tracking-widest uppercase inline-block">
          {invoice.gstEnabled ? 'TAX INVOICE' : 'INVOICE / BILL'}
        </h3>
      </div>

      {/* ─── 4. PROJECT REFERENCE WITH UNDERLINE ─── */}
      <div className="mb-4 text-[13px] leading-snug">
        <p className="font-semibold underline decoration-black decoration-1 underline-offset-4">
          Ref: {invoice.projectName || 'Harshail Iris Roshan Nager Borivali West.'}
        </p>
        <p className="text-xs text-gray-400">_</p>
      </div>

      {/* ─── 5. BILL NO & DATE ─── */}
      <div className="mb-4 text-[13px] space-y-0.5">
        <p className="font-bold">
          Bill No:- {invoice.invoiceNumber || 'RS 08'}
        </p>
        <p className="font-bold">
          DATE: {formatDateIN(invoice.invoiceDate || '2026-10-03')}
        </p>
      </div>

      {/* ─── 6. BORDERED TABLE (EXACT FORMAT FROM PHOTO) ─── */}
      <div className="w-full border-2 border-black">
        <table className="w-full border-collapse text-[12px] text-black">
          <thead>
            <tr className="border-b-2 border-black font-bold uppercase tracking-wider">
              <th className="border-r-2 border-black py-2 px-2 w-14 text-center">
                SR.NO
              </th>
              <th className="border-r-2 border-black py-2 px-3 text-center">
                PARTICULARS
              </th>
              <th className="py-2 px-3 w-48 text-center">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {/* Line Items */}
            {lineItems.length === 0 ? (
              <tr className="border-b border-black">
                <td className="border-r-2 border-black py-4 text-center font-bold">
                  A
                </td>
                <td className="border-r-2 border-black py-4 px-3 text-gray-400 italic">
                  No line items added
                </td>
                <td className="py-4 px-3 text-right font-bold">
                  {formatBillAmount(0)}
                </td>
              </tr>
            ) : (
              lineItems.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-black">
                  <td className="border-r-2 border-black py-2.5 px-2 text-center font-bold align-top">
                    {getSerial(idx)}
                  </td>
                  <td className="border-r-2 border-black py-2.5 px-3 font-normal align-top leading-snug">
                    {renderParticularsText(item.description || 'RCC slab work completed as per Drawing.')}
                    {item.quantity > 1 && (
                      <span className="block text-[11px] text-gray-600 mt-0.5">
                        ({item.quantity} {item.unit} @ Rs. {item.rate})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold align-top whitespace-nowrap">
                    {formatBillAmount(item.amount)}
                  </td>
                </tr>
              ))
            )}

            {/* Discount Row (if applicable) */}
            {invoice.discountEnabled && (invoice.discountAmount || 0) > 0 && (
              <tr className="border-b border-black">
                <td className="border-r-2 border-black py-2 px-2 text-center font-bold">
                  {getSerial(nextSerialIdx++)}
                </td>
                <td className="border-r-2 border-black py-2 px-3 text-center font-bold">
                  Less: Special Discount{' '}
                  {invoice.discountType === 'percentage'
                    ? `(${invoice.discountValue}%)`
                    : ''}
                </td>
                <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                  -{formatBillAmount(invoice.discountAmount || 0).replace('Rs.  ', 'Rs. ')}
                </td>
              </tr>
            )}

            {/* GST Rows (CGST + SGST or IGST) */}
            {invoice.gstEnabled && (
              <>
                {invoice.gstType === 'cgst_sgst' ? (
                  <>
                    <tr className="border-b border-black">
                      <td className="border-r-2 border-black py-2 px-2 text-center font-bold">
                        {getSerial(nextSerialIdx++)}
                      </td>
                      <td className="border-r-2 border-black py-2 px-3 text-center font-bold">
                        Add: CGST {(invoice.gstRate || 18) / 2}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                        {formatBillAmount(invoice.cgstAmount || 0)}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r-2 border-black py-2 px-2 text-center font-bold">
                        {getSerial(nextSerialIdx++)}
                      </td>
                      <td className="border-r-2 border-black py-2 px-3 text-center font-bold">
                        Add: SGST {(invoice.gstRate || 18) / 2}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                        {formatBillAmount(invoice.sgstAmount || 0)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-black">
                    <td className="border-r-2 border-black py-2 px-2 text-center font-bold">
                      {getSerial(nextSerialIdx++)}
                    </td>
                    <td className="border-r-2 border-black py-2 px-3 text-center font-bold">
                      Add: IGST {invoice.gstRate || 18}%
                    </td>
                    <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                      {formatBillAmount(invoice.igstAmount || 0)}
                    </td>
                  </tr>
                )}
              </>
            )}

            {/* Summary / Total Bill Amount Row */}
            <tr className="border-b-2 border-black font-bold">
              <td
                colSpan={2}
                className="border-r-2 border-black py-2.5 px-3 text-center text-[12.5px] uppercase tracking-wide"
              >
                Total Bill Amount (round off)
              </td>
              <td className="py-2.5 px-3 text-right font-black text-[13px] whitespace-nowrap">
                {formatBillAmount(grandTotal)}
              </td>
            </tr>

            {/* Amount In Words Row (Spanning full table width) */}
            <tr>
              <td
                colSpan={3}
                className="py-2.5 px-3 text-[11.5px] font-bold leading-snug uppercase tracking-tight"
              >
                AMOUNT IN WORDS: (
                {invoice.amountInWords ||
                  'Rupees Twenty Three lac thirty six thousand four hundred only.'}
                )
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── 7. GSTIN, PAN & SIGNATURE (EXACT MATCH TO PHOTO) ─── */}
      <div className="mt-4 flex items-start justify-between text-[13px]">
        {/* Left: Contractor GSTIN & PAN */}
        <div className="space-y-1 font-bold pt-1">
          <p>
            GSTIN :-&nbsp;&nbsp;{companyProfile.gstin || '27ACQFS7564P1ZW'}
          </p>
          <p>
            PAN NO :-&nbsp;{companyProfile.panNo || 'ACQFS7564P'}
          </p>
        </div>

        {/* Right: Signature Section */}
        <div className="text-center font-bold pr-2 flex flex-col items-center">
          <p className="text-base tracking-widest uppercase">
            {companyProfile.companyName || 'SHIV ENTERPRISES'}
          </p>

          {/* Signature / Stamp area */}
          <div className="h-24 w-44 flex items-center justify-center my-1">
            {companyProfile.signatureUrl ? (
              <img
                src={companyProfile.signatureUrl}
                alt="Signature"
                className="max-h-20 max-w-[170px] object-contain"
              />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>

          <p className="text-[13px] tracking-wider uppercase font-black">
            {companyProfile.signatoryTitle || 'PARTNER'}
          </p>
        </div>
      </div>
    </div>
  );
}
