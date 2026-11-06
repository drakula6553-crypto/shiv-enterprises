-- ============================================================
-- SHIV ENTERPRISES - CIVIL CONTRACTORS DATABASE SCHEMA
-- PostgreSQL / Supabase Schema for Invoicing, Ledgers & Expenses
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANY PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.company_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'SHIV ENTERPRISES',
  business_type TEXT NOT NULL DEFAULT 'CIVIL CONTRACTORS',
  tagline TEXT DEFAULT 'Enduring Structure for Generations',
  address TEXT NOT NULL DEFAULT 'K-303, Guru Residency, Dharamdas Road, Borivali (W), Mumbai - 400 092.',
  phone TEXT NOT NULL DEFAULT '+91 98692 18032',
  email TEXT NOT NULL DEFAULT 'shiv3enterprises@gmail.com',
  gstin TEXT DEFAULT '27ACQFS7564P1ZW',
  pan_no TEXT DEFAULT 'ACQFS7564P',
  signatory_title TEXT DEFAULT 'PARTNER',
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  branch TEXT,
  upi_id TEXT,
  terms_and_conditions TEXT DEFAULT '1. Payment due within 15 days.\n2. Work certified as per sanctioned drawings.',
  logo_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INVOICE TEMPLATES / BUILDER PRESETS
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  client_gstin TEXT,
  project_name TEXT,
  bill_prefix TEXT DEFAULT 'RS',
  default_gst_rate NUMERIC DEFAULT 18,
  default_particulars TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  client_gstin TEXT,
  project_name TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_enabled BOOLEAN DEFAULT TRUE,
  gst_type TEXT DEFAULT 'cgst_sgst',
  gst_rate NUMERIC DEFAULT 18,
  cgst_amount NUMERIC(12, 2) DEFAULT 0,
  sgst_amount NUMERIC(12, 2) DEFAULT 0,
  igst_amount NUMERIC(12, 2) DEFAULT 0,
  discount_enabled BOOLEAN DEFAULT FALSE,
  discount_type TEXT DEFAULT 'amount',
  discount_value NUMERIC(12, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  round_off BOOLEAN DEFAULT TRUE,
  round_off_amount NUMERIC(12, 2) DEFAULT 0,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_in_words TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_received NUMERIC(12, 2) DEFAULT 0,
  balance_due NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONTRACTORS DIRECTORY & SUB-LEDGERS
CREATE TABLE IF NOT EXISTS public.contractors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  trade TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  bills JSONB NOT NULL DEFAULT '[]'::jsonb,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_billed NUMERIC(12, 2) DEFAULT 0,
  total_paid NUMERIC(12, 2) DEFAULT 0,
  balance NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PURCHASES & EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  paid_to TEXT NOT NULL,
  category TEXT NOT NULL,
  project_name TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  bill_number TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'upi',
  status TEXT NOT NULL DEFAULT 'paid',
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow public read & write with anon key (internal contractor business tool)
CREATE POLICY "Allow public access for company profile" ON public.company_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for templates" ON public.invoice_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for contractors" ON public.contractors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Auto updated_at Trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.company_profile;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.company_profile FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS set_timestamp ON public.invoices;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS set_timestamp ON public.contractors;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS set_timestamp ON public.expenses;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- SEED INITIAL DATA
INSERT INTO public.company_profile (
  company_name, business_type, tagline, address, phone, email, gstin, pan_no, signatory_title
) VALUES (
  'SHIV ENTERPRISES',
  'CIVIL CONTRACTORS',
  'Enduring Structure for Generations',
  'K-303, Guru Residency, Dharamdas Road, Borivali (W), Mumbai - 400 092.',
  '+91 98692 18032',
  'shiv3enterprises@gmail.com',
  '27ACQFS7564P1ZW',
  'ACQFS7564P',
  'PARTNER'
) ON CONFLICT DO NOTHING;

INSERT INTO public.invoice_templates (
  id, name, client_name, client_phone, client_address, client_gstin, project_name, bill_prefix, default_gst_rate, default_particulars, is_default
) VALUES (
  'tpl_harshmaan',
  'Harshmaan Spaces LLP (RS Series)',
  'Harshmaan spaces LLP',
  '98692 00000',
  '104,Rose residency Chs.Pvt.\nDixit road,\nVile Parle East,\nMumbai- 500057.',
  '27AAIFH6459C1ZA',
  'Harshail Iris Roshan Nager Borivali West.',
  'RS',
  18,
  '10th and 11th Rcc slab work completed as per Drawing.',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  client_name = EXCLUDED.client_name,
  project_name = EXCLUDED.project_name;
