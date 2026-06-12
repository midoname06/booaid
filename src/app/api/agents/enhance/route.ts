export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  try {
    const { name, type, company_name, company_services, company_hours, goal, tone } =
      await req.json();

    const typeLabels: Record<string, string> = {
      receptionist: "receptionist virtuale",
      sales: "agente commerciale",
      support: "assistente supporto clienti",
      reactivation: "agente di riattivazione clienti",
    };

    const system = `Sei un esperto di AI conversazionale e copywriting per agenti AI.
Il tuo compito è migliorare la configurazione di un agente AI in italiano.
Rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick, senza testo aggiuntivo.`;

    const userMsg = `Migliora la configurazione di questo agente AI:
- Nome: ${name || "Agente"}
- Tipo: ${typeLabels[type] ?? type}
- Azienda: ${company_name || "non specificata"}
- Servizi: ${company_services || "non specificati"}
- Orari: ${company_hours || "non specificati"}
- Obiettivo attuale: ${goal || "(vuoto)"}
- Tono attuale: ${tone || "(vuoto)"}

Genera una configurazione migliorata e professionale. Restituisci esattamente questo JSON:
{
  "goal": "obiettivo chiaro e specifico per l'agente (max 120 caratteri)",
  "tone": "descrizione del tono comunicativo (max 60 caratteri)",
  "rules": ["regola 1", "regola 2", "regola 3", "regola 4"],
  "questions": ["domanda qualifica 1", "domanda qualifica 2", "domanda qualifica 3"]
}

Le regole devono essere pratiche e specifiche per il tipo di business.
Le domande devono aiutare a qualificare il lead o raccogliere info per la prenotazione.`;

    const llm = getProvider();
    const result = await llm.complete({
      system,
      messages: [{ role: "user", content: userMsg }],
    });

    const raw = result.text.trim();
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      goal: parsed.goal ?? "",
      tone: parsed.tone ?? "",
      rules: Array.isArray(parsed.rules) ? parsed.rules.join("\n") : "",
      questions: Array.isArray(parsed.questions) ? parsed.questions.join("\n") : "",
    });
  } catch (e: any) {
    console.error("[enhance] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Errore AI" }, { status: 500 });
  }
}
