'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser, AuthUser } from '@/lib/auth';

export default function HeaderUserBadge() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  return (
    <Link
      href="/admin/tracking"
      className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs"
      title={user ? `Signed in as ${user.fullName}` : 'Sign in'}
    >
      {user?.avatarInitials || 'HP'}
    </Link>
  );
}
