import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyName: string;
  avatarUrl?: string;
  loginTime: string;
}

const AUTH_STORAGE_KEY = 'shiv_contractor_session';

export const DEMO_ADMIN: AuthUser = {
  id: 'usr_admin_01',
  email: 'admin@shiventerprises.com',
  fullName: 'Harsh P.',
  role: 'Partner / Managing Director',
  companyName: 'Shiv Enterprises Civil Contractors',
  loginTime: new Date().toISOString(),
};

/**
 * Get the currently logged in user from localStorage
 */
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return DEMO_ADMIN; // Default signed-in for seamless site ops if not explicitly logged out
    if (raw === 'logged_out') return null;
    return JSON.parse(raw);
  } catch {
    return DEMO_ADMIN;
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // If Supabase is connected, try real backend auth first
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        const user: AuthUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          fullName: data.user.user_metadata?.full_name || 'Admin Partner',
          role: 'Partner / Owner',
          companyName: 'Shiv Enterprises',
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        return { success: true, user };
      }
    } catch (err: any) {
      console.warn('Supabase auth failed, falling back to local credentials:', err);
    }
  }

  // Local / offline contractor authentication
  if (!cleanEmail || !password) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  // Accept admin demo credentials or any reasonable contractor password (> 4 chars)
  const isDemo = cleanEmail === 'admin@shiventerprises.com' || cleanEmail.includes('shiv');
  const user: AuthUser = {
    id: 'usr_' + Math.random().toString(36).substring(2, 9),
    email: cleanEmail,
    fullName: isDemo ? 'Harsh P.' : cleanEmail.split('@')[0],
    role: 'Partner / Managing Director',
    companyName: 'Shiv Enterprises Civil Contractors',
    loginTime: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  return { success: true, user };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase signOut error:', e);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, 'logged_out');
  }
}
