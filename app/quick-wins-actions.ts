"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Demo helper: simuleer een nieuwe Funda-lead
// Wordt gebruikt op het dashboard tijdens pitches
export async function simulateLead() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Geen organisatie" };

  // Pak een willekeurige property uit de organisatie
  const { data: properties } = await supabase
    .from("properties")
    .select("id, address")
    .eq("organization_id", profile.organization_id)
    .eq("status", "active")
    .limit(10);

  const property = properties?.[Math.floor(Math.random() * (properties?.length || 1))];

  // Random demo namen
  const demoLeads = [
    { name: "Tessa van der Berg", email: "tessa.vdberg@gmail.com", phone: "+31611223344", message: "Goedemorgen, ik zag uw woning op Funda en zou graag een bezichtiging plannen.", budget: "€800k tot €900k", financing: "Pre-approval aanwezig", timeline: "Binnen 2 maanden", score: 89, priority: "hot" as const },
    { name: "Mehmet Yilmaz", email: "m.yilmaz@outlook.com", phone: "+31655667788", message: "Ik en mijn vrouw zoeken al maanden, deze ziet er perfect uit. Wanneer kunnen we langskomen?", budget: "€700k tot €800k", financing: "Pre-approval aanwezig", timeline: "Direct", score: 93, priority: "hot" as const },
    { name: "Caroline Janssen", email: "c.janssen@email.nl", phone: "+31633445566", message: "Mooie locatie, hebben jullie nog meer foto's beschikbaar?", budget: "€600k tot €700k", financing: "In aanvraag", timeline: "3 tot 6 maanden", score: 65, priority: "warm" as const },
    { name: "Erik Bosma", email: "ebosma@gmail.com", phone: "+31677889900", message: "Cash-koper, wil graag morgen al langskomen.", budget: "€1M tot €1.2M", financing: "Contant", timeline: "Direct", score: 96, priority: "hot" as const },
    { name: "Sara El Hassan", email: "sara.elh@gmail.com", phone: "+31644556677", message: "Hallo, is de woning nog beschikbaar voor bezichtiging?", budget: "€650k tot €750k", financing: "Pre-approval aanwezig", timeline: "Binnen 3 maanden", score: 82, priority: "warm" as const },
  ];

  const random = demoLeads[Math.floor(Math.random() * demoLeads.length)];

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: profile.organization_id,
      property_id: property?.id || null,
      assigned_to: user.id,
      name: random.name,
      email: random.email,
      phone: random.phone,
      message: random.message,
      status: "new",
      priority: random.priority,
      score: random.score,
      qual_budget: random.budget,
      qual_financing: random.financing,
      qual_timeline: random.timeline,
      source: "funda",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, lead };
}
