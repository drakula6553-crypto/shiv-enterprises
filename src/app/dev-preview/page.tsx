'use client';

import { useState } from 'react';
import { Smartphone, RefreshCw, Monitor } from 'lucide-react';

const pages = [
  { path: '/', label: 'Overview' },
  { path: '/new-bill', label: 'New bill' },
  { path: '/bills', label: 'Bills' },
  { path: '/expenses', label: 'Purchases' },
  { path: '/contractors', label: 'Contractors' },
  { path: '/settings', label: 'Settings' },
  { path: '/login', label: 'Login' },
];

export default function DevPreview() {
  const [currentPath, setCurrentPath] = useState('/');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h1 className="font-medium text-xs text-neutral-200">
              Responsive preview
            </h1>
          </div>

          {/* Page selector */}
          <div className="flex gap-1.5 flex-wrap">
            {pages.map((p) => (
              <button
                key={p.path}
                onClick={() => setCurrentPath(p.path)}
                className={`
                  px-3 h-7 rounded-md text-xs font-medium nav-transition
                  ${currentPath === p.path
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                  }
                `}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="ml-auto p-1.5 text-neutral-400 hover:text-white rounded-md nav-transition"
            title="Refresh previews"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex flex-wrap gap-8 p-6 items-start justify-center">
        {/* Mobile Viewport (390 x 844) */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 mb-2 justify-center text-neutral-400 text-xs">
            <Smartphone size={13} />
            <span>Mobile (390 × 844)</span>
          </div>

          <div
            className="relative bg-black rounded-[2.5rem] border border-neutral-800 shadow-2xl"
            style={{ padding: 12, width: 390 + 24, height: 844 + 24 }}
          >
            <iframe
              key={`mobile-${refreshKey}`}
              src={currentPath}
              className="bg-white block rounded-[2rem]"
              style={{ width: 390, height: 844, border: 'none' }}
              title="Mobile Preview"
            />
          </div>
        </div>

        {/* Desktop Viewport */}
        <div className="flex-1 min-w-[700px] max-w-5xl">
          <div className="flex items-center gap-2 mb-2 justify-center text-neutral-400 text-xs">
            <Monitor size={13} />
            <span>Desktop</span>
          </div>

          <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl">
            <div className="h-7 bg-neutral-900 border-b border-neutral-800 flex items-center px-3 gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <span className="text-[11px] text-neutral-400 font-mono ml-3 truncate">
                http://localhost:3000{currentPath}
              </span>
            </div>

            <iframe
              key={`desktop-${refreshKey}`}
              src={currentPath}
              className="bg-white w-full"
              style={{ height: 844, border: 'none' }}
              title="Desktop Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
