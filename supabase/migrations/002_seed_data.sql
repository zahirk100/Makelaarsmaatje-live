-- ============================================================================
-- SEED DATA (FK-safe voor profiles.id -> auth.users.id)
-- ============================================================================
-- Dit script faalt NIET op profiles FK omdat we enkel profiles maken
-- voor auth.users die echt bestaan.
-- ============================================================================

-- 1) DEMO ORGANISATIE
insert into public.organizations (id, name, slug, email_signature, phone)
values (
  '00000000-0000-0000-0000-000000000001',
  'Vermeulen Vastgoed',
  'vermeulen-vastgoed',
  E'Sander Vermeulen\nEigenaar, Vermeulen Vastgoed\n06 - 12 34 56 78\nsander@vermeulenvastgoed.nl',
  '06-12345678'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  email_signature = excluded.email_signature,
  phone = excluded.phone;

-- 2) DEMO PROFILES (alleen als auth user bestaat)
do $$
declare
  org_id uuid := '00000000-0000-0000-0000-000000000001';

  -- demo emails (pas aan naar users die bestaan in auth.users)
  user_email_sander  text := 'zahir55399@gmail.com';
  user_email_lisa    text := 'lisa@vermeulenvastgoed.nl';
  user_email_pieter  text := 'pieter@vermeulenvastgoed.nl';
  user_email_nadia   text := 'nadia@vermeulenvastgoed.nl';

  -- ids die we ophalen uit auth.users
  uid_sander uuid;
  uid_lisa uuid;
  uid_pieter uuid;
  uid_nadia uuid;
begin
  -- sander
  select id into uid_sander from auth.users where email = user_email_sander;
  if uid_sander is null then
    raise exception 'auth user not found: %', user_email_sander;
  end if;

  insert into public.profiles (id, organization_id, full_name, initials, email, role, color)
  values (uid_sander, org_id, 'Sander Vermeulen', 'SV', user_email_sander, 'admin', '#1F3D2B')
  on conflict (id) do update
  set organization_id = excluded.organization_id,
      full_name = excluded.full_name,
      initials = excluded.initials,
      email = excluded.email,
      role = excluded.role,
      color = excluded.color;

  -- lisa
  select id into uid_lisa from auth.users where email = user_email_lisa;
  if uid_lisa is not null then
    insert into public.profiles (id, organization_id, full_name, initials, email, role, color)
    values (uid_lisa, org_id, 'Lisa Janssen', 'LJ', user_email_lisa, 'makelaar', '#1F3D2B')
    on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = excluded.full_name,
        initials = excluded.initials,
        email = excluded.email,
        role = excluded.role,
        color = excluded.color;
  end if;

  -- pieter
  select id into uid_pieter from auth.users where email = user_email_pieter;
  if uid_pieter is not null then
    insert into public.profiles (id, organization_id, full_name, initials, email, role, color)
    values (uid_pieter, org_id, 'Pieter de Vries', 'PV', user_email_pieter, 'makelaar', '#2F6B45')
    on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = excluded.full_name,
        initials = excluded.initials,
        email = excluded.email,
        role = excluded.role,
        color = excluded.color;
  end if;

  -- nadia
  select id into uid_nadia from auth.users where email = user_email_nadia;
  if uid_nadia is not null then
    insert into public.profiles (id, organization_id, full_name, initials, email, role, color)
    values (uid_nadia, org_id, 'Nadia El Amrani', 'NE', user_email_nadia, 'makelaar', '#8B5A2B')
    on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = excluded.full_name,
        initials = excluded.initials,
        email = excluded.email,
        role = excluded.role,
        color = excluded.color;
  end if;

end $$;

