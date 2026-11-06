'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is signed in
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
      <div className="min-h-screen bg-[#090D14] flex flex-col items-center justify-center text-neutral-400 gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs tracking-wider animate-pulse">
          SE
        </div>
        <p className="text-xs text-neutral-400 font-mono">Verifying partner session...</p>
      </div>
    );
  }

  // Not authenticated: render nothing while redirect completes
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
