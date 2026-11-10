'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  ShoppingBag,
  Users,
  Settings,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { getCurrentUser, isUserAdmin, AuthUser } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/new-bill', label: 'New bill', icon: FilePlus },
  { href: '/bills', label: 'Bills & invoices', icon: FileText },
  { href: '/project-tracking', label: 'Project RA & Milestones', icon: Layers },
  { href: '/expenses', label: 'Purchases & expenses', icon: ShoppingBag },
  { href: '/contractors', label: 'Contractors', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, [pathname]);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0A192F] text-slate-200 fixed top-0 left-0 h-full z-40 border-r border-slate-800/80 select-none shadow-[2px_0_12px_rgba(2,12,27,0.35)]">
      {/* Brand Header with 3D Architectural Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/80 bg-[#071324]/50">
        <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center overflow-hidden p-1 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Shiv Enterprises 3D Architectural Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white leading-tight font-sans">
            Shiv Enterprises
          </h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            Civil Contractors • Mumbai
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
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
                group flex items-center gap-3 px-3 h-9 rounded-xl
                transition-all text-xs font-medium
                ${
                  isActive
                    ? 'bg-[#0284C7]/15 text-white font-semibold border border-[#0284C7]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                }
              `}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2 : 1.5}
                className={
                  isActive
                    ? 'text-[#38BDF8]'
                    : 'text-slate-400 group-hover:text-slate-200 transition-colors'
                }
              />
              <span className="truncate">{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              )}
            </Link>
          );
        })}

        {/* Admin Authority Section */}
        {isUserAdmin(currentUser) && (
          <div className="pt-4 border-t border-slate-800/80 mt-3">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-sky-400" />
              <span>Admin Authority</span>
            </p>
            <Link
              href="/admin/tracking"
              className={`
                flex items-center justify-between px-3 h-9 rounded-xl
                transition-all text-xs font-medium
                ${
                  pathname.startsWith('/admin/tracking')
                    ? 'bg-sky-500/15 text-sky-200 font-semibold border border-sky-500/30 shadow-[inset_0_1px_0_rgba(56,189,248,0.15)]'
                    : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck
                  size={16}
                  strokeWidth={1.5}
                  className="text-sky-400"
                />
                <span>Audit & Live Users</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase font-bold tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Live
              </span>
            </Link>
          </div>
        )}
      </nav>

      {/* Settings & User Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#071324]/40 space-y-2">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 h-9 rounded-xl
            transition-all text-xs font-medium
            ${
              pathname === '/settings'
                ? 'bg-[#0284C7]/15 text-white font-semibold border border-[#0284C7]/30'
                : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
            }
          `}
        >
          <Settings size={16} strokeWidth={1.5} className="text-slate-400" />
          <span>Settings & Letterhead</span>
        </Link>

        {/* User Profile Info */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between px-2">
          <Link
            href="/admin/tracking"
            className="flex items-center gap-2.5 overflow-hidden group hover:opacity-95 transition-opacity"
            title="View Live User Presence"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center font-bold text-[11px] shrink-0 shadow-sm">
              {currentUser?.avatarInitials || 'HP'}
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-semibold text-white block truncate group-hover:text-sky-300 transition-colors">
                {currentUser?.displayName || currentUser?.fullName || 'Harsh (Admin)'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {currentUser?.roleTitle || 'Admin / Managing Partner'}
              </span>
            </div>
          </Link>

          <Link
            href="/settings"
            title="Settings & Letterhead"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <Settings size={14} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