-- 3) PROPERTIES
insert into public.properties (id, organization_id, address, city, postal_code, price_cents, size_m2, rooms, seller_name, seller_email, status)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Prinsengracht 421', 'Amsterdam', '1016 HM',  87500000, 112, 4, 'Familie De Jong', 'dejong@email.nl', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Keizersgracht 118', 'Amsterdam', '1015 CW', 125000000, 145, 5, 'R.W. Janssens',    'janssens@email.nl', 'active'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Vondelstraat 88',   'Amsterdam', '1054 GP',  69500000,  95, 3, 'Mw. K. Bosman',   'bosman@email.nl', 'active'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Herengracht 502',   'Amsterdam', '1017 CB', 185000000, 200, 6, 'Heren De Wit',    'dewit@email.nl',  'active')
on conflict (id) do nothing;

-- 4) LEADS (assigned_to alleen als profile bestaat)
do $$
declare
  org_id uuid := '00000000-0000-0000-0000-000000000001';

  user_email_sander  text := 'zahir55399@gmail.com';
  user_email_lisa    text := 'lisa@vermeulenvastgoed.nl';
  user_email_pieter  text := 'pieter@vermeulenvastgoed.nl';
  user_email_nadia   text := 'nadia@vermeulenvastgoed.nl';

  uid_sander uuid;
  uid_lisa uuid;
  uid_pieter uuid;
  uid_nadia uuid;

  assigned_sophie uuid;
  assigned_mark uuid;
  assigned_aisha uuid;
  assigned_thomas uuid;
  assigned_jeroen uuid;
begin
  select id into uid_sander from auth.users where email = user_email_sander;
  if uid_sander is null then
    raise exception 'auth user not found: %', user_email_sander;
  end if;

  select id into uid_lisa from auth.users where email = user_email_lisa;
  select id into uid_pieter from auth.users where email = user_email_pieter;
  select id into uid_nadia from auth.users where email = user_email_nadia;

  -- mapping (indien uid_lisa etc null is, dan wordt assigned_to null voor die lead)
  assigned_sophie := uid_sander;
  assigned_mark := uid_lisa;
  assigned_aisha := uid_sander;
  assigned_thomas := uid_pieter;
  assigned_jeroen := uid_nadia;

  insert into public.leads (organization_id, property_id, assigned_to, name, email, phone, message, status, priority, score, qual_budget, qual_financing, qual_timeline, source)
  values
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', assigned_sophie,
     'Sophie van Dijk', 'sophie.vandijk@gmail.com', '+31612345678',
     'Goedemiddag, ik zag uw woning op Funda en ben erg enthousiast. Graag zou ik een bezichtiging willen inplannen.',
     'new', 'hot', 92,
     '€800k tot €950k', 'Pre-approval aanwezig', 'Binnen 3 maanden', 'funda'),

    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', assigned_mark,
     'Mark de Boer', 'm.deboer@outlook.com', '+31687654321',
     'Interesse in de woning. Zou graag meer info willen over de VvE bijdrage.',
     'contacted', 'warm', 74,
     '€1.1M tot €1.3M', 'In aanvraag', '3 tot 6 maanden', 'funda'),

    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', assigned_aisha,
     'Aisha Yilmaz', 'aisha.y@gmail.com', '+31611223344',
     'Hallo, ik ben geïnteresseerd in deze woning.',
     'booked', 'warm', 85,
     '€650k tot €750k', 'Pre-approval aanwezig', 'Binnen 3 maanden', 'funda'),

    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', assigned_thomas,
     'Thomas Bakker', 'tbakker@ziggo.nl', '+31699887766',
     'Graag bezichtiging zaterdag. Cash-koper, direct beschikbaar.',
     'booked', 'hot', 96,
     '€1.7M tot €2M', 'Contant, geen financiering', 'Direct', 'funda'),

    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', assigned_jeroen,
     'Jeroen Smit', 'j.smit@gmail.com', '+31644556677',
     'Gewoon even kijken uit nieuwsgierigheid.',
     'disqualified', 'cold', 18,
     'Niet opgegeven', 'Geen pre-approval', 'Oriënterend', 'funda');
end $$;