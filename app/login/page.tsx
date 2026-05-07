"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Onjuiste e-mail of wachtwoord");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, background: "#1F3D2B", borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L3 10V21H9V15H15V21H21V10L12 3Z" fill="#E8C07D" />
              <circle cx="12" cy="13" r="1.4" fill="#1F3D2B" />
            </svg>
          </div>
          <h1 className="fd" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Inloggen bij Makelaars<em style={{ color: "#C8821A", fontStyle: "italic" }}>maatje</em>
          </h1>
        </div>

        <form onSubmit={handleLogin} style={{ background: "white", padding: 28, borderRadius: 16, border: "1px solid #E5DFD3" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#1F3D2B" }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 8,
                border: "1px solid #E5DFD3", fontSize: 14, outline: "none",
                fontFamily: "inherit"
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#1F3D2B" }}>
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 8,
                border: "1px solid #E5DFD3", fontSize: 14, outline: "none",
                fontFamily: "inherit"
              }}
            />
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", color: "#B91C1C", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", background: "#1F3D2B", color: "white",
              padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: "none", cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Bezig..." : "Inloggen →"}
          </button>
        </form>

        <p style={{ fontSize: 12, color: "#A3A3A3", textAlign: "center", marginTop: 16 }}>
          Account aanmaken? Vraag de admin van je kantoor om een uitnodiging.
        </p>
      </div>
    </main>
  );
}
