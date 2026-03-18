"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export default function Page() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [url, setUrl] = useState("");
  const [selfNote, setSelfNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis() {
    setError("");
    setLoading(true);

    try {
      const normalizedUrl = normalizeUrl(url);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          industry,
          url: normalizedUrl,
          selfNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Analyse fehlgeschlagen.");
      }

      sessionStorage.setItem("echo_result", JSON.stringify(data));
      router.push("/result");
    } catch (err: any) {
      setError(err?.message || "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  const disabled =
    !companyName.trim() || !industry.trim() || !url.trim() || loading;

  return (
    <main
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "system-ui, sans-serif",
        color: "#111",
      }}
    >
      <h1 style={{ fontSize: 56, lineHeight: 1.05, marginBottom: 16, fontWeight: 800 }}>
        ECHO Snapshot
      </h1>

      <p style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 860, marginBottom: 32 }}>
        Eine Dritteinschätzung, um Identität greifbar zu machen – als Momentaufnahme,
        die du später erneut durchführen kannst.
      </p>

      <div style={cardStyle}>
        <label style={labelStyle}>Firmenname</label>
        <input
          style={inputStyle}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="z. B. Mosaik & Partners"
        />
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>Branche</label>
        <input
          style={inputStyle}
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="z. B. Strategische Markenberatung"
        />
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>Website-URL</label>
        <input
          style={inputStyle}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="z. B. mosaik.partners"
        />
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>
          Optional: Kurznotiz (Absicht / Selbstverständnis in 1–2 Sätzen)
        </label>
        <textarea
          style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
          value={selfNote}
          onChange={(e) => setSelfNote(e.target.value)}
          placeholder="z. B. Wir stehen für tuned excellence: präzise, kundennah, ohne Buzzwords."
        />
      </div>

      <button
        onClick={runAnalysis}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "18px 24px",
          borderRadius: 18,
          border: "none",
          background: disabled ? "#999" : "#111",
          color: "#fff",
          fontSize: 22,
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          marginTop: 8,
        }}
      >
        {loading ? "Analyse läuft..." : "Analyse erstellen"}
      </button>

      {error ? (
        <div
          style={{
            marginTop: 20,
            border: "1px solid #e4b4b4",
            color: "#a61e1e",
            background: "#fff7f7",
            borderRadius: 18,
            padding: 18,
            fontSize: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      ) : null}
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 24,
  padding: 20,
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 18,
  marginBottom: 12,
  color: "#444",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 18,
  border: "1px solid #ddd",
  borderRadius: 18,
  padding: "16px 18px",
  outline: "none",
  fontFamily: "inherit",
};
