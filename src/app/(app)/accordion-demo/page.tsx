'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, HardHat, FileText, Truck, ShieldCheck } from 'lucide-react';
import { CardSplitAccordion, type AccordionItemData } from '@/components/card-split-accordian';

const contractorFaqItems: AccordionItemData[] = [
  {
    id: 1,
    title: 'RCC Slab Work & Drawing Verification',
    icon: <HardHat className="size-4 text-orange-600" />,
    content:
      'All structural beam depths, column centers, and slab reinforcement must be checked against structural engineer sanctioned drawings before casting concrete.',
  },
  {
    id: 2,
    title: 'Cube Testing & Strength Certification',
    icon: <ShieldCheck className="size-4 text-emerald-600" />,
    content:
      'Concrete cubes must be cast on site and tested after 7 and 28 days. Work bills for slabs are submitted after 14-day de-shuttering and cube test clearance.',
  },
  {
    id: 3,
    title: 'Tax Invoices & GST Round-off Calculation',
    icon: <FileText className="size-4 text-neutral-800" />,
    content:
      'Contractor bills include 9% CGST + 9% SGST. The final payable grand total is rounded off to the nearest rupee matching the official Shiv Enterprises letterhead.',
  },
  {
    id: 4,
    title: 'Sub-Contractor Work Measurements & Weekly Pay',
    icon: <Truck className="size-4 text-neutral-600" />,
    content:
      'Masonry (sqft), plastering, and RCC steel fabrication quantities are measured every Friday. Partial running payments are cleared every Saturday.',
  },
];

export default function AccordionDemoPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/"
          className="p-1.5 -ml-1.5 text-neutral-500 hover:text-neutral-900 rounded-md nav-transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 tracking-tight">
            Card Split Accordion
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Component from registry.watermelon.sh/r/card-split-accordian.json
          </p>
        </div>
      </div>

      {/* Demo Section */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-xs">
        <h2 className="text-xs font-semibold text-neutral-900 mb-1">
          Civil Site Guidelines (Interactive Preview)
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Click any card below to experience the smooth spring split animation:
        </p>

        <CardSplitAccordion items={contractorFaqItems} />
      </div>
    </div>
  );
}
