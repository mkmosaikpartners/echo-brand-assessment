"use client";

import { useEffect, useState } from "react";

type Result = {
  echo_factor: number;
  scores: { E: number; C: number; H: number; O: number };
  self_image_score: number;
  digital_effect_score: number;
  deviation: "small" | "medium" | "large";
  band: "below average" | "average" | "above average";
  commentary: string;
};

function Gauge({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 18, padding: 14 }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <div style={{ width: 140, height: 10, background: "rgba(0,0,0,0.08)", borderRadius: 999 }}>
          <div style={{ width: `${pct}%`, height: 10, background: "#111", borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 780 }}>{pct}</div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    const raw =
      sessionStorage.getItem("echo_result") ||
      localStorage.getItem("echo_result");

    if (raw) setR(JSON.parse(raw));
  }, []);

  if (!r) {
    return (
      <main style={{ maxWidth: 860, margin: "0 auto", padding: 24, fontFamily: "system-ui", color: "#111" }}>
        <h1 style={{ fontSize: 40, margin: 0, fontWeight: 780 }}>Kein Ergebnis gefunden</h1>
        <p style={{ marginTop: 12, opacity: 0.8, lineHeight: 1.6 }}>
          Geh zurück zur Startseite und starte den Test erneut.
        </p>
      </main>
    );
  }

  const bandDE =
    r.band === "below average" ? "unterdurchschnittlich" :
    r.band === "above average" ? "überdurchschnittlich" :
    "durchschnittlich";

  const devDE =
    r.deviation === "small" ? "klein" :
    r.deviation === "large" ? "gross" :
    "mittel";

  return (
    <main style={{ maxWidth: 940, margin: "0 auto", padding: "44px 18px", fontFamily: "system-ui", color: "#111" }}>
      <div style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 40, margin: 0, fontWeight: 780 }}>Dein Ergebnis</h1>

        <p style={{ marginTop: 10, opacity: 0.82, lineHeight: 1.6 }}>
          ECHO-Faktor: <b>{r.echo_factor}/100</b> · Einordnung: <b>{bandDE}</b>
        </p>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 18 }}>
          <Gauge label="Erlebnis (E)" value={r.scores.E} />
          <Gauge label="Charakter (C)" value={r.scores.C} />
          <Gauge label="Homogenität (H)" value={r.scores.H} />
          <Gauge label="Originalität (O)" value={r.scores.O} />
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr", marginTop: 16 }}>
          <div style={miniCard}>
            <div style={miniTitle}>Selbstbild</div>
            <div style={miniValue}>{r.self_image_score}</div>
          </div>

          <div style={miniCard}>
            <div style={miniTitle}>Digitale Wirkung</div>
            <div style={miniValue}>{r.digital_effect_score}</div>
          </div>

          <div style={miniCard}>
            <div style={miniTitle}>Abweichung</div>
            <div style={miniValue}>{devDE}</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>
              {r.deviation === "small"
                ? "Dein Selbstbild und der digitale Eindruck liegen nahe beieinander."
                : r.deviation === "medium"
                ? "Es gibt erkennbare Spannungen zwischen Selbstbild und digitaler Wirkung."
                : "Selbstbild und digitaler Eindruck unterscheiden sich deutlich – das ist ein Hinweis auf Übersetzungsfragen."}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, borderRadius: 18, border: "1px solid rgba(0,0,0,0.10)", padding: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6 }}>
            Kommentar
          </div>
          <div style={{ marginTop: 10, whiteSpace: "pre-line", fontSize: 16, lineHeight: 1.7, opacity: 0.92 }}>
            {r.commentary}
          </div>
        </div>
      </div>
    </main>
  );
}

const miniCard: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 18,
  padding: 14,
};

const miniTitle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.7,
};

const miniValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 780,
  marginTop: 6,
};
