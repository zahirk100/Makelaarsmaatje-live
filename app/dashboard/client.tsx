"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut, simulateLead } from "../actions";
import type { Profile, Lead, LeadNote } from "@/types";
import { formatPrice, formatRelativeTime } from "@/lib/utils";

interface Props {
  currentUser: Profile & { organization: { name: string } };
  team: Profile[];
  initialLeads: Lead[];
}

export function DashboardClient({ currentUser, team, initialLeads }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [view, setView] = useState<"dash" | "lead">("dash");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showReassign, setShowReassign] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isMobile, setIsMobile] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `organization_id=eq.${currentUser.organization_id}` },
        () => {
          router.refresh();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, currentUser.organization_id, router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const selectedLead = leads.find((l) => l.id === selectedId) || null;

  function getMember(id: string | null): Profile | null {
    if (!id) return null;
    return team.find((t) => t.id === id) || null;
  }

  function navigate(v: "dash" | "lead") {
    setView(v);
    setSelectedId(null);
    setShowReassign(false);
    setShowNote(false);
    window.scrollTo(0, 0);
  }

  function openLead(id: string) {
    setSelectedId(id);
    setView("lead");
    window.scrollTo(0, 0);
  }

  async function sendLink(leadId: string, channel: string) {
    setBusy(true);
    const { error } = await supabase
      .from("leads")
      .update({ status: "contacted", contacted_at: new Date().toISOString() })
      .eq("id", leadId);

    if (!error) {
      // Log message
      await supabase.from("messages").insert({
        lead_id: leadId,
        channel: channel.toLowerCase(),
        direction: "outbound",
        content: "Boekingslink verstuurd",
        is_ai_generated: true,
      });
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: "contacted" as const } : l)));
      setSelectedId(null);
      setView("dash");
      showToast(`Boekingslink verstuurd via ${channel}`);
    } else {
      showToast("Er ging iets mis. Probeer opnieuw.");
    }
    setBusy(false);
  }

  async function reassign(memberId: string) {
    if (!selectedLead) return;
    setBusy(true);
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: memberId })
      .eq("id", selectedLead.id);

    if (!error) {
      setLeads(leads.map((l) =>
        l.id === selectedLead.id
          ? { ...l, assigned_to: memberId, assigned_profile: getMember(memberId) || undefined }
          : l
      ));
      setShowReassign(false);
      showToast(`Overgedragen aan ${getMember(memberId)?.full_name}`);
    } else {
      showToast("Overdragen mislukt");
    }
    setBusy(false);
  }

  async function saveNote() {
    if (!selectedLead || !noteText.trim()) return;
    setBusy(true);

    const { data, error } = await supabase
      .from("lead_notes")
      .insert({
        lead_id: selectedLead.id,
        author_id: currentUser.id,
        author_name: currentUser.full_name,
        text: noteText.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setLeads(leads.map((l) =>
        l.id === selectedLead.id
          ? { ...l, notes: [...(l.notes || []), data as LeadNote] }
          : l
      ));
      setNoteText("");
      setShowNote(false);
      showToast("Notitie toegevoegd");
    } else {
      showToast("Notitie opslaan mislukt");
    }
    setBusy(false);
  }

  async function delNote(noteId: string) {
    if (!selectedLead) return;
    const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
    if (!error) {
      setLeads(leads.map((l) =>
        l.id === selectedLead.id
          ? { ...l, notes: (l.notes || []).filter((n) => n.id !== noteId) }
          : l
      ));
    }
  }

  const filteredLeads = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      (l.property?.address || "").toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q);
    const matchFilter = filter === "all" || l.status === filter;
    return matchSearch && matchFilter;
  });

  function statusBadge(s: string) {
    if (s === "new") return <span className="badge" style={{ background: "#C8821A", color: "white" }}>NIEUW</span>;
    if (s === "contacted") return <span className="badge" style={{ background: "#FEF3C7", color: "#92400E" }}>VERSTUURD</span>;
    if (s === "booked") return <span className="badge" style={{ background: "#DCF2E3", color: "#15593B" }}>✓ GEBOEKT</span>;
    if (s === "disqualified") return <span className="badge" style={{ background: "#F3F4F6", color: "#6B6B6B" }}>GEFILTERD</span>;
    return null;
  }

  return (
    <>
      {toast && (
        <div className="toast-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8C07D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {toast}
        </div>
      )}

      <nav className="nav">
        <div className="nav-in">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L3 10V21H9V15H15V21H21V10L12 3Z" fill="#E8C07D" />
                <circle cx="12" cy="13" r="1.2" fill="#1F3D2B" />
              </svg>
            </div>
            <div>
              <div className="fd" style={{ fontSize: 19, fontWeight: 700 }}>
                Makelaars<span style={{ color: "#C8821A", fontStyle: "italic" }}>maatje</span>
              </div>
              <div style={{ fontSize: 11, color: "#737373", marginTop: -2 }}>
                {currentUser.organization.name}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#525252" }}>{currentUser.full_name}</span>
            <form action={signOut}>
              <button type="submit" style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, color: "#737373", background: "transparent" }}>
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="main">
        {view === "dash" && (
          <div className="fade">
            <div style={{ marginBottom: 24 }}>
              <div className="hero-tag">VANDAAG · {leads.filter(l => l.status === 'new').length} NIEUWE LEADS</div>
              <h1 className="fd" style={{ fontSize: isMobile ? 30 : 44, lineHeight: 1, fontWeight: 700, color: "#1F3D2B" }}>
                Goedemiddag,<br />
                <em style={{ fontWeight: 500 }}>{currentUser.full_name.split(" ")[0]}.</em>
              </h1>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 200, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { v: "all", l: "Alle" },
                  { v: "new", l: "Nieuw" },
                  { v: "contacted", l: "Verstuurd" },
                  { v: "booked", l: "Geboekt" },
                  { v: "disqualified", l: "Gefilterd" },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => setFilter(v)}
                    style={{
                      padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: filter === v ? "#1F3D2B" : "white",
                      color: filter === v ? "white" : "#525252",
                      border: "1px solid " + (filter === v ? "#1F3D2B" : "#E5DFD3"),
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                onClick={async () => {
                  setBusy(true);
                  const result = await simulateLead();
                  setBusy(false);
                  if (result.ok) {
                    showToast("Nieuwe Funda-lead binnengekomen");
                    router.refresh();
                  } else {
                    showToast("Simulatie mislukt: " + (result.error || "onbekende fout"));
                  }
                }}
                disabled={busy}
                className="btn btn-gold"
                style={{ flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {busy ? "Bezig..." : "Simuleer lead"}
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" className="input" placeholder="Zoek op naam, adres, e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 className="fd" style={{ fontSize: 22, fontWeight: 700, color: "#1F3D2B" }}>
                {search ? `${filteredLeads.length} resultaten` : "Inkomende leads"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#525252" }}>
                <div className="dot" style={{ width: 8, height: 8, borderRadius: 999, background: "#15593B" }}></div>
                Live verbonden
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Geen leads gevonden</div>
              </div>
            ) : (
              filteredLeads.map((l) => {
                const a = getMember(l.assigned_to);
                const pc = l.priority === "hot" ? "#C8821A" : l.priority === "cold" ? "#9CA3AF" : "#1F3D2B";
                const sbc = l.score >= 80 ? "#15593B" : l.score >= 50 ? "#E8C07D" : "#9CA3AF";
                const sc = l.score >= 80 ? "#15593B" : l.score >= 50 ? "#8B5A2B" : "#6B6B6B";
                const initials = l.name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
                const noteCount = l.notes?.length || 0;

                return (
                  <div key={l.id} className="lead-row" onClick={() => openLead(l.id)}>
                    <div style={{ position: "relative" }}>
                      <div className="avatar" style={{ width: 44, height: 44, background: pc, fontSize: 14 }}>{initials}</div>
                      <div style={{
                        position: "absolute", bottom: -3, right: -3, width: 22, height: 22, borderRadius: 999,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                        background: "white", border: "2px solid " + sbc, color: sc,
                      }}>{l.score}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1F3D2B" }}>{l.name}</h3>
                        {statusBadge(l.status)}
                        {noteCount > 0 && (
                          <span className="badge" style={{ background: "#F5F1E9", color: "#8B5A2B", fontWeight: 500 }}>
                            📝 {noteCount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#525252", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {l.property?.address || "Geen woning gekoppeld"}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#1F3D2B", marginTop: 2 }}>
                        {formatPrice(l.property?.price_cents)}
                      </div>
                    </div>
                    {!isMobile && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: "#737373", marginBottom: 3 }}>
                          {formatRelativeTime(l.received_at)}
                        </div>
                        <div style={{ fontSize: 11, color: "#A3A3A3" }}>
                          {a ? a.full_name : "Niet toegewezen"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {view === "lead" && selectedLead && (() => {
          const l = selectedLead;
          const a = getMember(l.assigned_to);
          const sbc = l.score >= 80 ? "#15593B" : "#E8C07D";
          const sc = l.score >= 80 ? "#15593B" : "#8B5A2B";
          const initials = l.name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
          const fn = l.name.split(" ")[0];

          return (
            <div className="fade">
              <button onClick={() => navigate("dash")} style={{ marginBottom: 14, fontSize: 14, color: "#737373" }}>
                ← Terug naar leads
              </button>
              <div className="grid" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: 18 }}>
                <div>
                  <div className="card">
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <div style={{ position: "relative" }}>
                        <div className="avatar" style={{ width: 56, height: 56, background: "#C8821A", fontSize: 18 }}>{initials}</div>
                        <div style={{
                          position: "absolute", bottom: -3, right: -3, width: 28, height: 28, borderRadius: 999,
                          background: "white", border: "2px solid " + sbc, color: sc,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                        }}>{l.score}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 className="fd" style={{ fontSize: 19, fontWeight: 700, color: "#1F3D2B" }}>{l.name}</h2>
                        <div style={{ fontSize: 12, color: "#737373" }}>
                          Via {l.source}, {formatRelativeTime(l.received_at)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#404040", marginBottom: 14 }}>
                      {l.email && <a href={`mailto:${l.email}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>✉️ {l.email}</a>}
                      {l.phone && <a href={`tel:${l.phone}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>📞 {l.phone}</a>}
                    </div>

                    {l.property && (
                      <div style={{ borderTop: "1px solid #E5DFD3", paddingTop: 14, marginBottom: 14 }}>
                        <div className="section-hdr">GEÏNTERESSEERD IN</div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1F3D2B" }}>{l.property.address}</div>
                        <div style={{ fontSize: 13, color: "#525252", marginTop: 3 }}>{formatPrice(l.property.price_cents)}</div>
                      </div>
                    )}

                    <div style={{ borderTop: "1px solid #E5DFD3", paddingTop: 14 }}>
                      <div className="section-hdr">TOEGEWEZEN AAN</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {a ? (
                            <>
                              <div className="avatar" style={{ width: 26, height: 26, background: a.color, fontSize: 10 }}>{a.initials}</div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "#1F3D2B" }}>{a.full_name}</span>
                            </>
                          ) : <span style={{ fontSize: 13, color: "#737373" }}>Niet toegewezen</span>}
                        </div>
                        <button onClick={() => setShowReassign(!showReassign)} style={{ fontSize: 12, fontWeight: 500, color: "#C8821A" }}>
                          Overdragen
                        </button>
                      </div>
                      {showReassign && (
                        <div style={{ marginTop: 10, padding: 8, borderRadius: 8, border: "1px solid #E5DFD3", background: "#FAF6EE" }}>
                          {team.map((tm) => (
                            <button key={tm.id} onClick={() => reassign(tm.id)} disabled={busy}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: 7, borderRadius: 6, textAlign: "left" }}>
                              <div className="avatar" style={{ width: 22, height: 22, background: tm.color, fontSize: 9 }}>{tm.initials}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: "#1F3D2B" }}>{tm.full_name}</div>
                                <div style={{ fontSize: 10, color: "#737373" }}>{tm.role === "admin" ? "Admin" : "Makelaar"}</div>
                              </div>
                              {l.assigned_to === tm.id && <span style={{ color: "#15593B" }}>✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="section-hdr" style={{ marginBottom: 12 }}>✨ AUTO-KWALIFICATIE</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#737373" }}>Budget</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1F3D2B" }}>{l.qual_budget || "Niet opgegeven"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#737373" }}>Financiering</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1F3D2B" }}>{l.qual_financing || "Niet opgegeven"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#737373" }}>Tijdlijn</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1F3D2B" }}>{l.qual_timeline || "Niet opgegeven"}</div>
                      </div>
                      <div style={{ paddingTop: 10, borderTop: "1px solid #E5DFD3" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "#525252" }}>Score</span>
                          <span className="fd" style={{ fontSize: 17, fontWeight: 700, color: l.score >= 80 ? "#15593B" : "#E8C07D" }}>
                            {l.score}/100
                          </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, overflow: "hidden", marginTop: 6, background: "#F5F1E9" }}>
                          <div style={{ height: "100%", width: `${l.score}%`, background: l.score >= 80 ? "#15593B" : "#E8C07D" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div className="section-hdr">📝 NOTITIES</div>
                      {!showNote && (
                        <button onClick={() => setShowNote(true)} style={{ padding: "4px 8px", borderRadius: 6, color: "#C8821A", fontSize: 18, fontWeight: 700 }}>+</button>
                      )}
                    </div>
                    {showNote && (
                      <div style={{ marginBottom: 10 }}>
                        <textarea className="textarea" placeholder="Bijv. 'Gebeld, budget blijkt hoger'" rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button onClick={saveNote} disabled={busy}
                            style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "white", background: "#1F3D2B" }}>
                            {busy ? "..." : "Opslaan"}
                          </button>
                          <button onClick={() => { setShowNote(false); setNoteText(""); }}
                            style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "#737373" }}>
                            Annuleer
                          </button>
                        </div>
                      </div>
                    )}
                    {(l.notes || []).length > 0 ? (
                      (l.notes || []).map((nt) => (
                        <div key={nt.id} style={{ borderRadius: 8, padding: 10, border: "1px solid #E5DFD3", background: "#FAF6EE", marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#1F3D2B" }}>{nt.author_name}</div>
                            <button onClick={() => delNote(nt.id)} style={{ color: "#EF4444", fontSize: 12 }}>🗑</button>
                          </div>
                          <div style={{ fontSize: 12, color: "#404040", lineHeight: 1.5 }}>{nt.text}</div>
                          <div style={{ fontSize: 10, color: "#A3A3A3", marginTop: 3 }}>
                            {formatRelativeTime(nt.created_at)}
                          </div>
                        </div>
                      ))
                    ) : !showNote && (
                      <div style={{ fontSize: 12, color: "#A3A3A3", textAlign: "center", padding: 10 }}>Nog geen notities</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="card">
                    <div className="section-hdr" style={{ marginBottom: 14 }}>💬 BERICHT VAN KOPER</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      <div className="avatar" style={{ width: 34, height: 34, background: "#C8821A", fontSize: 13 }}>{initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1F3D2B" }}>{l.name}</span>
                          <span style={{ fontSize: 10, color: "#A3A3A3" }}>{formatRelativeTime(l.received_at)}</span>
                        </div>
                        <div className="chat">"{l.message || "Geen bericht"}"</div>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid #E5DFD3", paddingTop: 14, marginTop: 14 }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div className="avatar" style={{ width: 34, height: 34, background: "#1F3D2B", fontSize: 11 }}>{currentUser.initials || "SV"}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#1F3D2B" }}>{currentUser.full_name}</span>
                            <span className="badge" style={{ background: "#FFF4D6", color: "#C8821A", fontWeight: 700 }}>✨ AI CONCEPT</span>
                          </div>
                          <div className="chat-ai">
                            <p>Hallo {fn},</p>
                            <p>Leuk dat je interesse hebt in {l.property?.address || "deze woning"}. Ik kan me goed voorstellen dat je snel een bezichtiging wilt inplannen.</p>
                            <p>Via onderstaande link kun je zelf een moment kiezen dat jou schikt.</p>
                            <p style={{ fontWeight: 500, color: "#C8821A" }}>makelaarsmaatje.nl/boek/{l.id.slice(0, 8)}</p>
                            <p>Tot snel,</p>
                            <p>{currentUser.full_name.split(" ")[0]}</p>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <button onClick={() => sendLink(l.id, "WhatsApp")} disabled={busy} className="btn btn-whats">
                              💬 Via WhatsApp
                            </button>
                            <button onClick={() => sendLink(l.id, "e-mail")} disabled={busy} className="btn btn-out">
                              ✉️ Via e-mail
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </>
  );
}
