import * as XLSX from 'xlsx';
import type { CompanyProfile } from './types';
import { getCompanyProfile } from './storage';

export interface ProjectStage {
  id: string;
  sr: number;
  description: string;
  percentage: number; // e.g. 5.5
  completedPercentage?: number; // actual completed % if partial, e.g. for brickwork 3.0% of 9.0%
  labourAmount: number;
  materialAmount: number;
  status: 'completed_billed' | 'completed_pending' | 'in_progress' | 'pending';
  billedInvoiceNumber?: string; // e.g. "RN 08" or "RS 10"
  notes?: string; // e.g. "Submission of The Bill is Pending"
}

export interface RmcDeductionItem {
  id: string;
  grade: string; // e.g. "M-15", "M-25", "M-45"
  quantityCuM: number;
  rate: number;
  amount: number;
  fromDate?: string;
  toDate?: string;
  notes?: string;
}

export interface MaterialAdjustmentItem {
  id: string;
  title: string;
  amount: number;
  type: 'add' | 'deduct';
  notes?: string;
}

export interface ProjectRAContract {
  id: string;
  builderName: string; // e.g. "Harshmaan spaces LLP"
  projectName: string; // e.g. "Roshan Nager Borivali west"
  contractDate: string; // "2026-11-03"
  billingAreaSqFt: number; // 60000
  labourRate: number; // 600
  materialRate: number; // 400
  stages: ProjectStage[];
  labourBilledAmount: number; // 17190000
  materialBilledAmount: number; // 2045411
  rmcDeductions: RmcDeductionItem[];
  materialAdjustments: MaterialAdjustmentItem[];
  retentionPercent?: number; // optional, e.g. 5%
  tdsPercent?: number; // optional, e.g. 1% or 2%
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComputedRACalculations {
  totalLabourContract: number;
  totalMaterialContract: number;
  totalTurnkeyContract: number;
  // Progress
  totalCompletedPercentage: number;
  totalLabourCompletedEarned: number;
  totalMaterialCompletedEarned: number;
  // Labour Due (1@)
  labourBilled: number;
  labourDueAmount: number; // 1@
  // Material Due (2@)
  materialBilled: number;
  totalRmcDeductions: number;
  materialBalanceBeforeAdj: number;
  totalMaterialAdjustments: number;
  materialDueAmount: number; // 2@
  // Grand Total Due (1@ + 2@)
  grandTotalDue: number;
  // Stages breakdown
  billedStagesCount: number;
  pendingSubmissionStagesCount: number;
  pendingStagesCount: number;
}

export function computeProjectRACalculations(contract: ProjectRAContract): ComputedRACalculations {
  const totalLabourContract = contract.billingAreaSqFt * contract.labourRate;
  const totalMaterialContract = contract.billingAreaSqFt * contract.materialRate;
  const totalTurnkeyContract = totalLabourContract + totalMaterialContract;

  let totalCompletedPercentage = 0;
  let totalLabourCompletedEarned = 0;
  let totalMaterialCompletedEarned = 0;

  let billedStagesCount = 0;
  let pendingSubmissionStagesCount = 0;
  let pendingStagesCount = 0;

  contract.stages.forEach((stage) => {
    const isCompleted =
      stage.status === 'completed_billed' ||
      stage.status === 'completed_pending';

    if (stage.status === 'completed_billed') billedStagesCount++;
    else if (stage.status === 'completed_pending') pendingSubmissionStagesCount++;
    else pendingStagesCount++;

    if (isCompleted) {
      // If a stage has completedPercentage specified (like partial brickwork), use it; otherwise use stage percentage
      const effectivePct =
        typeof stage.completedPercentage === 'number' && stage.completedPercentage > 0
          ? stage.completedPercentage
          : stage.percentage;

      totalCompletedPercentage += effectivePct;
      totalLabourCompletedEarned += (totalLabourContract * effectivePct) / 100;
      totalMaterialCompletedEarned += (totalMaterialContract * effectivePct) / 100;
    }
  });

  // Round percentages and amounts cleanly
  totalCompletedPercentage = Math.round(totalCompletedPercentage * 100) / 100;
  totalLabourCompletedEarned = Math.round(totalLabourCompletedEarned);
  totalMaterialCompletedEarned = Math.round(totalMaterialCompletedEarned);

  // 1@ Labour Due
  const labourBilled = contract.labourBilledAmount || 0;
  const labourDueAmount = Math.max(0, totalLabourCompletedEarned - labourBilled);

  // 2@ Material Due
  const materialBilled = contract.materialBilledAmount || 0;
  const totalRmcDeductions = contract.rmcDeductions.reduce((sum, item) => sum + (item.amount || 0), 0);
  const materialBalanceBeforeAdj = totalMaterialCompletedEarned - materialBilled - totalRmcDeductions;

  const totalMaterialAdjustments = contract.materialAdjustments.reduce((sum, item) => {
    return item.type === 'add' ? sum + item.amount : sum - item.amount;
  }, 0);

  const materialDueAmount = Math.round(materialBalanceBeforeAdj + totalMaterialAdjustments);

  // Grand Total Due (1@ + 2@)
  const grandTotalDue = labourDueAmount + materialDueAmount;

  return {
    totalLabourContract,
    totalMaterialContract,
    totalTurnkeyContract,
    totalCompletedPercentage,
    totalLabourCompletedEarned,
    totalMaterialCompletedEarned,
    labourBilled,
    labourDueAmount,
    materialBilled,
    totalRmcDeductions,
    materialBalanceBeforeAdj,
    totalMaterialAdjustments,
    materialDueAmount,
    grandTotalDue,
    billedStagesCount,
    pendingSubmissionStagesCount,
    pendingStagesCount,
  };
}

// ─── Pre-seed Data from User's PDF ────────────────────────────
export const SEED_ROSHAN_NAGER_PROJECT: ProjectRAContract = {
  id: 'roshan-nager-borivali',
  builderName: 'Harshmaan spaces LLP',
  projectName: 'Roshan Nager Borivali west',
  contractDate: '2026-11-03',
  billingAreaSqFt: 60000,
  labourRate: 600,
  materialRate: 400,
  labourBilledAmount: 17190000,
  materialBilledAmount: 2045411,
  notes: 'Area finalized on 26th March 2026. Rate: Rs.600 Labour + Rs.400 Material = Rs.1,000/sq.ft.',
  rmcDeductions: [
    {
      id: 'rmc-1',
      grade: 'M-15',
      quantityCuM: 105.5,
      rate: 2037,
      amount: 214904,
      fromDate: '2025-05-04',
      toDate: '2026-11-01',
    },
    {
      id: 'rmc-2',
      grade: 'M-25',
      quantityCuM: 4.5,
      rate: 1980,
      amount: 8910,
      fromDate: '2025-05-04',
      toDate: '2026-11-01',
    },
    {
      id: 'rmc-3',
      grade: 'M-45',
      quantityCuM: 2425.75,
      rate: 1823,
      amount: 4422142,
      fromDate: '2025-05-04',
      toDate: '2026-11-01',
    },
  ],
  materialAdjustments: [
    {
      id: 'adj-1',
      title: 'Pending Amount from Submited Bill (Jamuna Associates)',
      amount: 925291,
      type: 'add',
      notes: 'Subcontractor / vendor pending adjustment',
    },
  ],
  stages: [
    {
      id: 's-1',
      sr: 1,
      description: 'Excavation',
      percentage: 5.5,
      labourAmount: 1980000,
      materialAmount: 1320000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 01',
    },
    {
      id: 's-2',
      sr: 2,
      description: 'Plinth Work Up to Basment top slab',
      percentage: 8.0,
      labourAmount: 2880000,
      materialAmount: 1920000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 02',
    },
    {
      id: 's-3',
      sr: 3,
      description: '1st slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 03',
    },
    {
      id: 's-4',
      sr: 4,
      description: '2nd slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 03',
    },
    {
      id: 's-5',
      sr: 5,
      description: '3rd slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 04',
    },
    {
      id: 's-6',
      sr: 6,
      description: '4th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 04',
    },
    {
      id: 's-7',
      sr: 7,
      description: '5th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 05',
    },
    {
      id: 's-8',
      sr: 8,
      description: '6th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 05',
    },
    {
      id: 's-9',
      sr: 9,
      description: '7th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 06',
    },
    {
      id: 's-10',
      sr: 10,
      description: '8th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 06',
    },
    {
      id: 's-11',
      sr: 11,
      description: '9th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 07',
    },
    {
      id: 's-12',
      sr: 12,
      description: '10th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 07',
    },
    {
      id: 's-13',
      sr: 13,
      description: '11th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 08',
    },
    {
      id: 's-14',
      sr: 14,
      description: '12th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_pending',
      notes: 'Submission of The Bill is Pending (RS 10)',
    },
    {
      id: 's-15',
      sr: 15,
      description: '13th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'completed_pending',
      notes: 'Submission of The Bill is Pending (RS 10)',
    },
    {
      id: 's-16',
      sr: 16,
      description: '14th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'pending',
    },
    {
      id: 's-17',
      sr: 17,
      description: '15th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'pending',
    },
    {
      id: 's-18',
      sr: 18,
      description: '16th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'pending',
    },
    {
      id: 's-19',
      sr: 19,
      description: '17th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'pending',
    },
    {
      id: 's-20',
      sr: 20,
      description: '18th slab',
      percentage: 2.75,
      labourAmount: 990000,
      materialAmount: 660000,
      status: 'pending',
    },
    {
      id: 's-21',
      sr: 21,
      description: 'Under Ground Water Tank (U.G. Tank)',
      percentage: 4.0,
      labourAmount: 1440000,
      materialAmount: 960000,
      status: 'completed_billed',
      billedInvoiceNumber: 'RN 02',
    },
    {
      id: 's-22',
      sr: 22,
      description: 'Brick work 17th Floor (5 Podium + 8th & 9th floor done)',
      percentage: 9.0,
      completedPercentage: 3.0, // 3% of 9% completed
      labourAmount: 3240000,
      materialAmount: 2160000,
      status: 'completed_pending',
      notes: 'Submission of The Bill is Pending (3% completed: Rs. 10.8L Labour, Rs. 7.2L Material)',
    },
    {
      id: 's-23',
      sr: 23,
      description: 'Internal Plaster 17th Floor (5 podium + 8th floor done)',
      percentage: 10.0,
      completedPercentage: 3.5, // 3.5% of 10% completed
      labourAmount: 3600000,
      materialAmount: 2400000,
      status: 'completed_pending',
      notes: 'Submission of The Bill is Pending (3.5% completed: Rs. 12.6L Labour, Rs. 8.4L Material)',
    },
    {
      id: 's-24',
      sr: 24,
      description: 'External plaster 1st to Terrace',
      percentage: 11.0,
      labourAmount: 3960000,
      materialAmount: 2640000,
      status: 'pending',
    },
    {
      id: 's-25',
      sr: 25,
      description: 'O. H. Tanks & Lift Room',
      percentage: 2.0,
      labourAmount: 720000,
      materialAmount: 480000,
      status: 'pending',
    },
    {
      id: 's-26',
      sr: 26,
      description: 'Paving & Compound Wall',
      percentage: 1.0,
      labourAmount: 360000,
      materialAmount: 240000,
      status: 'pending',
    },
  ],
  createdAt: '2026-03-26T10:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = 'shiv_projects_ra';

export function getProjectsRA(): ProjectRAContract[] {
  if (typeof window === 'undefined') return [SEED_ROSHAN_NAGER_PROJECT];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveProjectRA(SEED_ROSHAN_NAGER_PROJECT);
      return [SEED_ROSHAN_NAGER_PROJECT];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveProjectRA(SEED_ROSHAN_NAGER_PROJECT);
      return [SEED_ROSHAN_NAGER_PROJECT];
    }
    return parsed;
  } catch {
    return [SEED_ROSHAN_NAGER_PROJECT];
  }
}

