import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, background: "#1F3D2B", borderRadius: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", boxShadow: "0 16px 36px rgba(31, 61, 43, 0.2)"
        }}>
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L3 10V21H9V15H15V21H21V10L12 3Z" fill="#E8C07D" />
            <circle cx="12" cy="13" r="1.4" fill="#1F3D2B" />
          </svg>
        </div>

        <h1 className="fd" style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 16 }}>
          Makelaars<em style={{ color: "#C8821A", fontStyle: "italic", fontWeight: 600 }}>maatje</em>
        </h1>
        <p style={{ fontSize: 18, color: "#525252", marginBottom: 32, lineHeight: 1.5 }}>
          De assistent die elke Funda-lead opvolgt voordat jij je telefoon checkt.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{
            background: "#1F3D2B", color: "white", padding: "14px 28px",
            borderRadius: 10, fontWeight: 600, fontSize: 15,
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8
          }}>
            Inloggen →
          </Link>
        </div>

        <p style={{ fontSize: 13, color: "#A3A3A3", marginTop: 32 }}>
          Voor makelaarskantoren · Pilot beschikbaar
        </p>
      </div>
    </main>
  );
}
