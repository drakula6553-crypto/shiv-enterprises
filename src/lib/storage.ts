// ============================================================
// LocalStorage helpers with automatic seeding & export
// ============================================================

import type { CompanyProfile, Invoice, Contractor, InvoiceTemplate, Payment, ContractorBill, ContractorPayment, Expense } from './types';
import { SAMPLE_COMPANY_PROFILE, SAMPLE_INVOICES, SAMPLE_CONTRACTORS, DEFAULT_TEMPLATES, SAMPLE_EXPENSES } from './seed';

const KEYS = {
  companyProfile: 'se_company_profile',
  invoices: 'se_invoices',
  contractors: 'se_contractors',
  templates: 'se_invoice_templates',
  expenses: 'se_expenses',
  seeded: 'se_has_seeded',
};

// ─── Company Profile ─────────────────────────────────────────

export const DEFAULT_PROFILE: CompanyProfile = SAMPLE_COMPANY_PROFILE;

export function getCompanyProfile(): CompanyProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEYS.companyProfile);
    if (!raw) {
      saveCompanyProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveCompanyProfile(profile: CompanyProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.companyProfile, JSON.stringify(profile));
}

// ─── Invoice Templates / Builder Presets ─────────────────────

export function getTemplates(): InvoiceTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(KEYS.templates);
    if (!raw) {
      localStorage.setItem(KEYS.templates, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplate(tpl: InvoiceTemplate): void {
  if (typeof window === 'undefined') return;
  const list = getTemplates();
  const idx = list.findIndex((t) => t.id === tpl.id);
  if (idx >= 0) {
    list[idx] = tpl;
  } else {
    list.push(tpl);
  }
  localStorage.setItem(KEYS.templates, JSON.stringify(list));
}

export function deleteTemplate(id: string): void {
  if (typeof window === 'undefined') return;
  const list = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(KEYS.templates, JSON.stringify(list));
}

// ─── Invoices ─────────────────────────────────────────────────

export function getInvoices(): Invoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.invoices);
    if (!raw) {
      localStorage.setItem(KEYS.invoices, JSON.stringify(SAMPLE_INVOICES));
      return SAMPLE_INVOICES;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getInvoice(id: string): Invoice | null {
  return getInvoices().find((inv) => inv.id === id) || null;
}

export function saveInvoice(invoice: Invoice): void {
  if (typeof window === 'undefined') return;
  const invoices = getInvoices();
  const idx = invoices.findIndex((inv) => inv.id === invoice.id);
  if (idx >= 0) {
    invoices[idx] = invoice;
  } else {
    invoices.unshift(invoice); // newest first
  }
  localStorage.setItem(KEYS.invoices, JSON.stringify(invoices));
}

export function deleteInvoice(id: string): void {
  if (typeof window === 'undefined') return;
  const invoices = getInvoices().filter((inv) => inv.id !== id);
  localStorage.setItem(KEYS.invoices, JSON.stringify(invoices));
}

// ─── Invoice Payment Helpers ─────────────────────────────────

function recalculateInvoice(inv: Invoice): Invoice {
  const totalReceived = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceDue = Math.max(0, parseFloat((inv.grandTotal - totalReceived).toFixed(2)));

  let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
  if (balanceDue <= 0 && totalReceived > 0) {
    status = 'paid';
  } else if (totalReceived > 0) {
    status = 'partial';
  }

  return {
    ...inv,
    totalReceived,
    balanceDue,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function addInvoicePayment(invoiceId: string, payment: Payment): Invoice | null {
  const inv = getInvoice(invoiceId);
  if (!inv) return null;

  inv.payments = [...(inv.payments || []), payment];
  const updated = recalculateInvoice(inv);
  saveInvoice(updated);
  return updated;
}

export function updateInvoicePayment(invoiceId: string, payment: Payment): Invoice | null {
  const inv = getInvoice(invoiceId);
  if (!inv) return null;

  inv.payments = (inv.payments || []).map((p) => (p.id === payment.id ? payment : p));
  const updated = recalculateInvoice(inv);
  saveInvoice(updated);
  return updated;
}

export function deleteInvoicePayment(invoiceId: string, paymentId: string): Invoice | null {
  const inv = getInvoice(invoiceId);
  if (!inv) return null;

  inv.payments = (inv.payments || []).filter((p) => p.id !== paymentId);
  const updated = recalculateInvoice(inv);
  saveInvoice(updated);
  return updated;
}

// ─── Contractors ──────────────────────────────────────────────

export function recalculateContractor(c: Contractor): Contractor {
  const totalBilled = (c.bills || []).reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = (c.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = totalBilled - totalPaid;

  return {
    ...c,
    totalBilled,
    totalPaid,
    balance,
  };
}

export function getContractors(): Contractor[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.contractors);
    if (!raw) {
      localStorage.setItem(KEYS.contractors, JSON.stringify(SAMPLE_CONTRACTORS));
      return SAMPLE_CONTRACTORS;
    }
    const list: Contractor[] = JSON.parse(raw);
    return list.map(recalculateContractor);
  } catch {
    return [];
  }
}

export function getContractor(id: string): Contractor | null {
  const c = getContractors().find((item) => item.id === id);
  return c ? recalculateContractor(c) : null;
}

export function saveContractor(contractor: Contractor): void {
  if (typeof window === 'undefined') return;
  const list = getContractors();
  const recalculated = recalculateContractor(contractor);
  const idx = list.findIndex((c) => c.id === recalculated.id);
  if (idx >= 0) {
    list[idx] = recalculated;
  } else {
    list.unshift(recalculated);
  }
  localStorage.setItem(KEYS.contractors, JSON.stringify(list));
}

export function deleteContractor(id: string): void {
  if (typeof window === 'undefined') return;
  const list = getContractors().filter((c) => c.id !== id);
  localStorage.setItem(KEYS.contractors, JSON.stringify(list));
}

export function addContractorBill(contractorId: string, bill: ContractorBill): Contractor | null {
  const c = getContractor(contractorId);
  if (!c) return null;
  c.bills = [...(c.bills || []), bill];
  const updated = recalculateContractor(c);
  saveContractor(updated);
  return updated;
}

export function deleteContractorBill(contractorId: string, billId: string): Contractor | null {
  const c = getContractor(contractorId);
  if (!c) return null;
  c.bills = (c.bills || []).filter((b) => b.id !== billId);
  const updated = recalculateContractor(c);
  saveContractor(updated);
  return updated;
}

export function addContractorPayment(contractorId: string, payment: ContractorPayment): Contractor | null {
  const c = getContractor(contractorId);
  if (!c) return null;
  c.payments = [...(c.payments || []), payment];
  const updated = recalculateContractor(c);
  saveContractor(updated);
  return updated;
}

export function deleteContractorPayment(contractorId: string, paymentId: string): Contractor | null {
  const c = getContractor(contractorId);
  if (!c) return null;
  c.payments = (c.payments || []).filter((p) => p.id !== paymentId);
  const updated = recalculateContractor(c);
  saveContractor(updated);
  return updated;
}

// ─── Shiv Enterprises Purchases & Site Expenses ─────────────

export function getExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.expenses);
    if (!raw) {
      localStorage.setItem(KEYS.expenses, JSON.stringify(SAMPLE_EXPENSES));
      return SAMPLE_EXPENSES;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getExpense(id: string): Expense | null {
  return getExpenses().find((e) => e.id === id) || null;
}

export function saveExpense(expense: Expense): void {
  if (typeof window === 'undefined') return;
  const list = getExpenses();
  const idx = list.findIndex((e) => e.id === expense.id);
  if (idx >= 0) {
    list[idx] = expense;
  } else {
    list.unshift(expense); // newest first
  }
  localStorage.setItem(KEYS.expenses, JSON.stringify(list));
}

export function deleteExpense(id: string): void {
  if (typeof window === 'undefined') return;
  const list = getExpenses().filter((e) => e.id !== id);
  localStorage.setItem(KEYS.expenses, JSON.stringify(list));
}

export function updateExpenseReceipt(
  expenseId: string,
  receiptUrl: string | null,
  receiptName?: string,
  receiptType?: 'image' | 'pdf'
): Expense | null {
  const exp = getExpense(expenseId);
  if (!exp) return null;
  exp.receiptUrl = receiptUrl;
  exp.receiptName = receiptName;
  exp.receiptType = receiptType;
  exp.updatedAt = new Date().toISOString();
  saveExpense(exp);
  return exp;
}

// ─── Seed & Reset ─────────────────────────────────────────────

export function seedSampleData(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.companyProfile, JSON.stringify(SAMPLE_COMPANY_PROFILE));
  localStorage.setItem(KEYS.invoices, JSON.stringify(SAMPLE_INVOICES));
  localStorage.setItem(KEYS.contractors, JSON.stringify(SAMPLE_CONTRACTORS));
  localStorage.setItem(KEYS.templates, JSON.stringify(DEFAULT_TEMPLATES));
  localStorage.setItem(KEYS.expenses, JSON.stringify(SAMPLE_EXPENSES));
  localStorage.setItem(KEYS.seeded, 'true');
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.companyProfile);
  localStorage.removeItem(KEYS.invoices);
  localStorage.removeItem(KEYS.contractors);
  localStorage.removeItem(KEYS.templates);
  localStorage.removeItem(KEYS.expenses);
  localStorage.removeItem(KEYS.seeded);
}

// ─── Backup / Export / Import ─────────────────────────────────

export function exportAllData(): string {
  return JSON.stringify(
    {
      companyProfile: getCompanyProfile(),
      templates: getTemplates(),
      invoices: getInvoices(),
      contractors: getContractors(),
      expenses: getExpenses(),
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
    },
    null,
    2
  );
}

export function importAllData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.companyProfile) saveCompanyProfile(data.companyProfile);
    if (Array.isArray(data.templates)) {
      localStorage.setItem(KEYS.templates, JSON.stringify(data.templates));
    }
    if (Array.isArray(data.invoices)) {
      localStorage.setItem(KEYS.invoices, JSON.stringify(data.invoices));
    }
    if (Array.isArray(data.contractors)) {
      localStorage.setItem(KEYS.contractors, JSON.stringify(data.contractors));
    }
    if (Array.isArray(data.expenses)) {
      localStorage.setItem(KEYS.expenses, JSON.stringify(data.expenses));
    }
    return true;
  } catch (err) {
    console.error('Failed to import data:', err);
    return false;
  }
}
