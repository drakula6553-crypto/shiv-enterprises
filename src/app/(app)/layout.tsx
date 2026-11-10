import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import HeaderUserBadge from '@/components/HeaderUserBadge';
import AuthGuard from '@/components/AuthGuard';
import LivePresenceTracker from '@/components/LivePresenceTracker';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <LivePresenceTracker />
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-sky-500/20 selection:text-sky-950">
        {/* Desktop structural sidebar */}
        <Sidebar />

        {/* Mobile top header */}
        <header className="md:hidden sticky top-0 z-30 bg-[#0A192F] text-white border-b border-slate-800 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center p-1 shadow-sm overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Shiv Enterprises 3D Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block leading-tight">
                  SHIV ENTERPRISES
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5 tracking-wide">
                  Civil Contractors • Borivali (W)
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Settings & Letterhead"
              >
                <Settings size={18} />
              </Link>
              <HeaderUserBadge />
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
    </AuthGuard>
  );
}
