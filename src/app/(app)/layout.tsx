import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { User, Settings } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-neutral-900 font-sans selection:bg-amber-500/20 selection:text-amber-900">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top header */}
      <header className="md:hidden sticky top-0 z-30 bg-[#0B0F17] text-white border-b border-white/[0.08] backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs tracking-wider shadow-[0_2px_8px_rgba(245,158,11,0.2)]">
              SE
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white block leading-tight">
                SHIV ENTERPRISES
              </span>
              <span className="text-[10px] text-neutral-400 block -mt-0.5">
                Civil Contractors • Borivali (W)
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
              title="Settings & Letterhead"
            >
              <Settings size={18} />
            </Link>
            <Link
              href="/login"
              className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-semibold text-xs"
              title="Account / Sign in"
            >
              HP
            </Link>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="md:ml-64 pb-20 md:pb-8 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
