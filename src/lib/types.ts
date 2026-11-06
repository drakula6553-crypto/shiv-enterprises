// ============================================================
// Core types for the Contractor Business App
// ============================================================

export interface CompanyProfile {
  companyName: string;
  businessType: string;         // e.g. "CIVIL CONTRACTORS"
  tagline: string;              // e.g. "Enduring Structure for Generations"
  address: string;
  phone: string;
  email: string;
  gstin: string;
  panNo: string;                // e.g. "ACQFS7564P"
  signatoryTitle: string;       // e.g. "PARTNER"
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
  termsAndConditions: string;
  logoUrl: string | null;       // base64 data URL
  signatureUrl: string | null;  // base64 data URL
}

export interface LineItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number; // quantity * rate
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  mode: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  reference: string;
  notes: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string; // display name e.g. "Harshmaan Spaces LLP"
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientGstin: string;
  projectName: string;
  billPrefix: string; // e.g. "RS"
  seriesPrefix?: string;
  defaultGstRate: number; // e.g. 18
  gstRate?: number;
  gstEnabled?: boolean;
  defaultParticulars?: string;
  defaultLineItems?: LineItem[];
  isDefault?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  // Client
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientGstin: string;
  projectName: string;
  // Items
  lineItems: LineItem[];
  // Calculations
  subtotal: number;
  gstEnabled: boolean;
  gstType: 'cgst_sgst' | 'igst';
  gstRate: number;           // total rate, e.g. 18
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountEnabled: boolean;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  discountAmount: number;
  roundOff: boolean;
  roundOffAmount: number;
  grandTotal: number;
  amountInWords: string;
  // Status & payments
  status: 'unpaid' | 'partial' | 'paid';
  payments: Payment[];
  totalReceived: number;
  balanceDue: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  trade: string;
  address: string;
  notes: string;
  bills: ContractorBill[];
  payments: ContractorPayment[];
  totalBilled: number;
  totalPaid: number;
  balance: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ContractorBill {
  id: string;
  date: string;
  project: string;
  description: string;
  amount: number;
}

export interface ContractorPayment {
  id: string;
  date: string;
  amount: number;
  mode: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  notes: string;
}

// ─── Shiv Enterprises Purchases & Site Expenses ─────────────

export type ExpenseCategory =
  | 'Materials'       // Cement, Sand, Steel, Aggregate, Bricks
  | 'Machinery/Tools' // JCB, Crane, Vibrator rental
  | 'Transport/Fuel'  // Diesel, Tempo, Tractor
  | 'Hardware/Pipes'  // Wire, Nails, PVC, Shuttering
  | 'Site Labour'     // Kharchi, daily wages, labour advance
  | 'Site Tea/Food'   // Snacks, drinking water
  | 'Office/Govt'     // Municipal fees, drawings printing
  | 'Other';

export interface Expense {
  id: string;
  date: string;
  paidTo: string;        // Supplier / Vendor / Person name
  category: ExpenseCategory;
  projectName: string;   // Project / Site reference
  description: string;   // Items bought / Work description
  billNumber?: string;   // Invoice / Voucher no.
  amount: number;        // Total amount (Rs.)
  paymentMode: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  status: 'paid' | 'pending';
  receiptUrl?: string | null; // Receipt photo base64
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Materials',
  'Machinery/Tools',
  'Transport/Fuel',
  'Hardware/Pipes',
  'Site Labour',
  'Site Tea/Food',
  'Office/Govt',
  'Other',
];

// Common unit options for line items
export const UNIT_OPTIONS = [
  'nos', 'sqft', 'rft', 'cft', 'kg', 'mt', 'bags',
  'trips', 'hrs', 'days', 'lot', 'ls', 'set', 'slab',
];

// GST rate options (total %)
export const GST_RATES = [5, 12, 18, 28];

// Payment mode labels
export const PAYMENT_MODES: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
};

// Trade options for contractors
export const TRADE_OPTIONS = [
  'Mason', 'Plumber', 'Electrician', 'Carpenter', 'Painter',
  'Welder', 'Tile Worker', 'Labour', 'Fabricator', 'RCC Worker',
  'Waterproofing', 'Glass Work', 'AC/HVAC', 'Transport', 'Other',
];