export function saveProjectRA(project: ProjectRAContract): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getProjectsRA();
    const idx = all.findIndex((p) => p.id === project.id);
    project.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      all[idx] = project;
    } else {
      all.unshift(project);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving project RA:', e);
  }
}

export function getProjectRAById(id: string): ProjectRAContract | null {
  const all = getProjectsRA();
  return all.find((p) => p.id === id) || null;
}

export function deleteProjectRA(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getProjectsRA().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error deleting project RA:', e);
  }
}

// ─── Native Multi-Sheet Excel Export (.xlsx) ─────────────────
export function exportProjectRAToExcel(
  contract: ProjectRAContract,
  companyProfile?: CompanyProfile | null
) {
  const calc = computeProjectRACalculations(contract);
  const company = companyProfile || getCompanyProfile();

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Mode of Payment (Schedule of Rates) ──────────────
  const sheet1Data: (string | number)[][] = [
    [company?.companyName || 'SHIV ENTERPRISES', '', '', '', ''],
    [company?.businessType || 'CIVIL CONTRACTORS', '', '', '', ''],
    [`Project: ${contract.projectName}`, '', '', `Date: ${contract.contractDate}`, ''],
    [`Builder: ${contract.builderName}`, '', '', `Billing Area: ${contract.billingAreaSqFt.toLocaleString('en-IN')} sq.ft.`, ''],
    [`Labour Rate: Rs. ${contract.labourRate}/sq.ft.`, '', '', `Material Rate: Rs. ${contract.materialRate}/sq.ft.`, ''],
    [`Total Rate: Rs. ${contract.labourRate + contract.materialRate}/sq.ft.`, '', '', `Total Contract Value: Rs. ${calc.totalTurnkeyContract.toLocaleString('en-IN')}`, ''],
    [],
    ['Sr.', 'Description of Item', 'Percentage', 'Labour Amount (Rs.)', 'Material Amount (Rs.)', 'Total Amount (Rs.)'],
  ];

  contract.stages.forEach((stage) => {
    sheet1Data.push([
      stage.sr,
      stage.description,
      `${stage.percentage}%`,
      stage.labourAmount,
      stage.materialAmount,
      stage.labourAmount + stage.materialAmount,
    ]);
  });

  // Total Row
  sheet1Data.push([
    'Total',
    'Total % and Amount',
    '100%',
    calc.totalLabourContract,
    calc.totalMaterialContract,
    calc.totalTurnkeyContract,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  // Auto-column widths
  ws1['!cols'] = [
    { wch: 6 },
    { wch: 45 },
    { wch: 15 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Mode of Payment (SOR)');

  // ── Sheet 2: Labour & Material RA Statement & RMC ─────────────
  const sheet2Data: (string | number)[][] = [
    [company?.companyName || 'SHIV ENTERPRISES', '', '', ''],
    [`${contract.projectName} - Running Account (RA) Statement`, '', '', `Date: ${contract.contractDate}`],
    [`Billing Area: ${contract.billingAreaSqFt.toLocaleString('en-IN')} sq.ft.`, '', `Labour Rate: Rs. ${contract.labourRate}`, `Material Rate: Rs. ${contract.materialRate}`],
    [`Contract Total: Rs. ${calc.totalTurnkeyContract.toLocaleString('en-IN')}`, '', `Total Labour: Rs. ${calc.totalLabourContract.toLocaleString('en-IN')}`, `Total Material: Rs. ${calc.totalMaterialContract.toLocaleString('en-IN')}`],
    [],
    ['WORK COMPLETED SUMMARY', '', '', '', ''],
    ['Sr.', 'Work Completed / Stage', 'Percentage %', 'Labour (A) (Rs.)', 'Material (B) (Rs.)', 'Status / Bill Ref'],
  ];

  contract.stages.forEach((stage) => {
    const isCompleted =
      stage.status === 'completed_billed' || stage.status === 'completed_pending';
    if (isCompleted) {
      const pct = stage.completedPercentage || stage.percentage;
      const labour = Math.round((calc.totalLabourContract * pct) / 100);
      const material = Math.round((calc.totalMaterialContract * pct) / 100);
      const statusLabel =
        stage.status === 'completed_billed'
          ? `Billed (${stage.billedInvoiceNumber || 'RN'})`
          : stage.notes || 'Submission of The Bill is Pending';

      sheet2Data.push([stage.sr, stage.description, `${pct}%`, labour, material, statusLabel]);
    }
  });

  sheet2Data.push([
    '',
    'Total Work Completed to Date',
    `${calc.totalCompletedPercentage}%`,
    calc.totalLabourCompletedEarned,
    calc.totalMaterialCompletedEarned,
    '',
  ]);

  sheet2Data.push([]);
  sheet2Data.push(['RUNNING RECONCILIATION & ACCOUNT DUE', '', '', '', '']);
  sheet2Data.push(['1@ Labour Account Due Calculation', '', '', '', '']);
  sheet2Data.push(['Total Labour Work Completed (59.75%)', '', '', calc.totalLabourCompletedEarned, '']);
  sheet2Data.push(['Less: Labour Bill Submitted up to RN 08', '', '', -calc.labourBilled, '']);
  sheet2Data.push(['1@ Labour Ac. Due Amount', '', '', calc.labourDueAmount, '']);

  sheet2Data.push([]);
  sheet2Data.push(['2@ Material Account Due Calculation', '', '', '', '']);
  sheet2Data.push(['Total Material Work Completed (59.75%)', '', '', calc.totalMaterialCompletedEarned, '']);
  sheet2Data.push(['Less: Material Submitted Bill', '', '', -calc.materialBilled, '']);
  sheet2Data.push(['Less: RMC Concrete Deductions', '', '', -calc.totalRmcDeductions, '']);
  sheet2Data.push(['Material Balance Subtotal', '', '', calc.materialBalanceBeforeAdj, '']);

  contract.materialAdjustments.forEach((adj) => {
    sheet2Data.push([
      `Add / Deduct: ${adj.title}`,
      '',
      '',
      adj.type === 'add' ? adj.amount : -adj.amount,
      adj.notes || '',
    ]);
  });

  sheet2Data.push(['2@ Total Material Ac. Due Amount', '', '', calc.materialDueAmount, '']);

  sheet2Data.push([]);
  sheet2Data.push(['NET OUTSTANDING SUMMARY', '', '', '', '']);
  sheet2Data.push(['1@ Labour Ac. Due', '', '', calc.labourDueAmount, '']);
  sheet2Data.push(['2@ Material Ac. Due', '', '', calc.materialDueAmount, '']);
  sheet2Data.push(['TOTAL DUE (Labour 1@ + Material 2@)', '', '', calc.grandTotalDue, '']);

  sheet2Data.push([]);
  sheet2Data.push(['RMC CONCRETE DEDUCTION BREAKDOWN', '', '', '', '']);
  sheet2Data.push(['Sr.', 'Concrete Grade', 'Quantity (cu.mtr)', 'Rate (Rs.)', 'Amount (Rs.)', 'Period']);

  contract.rmcDeductions.forEach((rmc, i) => {
    sheet2Data.push([
      i + 1,
      rmc.grade,
      rmc.quantityCuM,
      rmc.rate,
      rmc.amount,
      rmc.fromDate && rmc.toDate ? `${rmc.fromDate} to ${rmc.toDate}` : '',
    ]);
  });
  sheet2Data.push(['', 'Total Deduction of RMC', '', '', calc.totalRmcDeductions, '']);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 45 },
    { wch: 18 },
    { wch: 25 },
    { wch: 25 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'RA Statement & RMC');

  // Trigger download in browser
  const safeName = contract.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}_RA_Statement_${contract.contractDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
