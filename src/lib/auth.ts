import { recordLoginEvent } from './tracking';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  displayName: string;
  role: 'admin' | 'partner';
  roleTitle: string;
  companyName: string;
  avatarInitials: string;
  loginTime: string;
}

export interface PartnerAccount {
  username: string;
  displayName: string;
  fullName: string;
  role: 'admin' | 'partner';
  roleTitle: string;
  password: string;
  avatarInitials: string;
}

const AUTH_STORAGE_KEY = 'shiv_contractor_session';

/**
 * Pre-configured Partner and Admin accounts
 */
export const PARTNER_ACCOUNTS: Record<string, PartnerAccount> = {
  girish1: {
    username: 'girish1',
    displayName: 'Girish',
    fullName: 'Girish (Partner)',
    role: 'partner',
    roleTitle: 'Partner',
    password: 'Girish@123',
    avatarInitials: 'G',
  },
  kishor2: {
    username: 'kishor2',
    displayName: 'Kishor',
    fullName: 'Kishor (Partner)',
    role: 'partner',
    roleTitle: 'Partner',
    password: 'Kishor@15',
    avatarInitials: 'K',
  },
  harsh16: {
    username: 'Harsh16',
    displayName: 'Harsh',
    fullName: 'Harsh (Admin)',
    role: 'admin',
    roleTitle: 'Admin / Managing Partner',
    password: 'Harsh@123',
    avatarInitials: 'HP',
  },
};

export const DEFAULT_USER: AuthUser = {
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

/**
 * Check if the given user has admin privileges
 */
export function isUserAdmin(user: AuthUser | null): boolean {
  if (!user) return true; // Default admin access while login is removed
  return user.role === 'admin' || user.username.toLowerCase() === 'harsh16';
}

/**
 * Get current logged in user from localStorage (defaults to Harsh Admin since login page is removed)
 */
export function getCurrentUser(): AuthUser {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw || raw === 'logged_out') {
      return DEFAULT_USER;
    }
    const parsed = JSON.parse(raw);
    return parsed && parsed.username ? parsed : DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

/**
 * Sign in using username or email and password
 */
export async function signIn(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanId || !cleanPass) {
    return {
      success: false,
      error: 'Please enter both your username and password.',
    };
  }

  // Normalize username (strip @domain if email entered)
  const usernameKey = cleanId.split('@')[0];

  // Find matching account
  const account = PARTNER_ACCOUNTS[usernameKey] || PARTNER_ACCOUNTS[cleanId];

  if (!account) {
    return {
      success: false,
      error: `Invalid username "${identifier}". Access is restricted to registered partners (Harsh16, girish1, kishor2).`,
    };
  }

  // Check password
  if (account.password !== cleanPass) {
    return {
      success: false,
      error: 'Incorrect password. Please verify and try again.',
    };
  }

  // Construct authenticated user session
  const user: AuthUser = {
    id: `usr_${account.username.toLowerCase()}`,
    username: account.username,
    email: `${account.username.toLowerCase()}@shiventerprises.com`,
    fullName: account.fullName,
    displayName: account.displayName,
    role: account.role,
    roleTitle: account.roleTitle,
    companyName: 'Shiv Enterprises Civil Contractors',
    avatarInitials: account.avatarInitials,
    loginTime: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  // Record login event in Supabase and local tracking logs
  try {
    await recordLoginEvent(user);
  } catch (err) {
    console.warn('Could not record login event:', err);
  }

  return { success: true, user };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, 'logged_out');
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
