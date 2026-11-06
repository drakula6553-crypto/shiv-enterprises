'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CapitalioDashboardDemo from '@/components/watermelon/capitalio-dashboard/demo';

export default function CapitalioPage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Floating Return Pill */}
      <Link
        href="/"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-neutral-900 text-white px-3.5 py-2 rounded-full shadow-lg border border-neutral-700 text-xs font-medium hover:bg-neutral-800 transition-all"
      >
        <ArrowLeft size={14} />
        <span>Back to Shiv Enterprises</span>
      </Link>
      <CapitalioDashboardDemo />
    </div>
  );
}
