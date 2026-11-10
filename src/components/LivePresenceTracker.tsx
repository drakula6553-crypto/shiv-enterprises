'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { sendUserHeartbeat, logLiveActivityBreadcrumb } from '@/lib/livePresence';
import { getCurrentUser } from '@/lib/auth';

export default function LivePresenceTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    // Send heartbeat immediately on route change
    sendUserHeartbeat(pathname);

    // If route changed, log a navigation breadcrumb
    if (lastPathRef.current && lastPathRef.current !== pathname) {
      logLiveActivityBreadcrumb({
        pathname,
        actionType: 'page_view',
      });
    }
    lastPathRef.current = pathname;

    // Periodic heartbeat every 20 seconds while user is active on this tab
    const interval = setInterval(() => {
      sendUserHeartbeat(pathname);
    }, 20000);

    // Update on visibility change (e.g. user returns to this tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendUserHeartbeat(pathname);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname]);

  return null;
}
