import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AuthUser } from './auth';
import { getCurrentUser } from './auth';

export interface LoginLog {
  id: string;
  username: string;
  userName: string;
  role: string;
  loginAt: string;
  deviceInfo: string;
  ipAddress?: string;
  status: 'success' | 'failed';
}

export interface BillActivityLog {
  id: string;
  billId: string;
  invoiceNumber: string;
  clientName: string;
  grandTotal: number;
  action: 'created' | 'updated' | 'deleted' | 'payment_recorded' | 'payment_deleted' | 'downloaded_pdf';
  notes?: string;
  createdByUsername: string;
  createdByName: string;
  createdByRole: string;
  createdAtTime: string;
}

export interface ExpenseActivityLog {
  id: string;
  expenseId: string;
  paidTo: string;
  category: string;
  projectName: string;
  amount: number;
  billNumber?: string;
  action: 'created' | 'updated' | 'deleted' | 'receipt_uploaded';
  createdByUsername: string;
  createdByName: string;
  createdByRole: string;
  createdAtTime: string;
}

export interface ContractorActivityLog {
  id: string;
  contractorId: string;
  contractorName: string;
  category: string;
  action:
    | 'contractor_added'
    | 'contractor_updated'
    | 'contractor_deleted'
    | 'bill_recorded'
    | 'bill_deleted'
    | 'payment_recorded'
    | 'payment_deleted';
  amount: number;
  description: string;
  createdByUsername: string;
  createdByName: string;
  createdByRole: string;
  createdAtTime: string;
}

const STORAGE_KEY_LOGIN_LOGS = 'shiv_login_logs';
const STORAGE_KEY_BILL_LOGS = 'shiv_bill_activity_logs';
const STORAGE_KEY_EXPENSE_LOGS = 'shiv_expense_activity_logs';
const STORAGE_KEY_CONTRACTOR_LOGS = 'shiv_contractor_activity_logs';

function resolveUser(user?: AuthUser | null): AuthUser {
  if (user) return user;
  const current = getCurrentUser();
  if (current) return current;
  return {
    id: 'usr_harsh16',
    username: 'Harsh16',
    email: 'harsh16@shiventerprises.com',
    fullName: 'Harsh (Admin)',
    displayName: 'Harsh',
    role: 'admin',
    roleTitle: 'Admin / Managing Partner',
    companyName: 'Shiv Enterprises Civil Contractors',
    avatarInitials: 'HP',
    loginTime: new Date().toISOString(),
  };
}

/**
 * Get readable device summary from userAgent
 */
export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Server';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  let os = 'Unknown Device';

  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Device';
  else if (/Android/i.test(ua)) os = 'Android Phone';
  else if (/Windows NT/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh/i.test(ua)) os = 'MacBook / Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return `${browser} on ${os}`;
}

/**
 * Record a login event into Supabase and localStorage
 */
export async function recordLoginEvent(user: AuthUser): Promise<void> {
  const newLog: LoginLog = {
    id: 'log_' + Math.random().toString(36).substring(2, 9),
    username: user.username,
    userName: user.fullName,
    role: user.roleTitle || user.role,
    loginAt: new Date().toISOString(),
    deviceInfo: getDeviceInfo(),
    status: 'success',
  };

  // 1. Save locally
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOGIN_LOGS);
      const existing: LoginLog[] = raw ? JSON.parse(raw) : [];
      existing.unshift(newLog);
      localStorage.setItem(STORAGE_KEY_LOGIN_LOGS, JSON.stringify(existing.slice(0, 150)));
    } catch (e) {
      console.warn('Failed to store login log locally:', e);
    }
  }

  // 2. Sync to Supabase Cloud
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('login_logs').insert({
        username: newLog.username,
        user_name: newLog.userName,
        role: newLog.role,
        login_at: newLog.loginAt,
        device_info: newLog.deviceInfo,
        status: newLog.status,
      });
    } catch (err) {
      console.warn('Failed to write login log to Supabase:', err);
    }
  }
}

/**
 * Record a bill activity event (creation, update, payment, delete, pdf download)
 */
