import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Haal profiel op
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <main style={{ padding: 40, textAlign: "center", maxWidth: 560, margin: "60px auto" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Account nog niet ingericht</h1>
        <p style={{ color: "#525252", marginBottom: 24 }}>
          Je account bestaat, maar is nog niet gekoppeld aan een kantoor.
          Vraag de admin om je toe te voegen, of voer de seed-data SQL uit in Supabase.
        </p>
        <p style={{ fontSize: 13, color: "#A3A3A3" }}>
          Ingelogd als: {user.email}
        </p>
      </main>
    );
  }

  // Haal team op
  const { data: team } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true });

  // Haal leads op met property en assigned profile
  const { data: leads } = await supabase
    .from("leads")
    .select("*, property:properties(*), assigned_profile:profiles!leads_assigned_to_fkey(*), notes:lead_notes(*)")
    .eq("organization_id", profile.organization_id)
    .order("received_at", { ascending: false });

  return (
    <DashboardClient
      currentUser={profile}
      team={team || []}
      initialLeads={leads || []}
    />
  );
}
