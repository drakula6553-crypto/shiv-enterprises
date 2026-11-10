import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getCurrentUser, AuthUser, PARTNER_ACCOUNTS } from './auth';
import { getDeviceInfo } from './tracking';

export interface UserPresence {
  username: string;
  userName: string;
  role: string;
  status: 'online' | 'idle' | 'offline';
  currentPage: string;
  currentPageTitle: string;
  deviceInfo: string;
  lastActiveAt: string;
  sessionStartedAt: string;
  secondsAgo: number;
  isOnline: boolean;
  isIdle: boolean;
}

export interface LiveActivityItem {
  id: string;
  username: string;
  userName: string;
  role: string;
  actionType: 'page_view' | 'action' | 'session_start';
  pagePath: string;
  pageTitle: string;
  details?: string;
  deviceInfo: string;
  createdAt: string;
}

const STORAGE_KEY_PRESENCE = 'shiv_user_presence_local';
const STORAGE_KEY_ACTIVITY = 'shiv_live_activity_stream_local';

/**
 * Friendly page title mapping from URL pathname
 */
export function getFriendlyPageTitle(pathname: string): string {
  if (pathname === '/') return 'Overview Dashboard';
  if (pathname.startsWith('/new-bill')) return 'Creating New Bill';
  if (pathname.startsWith('/bills')) return 'Bills & Invoices Ledger';
  if (pathname.startsWith('/project-tracking')) return 'Project RA & Milestones';
  if (pathname.startsWith('/expenses')) return 'Purchases & Expenses';
  if (pathname.startsWith('/contractors')) return 'Contractors Ledger';
  if (pathname.startsWith('/admin/tracking')) return 'Operations & Activity Tracking';
  if (pathname.startsWith('/settings')) return 'Settings & Letterhead';
  if (pathname.startsWith('/login')) return 'Login Screen';
  return 'Contractor Portal';
}

/**
 * Send heartbeat to Supabase & local storage
 */
export async function sendUserHeartbeat(
  pathname: string,
  explicitTitle?: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  const user = getCurrentUser();
  if (!user) return;

  const pageTitle = explicitTitle || getFriendlyPageTitle(pathname);
  const nowISO = new Date().toISOString();
  const device = getDeviceInfo();

  const presencePayload = {
    username: user.username.toLowerCase(),
    user_name: user.fullName,
    role: user.roleTitle || user.role,
    status: 'online',
    current_page: pathname,
    current_page_title: pageTitle,
    device_info: device,
    last_active_at: nowISO,
    updated_at: nowISO,
  };

  // 1. Update localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESENCE);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((p) => p.username === presencePayload.username);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...presencePayload };
    } else {
      list.push(presencePayload);
    }
    localStorage.setItem(STORAGE_KEY_PRESENCE, JSON.stringify(list));

    // Broadcast channel for instantaneous tab-to-tab sync
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('shiv_presence_channel');
      bc.postMessage({ type: 'HEARTBEAT', payload: presencePayload });
      bc.close();
    }
  } catch (e) {
    console.warn('Local presence storage error:', e);
  }

  // 2. Sync to Supabase Cloud
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('user_presence').upsert(
        {
          ...presencePayload,
          session_started_at: user.loginTime || nowISO,
        },
        { onConflict: 'username' }
      );
    } catch (err) {
      console.warn('Failed to update live presence in Supabase:', err);
    }
  }
}

/**
 * Log a page view / action breadcrumb into the live activity stream
 */
