"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type QA = { questionId: string; markers: string[]; note?: string };

const INTENT_OPTIONS: Array<[string, string]> = [
  ["clarity", "Klarheit & Orientierung"],
  ["reliability", "Verlässlichkeit & Ruhe"],
  ["competence", "Kompetenz & Anspruch"],
  ["dialogue", "Nähe & Dialog"],
  ["efficiency", "Effizienz & Tempo"],
  ["stance", "Eigenständigkeit & Haltung"],
  ["human", "Menschlichkeit & Fürsorge"],
  ["precision", "Präzision & Sorgfalt"],
];

const QUESTIONS: Array<{
  id: string;
  title: string;
  prompt: string;
  options: { id: string; label: string }[];
  noteHint: string;
}> = [
  // Kunde
  {
    id: "K1",
    title: "Kunde · Eindruck",
    prompt:
      "Stell dir eine Person vor, die mit dir in einer Kundenbeziehung steht. Sie erlebt deinen Auftritt vor allem als …",
    options: [
      { id: "ClearOrdered", label: "klar & geordnet" },
      { id: "CalmSovereign", label: "ruhig & souverän" },
      { id: "Functional", label: "sachlich & funktional" },
      { id: "PersonalClose", label: "persönlich & nah" },
      { id: "NeedsExplanation", label: "erklärungsbedürftig" },
      { id: "HardToGrasp", label: "schwer greifbar" },
    ],
    noteHint: "Optional: Woran machst du das fest?",
  },
  {
    id: "K2",
    title: "Kunde · Haltung",
    prompt: "Im Umgang mit Kunden wird vor allem folgende Haltung spürbar …",
    options: [
      { id: "CareResponsible", label: "sorgfältig & verantwortungsvoll" },
      { id: "PragmaticSolution", label: "pragmatisch & lösungsorientiert" },
      { id: "Partnership", label: "partnerschaftlich" },
      { id: "DemandingHighBar", label: "anspruchsvoll & fordernd" },
      { id: "Distant", label: "distanziert" },
      { id: "Inconsistent", label: "uneinheitlich" },
    ],
    noteHint: "Optional: Woran zeigt sich das?",
  },
  {
    id: "K3",
    title: "Kunde · Konsistenz",
    prompt: "Über verschiedene Kontaktmomente hinweg wirkt diese Wahrnehmung …",
    options: [
      { id: "VeryConsistent", label: "sehr konsistent" },
      { id: "MostlyConsistent", label: "meist konsistent" },
      { id: "ContextDependent", label: "situationsabhängig" },
      { id: "Contradictory", label: "eher widersprüchlich" },
    ],
    noteHint: "Optional: Wo ist es deutlich – wo bricht es?",
  },

  // Bewerber
  {
    id: "B1",
    title: "Bewerber · Eindruck",
    prompt:
      "Stell dir eine Person vor, die eine Stelle bei dir prüft – ohne dich persönlich zu kennen. Sie erlebt dich auf der Jobs/Arbeitgeberseite vor allem als …",
    options: [
      { id: "Inviting", label: "klar & einladend" },
      { id: "FocusedHighBar", label: "anspruchsvoll & fokussiert" },
      { id: "Human", label: "nahbar & menschlich" },
      { id: "FormalDistant", label: "formal & distanziert" },
      { id: "Generic", label: "austauschbar" },
      { id: "HardToPlace", label: "schwer einzuordnen" },
    ],
    noteHint: "Optional: Woran würde man das merken?",
  },
  {
    id: "B2",
    title: "Bewerber · Kulturwirkung",
    prompt: "Welche Kulturwirkung wird spürbar – ohne dass sie explizit erklärt wird?",
    options: [
      { id: "TrustResponsibility", label: "Verantwortung & Vertrauen" },
      { id: "PerformanceDemand", label: "Leistung & Anspruch" },
      { id: "CollaborationClose", label: "Zusammenarbeit & Nähe" },
      { id: "OrderControl", label: "Ordnung & Kontrolle" },
      { id: "FreedomCreate", label: "Freiheit & Gestaltung" },
      { id: "UnclearContradictory", label: "unklar / widersprüchlich" },
    ],
    noteHint: "Optional: Woran machst du das fest?",
  },
  {
    id: "B3",
    title: "Bewerber · Passung",
    prompt: "Im Verhältnis zu deiner Absicht wirkt dieser Arbeitgeberauftritt …",
    options: [
      { id: "VeryAligned", label: "sehr stimmig" },
      { id: "MostlyAligned", label: "überwiegend stimmig" },
      { id: "Tension", label: "spannungsvoll" },
      { id: "Unclear", label: "unklar" },
    ],
    noteHint: "Optional: Worin liegt die Spannung?",
  },

  // Branchenkenner
  {
    id: "R1",
    title: "Branchenkenner · Einordnung",
    prompt:
      "Stell dir jemanden vor, der deine Branche gut kennt. Er würde deinen Auftritt vermutlich so einordnen …",
    options: [
      { id: "ClearlyPositioned", label: "klar positioniert" },
      { id: "SolidExpected", label: "solide, aber erwartbar" },
      { id: "AmbitiousNotSharp", label: "ambitioniert, aber noch nicht scharf" },
      { id: "Distinct", label: "eigenständig" },
      { id: "HardToPlace2", label: "schwer einzuordnen" },
      { id: "Contradictory2", label: "widersprüchlich" },
    ],
    noteHint: "Optional: Woran würde er das festmachen?",
  },
  {
    id: "R2",
    title: "Branchenkenner · Vergleich",
    prompt: "Im Vergleich zu relevanten Mitbewerbern wirkt dein Auftritt …",
    options: [
      { id: "HighlyDistinct", label: "deutlich eigenständig" },
      { id: "PartlyDistinct", label: "in Teilen eigenständig" },
      { id: "IndustryTypical", label: "eher branchenüblich" },
      { id: "BarelyDistinct", label: "kaum unterscheidbar" },
    ],
    noteHint: "Optional: Wodurch unterscheidet es sich (oder nicht)?",
  },
  {
    id: "R3",
    title: "Branchenkenner · Entstehung",
    prompt: "Diese Wirkung entsteht bei dir eher durch …",
    options: [
      { id: "ConsciousDecisions", label: "bewusste Entscheidungen" },
      { id: "GrownPractice", label: "gewachsene Praxis" },
      { id: "SingleInitiatives", label: "Einzelinitiativen" },
      { id: "ChanceHistory", label: "Zufall / Historie" },
    ],
    noteHint: "Optional: Welche Entscheidung prägt das am stärksten?",
  },
];

