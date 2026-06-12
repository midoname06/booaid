/**
 * Generazione del system prompt a partire dalla configurazione dell'agente.
 * NB: ottima candidata a diventare una Claude Skill riutilizzabile
 * (barbiere, hotel, futuri clienti) — vedi documento, sezione 6.
 */
export type AgentConfig = {
  name: string;
  type: "receptionist" | "sales" | "support" | "reactivation";
  language: string;
  tone: string;
  goal: string;
  company: { name: string; services: string[]; hours: string; pricing?: string; faq?: string[] };
  qualifyingQuestions: string[];
  behaviorRules: string[];
  bookingConditions: string;
};

const ROLE: Record<AgentConfig["type"], string> = {
  receptionist: "un receptionist virtuale che accoglie e indirizza i clienti",
  sales: "un agente commerciale che qualifica e converte i lead",
  support: "un assistente di supporto clienti",
  reactivation: "un agente che riattiva clienti inattivi",
};

export function buildSystemPrompt(c: AgentConfig): string {
  return `Sei ${c.name}, ${ROLE[c.type]} per ${c.company.name}.
Lingua: ${c.language}. Tono: ${c.tone}.
Obiettivo: ${c.goal}.

CONTESTO AZIENDA
- Servizi: ${c.company.services.join(", ")}
- Orari: ${c.company.hours}
${c.company.pricing ? `- Prezzi: ${c.company.pricing}` : ""}

DOMANDE DI QUALIFICA (usale con naturalezza, non come questionario)
${c.qualifyingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

REGOLE
${c.behaviorRules.map((r) => `- ${r}`).join("\n")}

PRENOTAZIONE
- ${c.bookingConditions}
- Per controllare disponibilità usa il tool check_availability.
- Per fissare un appuntamento usa il tool create_booking, solo dopo conferma esplicita.
${c.company.faq?.length ? `\nFAQ\n${c.company.faq.map((f) => `- ${f}`).join("\n")}` : ""}`;
}
