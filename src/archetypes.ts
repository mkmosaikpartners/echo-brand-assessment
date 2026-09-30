// Automatisch erzeugt aus ECHO-Archetypen-Matrix.md (Grundlage: Sally Hogshead, © Fascinate, Inc.)
export const ADVANTAGES = {
  "Innovation": "bricht mit Gewohntem",
  "Passion": "begeistert über Emotionen",
  "Power": "führt mit Bestimmtheit",
  "Prestige": "setzt Massstäbe",
  "Trust": "schafft Loyalität dank Beständigkeit",
  "Mystique": "weckt Neugier durch Zurückhaltung",
  "Alert": "sieht Probleme, bevor sie entstehen"
} as const;

export type Advantage = keyof typeof ADVANTAGES;

/** Die Wirkung als deutsches Eigenschaftswort – so erscheint sie im Ergebnis. */
export const EFFECT_WORD: Record<Advantage, string> = {
  Innovation: "erneuernd",
  Passion: "begeisternd",
  Power: "bestimmt",
  Prestige: "massgebend",
  Trust: "verlässlich",
  Mystique: "zurückhaltend",
  Alert: "vorausschauend",
};

export interface Archetype { name: string; primary: Advantage; secondary: Advantage; traits: string[]; diagonal: boolean }

export const ARCHETYPES: Archetype[] = [
  {
    "name": "The Anarchy",
    "primary": "Innovation",
    "secondary": "Innovation",
    "traits": [
      "sprunghaft",
      "verblüffend",
      "chaotisch"
    ],
    "diagonal": true
  },
  {
    "name": "The Rockstar",
    "primary": "Innovation",
    "secondary": "Passion",
    "traits": [
      "kühn",
      "künstlerisch",
      "unkonventionell"
    ],
    "diagonal": false
  },
  {
    "name": "The Maverick Leader",
    "primary": "Innovation",
    "secondary": "Power",
    "traits": [
      "wegbereitend",
      "unangepasst",
      "unternehmerisch"
    ],
    "diagonal": false
  },
  {
    "name": "The Trendsetter",
    "primary": "Innovation",
    "secondary": "Prestige",
    "traits": [
      "an vorderster Front",
      "exklusiv",
      "progressiv"
    ],
    "diagonal": false
  },
  {
    "name": "The Artisan",
    "primary": "Innovation",
    "secondary": "Trust",
    "traits": [
      "überlegt",
      "durchdacht",
      "flexibel"
    ],
    "diagonal": false
  },
  {
    "name": "The Provocateur",
    "primary": "Innovation",
    "secondary": "Mystique",
    "traits": [
      "clever",
      "gewandt",
      "zeitgemäss"
    ],
    "diagonal": false
  },
  {
    "name": "The Quick-Start",
    "primary": "Innovation",
    "secondary": "Alert",
    "traits": [
      "produktiv",
      "gründlich",
      "gewissenhaft"
    ],
    "diagonal": false
  },
  {
    "name": "The Catalyst",
    "primary": "Passion",
    "secondary": "Innovation",
    "traits": [
      "querdenkend",
      "verbindend",
      "belebend"
    ],
    "diagonal": false
  },
  {
    "name": "The Drama",
    "primary": "Passion",
    "secondary": "Passion",
    "traits": [
      "theatralisch",
      "gefühlsbetont",
      "empfindsam"
    ],
    "diagonal": true
  },
  {
    "name": "The People's Champion",
    "primary": "Passion",
    "secondary": "Power",
    "traits": [
      "dynamisch",
      "integrierend",
      "mitreissend"
    ],
    "diagonal": false
  },
  {
    "name": "The Talent",
    "primary": "Passion",
    "secondary": "Prestige",
    "traits": [
      "ausdrucksstark",
      "stilvoll",
      "emotional intelligent"
    ],
    "diagonal": false
  },
  {
    "name": "The Beloved",
    "primary": "Passion",
    "secondary": "Trust",
    "traits": [
      "fürsorglich",
      "loyal",
      "aufrichtig"
    ],
    "diagonal": false
  },
  {
    "name": "The Intrigue",
    "primary": "Passion",
    "secondary": "Mystique",
    "traits": [
      "urteilssicher",
      "scharfsinnig",
      "rücksichtsvoll"
    ],
    "diagonal": false
  },
  {
    "name": "The Orchestrator",
    "primary": "Passion",
    "secondary": "Alert",
    "traits": [
      "aufmerksam",
      "engagiert",
      "effizient"
    ],
    "diagonal": false
  },
  {
    "name": "The Change Agent",
    "primary": "Power",
    "secondary": "Innovation",
    "traits": [
      "erfinderisch",
      "unkonventionell",
      "aus eigenem Antrieb"
    ],
    "diagonal": false
  },
  {
    "name": "The Ringleader",
    "primary": "Power",
    "secondary": "Passion",
    "traits": [
      "motivierend",
      "temperamentvoll",
      "überzeugend"
    ],
    "diagonal": false
  },
  {
    "name": "The Aggressor",
    "primary": "Power",
    "secondary": "Power",
    "traits": [
      "dominant",
      "herrisch",
      "dogmatisch"
    ],
    "diagonal": true
  },
  {
    "name": "The Maestro",
    "primary": "Power",
    "secondary": "Prestige",
    "traits": [
      "ambitioniert",
      "fokussiert",
      "selbstsicher"
    ],
    "diagonal": false
  },
  {
    "name": "The Guardian",
    "primary": "Power",
    "secondary": "Trust",
    "traits": [
      "präsent",
      "echt",
      "trittsicher"
    ],
    "diagonal": false
  },
  {
    "name": "The Mastermind",
    "primary": "Power",
    "secondary": "Mystique",
    "traits": [
      "methodisch",
      "intensiv",
      "eigenständig"
    ],
    "diagonal": false
  },
  {
    "name": "The Defender",
    "primary": "Power",
    "secondary": "Alert",
    "traits": [
      "proaktiv",
      "vorsichtig",
      "willensstark"
    ],
    "diagonal": false
  },
  {
    "name": "The Avant-Garde",
    "primary": "Prestige",
    "secondary": "Innovation",
    "traits": [
      "originell",
      "unternehmerisch",
      "vorausdenkend"
    ],
    "diagonal": false
  },
  {
    "name": "The Connoisseur",
    "primary": "Prestige",
    "secondary": "Passion",
    "traits": [
      "tiefgründig",
      "distinguiert",
      "bestens im Bild"
    ],
    "diagonal": false
  },
  {
    "name": "The Victor",
    "primary": "Prestige",
    "secondary": "Power",
    "traits": [
      "respektiert",
      "wettbewerbsstark",
      "ergebnisorientiert"
    ],
    "diagonal": false
  },
  {
    "name": "The Imperial",
    "primary": "Prestige",
    "secondary": "Prestige",
    "traits": [
      "arrogant",
      "kühl",
      "überlegen"
    ],
    "diagonal": true
  },
  {
    "name": "The Blue Chip",
    "primary": "Prestige",
    "secondary": "Trust",
    "traits": [
      "klassisch",
      "etabliert",
      "klassenbest"
    ],
    "diagonal": false
  },
  {
    "name": "The Architect",
    "primary": "Prestige",
    "secondary": "Mystique",
    "traits": [
      "versiert",
      "zurückhaltend",
      "geschliffen"
    ],
    "diagonal": false
  },
  {
    "name": "The Scholar",
    "primary": "Prestige",
    "secondary": "Alert",
    "traits": [
      "intellektuell",
      "diszipliniert",
      "systematisch"
    ],
    "diagonal": false
  },
  {
    "name": "The Evolutionary",
    "primary": "Trust",
    "secondary": "Innovation",
    "traits": [
      "neugierig",
      "anpassungsfähig",
      "aufgeschlossen"
    ],
    "diagonal": false
  },
  {
    "name": "The Authentic",
    "primary": "Trust",
    "secondary": "Passion",
    "traits": [
      "nahbar",
      "zuverlässig",
      "vertrauenswürdig"
    ],
    "diagonal": false
  },
  {
    "name": "The Gravitas",
    "primary": "Trust",
    "secondary": "Power",
    "traits": [
      "würdevoll",
      "stabil",
      "fleissig"
    ],
    "diagonal": false
  },
  {
    "name": "The Diplomat",
    "primary": "Trust",
    "secondary": "Prestige",
    "traits": [
      "besonnen",
      "feinsinnig",
      "kompetent"
    ],
    "diagonal": false
  },
  {
    "name": "The Old Guard",
    "primary": "Trust",
    "secondary": "Trust",
    "traits": [
      "berechenbar",
      "sicher",
      "unverrückbar"
    ],
    "diagonal": true
  },
  {
    "name": "The Anchor",
    "primary": "Trust",
    "secondary": "Mystique",
    "traits": [
      "schützend",
      "zielgerichtet",
      "analytisch"
    ],
    "diagonal": false
  },
  {
    "name": "The Good Citizen",
    "primary": "Trust",
    "secondary": "Alert",
    "traits": [
      "prinzipientreu",
      "vorbereitet",
      "gewissenhaft"
    ],
    "diagonal": false
  },
  {
    "name": "The Secret Weapon",
    "primary": "Mystique",
    "secondary": "Innovation",
    "traits": [
      "wendig",
      "unaufdringlich",
      "unabhängig"
    ],
    "diagonal": false
  },
  {
    "name": "The Subtle Touch",
    "primary": "Mystique",
    "secondary": "Passion",
    "traits": [
      "taktvoll",
      "eigenständig",
      "achtsam"
    ],
    "diagonal": false
  },
  {
    "name": "The Veiled Strength",
    "primary": "Mystique",
    "secondary": "Power",
    "traits": [
      "realistisch",
      "bewusst",
      "auf den Punkt"
    ],
    "diagonal": false
  },
  {
    "name": "The Royal Guard",
    "primary": "Mystique",
    "secondary": "Prestige",
    "traits": [
      "elegant",
      "scharfsinnig",
      "diskret"
    ],
    "diagonal": false
  },
  {
    "name": "The Wise Owl",
    "primary": "Mystique",
    "secondary": "Trust",
    "traits": [
      "beobachtend",
      "souverän",
      "gelassen"
    ],
    "diagonal": false
  },
  {
    "name": "The Deadbolt",
    "primary": "Mystique",
    "secondary": "Mystique",
    "traits": [
      "nüchtern",
      "introvertiert",
      "konzentriert"
    ],
    "diagonal": true
  },
  {
    "name": "The Archer",
    "primary": "Mystique",
    "secondary": "Alert",
    "traits": [
      "treffsicher",
      "durchdacht",
      "pragmatisch"
    ],
    "diagonal": false
  },
  {
    "name": "The Composer",
    "primary": "Alert",
    "secondary": "Innovation",
    "traits": [
      "strategisch",
      "fein abgestimmt",
      "umsichtig"
    ],
    "diagonal": false
  },
  {
    "name": "The Coordinator",
    "primary": "Alert",
    "secondary": "Passion",
    "traits": [
      "konstruktiv",
      "organisiert",
      "praktisch"
    ],
    "diagonal": false
  },
  {
    "name": "The Ace",
    "primary": "Alert",
    "secondary": "Power",
    "traits": [
      "entschlossen",
      "unermüdlich",
      "geradlinig"
    ],
    "diagonal": false
  },
  {
    "name": "The Editor-in-Chief",
    "primary": "Alert",
    "secondary": "Prestige",
    "traits": [
      "produktiv",
      "versiert",
      "detailgenau"
    ],
    "diagonal": false
  },
  {
    "name": "The Mediator",
    "primary": "Alert",
    "secondary": "Trust",
    "traits": [
      "standhaft",
      "gefasst",
      "strukturiert"
    ],
    "diagonal": false
  },
  {
    "name": "The Detective",
    "primary": "Alert",
    "secondary": "Mystique",
    "traits": [
      "klar",
      "präzise",
      "akribisch"
    ],
    "diagonal": false
  },
  {
    "name": "The Control Freak",
    "primary": "Alert",
    "secondary": "Alert",
    "traits": [
      "zwanghaft",
      "getrieben",
      "anspruchsvoll"
    ],
    "diagonal": true
  }
];

export function findArchetype(primary: string, secondary: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.primary === primary && a.secondary === secondary);
}
