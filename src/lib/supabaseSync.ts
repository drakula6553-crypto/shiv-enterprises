import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  getCompanyProfile,
  saveCompanyProfile,
  getInvoices,
  getContractors,
  getExpenses,
  getTemplates,
} from './storage';
import type { Invoice, Contractor, Expense, CompanyProfile, InvoiceTemplate } from './types';

export interface SyncResult {
  success: boolean;
  message: string;
  pushedCount?: number;
  pulledCount?: number;
  error?: string;
}

/**
 * Push all local records into Supabase cloud database
 */
export async function pushAllToSupabase(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local',
    };
  }

  try {
    const profile = getCompanyProfile();
    const invoices = getInvoices();
    const contractors = getContractors();
    const expenses = getExpenses();
    const templates = getTemplates();

    // 1. Upsert Company Profile
    await supabase.from('company_profile').upsert({
      company_name: profile.companyName,
      business_type: profile.businessType,
      tagline: profile.tagline,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      gstin: profile.gstin,
      pan_no: profile.panNo,
      signatory_title: profile.signatoryTitle,
      bank_name: profile.bankName,
      account_number: profile.accountNumber,
      ifsc_code: profile.ifscCode,
      branch: profile.branch,
      upi_id: profile.upiId,
      terms_and_conditions: profile.termsAndConditions,
      logo_url: profile.logoUrl,
      signature_url: profile.signatureUrl,
    });

    // 2. Upsert Templates
    if (templates.length > 0) {
      const formattedTpls = templates.map((t) => ({
        id: t.id,
        name: t.name,
        client_name: t.clientName,
        client_phone: t.clientPhone,
        client_address: t.clientAddress,
        client_gstin: t.clientGstin,
        project_name: t.projectName,
        projects: t.projects || [],
        bill_prefix: t.billPrefix || 'RS',
        default_gst_rate: t.defaultGstRate || 18,
        default_particulars: t.defaultParticulars,
        is_default: t.isDefault || false,
      }));
      await supabase.from('invoice_templates').upsert(formattedTpls);
    }

    // 3. Upsert Invoices
    if (invoices.length > 0) {
      const formattedInvoices = invoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        invoice_date: inv.invoiceDate,
        due_date: inv.dueDate,
        client_name: inv.clientName,
        client_phone: inv.clientPhone,
        client_address: inv.clientAddress,
        client_gstin: inv.clientGstin,
        project_name: inv.projectName,
        line_items: inv.lineItems,
        subtotal: inv.subtotal,
        gst_enabled: inv.gstEnabled,
        gst_type: inv.gstType,
        gst_rate: inv.gstRate,
        cgst_amount: inv.cgstAmount,
        sgst_amount: inv.sgstAmount,
        igst_amount: inv.igstAmount,
        discount_enabled: inv.discountEnabled,
        discount_type: inv.discountType,
        discount_value: inv.discountValue,
        discount_amount: inv.discountAmount,
        round_off: inv.roundOff,
        round_off_amount: inv.roundOffAmount,
        grand_total: inv.grandTotal,
        amount_in_words: inv.amountInWords,
        status: inv.status,
        payments: inv.payments,
        total_received: inv.totalReceived,
        balance_due: inv.balanceDue,
        created_by_username: inv.createdBy?.username || null,
        created_by_name: inv.createdBy?.name || null,
        created_by_role: inv.createdBy?.role || null,
        created_by_time: inv.createdBy?.timestamp || null,
      }));
      await supabase.from('invoices').upsert(formattedInvoices);
    }

    // 4. Upsert Contractors
    if (contractors.length > 0) {
      const formattedContractors = contractors.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        trade: c.trade,
        address: c.address,
        notes: c.notes,
        bills: c.bills,
        payments: c.payments,
        total_billed: c.totalBilled,
        total_paid: c.totalPaid,
        balance: c.balance,
      }));
      await supabase.from('contractors').upsert(formattedContractors);
    }

    // 5. Upsert Expenses
    if (expenses.length > 0) {
      const formattedExpenses = expenses.map((exp) => ({
        id: exp.id,
        date: exp.date,
        paid_to: exp.paidTo,
        category: exp.category,
        project_name: exp.projectName,
        description: exp.description,
        bill_number: exp.billNumber,
        amount: exp.amount,
        payment_mode: exp.paymentMode,
        status: exp.status,
        receipt_url: exp.receiptUrl,
        notes: exp.notes,
      }));
      await supabase.from('expenses').upsert(formattedExpenses);
    }

    const totalPushed = invoices.length + contractors.length + expenses.length;
    return {
      success: true,
      message: `Successfully synchronized ${totalPushed} records to Supabase Cloud.`,
      pushedCount: totalPushed,
    };
  } catch (err: any) {
    console.error('Supabase sync push error:', err);
    return {
      success: false,
      message: err.message || 'Failed to sync with Supabase Cloud.',
      error: err.message,
    };
  }
}

/**
 * Pull all cloud records from Supabase into LocalStorage
 */
