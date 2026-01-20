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

const QUESTIONS = [
  {
    id: "K1",
    title: "Kunde · Eindruck",
    prompt: "Stell dir eine Person vor, die mit dir in einer Kundenbeziehung steht. Sie erlebt deinen Auftritt vor allem als …",
    options: ["klar & geordnet", "ruhig & souverän", "sachlich & funktional", "persönlich & nah", "erklärungsbedürftig", "schwer greifbar"],
  },
  {
    id: "K2",
    title: "Kunde · Haltung",
    prompt: "Im Umgang mit Kunden wird vor allem folgende Haltung spürbar …",
    options: ["sorgfältig & verantwortungsvoll", "pragmatisch & lösungsorientiert", "partnerschaftlich", "anspruchsvoll & fordernd", "distanziert", "uneinheitlich"],
  },
  {
    id: "K3",
    title: "Kunde · Konsistenz",
    prompt: "Über verschiedene Kontaktmomente hinweg wirkt diese Wahrnehmung …",
    options: ["sehr konsistent", "meist konsistent", "situationsabhängig", "eher widersprüchlich"],
  },
];

export default function Page() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [intent, setIntent] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, QA>>(
    Object.fromEntries(QUESTIONS.map(q => [q.id, { questionId: q.id, markers: [] }]))
  );

  const canNext = useMemo(() => {
    if (step === 1) return companyName && industry;
    if (step === 2) return intent.length > 0 && intent.length <= 2;
    if (step === 3) return QUESTIONS.every(q => answers[q.id].markers.length > 0);
    return true;
  }, [step, companyName, industry, intent, answers]);

  function toggleIntent(id: string) {
    setIntent(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      return next.slice(0, 2);
    });
  }

  function toggleMarker(qid: string, label: string) {
    setAnswers(prev => {
      const m = prev[qid].markers;
      const next = m.includes(label) ? m.filter(x => x !== label) : [...m, label];
      return { ...prev, [qid]: { ...prev[qid], markers: next.slice(0, 2) } };
    });
  }

  async function submit() {
    const res = await fetch("/api/analyze", { method: "POST" });
    const data = await res.json();

    sessionStorage.setItem("echo_result", JSON.stringify(data));
    localStorage.setItem("echo_result", JSON.stringify(data));

    router.push("/result");
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 32, fontFamily: "system-ui" }}>
      {step === 1 && (
        <>
          <h1>Wie wirkt deine Marke?</h1>
          <input placeholder="Unternehmensname" value={companyName} onChange={e => setCompanyName(e.target.value)} />
          <input placeholder="Branche" value={industry} onChange={e => setIndustry(e.target.value)} />
        </>
      )}

      {step === 2 && (
        <>
          <h2>Was soll man idealerweise erleben?</h2>
          {INTENT_OPTIONS.map(([id, label]) => (
            <button key={id} onClick={() => toggleIntent(id)}>{label}</button>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          {QUESTIONS.map(q => (
            <div key={q.id}>
              <h3>{q.prompt}</h3>
              {q.options.map(o => (
                <button key={o} onClick={() => toggleMarker(q.id, o)}>{o}</button>
              ))}
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        {step > 1 && <button onClick={() => setStep(s => s - 1)}>Zurück</button>}
        {step < 3 && <button disabled={!canNext} onClick={() => setStep(s => s + 1)}>Weiter</button>}
        {step === 3 && <button onClick={submit}>Auswerten</button>}
      </div>
    </main>
  );
}
