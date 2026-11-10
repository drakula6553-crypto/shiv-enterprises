'use client';

import React from 'react';

/**
 * AuthGuard - Login page removed for now.
 * Direct access to all features with default Admin session.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
