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

      {/* 3D Modern Architectural Tower Blocks SVG */}
      <svg
        width="46"
        height="56"
        viewBox="0 0 46 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="tower1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="tower2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="tower3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* Left tower (Light sky blue) */}
        <path
          d="M6 24 C 6 22, 12 14, 15 12 L 15 54 L 6 54 Z"
          fill="url(#tower1)"
        />
        {/* Middle main tower (Vibrant cyan/blue with curved crown) */}
        <path
          d="M17 10 C 17 6, 26 2, 30 1 L 30 54 L 17 54 Z"
          fill="url(#tower2)"
        />
        {/* Right curved architectural blade (Steel slate) */}
        <path
          d="M32 8 C 36 12, 42 20, 42 26 L 42 54 L 32 54 Z"
          fill="url(#tower3)"
        />

        {/* Subtle architectural horizontal floor lines */}
        <line x1="7" y1="32" x2="14" y2="32" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        <line x1="7" y1="42" x2="14" y2="42" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        <line x1="18" y1="20" x2="29" y2="20" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        <line x1="18" y1="32" x2="29" y2="32" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        <line x1="18" y1="44" x2="29" y2="44" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        <line x1="33" y1="24" x2="41" y2="24" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        <line x1="33" y1="36" x2="41" y2="36" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
      </svg>
    </div>
  );
}
