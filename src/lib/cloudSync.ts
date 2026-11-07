import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Expense, Invoice, Contractor } from './types';
import {
  getExpenses,
  saveExpense,
  getInvoices,
  saveInvoice,
  getContractors,
  saveContractor,
} from './storage';

/**
 * Compress an image file using browser Canvas and return a clean Blob + fallback data URL
 */
function compressImageToBlob(
  file: File,
  maxDimension = 1400,
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original
          resolve({ blob: file, dataUrl: e.target?.result as string });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve({ blob: file, dataUrl: e.target?.result as string });
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a bill photo or PDF to Supabase Storage bucket 'bill-receipts'
 * Returns a permanent public URL accessible by all partners and admin across devices.
 * If Supabase Storage is not available, falls back to compressed base64 data URL.
 */
export async function uploadReceiptToCloud(
  file: File
): Promise<{ url: string; name: string; type: 'image' | 'pdf' }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const type: 'image' | 'pdf' = isPdf ? 'pdf' : 'image';
  const ext = isPdf ? 'pdf' : 'jpg';
  const cleanBaseName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24);
  const uniquePath = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${cleanBaseName}.${ext}`;

  let uploadPayload: Blob | File = file;
  let fallbackDataUrl = '';

  if (!isPdf) {
    try {
      const compressed = await compressImageToBlob(file, 1400, 0.82);
      uploadPayload = compressed.blob;
      fallbackDataUrl = compressed.dataUrl;
    } catch (err) {
      console.warn('Image compression fallback:', err);
      uploadPayload = file;
    }
  } else {
    try {
      fallbackDataUrl = await readFileAsDataUrl(file);
    } catch (err) {
      console.warn('PDF read fallback:', err);
    }
  }

  // Upload to Supabase Storage
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('bill-receipts')
        .upload(uniquePath, uploadPayload, {
          contentType: isPdf ? 'application/pdf' : 'image/jpeg',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('bill-receipts')
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            name: file.name,
            type,
          };
        }
      } else if (error) {
        console.warn('Supabase storage upload error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase storage upload exception:', err);
    }
  }

  // Fallback to data URL
  if (!fallbackDataUrl) {
    fallbackDataUrl = await readFileAsDataUrl(file);
  }

  return {
    url: fallbackDataUrl,
    name: file.name,
    type,
  };
}

/**
 * Converts a base64 Data URL to a Supabase Storage CDN URL so it is visible to all devices.
 */
export async function uploadDataUrlToCloud(
  dataUrl: string,
  fileName = 'receipt.jpg',
  fileType: 'image' | 'pdf' = 'image'
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:') || !isSupabaseConfigured || !supabase) {
    return dataUrl;
  }

  try {
    const isPdf = fileType === 'pdf' || dataUrl.startsWith('data:application/pdf');
    const ext = isPdf ? 'pdf' : 'jpg';
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return dataUrl;
    const base64Data = dataUrl.slice(commaIdx + 1);
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    const contentType = mimeMatch ? mimeMatch[1] : (isPdf ? 'application/pdf' : 'image/jpeg');

    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: contentType });
    const cleanBaseName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24);
    const uniquePath = `migrated_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${cleanBaseName}.${ext}`;

    const { data, error } = await supabase.storage
      .from('bill-receipts')
      .upload(uniquePath, blob, { contentType, upsert: true });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage
        .from('bill-receipts')
        .getPublicUrl(data.path);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Failed to upload dataUrl to Supabase storage:', err);
  }
  return dataUrl;
}

/**
 * Instantly save/update an expense in Supabase Cloud
 */
export async function syncExpenseToCloud(expense: Expense): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    let finalReceiptUrl = expense.receiptUrl || null;

    // If local base64, auto-upload to Supabase CDN bucket
    if (finalReceiptUrl && finalReceiptUrl.startsWith('data:')) {
      const cdnUrl = await uploadDataUrlToCloud(
        finalReceiptUrl,
        expense.receiptName || 'receipt.jpg',
        expense.receiptType || 'image'
      );
      if (cdnUrl && cdnUrl.startsWith('http')) {
        finalReceiptUrl = cdnUrl;
        expense.receiptUrl = cdnUrl;
        saveExpense(expense);
      }
    }

    const payload = {
      id: expense.id,
      date: expense.date,
      paid_to: expense.paidTo,
      category: expense.category,
      project_name: expense.projectName,
      description: expense.description,
      bill_number: expense.billNumber || null,
      amount: expense.amount,
      payment_mode: expense.paymentMode,
      status: expense.status || 'paid',
      receipt_url: finalReceiptUrl,
      receipt_name: expense.receiptName || null,
      receipt_type: expense.receiptType || 'image',
      notes: expense.notes || null,
      created_at: expense.createdAt,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('expenses').upsert(payload);
  } catch (err) {
    console.warn('Failed to upsert expense in Supabase Cloud:', err);
  }
}

/**
 * Delete an expense in Supabase Cloud
 */
export async function deleteExpenseFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('expenses').delete().eq('id', id);
  } catch (err) {
    console.warn('Failed to delete expense from Supabase Cloud:', err);
  }
}

/**
 * Fetch live expenses from Supabase Cloud & synchronize with LocalStorage
 */
export async function fetchExpensesFromCloud(): Promise<Expense[]> {
  const localList = getExpenses();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (!error && Array.isArray(data)) {
      const cloudList: Expense[] = data.map((row) => ({
        id: row.id,
        date: row.date,
        paidTo: row.paid_to,
        category: row.category,
        projectName: row.project_name,
        description: row.description,
        billNumber: row.bill_number || undefined,
        amount: Number(row.amount),
        paymentMode: row.payment_mode,
        status: row.status,
        receiptUrl: row.receipt_url || null,
        receiptName: row.receipt_name || undefined,
        receiptType:
          row.receipt_type ||
          (row.receipt_url?.endsWith('.pdf') || row.receipt_url?.startsWith('data:application/pdf')
            ? 'pdf'
            : 'image'),
        notes: row.notes || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Combine by ID with smart receipt preservation
      const map = new Map<string, Expense>();
      localList.forEach((e) => map.set(e.id, e));

      cloudList.forEach((cloudExp) => {
        const localExp = map.get(cloudExp.id);
        if (localExp && localExp.receiptUrl && !cloudExp.receiptUrl) {
          // Local has receipt that wasn't yet in cloud: preserve and push
          const merged: Expense = {
            ...cloudExp,
            receiptUrl: localExp.receiptUrl,
            receiptName: localExp.receiptName,
            receiptType: localExp.receiptType,
          };
          map.set(cloudExp.id, merged);
          syncExpenseToCloud(merged);
        } else {
          map.set(cloudExp.id, cloudExp);
        }
      });

      // Push any local expenses that don't exist at all on cloud
      const unpushed = localList.filter((l) => !cloudList.some((c) => c.id === l.id));
      if (unpushed.length > 0) {
        unpushed.forEach((e) => {
          syncExpenseToCloud(e);
        });
      }

      // Check if any merged expense has a base64 receipt that needs CDN migration
      map.forEach((exp) => {
        if (exp.receiptUrl && exp.receiptUrl.startsWith('data:')) {
          uploadDataUrlToCloud(exp.receiptUrl, exp.receiptName, exp.receiptType).then((cdnUrl) => {
            if (cdnUrl && cdnUrl.startsWith('http')) {
              exp.receiptUrl = cdnUrl;
              saveExpense(exp);
              syncExpenseToCloud(exp);
            }
          });
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem('se_expenses', JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching expenses from Supabase Cloud:', err);
  }

  return localList;
}

/**
 * Instantly save/update an invoice in Supabase Cloud
 */
export async function syncInvoiceToCloud(inv: Invoice): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase.from('invoices').upsert({
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
      created_at: inv.createdAt,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to upsert invoice in Supabase Cloud:', err);
  }
}

/**
 * Delete an invoice in Supabase Cloud
 */
export async function deleteInvoiceFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('invoices').delete().eq('id', id);
  } catch (err) {
    console.warn('Failed to delete invoice from Supabase Cloud:', err);
  }
}

/**
 * Fetch live invoices from Supabase Cloud & synchronize with LocalStorage
 */
export async function fetchInvoicesFromCloud(): Promise<Invoice[]> {
  const localList = getInvoices();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (!error && Array.isArray(data)) {
      const cloudList: Invoice[] = data.map((row) => ({
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
        totalReceived: Number(row.total_received) || 0,
        balanceDue: Number(row.balance_due) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const map = new Map<string, Invoice>();
      localList.forEach((inv) => map.set(inv.id, inv));
      cloudList.forEach((inv) => map.set(inv.id, inv));

      // Push any local invoices not yet on cloud
      const unpushed = localList.filter((l) => !cloudList.some((c) => c.id === l.id));
      if (unpushed.length > 0) {
        supabase.from('invoices').upsert(
          unpushed.map((inv) => ({
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
            created_at: inv.createdAt,
            updated_at: inv.updatedAt || new Date().toISOString(),
          }))
        ).then(() => {});
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem('se_invoices', JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching invoices from Supabase Cloud:', err);
  }

  return localList;
}

/**
 * Instantly save/update a contractor in Supabase Cloud
 */
export async function syncContractorToCloud(c: Contractor): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase.from('contractors').upsert({
      id: c.id,
      name: c.name,
      trade: c.trade,
      phone: c.phone,
      address: c.address,
      notes: c.notes,
      bills: c.bills,
      payments: c.payments,
      total_billed: c.totalBilled,
      total_paid: c.totalPaid,
      balance: c.balance,
      created_at: c.createdAt,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to upsert contractor in Supabase Cloud:', err);
  }
}

/**
 * Delete a contractor in Supabase Cloud
 */
export async function deleteContractorFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('contractors').delete().eq('id', id);
  } catch (err) {
    console.warn('Failed to delete contractor from Supabase Cloud:', err);
  }
}

/**
 * Fetch live contractors from Supabase Cloud & synchronize with LocalStorage
 */
export async function fetchContractorsFromCloud(): Promise<Contractor[]> {
  const localList = getContractors();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const cloudList: Contractor[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        trade: row.trade,
        phone: row.phone || '',
        address: row.address || '',
        notes: row.notes || '',
        bills: row.bills || [],
        payments: row.payments || [],
        totalBilled: Number(row.total_billed) || 0,
        totalPaid: Number(row.total_paid) || 0,
        balance: Number(row.balance) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const map = new Map<string, Contractor>();
      localList.forEach((c) => map.set(c.id, c));
      cloudList.forEach((c) => map.set(c.id, c));

      // Push any local contractors not yet on cloud
      const unpushed = localList.filter((l) => !cloudList.some((c) => c.id === l.id));
      if (unpushed.length > 0) {
        supabase.from('contractors').upsert(
          unpushed.map((c) => ({
            id: c.id,
            name: c.name,
            trade: c.trade,
            phone: c.phone,
            address: c.address,
            notes: c.notes,
            bills: c.bills,
            payments: c.payments,
            total_billed: c.totalBilled,
            total_paid: c.totalPaid,
            balance: c.balance,
            created_at: c.createdAt,
            updated_at: c.updatedAt || new Date().toISOString(),
          }))
        ).then(() => {});
      }

      const merged = Array.from(map.values());
      if (typeof window !== 'undefined') {
        localStorage.setItem('se_contractors', JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching contractors from Supabase Cloud:', err);
  }

  return localList;
}