export async function pullAllFromSupabase(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured.',
    };
  }

  try {
    const { data: remoteInvoices } = await supabase.from('invoices').select('*');
    const { data: remoteContractors } = await supabase.from('contractors').select('*');
    const { data: remoteExpenses } = await supabase.from('expenses').select('*');
    const { data: remoteProfile } = await supabase.from('company_profile').select('*').limit(1).single();
    const { data: remoteTemplates } = await supabase.from('invoice_templates').select('*');

    if (remoteProfile) {
      saveCompanyProfile({
        companyName: remoteProfile.company_name,
        businessType: remoteProfile.business_type,
        tagline: remoteProfile.tagline,
        address: remoteProfile.address,
        phone: remoteProfile.phone,
        email: remoteProfile.email,
        gstin: remoteProfile.gstin,
        panNo: remoteProfile.pan_no,
        signatoryTitle: remoteProfile.signatory_title,
        bankName: remoteProfile.bank_name,
        accountNumber: remoteProfile.account_number,
        ifscCode: remoteProfile.ifsc_code,
        branch: remoteProfile.branch,
        upiId: remoteProfile.upi_id,
        termsAndConditions: remoteProfile.terms_and_conditions,
        logoUrl: remoteProfile.logo_url,
        signatureUrl: remoteProfile.signature_url,
      });
    }

    if (Array.isArray(remoteInvoices) && remoteInvoices.length > 0) {
      const mappedInvoices: Invoice[] = remoteInvoices.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        dueDate: row.due_date,
        clientName: row.client_name,
        clientPhone: row.client_phone || '',
        clientAddress: row.client_address || '',
        clientGstin: row.client_gstin || '',
        projectName: row.project_name || '',
        lineItems: row.line_items || [],
        subtotal: Number(row.subtotal),
        gstEnabled: row.gst_enabled,
        gstType: row.gst_type,
        gstRate: Number(row.gst_rate),
        cgstAmount: Number(row.cgst_amount),
        sgstAmount: Number(row.sgst_amount),
        igstAmount: Number(row.igst_amount),
        discountEnabled: row.discount_enabled,
        discountType: row.discount_type,
        discountValue: Number(row.discount_value),
        discountAmount: Number(row.discount_amount),
        roundOff: row.round_off,
        roundOffAmount: Number(row.round_off_amount),
        grandTotal: Number(row.grand_total),
        amountInWords: row.amount_in_words,
        status: row.status,
        payments: row.payments || [],
        totalReceived: Number(row.total_received),
        balanceDue: Number(row.balance_due),
        createdBy: row.created_by_username ? {
          username: row.created_by_username,
          name: row.created_by_name || row.created_by_username,
          role: row.created_by_role || 'Partner',
          timestamp: row.created_by_time || row.created_at,
        } : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      localStorage.setItem('se_invoices', JSON.stringify(mappedInvoices));
    }

    if (Array.isArray(remoteContractors) && remoteContractors.length > 0) {
      const mappedContractors: Contractor[] = remoteContractors.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        trade: row.trade,
        address: row.address || '',
        notes: row.notes || '',
        bills: row.bills || [],
        payments: row.payments || [],
        totalBilled: Number(row.total_billed),
        totalPaid: Number(row.total_paid),
        balance: Number(row.balance),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      localStorage.setItem('se_contractors', JSON.stringify(mappedContractors));
    }

    if (Array.isArray(remoteExpenses) && remoteExpenses.length > 0) {
      const mappedExpenses: Expense[] = remoteExpenses.map((row) => ({
        id: row.id,
        date: row.date,
        paidTo: row.paid_to,
        category: row.category,
        projectName: row.project_name,
        description: row.description,
        billNumber: row.bill_number,
        amount: Number(row.amount),
        paymentMode: row.payment_mode,
        status: row.status,
        receiptUrl: row.receipt_url,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      localStorage.setItem('se_expenses', JSON.stringify(mappedExpenses));
    }

    if (Array.isArray(remoteTemplates) && remoteTemplates.length > 0) {
      const mappedTemplates: InvoiceTemplate[] = remoteTemplates.map((row) => ({
        id: row.id,
        name: row.name,
        clientName: row.client_name,
        clientPhone: row.client_phone || '',
        clientAddress: row.client_address || '',
        clientGstin: row.client_gstin || '',
        projectName: row.project_name || '',
        projects: Array.isArray(row.projects) && row.projects.length > 0
          ? row.projects
          : (row.project_name ? [row.project_name] : []),
        billPrefix: row.bill_prefix || 'RS',
        defaultGstRate: Number(row.default_gst_rate) || 18,
        defaultParticulars: row.default_particulars,
        isDefault: row.is_default || false,
      }));
      localStorage.setItem('se_templates', JSON.stringify(mappedTemplates));
    }

    const totalPulled = (remoteInvoices?.length || 0) + (remoteContractors?.length || 0) + (remoteExpenses?.length || 0) + (remoteTemplates?.length || 0);
    return {
      success: true,
      message: `Downloaded ${totalPulled} records from Supabase Cloud.`,
      pulledCount: totalPulled,
    };
  } catch (err: any) {
    console.error('Supabase sync pull error:', err);
    return {
      success: false,
      message: err.message || 'Failed to pull data from Supabase.',
      error: err.message,
    };
  }
}
