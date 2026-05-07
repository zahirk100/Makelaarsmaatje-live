import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Service role client (bypass RLS voor webhook)
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface FundaLeadPayload {
  organization_id?: string;
  organization_slug?: string;
  property_address?: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  // Verifieer secret
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: FundaLeadPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Vind organisatie
  let organizationId = payload.organization_id;
  if (!organizationId && payload.organization_slug) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", payload.organization_slug)
      .single();
    organizationId = org?.id;
  }

  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Probeer property te matchen op adres
  let propertyId: string | null = null;
  if (payload.property_address) {
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("address", `%${payload.property_address}%`)
      .single();
    propertyId = property?.id || null;
  }

  // Insert lead
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: organizationId,
      property_id: propertyId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      message: payload.message,
      status: "new",
      priority: "warm",
      score: 50,
      source: "funda",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead_id: lead.id });
}

export async function GET() {
  return NextResponse.json({
    info: "Makelaarsmaatje Funda webhook endpoint",
    method: "POST with Bearer token in Authorization header",
  });
}
