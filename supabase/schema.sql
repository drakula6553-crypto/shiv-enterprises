-- ============================================================
-- Supabase Database Schema for Shiv Enterprises Contractor App
-- ============================================================

-- 1. Company Profile Table
create table if not exists company_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company_name text not null default 'SHIV ENTERPRISES',
  business_type text default 'CIVIL CONTRACTORS',
  tagline text default 'Enduring Structure for Generations',
  address text,
  phone text,
  email text,
  gstin text,
  pan_no text,
  signatory_title text default 'PARTNER',
  bank_name text,
  account_number text,
  ifsc_code text,
  branch text,
  upi_id text,
  terms_and_conditions text,
  logo_url text,
  signature_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Invoices Table
create table if not exists invoices (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  invoice_number text not null,
  invoice_date date not null,
  due_date date,
  client_name text not null,
  client_phone text,
  client_address text,
  client_gstin text,
  project_name text,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  gst_enabled boolean default true,
  gst_type text default 'cgst_sgst',
  gst_rate numeric default 18,
  cgst_amount numeric default 0,
  sgst_amount numeric default 0,
  igst_amount numeric default 0,
  discount_enabled boolean default false,
  discount_type text default 'amount',
  discount_value numeric default 0,
  discount_amount numeric default 0,
  round_off boolean default true,
  round_off_amount numeric default 0,
  grand_total numeric default 0,
  amount_in_words text,
  status text default 'unpaid',
  payments jsonb default '[]'::jsonb,
  total_received numeric default 0,
  balance_due numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Contractors Table
create table if not exists contractors (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  trade text not null,
  address text,
  notes text,
  bills jsonb default '[]'::jsonb,
  payments jsonb default '[]'::jsonb,
  total_billed numeric default 0,
  total_paid numeric default 0,
  balance numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Row Level Security (RLS)
alter table company_profile enable row level security;
alter table invoices enable row level security;
alter table contractors enable row level security;

create policy "Users can view their own company profile"
  on company_profile for all
  using (auth.uid() = user_id);

create policy "Users can view their own invoices"
  on invoices for all
  using (auth.uid() = user_id);

create policy "Users can view their own contractors"
  on contractors for all
  using (auth.uid() = user_id);
