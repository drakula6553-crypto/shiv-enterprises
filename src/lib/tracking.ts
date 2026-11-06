import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AuthUser } from './auth';

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
  action: 'created' | 'updated' | 'downloaded_pdf';
  createdByUsername: string;
  createdByName: string;
  createdByRole: string;
  createdAtTime: string;
}

const STORAGE_KEY_LOGIN_LOGS = 'shiv_login_logs';
const STORAGE_KEY_BILL_LOGS = 'shiv_bill_activity_logs';

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
      localStorage.setItem(STORAGE_KEY_LOGIN_LOGS, JSON.stringify(existing.slice(0, 100)));
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
 * Record a bill creation or modification event
 */
export async function recordBillActivity(params: {
  billId: string;
  invoiceNumber: string;
  clientName: string;
  grandTotal: number;
  action?: 'created' | 'updated' | 'downloaded_pdf';
  user: AuthUser;
}): Promise<void> {
  const newLog: BillActivityLog = {
    id: 'bact_' + Math.random().toString(36).substring(2, 9),
    billId: params.billId,
    invoiceNumber: params.invoiceNumber,
    clientName: params.clientName,
    grandTotal: params.grandTotal,
    action: params.action || 'created',
    createdByUsername: params.user.username,
    createdByName: params.user.fullName,
    createdByRole: params.user.roleTitle || params.user.role,
    createdAtTime: new Date().toISOString(),
  };

  // 1. Save locally
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BILL_LOGS);
      const existing: BillActivityLog[] = raw ? JSON.parse(raw) : [];
      existing.unshift(newLog);
      localStorage.setItem(STORAGE_KEY_BILL_LOGS, JSON.stringify(existing.slice(0, 100)));
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
