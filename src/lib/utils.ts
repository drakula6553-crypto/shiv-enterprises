import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn class merging helper
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// Utility functions for the Contractor Business App
// ============================================================

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Format a number in Indian currency style: ₹1,23,456.78
 */
export function formatINR(num: number): string {
  if (num === 0) return '₹0';
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

  // Include decimal only if not .00
  if (decPart !== '00') {
    formatted += '.' + decPart;
  }

  return (isNeg ? '-₹' : '₹') + formatted;
}

/**
 * Convert number to Indian words for invoice
 * e.g. 135467.50 → "Rupees One Lakh Thirty-Five Thousand Four Hundred Sixty-Seven and Fifty Paise Only"
 */
export function numberToWords(n: number): string {
  if (n === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return tens[t] + (o ? '-' + ones[o] : '');
  }

  function threeDigits(num: number): string {
    if (num === 0) return '';
    const h = Math.floor(num / 100);
    const rem = num % 100;
    let s = '';
    if (h > 0) s += ones[h] + ' Hundred';
    if (rem > 0) s += (h > 0 ? ' ' : '') + twoDigits(rem);
    return s;
  }

  // Indian numbering: Crore, Lakh, Thousand, Hundred
  function intToWords(num: number): string {
    if (num === 0) return '';

    let result = '';
    // Crores (1,00,00,000+)
    const crores = Math.floor(num / 10000000);
    num %= 10000000;
    if (crores > 0) result += threeDigits(crores) + ' Crore ';

    // Lakhs (1,00,000)
    const lakhs = Math.floor(num / 100000);
    num %= 100000;
    if (lakhs > 0) result += twoDigits(lakhs) + ' Lakh ';

    // Thousands (1,000)
    const thousands = Math.floor(num / 1000);
    num %= 1000;
    if (thousands > 0) result += twoDigits(thousands) + ' Thousand ';

    // Hundreds & remainder
    if (num > 0) result += threeDigits(num);

    return result.trim();
  }

  const absN = Math.abs(n);
  const rupees = Math.floor(absN);
  const paise = Math.round((absN - rupees) * 100);

  let words = 'Rupees ' + (rupees > 0 ? intToWords(rupees) : 'Zero');

  if (paise > 0) {
    words += ' and ' + twoDigits(paise) + ' Paise';
  }

  words += ' Only';
  return words;
}

/**
 * Format a date string (YYYY-MM-DD) to Indian display format (DD/MM/YYYY)
 */
export function formatDateIN(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function todayISO(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Get a date N days from now as YYYY-MM-DD
 */
export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/**
 * Generate next invoice number based on existing invoices and preferred series
 * Handles both "RS 08" -> "RS 09" and "INV 01" -> "INV 02"
 */
export function nextInvoiceNumber(
  existingInvoices: { invoiceNumber: string }[],
  fallbackSeries = 'RS 09'
): string {
  const prefixMatch = fallbackSeries.match(/^([A-Za-z]+)\s*(\d+)/);
  const prefix = prefixMatch ? prefixMatch[1] : 'RS';

  let maxNum = 0;
  for (const inv of existingInvoices) {
    const regex = new RegExp(`^${prefix}\\s*(\\d+)`, 'i');
    const match = inv.invoiceNumber.match(regex);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }

  if (maxNum === 0) {
    return fallbackSeries;
  }

  return `${prefix} ${String(maxNum + 1).padStart(2, '0')}`;
}

/**
 * Round to nearest rupee and return round-off amount
 */
export function calcRoundOff(amount: number): { rounded: number; diff: number } {
  const rounded = Math.round(amount);
  return { rounded, diff: parseFloat((rounded - amount).toFixed(2)) };
}

/**
 * Read a file as a base64 data URL (for logo/signature upload)
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
