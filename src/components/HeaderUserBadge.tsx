'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser, isUserAdmin, AuthUser } from '@/lib/auth';

export default function HeaderUserBadge() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const isAdmin = isUserAdmin(user);
  const targetHref = isAdmin ? '/admin/tracking' : '/settings';

  return (
    <Link
      href={targetHref}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs transition-transform active:scale-95 shadow-sm ${
        isAdmin
          ? 'bg-sky-500/20 border-sky-500/30 text-sky-200'
          : 'bg-slate-700/40 border-slate-600/40 text-slate-200'
      }`}
      title={user ? `Signed in as ${user.fullName} (${user.roleTitle})` : 'Partner Settings'}
    >
      {user?.avatarInitials || (user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'HP')}
    </Link>
  );
}
