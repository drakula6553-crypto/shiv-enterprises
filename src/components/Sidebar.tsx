'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  LogIn,
  User,
} from 'lucide-react';
import { getCurrentUser, signOut, AuthUser } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/new-bill', label: 'New bill', icon: FilePlus },
  { href: '/bills', label: 'Bills & invoices', icon: FileText },
  { href: '/expenses', label: 'Purchases & expenses', icon: ShoppingBag },
  { href: '/contractors', label: 'Contractors', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    router.push('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0B0F17] text-neutral-200 fixed top-0 left-0 h-full z-40 border-r border-white/[0.07] select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.07]">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs tracking-wider shadow-[0_2px_8px_rgba(245,158,11,0.15)]">
          SE
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-white leading-tight">
            Shiv Enterprises
          </h1>
          <p className="text-[11px] text-neutral-400 font-normal">
            Civil Contractors • Mumbai
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pt-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500 font-mono">
          Operations
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 h-9 rounded-lg
                nav-transition text-xs font-medium
                ${isActive
                  ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
                }
              `}
            >
              <Icon
                size={16}
                strokeWidth={1.5}
                className={isActive ? 'text-amber-400' : 'text-neutral-500'}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Settings & Auth Footer */}
      <div className="p-3 border-t border-white/[0.07] space-y-2">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 h-9 rounded-lg
            nav-transition text-xs font-medium
            ${pathname === '/settings'
              ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.08]'
              : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
            }
          `}
        >
          <Settings size={16} strokeWidth={1.5} className="text-neutral-400" />
          <span>Settings & Letterhead</span>
        </Link>

        {/* User Profile / Login status */}
        <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between px-2">
          {currentUser ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-semibold text-[11px] shrink-0">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'H'}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-medium text-white block truncate">
                  {currentUser.fullName || 'Harsh P.'}
                </span>
                <span className="text-[10px] text-neutral-400 block truncate">
                  {currentUser.role ? 'Partner' : 'Partner'}
                </span>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white"
            >
              <User size={14} className="text-neutral-400" />
              <span>Partner Sign in</span>
            </Link>
          )}

          {currentUser ? (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-white/[0.05] rounded-md transition-colors"
            >
              <LogOut size={14} />
            </button>
          ) : (
            <Link
              href="/login"
              className="p-1.5 text-neutral-400 hover:text-amber-400 rounded-md transition-colors"
              title="Log in"
            >
              <LogIn size={14} />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