export async function recordBillActivity(params: {
  billId: string;
  invoiceNumber: string;
  clientName: string;
  grandTotal: number;
  action?: 'created' | 'updated' | 'deleted' | 'payment_recorded' | 'payment_deleted' | 'downloaded_pdf';
  notes?: string;
  user?: AuthUser | null;
}): Promise<void> {
  const activeUser = resolveUser(params.user);
  const newLog: BillActivityLog = {
    id: 'bact_' + Math.random().toString(36).substring(2, 9),
    billId: params.billId,
    invoiceNumber: params.invoiceNumber,
    clientName: params.clientName,
    grandTotal: params.grandTotal,
    action: params.action || 'created',
    notes: params.notes,
    createdByUsername: activeUser.username,
    createdByName: activeUser.fullName,
    createdByRole: activeUser.roleTitle || activeUser.role,
    createdAtTime: new Date().toISOString(),
  };

  // 1. Save locally
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BILL_LOGS);
      const existing: BillActivityLog[] = raw ? JSON.parse(raw) : [];
      existing.unshift(newLog);
      localStorage.setItem(STORAGE_KEY_BILL_LOGS, JSON.stringify(existing.slice(0, 150)));
    } catch (e) {
      console.warn('Failed to save bill log locally:', e);
    }
  }

  // 2. Sync to Supabase Cloud
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('bill_activity_logs').insert({
        bill_id: newLog.billId,
        invoice_number: newLog.invoiceNumber,
        client_name: newLog.clientName,
        grand_total: newLog.grandTotal,
        action: newLog.action,
        created_by_username: newLog.createdByUsername,
        created_by_name: newLog.createdByName,
        created_by_role: newLog.createdByRole,
        created_at_time: newLog.createdAtTime,
      });
    } catch (err) {
      console.warn('Failed to write bill log to Supabase:', err);
    }
  }
}

/**
 * Record a purchase / site expense activity event
 */
export async function recordExpenseActivity(params: {
  expenseId: string;
  paidTo: string;
  category: string;
  projectName: string;
  amount: number;
  billNumber?: string;
  action?: 'created' | 'updated' | 'deleted' | 'receipt_uploaded';
  user?: AuthUser | null;
}): Promise<void> {
  const activeUser = resolveUser(params.user);
  const newLog: ExpenseActivityLog = {
    id: 'eact_' + Math.random().toString(36).substring(2, 9),
    expenseId: params.expenseId,
    paidTo: params.paidTo,
    category: params.category,
    projectName: params.projectName,
    amount: params.amount,
    billNumber: params.billNumber || '',
    action: params.action || 'created',
    createdByUsername: activeUser.username,
    createdByName: activeUser.fullName,
    createdByRole: activeUser.roleTitle || activeUser.role,
    createdAtTime: new Date().toISOString(),
  };

  // 1. Save locally
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EXPENSE_LOGS);
      const existing: ExpenseActivityLog[] = raw ? JSON.parse(raw) : [];
      existing.unshift(newLog);
      localStorage.setItem(STORAGE_KEY_EXPENSE_LOGS, JSON.stringify(existing.slice(0, 150)));
    } catch (e) {
      console.warn('Failed to save expense log locally:', e);
    }
  }

  // 2. Sync to Supabase Cloud
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('expense_activity_logs').insert({
        expense_id: newLog.expenseId,
        paid_to: newLog.paidTo,
        category: newLog.category,
        project_name: newLog.projectName,
        amount: newLog.amount,
        bill_number: newLog.billNumber,
        action: newLog.action,
        created_by_username: newLog.createdByUsername,
        created_by_name: newLog.createdByName,
        created_by_role: newLog.createdByRole,
        created_at_time: newLog.createdAtTime,
      });
    } catch (err) {
      console.warn('Failed to write expense log to Supabase:', err);
    }
  }
}

/**
 * Record a contractor / subcontractor ledger activity event
 */
export async function recordContractorActivity(params: {
  contractorId: string;
  contractorName: string;
  category?: string;
  action:
    | 'contractor_added'
    | 'contractor_updated'
    | 'contractor_deleted'
    | 'bill_recorded'
    | 'bill_deleted'
    | 'payment_recorded'
    | 'payment_deleted';
  amount?: number;
  description?: string;
  user?: AuthUser | null;
}): Promise<void> {
  const activeUser = resolveUser(params.user);
  const newLog: ContractorActivityLog = {
    id: 'cact_' + Math.random().toString(36).substring(2, 9),
    contractorId: params.contractorId,
    contractorName: params.contractorName,
    category: params.category || 'General',
    action: params.action,
    amount: params.amount || 0,
    description: params.description || '',
    createdByUsername: activeUser.username,
    createdByName: activeUser.fullName,
    createdByRole: activeUser.roleTitle || activeUser.role,
    createdAtTime: new Date().toISOString(),
  };

  // 1. Save locally
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONTRACTOR_LOGS);
      const existing: ContractorActivityLog[] = raw ? JSON.parse(raw) : [];
      existing.unshift(newLog);
      localStorage.setItem(STORAGE_KEY_CONTRACTOR_LOGS, JSON.stringify(existing.slice(0, 150)));
    } catch (e) {
      console.warn('Failed to save contractor log locally:', e);
    }
  }

  // 2. Sync to Supabase Cloud
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('contractor_activity_logs').insert({
        contractor_id: newLog.contractorId,
        contractor_name: newLog.contractorName,
        category: newLog.category,
        action: newLog.action,
        amount: newLog.amount,
        description: newLog.description,
        created_by_username: newLog.createdByUsername,
        created_by_name: newLog.createdByName,
        created_by_role: newLog.createdByRole,
        created_at_time: newLog.createdAtTime,
      });
    } catch (err) {
      console.warn('Failed to write contractor log to Supabase:', err);
    }
  }
}

