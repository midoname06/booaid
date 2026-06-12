# CLAUDE.md — Istruzioni di progetto per Claude Code

> Questo file viene letto automaticamente all'avvio. Contiene il contesto di Wafiq Agents,
> le regole di lavoro e le preferenze. Aggiornalo quando il progetto evolve.

## Cos'è Wafiq Agents
Piattaforma SaaS no-code per costruire **agenti AI** che rispondono ai clienti, qualificano
lead, prenotano appuntamenti e automatizzano workflow. Ispirato concettualmente a Bookedin.ai
ma **prodotto originale** (brand, testi e design completamente nostri — non copiare nulla).

**Obiettivo reale del progetto:** usarlo per i business del proprietario (Barbiere Foued + un
hotel), NON rivenderlo white-label per ora. Di conseguenza:
- White-label, client portal multi-tenant, sistema crediti/billing = **FASE 2**, non MVP.
- Le tabelle hanno comunque `workspace_id` ovunque → multi-tenant *predisposto* ma non implementato.
- **Non costruire il voice agent realtime nell'MVP.** Chat + WhatsApp/SMS testuali coprono il 90%
  del valore per barbiere e hotel. La voce è fase 1.5.

## Lingua e comunicazione
- **Parla sempre in italiano.**
- Stile diretto e opinionato: se una scelta tecnica è sbagliata, dillo e proponi l'alternativa.
- Niente codice "buttato lì": spiega brevemente il perché delle decisioni importanti.

## Stack tecnico (già deciso — non cambiare senza motivo)
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion.
- **Workflow builder:** React Flow.
- **Backend:** Next.js Route Handlers (API). Estrarre in FastAPI solo se serve scalare.
- **DB + Auth:** Supabase (PostgreSQL + RLS), pgvector per la knowledge base.
- **AI:** layer provider-agnostico in `src/lib/ai/provider.ts`. Claude primario, OpenAI fallback.
  NON chiamare i provider direttamente altrove: passa sempre da quel layer.
- **Integrazioni:** Google Calendar (booking reale), Twilio (SMS/Voice, fase 1.5),
  WhatsApp Business API, Resend (email), Stripe (fase 2).

## Design (requisiti non negoziabili)
- Dark mode premium. Palette: bg #070B14, surface #101828, primary #7C3AED, accent #06B6D4,
  success #22C55E, warning #F59E0B, danger #EF4444, text #F8FAFC, muted #94A3B8.
- UI **glove-friendly / high-contrast**: target touch grandi, testo leggibile a distanza,
  contrasto alto. Questo viene dall'esperienza factory del proprietario — applicalo sempre
  alle interfacce operative.
- Per generare/rifinire UI usa la skill personale **`flutter-html-design`** se disponibile,
  e **`app-design-intelligence`** per il brief di design prima di scrivere codice UI nuovo.
- Niente estetica "AI slop": font generici (Inter/Roboto/Arial), gradienti viola su bianco, layout prevedibili.

## Sicurezza e regole operative
- **Mai scrivere chiavi API reali nei file.** Crea `.env.local` da `.env.example` ma lascia i
  valori vuoti: li inserisce il proprietario a mano.
- Non committare `.env.local` (verifica che sia nel `.gitignore`).
- Credenziali integrazioni in `integrations.credentials` vanno cifrate a livello app, mai in chiaro.
- Prima di azioni distruttive (drop tabelle, rm massivi, force push) chiedi conferma.

## Roadmap (ordine di lavoro)
> Aggiornata dopo l'analisi live di Bookedin (vedi WAFIQ_AGENTS.md §1.bis): wizard guidato
> come esperienza principale, React Flow declassato a vista avanzata facoltativa.
1. **Settimana 1** — Auth Supabase · Dashboard · Agent Builder (creazione minimale + editor a sezioni, AI Enhance del prompt) + chat preview con AI reale (function calling).
2. **Settimana 2** — Lead inbox · conversazioni persistite · pipeline kanban con avanzamento automatico di stage · Google Calendar OAuth + create booking reale · estrazione automatica campi lead.
3. **Settimana 3** — Wizard "Crea Sistema" a step con template (barbiere/hotel/riattivazione) · sequenze follow-up come lista di passi · queue · email/SMS. (React Flow solo se avanza tempo.)
4. **Settimana 4** — Analytics con "Obiettivi raggiunti" come metrica centrale · settings/integrazioni · deploy Vercel + Supabase.

## File chiave già presenti
- `WAFIQ_AGENTS.md` — documento completo: analisi, mappa funzionale, schema DB, architettura.
- `db/schema.sql` — schema PostgreSQL completo (18+ tabelle, indici, RLS). `db/seed.sql` — demo data.
- `src/lib/ai/provider.ts` — astrazione LLM. `src/lib/ai/prompts.ts` — generazione system prompt.
- `src/app/api/chat/route.ts` — runtime agente. `src/app/api/bookings/route.ts` — Google Calendar.

## Modo di lavorare con me (proprietario)
- Procediamo per piccoli step verificabili: fai una cosa, falla girare, poi la prossima.
- Quando un pezzo è un buon candidato a diventare una **Claude Skill riutilizzabile**
  (es. la generazione system prompt da usare per barbiere/hotel/clienti futuri), segnalalo.
- Se installi pacchetti o cambi config, dimmi cosa e perché in una riga.
