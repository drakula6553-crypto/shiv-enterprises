'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setIsAuthenticated(false);
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // While verifying session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center p-2 shadow-xl overflow-hidden animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Shiv Enterprises 3D Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
          <span>Verifying partner authorization...</span>
        </div>
      </div>
    );
  }

  // Not authenticated: render nothing while redirect completes
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
