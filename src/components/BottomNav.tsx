'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FilePlus, FileText, ShoppingBag, Users, Layers } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/new-bill', label: 'New bill', icon: FilePlus },
  { href: '/bills', label: 'Bills', icon: FileText },
  { href: '/project-tracking', label: 'RA Ledger', icon: Layers },
  { href: '/expenses', label: 'Purchases', icon: ShoppingBag },
  { href: '/contractors', label: 'Contractors', icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex justify-around items-center h-14 max-w-md mx-auto px-1">
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
                flex flex-col items-center justify-center
                flex-1 min-h-[44px] py-1
                rounded-lg transition-all touch-target
                ${isActive
                  ? 'text-[#0284C7]'
                  : 'text-slate-500 active:text-slate-900'
                }
              `}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? 'text-[#0284C7]' : 'text-slate-400'}
              />
              <span
                className={`
                  text-[10px] mt-0.5 leading-tight text-center tracking-normal
                  ${isActive ? 'font-bold text-[#0F2238]' : 'font-medium text-slate-500'}
                `}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
