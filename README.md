# ECHO Snapshot 2.0

Markenanalyse nach der ECHO-Methodik von Mosaik: URL eingeben, ECHO liest die Website, stuft sie nach der ECHO-Rubrik ein und zeigt das Ergebnis als Web-Präsentation.

## So funktioniert es

1. **Lesen** – Cloudflare Browser Rendering öffnet die Startseite (deutsche Fassung bevorzugt), macht ein Bild des ersten Bildschirms und liest bis zu fünf Unterseiten (Über uns, Angebot, Referenzen, Karriere, Kontakt) sowie optional die Startseiten von bis zu drei Mitbewerbern.
2. **Einstufen** – Ein Sprachmodell (Anthropic Claude) stuft zwölf Indikatoren nach der Rubrik in `src/rubric.ts` ein, jeweils mit Zitat oder Beobachtung als Beleg.
3. **Prüfen und rechnen** – Jedes Zitat wird gegen den gelesenen Text geprüft; unauffindbare werden entfernt, Stufen ohne Beleg gesenkt (`src/verify.ts`). Die Werte für E, C, H und O werden fest aus den Stufen berechnet (`src/score.ts`). Der Archetyp kommt aus der Matrix (`src/archetypes.ts`).
4. **Zeigen** – Das Ergebnis ist 90 Tage unter `/r/<id>` abrufbar. Mit `REVIEW_MODE=on` erscheint es erst nach Freigabe unter `/admin`.

## Einstellungen (Cloudflare → Worker → Einstellungen → Variablen)

| Name | Art | Zweck |
|---|---|---|
| `ANTHROPIC_API_KEY` | Geheimnis | Schlüssel für das Sprachmodell |
| `ADMIN_KEY` | Geheimnis | Passwort für die Freigabeseite `/admin` |
| `ANTHROPIC_MODEL` | Variable | Modell, Standard `claude-sonnet-5-5` |
| `REVIEW_MODE` | Variable | `on` = Ergebnisse erst nach Freigabe sichtbar, `off` = sofort |
| `RATE_LIMIT_PER_HOUR` | Variable | Analysen pro Stunde und Adresse (Standard 5) |
| `CONTACT_URL` | Variable | Ziel des Buttons «Gespräch vereinbaren» |

## Für Entwickler

```
npm install
npm test          # Logik-Tests
npm run typecheck
npx wrangler deploy
```

Die Rubrik und die Archetypen-Matrix entsprechen den Dokumenten im Projekt «ECHO – Markenanalyse». Grundlage des Charakters: The 49 Personality Archetypes von Sally Hogshead (© Fascinate, Inc.).