export async function logLiveActivityBreadcrumb(params: {
  pathname: string;
  actionType?: 'page_view' | 'action' | 'session_start';
  details?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const user = getCurrentUser();
  if (!user) return;

  const nowISO = new Date().toISOString();
  const pageTitle = getFriendlyPageTitle(params.pathname);
  const device = getDeviceInfo();

  const activityItem: LiveActivityItem = {
    id: 'act_' + Math.random().toString(36).substring(2, 9),
    username: user.username.toLowerCase(),
    userName: user.fullName,
    role: user.roleTitle || user.role,
    actionType: params.actionType || 'page_view',
    pagePath: params.pathname,
    pageTitle: pageTitle,
    details: params.details || `Navigated to ${pageTitle}`,
    deviceInfo: device,
    createdAt: nowISO,
  };

  // 1. Local storage buffer
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITY);
    const existing: LiveActivityItem[] = raw ? JSON.parse(raw) : [];
    existing.unshift(activityItem);
    localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(existing.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to save activity breadcrumb locally:', e);
  }

  // 2. Supabase Cloud write
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('live_activity_stream').insert({
        username: activityItem.username,
        user_name: activityItem.userName,
        role: activityItem.role,
        action_type: activityItem.actionType,
        page_path: activityItem.pagePath,
        page_title: activityItem.pageTitle,
        details: activityItem.details,
        device_info: activityItem.deviceInfo,
        created_at: activityItem.createdAt,
      });
    } catch (err) {
      console.warn('Failed to write activity stream to Supabase:', err);
    }
  }
}

/**
 * Fetch all users' live presence status
 */
export async function getLiveUsersPresence(): Promise<UserPresence[]> {
  let records: any[] = [];

  // Try Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .order('last_active_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        records = data;
      }
    } catch (err) {
      console.warn('Error reading presence from Supabase:', err);
    }
  }

  // Fallback to localStorage if Supabase returned nothing
  if (records.length === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRESENCE);
      if (raw) records = JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading local presence:', e);
    }
  }

  // Ensure default partners are seeded
  const partnerKeys = [
    { username: 'harsh16', name: 'Harsh (Admin)', role: 'Admin / Managing Partner' },
    { username: 'girish1', name: 'Girish (Partner)', role: 'Partner' },
    { username: 'kishor2', name: 'Kishor (Partner)', role: 'Partner' },
  ];

  const now = Date.now();
  const current = getCurrentUser();

  const finalPresenceList: UserPresence[] = partnerKeys.map((pk) => {
    const existing = records.find(
      (r) => r.username?.toLowerCase() === pk.username.toLowerCase()
    );

    const isCurrentActiveSession =
      current && current.username.toLowerCase() === pk.username.toLowerCase();

    const lastActiveAt = isCurrentActiveSession
      ? new Date().toISOString()
      : existing?.last_active_at || new Date(now - 86400000 * 2).toISOString();

    const secondsAgo = Math.max(
      0,
      Math.floor((now - new Date(lastActiveAt).getTime()) / 1000)
    );

    // Online threshold: active in the last 75 seconds
    const isOnline = isCurrentActiveSession || secondsAgo <= 75;
    // Idle threshold: between 75 seconds and 5 minutes
    const isIdle = !isOnline && secondsAgo <= 300;

    const status: UserPresence['status'] = isOnline
      ? 'online'
      : isIdle
      ? 'idle'
      : 'offline';

    return {
      username: pk.username,
      userName: existing?.user_name || pk.name,
      role: existing?.role || pk.role,
      status,
      currentPage: isCurrentActiveSession
        ? window?.location?.pathname || '/'
        : existing?.current_page || '/',
      currentPageTitle: isCurrentActiveSession
        ? getFriendlyPageTitle(window?.location?.pathname || '/')
        : existing?.current_page_title || 'Overview Dashboard',
      deviceInfo: isCurrentActiveSession
        ? getDeviceInfo()
        : existing?.device_info || 'Chrome on Windows PC',
      lastActiveAt,
      sessionStartedAt: existing?.session_started_at || lastActiveAt,
      secondsAgo,
      isOnline,
      isIdle,
    };
  });

  // Sort: Online first, then Idle, then Offline
  return finalPresenceList.sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    if (a.isIdle && !b.isIdle) return -1;
    if (!a.isIdle && b.isIdle) return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });
}

/**
 * Fetch recent activity breadcrumbs for live stream
 */
export async function getLiveActivityStream(): Promise<LiveActivityItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('live_activity_stream')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          username: d.username,
          userName: d.user_name,
          role: d.role,
          actionType: d.action_type,
          pagePath: d.page_path,
          pageTitle: d.page_title,
          details: d.details,
          deviceInfo: d.device_info,
          createdAt: d.created_at,
        }));
      }
    } catch (err) {
      console.warn('Failed to read activity stream from Supabase:', err);
    }
  }

  // Fallback to local
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }

  return [];
}
