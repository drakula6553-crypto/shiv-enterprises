'use client';

import React from 'react';

export default function ShivLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Text Branding */}
      <div className="text-right flex flex-col items-end">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tracking-tight text-[#1E3A8A] font-sans">
            SH<span className="text-[#0284C7] lowercase text-2xl font-bold">i</span>V
          </span>
        </div>
        <span className="text-[11px] font-bold tracking-[0.22em] text-[#64748B] uppercase font-sans -mt-1">
          ENTERPRISES
        </span>
        <span
          className="text-[9.5px] text-[#475569] italic tracking-tight font-serif mt-0.5"
          style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
        >
          Enduring Structure for Generations
        </span>
      </div>

      {/* 3D Modern Architectural Logo Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Shiv Enterprises 3D Architectural Logo"
        className="h-14 w-auto object-contain flex-shrink-0 drop-shadow-sm"
      />
    </div>
  );
}
