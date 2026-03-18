"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  company_name: string;
  industry: string;
  url: string;
  pages_analyzed: string[];
  position_statement: string;
  scores: {
    E: number;
    C: number;
    H: number;
    O: number;
  };
  echo_factor: number;
  maturity: string;
  industry_positioning: string;
  tensions: string[];
  executive_implication: string;
};

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("echo_result");
    if (raw) {
      setResult(JSON.parse(raw));
    }
  }, []);

  if (!result) {
    return (
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui, sans-serif" }}>
        <h1>Kein Resultat gefunden</h1>
        <button onClick={() => router.push("/")}>Zurück</button>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 1380,
        margin: "0 auto",
        padding: "24px 24px 32px",
        fontFamily: "system-ui, sans-serif",
        color: "#111",
      }}
    >
      <h1 style={{ fontSize: 64, lineHeight: 1.05, marginBottom: 12, fontWeight: 800 }}>
        ECHO Snapshot für {result.company_name}
      </h1>

      <p style={{ fontSize: 18, lineHeight: 1.5, marginBottom: 28 }}>
        Branche: <b>{result.industry}</b> · Branchenposition: <b>{result.industry_positioning}</b> · Reifegrad: <b>{result.maturity}</b>
      </p>

      <Section title="Position">
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.5 }}>
          {result.position_statement}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <ScoreCard
          title="Erlebnis (E)"
          value={result.scores.E}
          explanation="Erlebnis beschreibt, ob Identität in Kontaktmomenten spürbar, verständlich und orientierend wird."
        />
        <ScoreCard
          title="Charakter (C)"
          value={result.scores.C}
          explanation="Charakter zeigt, ob Haltung, Perspektive und Selbstverständnis klar erkennbar sind."
        />
        <ScoreCard
          title="Homogenität (H)"
          value={result.scores.H}
          explanation="Homogenität zeigt, ob diese Identität systemisch konsistent oder eher situativ und personenabhängig wirkt."
        />
        <ScoreCard
          title="Originalität (O)"
          value={result.scores.O}
          explanation="Originalität zeigt, ob Differenzierung strukturell sichtbar ist oder eher austauschbar bleibt."
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 18, marginBottom: 18 }}>
        <Section title="ECHO-Faktor">
          <div style={{ fontSize: 48, fontWeight: 800 }}>{result.echo_factor}</div>
        </Section>

        <Section title="Spannungsfelder">
          <ul style={{ margin: 0, paddingLeft: 28, fontSize: 18, lineHeight: 1.8 }}>
            {result.tensions.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Executive-Implikation">
        <div style={{ fontSize: 18, lineHeight: 1.7 }}>{result.executive_implication}</div>
      </Section>

      <div style={{ display: "flex", gap: 16, marginTop: 20, marginBottom: 20 }}>
        <button
          style={primaryButton}
          onClick={() => window.print()}
        >
          PDF herunterladen
        </button>

        <button
          style={secondaryButton}
          onClick={() => {
            sessionStorage.removeItem("echo_result");
            router.push("/");
          }}
        >
          Neue Momentaufnahme
        </button>
      </div>

      <div style={{ fontSize: 14, color: "#555" }}>
        Analysierte Seiten: {result.pages_analyzed.join(" · ")}
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 24,
        padding: 20,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontSize: 14,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#666",
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ScoreCard({
  title,
  value,
  explanation,
}: {
  title: string;
  value: number;
  explanation: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 24,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 18, color: "#555", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 42, fontWeight: 800 }}>{value}</div>
        <div
          style={{
            flex: 1,
            height: 14,
            background: "#e9e9e9",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${value}%`,
              height: "100%",
              background: "#111",
              borderRadius: 999,
            }}
          />
        </div>
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.6, color: "#444" }}>{explanation}</div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  padding: "16px 22px",
  borderRadius: 18,
  border: "none",
  background: "#111",
  color: "#fff",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "16px 22px",
  borderRadius: 18,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};