/**
 * Fetch login logs from Supabase (fallback to local cache)
 */
export async function getLoginLogs(): Promise<LoginLog[]> {
  let remoteLogs: LoginLog[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('login_logs')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        remoteLogs = data.map((d: any) => ({
          id: d.id,
          username: d.username,
          userName: d.user_name,
          role: d.role,
          loginAt: d.login_at,
          deviceInfo: d.device_info || 'Unknown device',
          ipAddress: d.ip_address,
          status: d.status || 'success',
        }));
      }
    } catch (err) {
      console.warn('Error fetching login logs from Supabase:', err);
    }
  }

  if (remoteLogs.length > 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LOGIN_LOGS, JSON.stringify(remoteLogs));
    }
    return remoteLogs;
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOGIN_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to read local login logs:', e);
    }
  }

  return [];
}

/**
 * Fetch bill activity logs from Supabase (fallback to local cache)
 */
export async function getBillActivityLogs(): Promise<BillActivityLog[]> {
  let remoteLogs: BillActivityLog[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bill_activity_logs')
        .select('*')
        .order('created_at_time', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        remoteLogs = data.map((d: any) => ({
          id: d.id,
          billId: d.bill_id,
          invoiceNumber: d.invoice_number,
          clientName: d.client_name,
          grandTotal: Number(d.grand_total) || 0,
          action: d.action || 'created',
          createdByUsername: d.created_by_username,
          createdByName: d.created_by_name,
          createdByRole: d.created_by_role,
          createdAtTime: d.created_at_time,
        }));
      }
    } catch (err) {
      console.warn('Error fetching bill activity logs from Supabase:', err);
    }
  }

  if (remoteLogs.length > 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BILL_LOGS, JSON.stringify(remoteLogs));
    }
    return remoteLogs;
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BILL_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to read local bill logs:', e);
    }
  }

  return [];
}

/**
 * Fetch purchase / expense activity logs from Supabase (fallback to local cache)
 */
export async function getExpenseActivityLogs(): Promise<ExpenseActivityLog[]> {
  let remoteLogs: ExpenseActivityLog[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('expense_activity_logs')
        .select('*')
        .order('created_at_time', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        remoteLogs = data.map((d: any) => ({
          id: d.id,
          expenseId: d.expense_id,
          paidTo: d.paid_to,
          category: d.category || 'General',
          projectName: d.project_name || '',
          amount: Number(d.amount) || 0,
          billNumber: d.bill_number,
          action: d.action || 'created',
          createdByUsername: d.created_by_username,
          createdByName: d.created_by_name,
          createdByRole: d.created_by_role,
          createdAtTime: d.created_at_time,
        }));
      }
    } catch (err) {
      console.warn('Error fetching expense activity logs from Supabase:', err);
    }
  }

  if (remoteLogs.length > 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_EXPENSE_LOGS, JSON.stringify(remoteLogs));
    }
    return remoteLogs;
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EXPENSE_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to read local expense logs:', e);
    }
  }

  return [];
}

/**
 * Fetch contractor activity logs from Supabase (fallback to local cache)
 */
export async function getContractorActivityLogs(): Promise<ContractorActivityLog[]> {
  let remoteLogs: ContractorActivityLog[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('contractor_activity_logs')
        .select('*')
        .order('created_at_time', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        remoteLogs = data.map((d: any) => ({
          id: d.id,
          contractorId: d.contractor_id,
          contractorName: d.contractor_name,
          category: d.category || 'General',
          action: d.action || 'contractor_added',
          amount: Number(d.amount) || 0,
          description: d.description || '',
          createdByUsername: d.created_by_username,
          createdByName: d.created_by_name,
          createdByRole: d.created_by_role,
          createdAtTime: d.created_at_time,
        }));
      }
    } catch (err) {
      console.warn('Error fetching contractor activity logs from Supabase:', err);
    }
  }

  if (remoteLogs.length > 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CONTRACTOR_LOGS, JSON.stringify(remoteLogs));
    }
    return remoteLogs;
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONTRACTOR_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to read local contractor logs:', e);
    }
  }

  return [];
}
