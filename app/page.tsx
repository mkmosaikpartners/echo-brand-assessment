"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [url, setUrl] = useState("");
  const [selfNote, setSelfNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, industry, url, selfNote }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Analyse fehlgeschlagen.");
      }

      sessionStorage.setItem("echo_result", JSON.stringify(data));
      router.push("/result");
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "44px 18px", fontFamily: "system-ui", color: "#111" }}>
      <h1 style={{ fontSize: 38, margin: 0, fontWeight: 780 }}>ECHO Snapshot</h1>
      <p style={{ marginTop: 10, opacity: 0.82, lineHeight: 1.6, maxWidth: 720 }}>
        Eine Dritteinschätzung, um Identität greifbar zu machen – als Momentaufnahme, die du später erneut durchführen kannst.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 20, maxWidth: 640 }}>
        <Field label="Firmenname" value={companyName} onChange={setCompanyName} placeholder="z.B. isolutions" />
        <Field label="Branche" value={industry} onChange={setIndustry} placeholder="z.B. IT-Dienstleister / Beratung" />
        <Field label="Website-URL" value={url} onChange={setUrl} placeholder="https://…" />

        <div style={card}>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
            Optional: Kurznotiz (Absicht / Selbstverständnis in 1–2 Sätzen)
          </div>
          <textarea
            value={selfNote}
            onChange={(e) => setSelfNote(e.target.value)}
            rows={3}
            style={textarea}
            placeholder="z.B. Wir stehen für tuned excellence: präzise, kundennah, ohne Buzzwords."
          />
        </div>

        <button
          onClick={run}
          disabled={loading || !companyName.trim() || !industry.trim() || !url.trim()}
          style={btn(loading || !companyName.trim() || !industry.trim() || !url.trim())}
        >
          {loading ? "Analyse läuft…" : "Analyse erstellen"}
        </button>

        {error ? (
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: 12, color: "#B00020" }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ marginTop: 8, opacity: 0.8, lineHeight: 1.6 }}>
            Wir lesen relevante Seiten aus und verdichten die Dritteinschätzung entlang ECHO.
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={card}>
      <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        style={input}
      />
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 18,
  padding: 14,
};

const input: React.CSSProperties = {
  width: "100%",
  fontSize: 16,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.14)",
  outline: "none",
};

const textarea: React.CSSProperties = {
  width: "100%",
  fontSize: 15,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.14)",
  outline: "none",
  resize: "vertical",
};

function btn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.06)" : "#111",
    color: disabled ? "rgba(0,0,0,0.35)" : "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
