'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FilePlus, FileText, ShoppingBag, Users } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/new-bill', label: 'New bill', icon: FilePlus },
  { href: '/bills', label: 'Bills', icon: FileText },
  { href: '/expenses', label: 'Purchases', icon: ShoppingBag },
  { href: '/contractors', label: 'Contractors', icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 md:hidden safe-area-bottom">
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
                rounded-md nav-transition touch-target
                ${isActive
                  ? 'text-navy'
                  : 'text-neutral-500 active:text-neutral-900'
                }
              `}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? 'text-amber-600' : 'text-neutral-500'}
              />
              <span
                className={`
                  text-[10px] mt-0.5 leading-tight text-center tracking-normal
                  ${isActive ? 'font-semibold text-neutral-900' : 'font-normal text-neutral-500'}
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
