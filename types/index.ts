export type LeadStatus = "new" | "contacted" | "booked" | "visited" | "disqualified" | "closed";
export type LeadPriority = "hot" | "warm" | "cold";
export type UserRole = "admin" | "makelaar";

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string;
  initials: string;
  email: string;
  phone: string | null;
  role: UserRole;
  color: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Property {
  id: string;
  organization_id: string;
  address: string;
  city: string;
  postal_code: string | null;
  price_cents: number | null;
  size_m2: number | null;
  rooms: number | null;
  funda_url: string | null;
  description: string | null;
  seller_name: string | null;
  seller_email: string | null;
  seller_phone: string | null;
  status: "active" | "sold" | "withdrawn";
  created_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  property_id: string | null;
  assigned_to: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  score: number;
  qual_budget: string | null;
  qual_financing: string | null;
  qual_timeline: string | null;
  qualified_at: string | null;
  booking_time: string | null;
  booking_link: string | null;
  received_at: string;
  contacted_at: string | null;
  created_at: string;

  // Joined fields
  property?: Property;
  assigned_profile?: Profile;
  notes?: LeadNote[];
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string | null;
  author_name: string;
  text: string;
  created_at: string;
}
