"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  company_name: string;
  industry: string;
  url: string;

  position_statement: string;
  maturity: string;
  industry_positioning: string;
  tensions: string[];
  executive_implication: string;

  scores: { E: number; C: number; H: number; O: number };
  echo_factor: number;

  meta?: { pages_analyzed?: string[] };
};

export default function ResultPage() {
  const router = useRouter();
  const [r, setR] = useState<Result | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("echo_result");
    if (!raw) return;
    setR(JSON.parse(raw));
  }, []);

  async function downloadPdf() {
    if (!r) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "PDF konnte nicht erstellt werden.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ECHO-${r.company_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Fehler beim PDF-Download.");
    } finally {
      setDownloading(false);
    }
  }

  if (!r) {
    return (
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "44px 18px", fontFamily: "system-ui", color: "#111" }}>
        <h1 style={{ fontSize: 34, margin: 0, fontWeight: 780 }}>Kein Resultat</h1>
        <p style={{ marginTop: 10, opacity: 0.82, lineHeight: 1.6 }}>
          Starte die Analyse erneut.
        </p>
        <button onClick={() => router.push("/")} style={btn(false)}>
          Zur Startseite
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "44px 18px", fontFamily: "system-ui", color: "#111" }}>
      <h1 style={{ fontSize: 34, margin: 0, fontWeight: 780 }}>
        ECHO Snapshot für {r.company_name}
      </h1>
      <p style={{ marginTop: 10, opacity: 0.82, lineHeight: 1.6 }}>
        Branche: <b>{r.industry}</b> · Branchenposition: <b>{r.industry_positioning}</b> · Reifegrad: <b>{r.maturity}</b>
      </p>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={label}>Position</div>
        <div style={{ fontSize: 18, lineHeight: 1.55, fontWeight: 650 }}>{r.position_statement}</div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
        <Mini label="Erlebnis (E)" value={r.scores.E} />
        <Mini label="Charakter (C)" value={r.scores.C} />
        <Mini label="Homogenität (H)" value={r.scores.H} />
        <Mini label="Originalität (O)" value={r.scores.O} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ ...card, flex: "1 1 220px" }}>
          <div style={label}>ECHO-Faktor</div>
          <div style={{ fontSize: 34, fontWeight: 820 }}>{Math.round(r.echo_factor)}</div>
        </div>

        <div style={{ ...card, flex: "2 1 420px" }}>
          <div style={label}>Spannungsfelder</div>
          <ul style={{ margin: "8px 0 0 18px", padding: 0, lineHeight: 1.6, opacity: 0.92 }}>
            {r.tensions.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={label}>Executive-Implikation</div>
        <div style={{ lineHeight: 1.65, opacity: 0.92 }}>{r.executive_implication}</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button onClick={downloadPdf} disabled={downloading} style={btn(downloading)}>
          {downloading ? "PDF wird erstellt…" : "PDF herunterladen"}
        </button>
        <button
          onClick={() => router.push("/")}
          style={{
            ...btn(false),
            background: "transparent",
            color: "#111",
          }}
        >
          Neue Momentaufnahme
        </button>
      </div>

      {r.meta?.pages_analyzed?.length ? (
        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>
          Analysierte Seiten: {r.meta.pages_analyzed.join(" · ")}
        </div>
      ) : null}
    </main>
  );
}

function Mini({ label: t, value }: { label: string; value: number }) {
  return (
    <div style={card}>
      <div style={labelStyle}>{t}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 28, fontWeight: 820 }}>{Math.round(value)}</div>
        <div style={{ flex: 1, height: 10, background: "rgba(0,0,0,0.08)", borderRadius: 999 }}>
          <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: 10, background: "#111", borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 18,
  padding: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.72,
  marginBottom: 8,
};

const label: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  opacity: 0.6,
  marginBottom: 8,
};

function btn(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.06)" : "#111",
    color: disabled ? "rgba(0,0,0,0.35)" : "#fff",
    fontSize: 15,
    fontWeight: 750,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
