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
      className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-transform active:scale-95 ${
        isAdmin
          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
          : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
      }`}
      title={user ? `Signed in as ${user.fullName} (${user.roleTitle})` : 'Partner Settings'}
    >
      {user?.avatarInitials || (user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'SE')}
    </Link>
  );
}