function clampText(s: string, n: number) {
  return (s ?? "").slice(0, n);
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 18,
        padding: 16,
        background: "white",
      }}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  kind,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  kind?: "primary" | "ghost";
}) {
  const primary = kind !== "ghost";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        border: primary ? "1px solid #111" : "1px solid rgba(0,0,0,0.12)",
        background: primary ? "#111" : "white",
        color: primary ? "white" : "#111",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontWeight: 650,
      }}
    >
      {children}
    </button>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 12,
        border: selected ? "1px solid #111" : "1px solid rgba(0,0,0,0.18)",
        background: selected ? "#111" : "white",
        color: selected ? "white" : "#111",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

export default function Page() {
  const router = useRouter();
  const totalSteps = 6;
  const [step, setStep] = useState(1);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("11-50");
  const [role, setRole] = useState("CEO");

  const [intentPicks, setIntentPicks] = useState<string[]>([]);
  const [intentNote, setIntentNote] = useState("");

  const [answers, setAnswers] = useState<Record<string, QA>>(() =>
    Object.fromEntries(
      QUESTIONS.map((q) => [q.id, { questionId: q.id, markers: [], note: "" }])
    )
  );

  const [companyUrl, setCompanyUrl] = useState("");
  const [compUrls, setCompUrls] = useState(["", "", ""]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === 1) return companyName.trim().length > 0 && industry.trim().length > 0;
    if (step === 2) return intentPicks.length >= 1 && intentPicks.length <= 2;
    if (step >= 3 && step <= 5) {
      const idx = (step - 3) * 3;
      const subset = QUESTIONS.slice(idx, idx + 3);
      return subset.every((q) => (answers[q.id]?.markers?.length ?? 0) >= 1);
    }
    if (step === 6) return companyUrl.trim().length > 0 && compUrls.every((u) => u.trim().length > 0);
    return true;
  }, [step, companyName, industry, intentPicks, answers, companyUrl, compUrls]);

  function toggleIntent(id: string) {
    setIntentPicks((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      return next.slice(0, 2);
    });
  }

  function toggleMarker(qid: string, mid: string) {
    setAnswers((prev) => {
      const cur = prev[qid];
      const arr = cur.markers ?? [];
      const has = arr.includes(mid);
      let next = has ? arr.filter((x) => x !== mid) : [...arr, mid];
      if (next.length > 2) next = next.slice(next.length - 2);
      return { ...prev, [qid]: { ...cur, markers: next } };
    });
  }

  async function submit() {
    setLoading(true);
    setErr(null);

    try {
      const payload = {
        companyName,
        industry,
        size,
        role,
        intent: { picks: intentPicks, note: intentNote },
        selfAssessment: QUESTIONS.map((q) => ({
          questionId: q.id,
          markers: answers[q.id].markers,
          note: answers[q.id].note ?? "",
        })),
        urls: { company: companyUrl, competitors: compUrls },
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyse fehlgeschlagen");

      sessionStorage.setItem("echo_result", JSON.stringify(data));
      localStorage.setItem("echo_result", JSON.stringify(data));

      router.push("/result");
    } catch (e: any) {
      setErr(e?.message ?? "Fehler");
    } finally {
      setLoading(false);
    }
  }

  const pct = Math.round((step / totalSteps) * 100);

  return (
    <main
      style={{
        maxWidth: 940,
        margin: "0 auto",
        padding: "44px 18px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
        color: "#111",
      }}
    >
      <div style={{ maxWidth: 760 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.7 }}>
          <span>{`Schritt ${step} von ${totalSteps}`}</span>
          <span>{pct}%</span>
        </div>
        <div style={{ marginTop: 8, height: 8, background: "rgba(0,0,0,0.08)", borderRadius: 999 }}>
          <div style={{ width: `${pct}%`, height: 8, background: "#111", borderRadius: 999 }} />
        </div>

        <div style={{ height: 22 }} />

        {step === 1 && (
          <>
            <h1 style={{ fontSize: 42, lineHeight: 1.08, margin: "0 0 10px 0", fontWeight: 780 }}>
              Wie wirkt deine Marke – gemessen an Wahrnehmung, nicht an Absicht?
            </h1>
            <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.6 }}>
              6–8 Minuten. Keine Vorbereitung. Kein Urteil – du erhältst Orientierung.
            </p>

            <div style={{ height: 16 }} />

            <Card>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, opacity: 0.75 }}>Unternehmensname</span>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={inputStyle}
                    placeholder="z. B. isolutions AG"
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, opacity: 0.75 }}>Branche / Segment</span>
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    style={inputStyle}
                    placeholder="z. B. IT-Dienstleistungen"
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13, opacity: 0.75 }}>Grösse</span>
                    <select value={size} onChange={(e) => setSize(e.target.value)} style={inputStyle}>
                      {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13, opacity: 0.75 }}>Rolle (GL)</span>
                    <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                      {["CEO", "COO", "CFO", "HR", "Sales", "Marketing", "Other"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </Card>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize: 34, margin: "0 0 10px 0", fontWeight: 780 }}>
              Was soll man idealerweise erleben?
            </h2>
            <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.6 }}>
              Wähle ein bis zwei Aspekte, die am besten ausdrücken, wie deine Organisation wirken soll.
              <br />
              <span style={{ opacity: 0.7 }}>Maximal zwei auswählen.</span>
            </p>

            <div style={{ height: 14 }} />

            <Card>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {INTENT_OPTIONS.map(([id, label]) => (
                  <Chip
                    key={id}
                    label={label}
                    selected={intentPicks.includes(id)}
                    onClick={() => toggleIntent(id)}
                  />
                ))}
              </div>

              <div style={{ height: 14 }} />

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, opacity: 0.75 }}>Optional (1 Satz)</span>
                <input
                  value={intentNote}
                  onChange={(e) => setIntentNote(clampText(e.target.value, 140))}
                  style={inputStyle}
                  placeholder="Woran würde man das erkennen?"
                />
              </label>
            </Card>
          </>
        )}

        {step >= 3 && step <= 5 && (
          <>
            <h2 style={{ fontSize: 34, margin: "0 0 10px 0", fontWeight: 780 }}>
              {step === 3 ? "Perspektive: Kunde" : step === 4 ? "Perspektive: Bewerber" : "Perspektive: Branchenkenner"}
            </h2>
            <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.6 }}>
              Wähle pro Frage 1–2 Marker. Wenn du willst, begründe kurz (optional).
            </p>

            <div style={{ height: 14 }} />

            <div style={{ display: "grid", gap: 14 }}>
              {QUESTIONS.slice((step - 3) * 3, (step - 3) * 3 + 3).map((q) => {
                const a = answers[q.id];
                return (
                  <Card key={q.id}>
                    <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6 }}>
                      {q.title}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 750, marginTop: 8 }}>{q.prompt}</div>

                    <div style={{ height: 12 }} />

                    <div style={{ display: "grid", gap: 8 }}>
                      {q.options.map((o) => (
                        <Chip
                          key={o.id}
                          label={o.label}
                          selected={a.markers.includes(o.id)}
                          onClick={() => toggleMarker(q.id, o.id)}
                        />
                      ))}
                    </div>

                    <div style={{ height: 12 }} />

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13, opacity: 0.75 }}>Optional (max. 1–2 Sätze)</span>
                      <textarea
                        value={a.note ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], note: clampText(e.target.value, 180) },
                          }))
                        }
                        style={{ ...inputStyle, minHeight: 64 }}
                        placeholder={q.noteHint}
                      />
                    </label>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h2 style={{ fontSize: 34, margin: "0 0 10px 0", fontWeight: 780 }}>Digitale Realität</h2>
            <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.6 }}>
              Wir analysieren deine Website als digitale Visitenkarte – so, wie sie wirkt, wenn niemand etwas erklärt.
              Wähle Mitbewerber, die in Grösse/Bekanntheit möglichst vergleichbar sind.
            </p>

            <div style={{ height: 14 }} />

            <Card>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, opacity: 0.75 }}>Deine Website</span>
                  <input
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    style={inputStyle}
                    placeholder="https://…"
                  />
                </label>

                {compUrls.map((u, i) => (
                  <label key={i} style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13, opacity: 0.75 }}>{`Mitbewerber ${i + 1}`}</span>
                    <input
                      value={u}
                      onChange={(e) =>
                        setCompUrls((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                      }
                      style={inputStyle}
                      placeholder="https://…"
                    />
                  </label>
                ))}
              </div>
            </Card>
          </>
        )}

        <div style={{ height: 18 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <Button kind="ghost" disabled={step === 1 || loading} onClick={() => setStep((s) => Math.max(1, s - 1))}>
            Zurück
          </Button>

          {step < totalSteps ? (
            <Button disabled={!canNext || loading} onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}>
              Weiter
            </Button>
          ) : (
            <Button disabled={!canNext || loading} onClick={submit}>
              {loading ? "Auswerten…" : "Auswerten"}
            </Button>
          )}
        </div>

        {err && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 16,
              padding: 14,
              border: "1px solid rgba(220,0,0,0.25)",
              background: "rgba(220,0,0,0.05)",
            }}
          >
            <div style={{ fontWeight: 750, marginBottom: 4 }}>Da ist etwas schiefgelaufen</div>
            <div style={{ opacity: 0.85 }}>{err}</div>
          </div>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 14,
  padding: "12px 12px",
  fontSize: 15,
  outline: "none",
};
