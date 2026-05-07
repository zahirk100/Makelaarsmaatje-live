-- ============================================================================
-- MAKELAARSMAATJE — Database Schema
-- ============================================================================
-- Voer dit bestand in zijn geheel uit in Supabase SQL Editor.
-- Maakt alle tabellen, indexes, en row-level security aan.
-- ============================================================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS (makelaarskantoren)
-- ============================================================================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  email_signature text,
  phone text,
  funda_webhook_secret text default uuid_generate_v4()::text,
  whatsapp_business_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- PROFILES (makelaars binnen een kantoor)
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  full_name text not null,
  initials text,
  email text not null,
  phone text,
  role text default 'makelaar' check (role in ('admin', 'makelaar')),
  color text default '#1F3D2B',
  avatar_url text,
  created_at timestamptz default now()
);

-- ============================================================================
-- PROPERTIES (woningen in portefeuille)
-- ============================================================================
create table properties (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  address text not null,
  city text not null,
  postal_code text,
  price_cents bigint,
  size_m2 integer,
  rooms integer,
  funda_url text,
  description text,
  seller_name text,
  seller_email text,
  seller_phone text,
  status text default 'active' check (status in ('active', 'sold', 'withdrawn')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- LEADS (kopers die interesse tonen)
-- ============================================================================
create table leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,

  -- Lead info
  name text not null,
  email text,
  phone text,
  message text,
  source text default 'funda',

  -- Status
  status text default 'new' check (status in ('new', 'contacted', 'booked', 'visited', 'disqualified', 'closed')),
  priority text default 'warm' check (priority in ('hot', 'warm', 'cold')),
  score integer default 50 check (score >= 0 and score <= 100),

  -- Qualification answers (3 vragen)
  qual_budget text,
  qual_financing text,
  qual_timeline text,
  qualified_at timestamptz,

  -- Booking
  booking_time timestamptz,
  booking_link text,

  -- Timestamps
  received_at timestamptz default now(),
  contacted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- LEAD_NOTES (notities per lead)
-- ============================================================================
create table lead_notes (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete set null,
  author_name text not null,
  text text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- AVAILABILITY (beschikbaarheid per makelaar)
-- ============================================================================
create table availability (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================================
-- MESSAGES (verzonden berichten log)
-- ============================================================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade not null,
  channel text not null check (channel in ('whatsapp', 'email', 'sms')),
  direction text not null check (direction in ('inbound', 'outbound')),
  content text not null,
  is_ai_generated boolean default false,
  sent_at timestamptz default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
create index idx_leads_org on leads(organization_id);
create index idx_leads_status on leads(organization_id, status);
create index idx_leads_assigned on leads(assigned_to);
create index idx_leads_received on leads(received_at desc);
create index idx_properties_org on properties(organization_id);
create index idx_notes_lead on lead_notes(lead_id);
create index idx_messages_lead on messages(lead_id);
create index idx_availability_profile on availability(profile_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table properties enable row level security;
alter table leads enable row level security;
alter table lead_notes enable row level security;
alter table availability enable row level security;
alter table messages enable row level security;

-- Helper function: get current user's organization
create or replace function get_user_organization_id()
returns uuid
language sql
security definer
stable
as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- ORGANIZATIONS: alleen je eigen kantoor zien
create policy "Users see own organization" on organizations
  for select using (id = get_user_organization_id());
create policy "Admins update own organization" on organizations
  for update using (
    id = get_user_organization_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- PROFILES: alleen mensen uit je eigen kantoor zien
create policy "Users see own organization profiles" on profiles
  for select using (organization_id = get_user_organization_id());
create policy "Users update own profile" on profiles
  for update using (id = auth.uid());

-- PROPERTIES, LEADS, LEAD_NOTES, AVAILABILITY, MESSAGES: scoped op organisatie
create policy "Org access properties" on properties
  for all using (organization_id = get_user_organization_id());
create policy "Org access leads" on leads
  for all using (organization_id = get_user_organization_id());
create policy "Org access notes" on lead_notes
  for all using (
    exists (select 1 from leads where leads.id = lead_notes.lead_id and leads.organization_id = get_user_organization_id())
  );
create policy "Org access availability" on availability
  for all using (
    exists (select 1 from profiles where profiles.id = availability.profile_id and profiles.organization_id = get_user_organization_id())
  );
create policy "Org access messages" on messages
  for all using (
    exists (select 1 from leads where leads.id = messages.lead_id and leads.organization_id = get_user_organization_id())
  );

-- ============================================================================
-- TRIGGER: auto-create profile bij signup (later in te vullen)
-- ============================================================================
-- We doen dit handmatig in seed data voor nu

-- ============================================================================
-- KLAAR
-- ============================================================================
-- Voer nu 002_seed_data.sql uit om demo-data toe te voegen.
