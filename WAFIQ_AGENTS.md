# Wafiq Agents — Documento di prodotto, architettura e MVP

> AI Agent Builder no-code: agenti che rispondono ai clienti, qualificano lead, prenotano appuntamenti e automatizzano workflow.
> Documento tarato sul tuo obiettivo reale: **usarlo per i tuoi business** (Barbiere Foued, hotel) prima di pensare a rivenderlo.

---

## 1. Analisi di Bookedin.ai (dati reali dal sito)

### Cos'è
Bookedin.ai è un **SaaS no-code per agenzie** che vendono servizi di automazione AI. Non è un tool per il cliente finale: è un tool *per chi rivende AI*. La frase chiave del sito è "Stop trying to build AI. Start selling it." Il prodotto che l'agenzia compra è "fatto, white-label, lo vendi col tuo logo".

### Target preciso
Due profili, ma il primario è uno solo:
- **Primario:** agenzie di marketing / lead-gen che già fanno Facebook & Google Ads per i clienti e vogliono aggiungere un'offerta AI senza saper programmare e senza assumere sviluppatori.
- **Secondario:** business singoli che lo usano per sé.

Il vero dolore che vendono è *"the last mile of lead generation"*: tu generi lead col paid advertising, ma metà non si presenta. Bookedin chiama ogni lead in pochi secondi e fa follow-up su SMS/email/DM finché non prenota o esce.

### Proposta di valore
Sostituire lo stack frammentato (Vapi + Google Sheets + CRM + n8n + Zapier per ogni cliente) con **una piattaforma unica per costruire, automatizzare e monetizzare**. I tre verbi sono letteralmente la struttura del sito: Build → Automate → Deliver.

### Problemi che risolve
1. **Manual overload** — onboarding manuale, debug di workflow, rincorsa dei pagamenti.
2. **Duct-taped tools** — 5 tool incollati che quando uno si rompe fa crollare tutto il servizio.
3. **Unprofessional delivery** — consegnare risultati in fogli Excel raffazzonati invece che in una dashboard brandizzata.

### Flusso utente (i 3 step del prodotto)
1. **Build** — No-Code Agent Builder: costruisci e testi agenti voce/chat visivamente, generi i prompt in linguaggio naturale, colleghi tool di booking (Google Calendar, Calendly) senza scrivere codice.
2. **Automate** — Visual Workflow Builder: trigger nativi dagli eventi dell'agente ("call-ended", "call-started") invece di webhook inaffidabili. Sostituisce Zapier/Make/CRM.
3. **Deliver** — Whitelabel Client Portal + Unified Inbox + Analytics con attribuzione ROI diretta (chiamate, appuntamenti, revenue generato).

### Casi d'uso che pubblicizzano
AI Scheduler (booking 24/7), Sales AI (qualifica + demo), Outbound Campaigns (riattivazione database), Abbandoni carrello, Reminder eventi (anti no-show), Unified Inbox con flag di sentiment.

### Modello di pricing (utile per capire la macchina)
Tre piani: Starter $75/mo (2 agenti), Pro $208/mo (agenti illimitati, API access), Agency $291/mo (white-label, "ti aiutiamo a costruire il primo sistema", BYO API keys). Il meccanismo dei **crediti** è la parte intelligente: ogni piano include crediti, poi paghi "costo provider + 20%", oppure porti le tue chiavi API e salti il markup. Hanno scaricato il costo variabile dei token sul cliente.

### Lettura da Product Manager
Bookedin non vende tecnologia, vende **un'offerta pronta da rivendere**. Il loro fossato non è il software (chiunque collega Vapi+GPT), è la combinazione *prodotto pronto + community Skool + tutorial + done-for-you*. Per te questo è un insegnamento chiave: il software è la parte facile, la distribuzione è il prodotto.

### 1.bis — Verifica live della dashboard (giugno 2026, account trial)
Esplorazione diretta dell'app `dashboard.bookedin.ai`. Struttura reale verificata:

**Navigazione:** Dashboard · Setup Builder · Build (Agents, Strategies, Forms, Tools) · Communications (Inbox, Campaigns, Leads, Pipelines, Lists) · Monitoring (Analytics & Usage) · Business (Plans & Billing, Settings, Channels, Resources). In basso: piano + saldo crediti sempre visibile, Dark Mode, Sign Out.

**Setup Builder (il loro vero builder principale):** wizard a 6 step, layout a 3 pannelli — progress a sinistra, *chat guidata* al centro (ogni scelta diventa un messaggio), input a destra. Flusso: template sistema (Customer Support / Instant Response / Lead Reactivation) → nome → canali (Voice + 1 canale testuale: SMS o WhatsApp) → connessione account (skippabile) → agente (esistente o nuovo) → app (Google Calendar, Calendly, Cal.com — skippabile). Output: **diagramma a 3 nodi** `1. Feeding Contact Data → 2. Agent → 3. Monitor Results`, ogni nodo con pulsante Configure. **Non è un canvas libero**: il "workflow" è un percorso lineare precostruito dal template.

**Editor agente:** creazione minimale (modal con solo il nome) → editor completo. Layout: configurazione a sinistra + pannello "Test your agent" sempre visibile a destra (selettore canale: voice, chat, SMS, WhatsApp, Instagram, Gmail + test chiamata). La configurazione è divisa in 6 tab a icone:
1. *General Prompt* — Agent Objective (one-liner) + editor prompt con righe numerate, variabili `{{first_name}}`, libreria Templates, e **AI Enhance** ("descrivi come migliorare il prompt" → l'AI lo riscrive)
2. *Channels* — prompt e feature specifici per canale (il General si applica a tutti, il channel prompt sovrascrive)
3. *Tools* — app esterne e API custom (richiede prima un canale)
4. *Connections* — numeri/account per andare live
5. *Workflow & Follow-up* — strategia collegata + sequenza follow-up automatica (dropdown, non canvas)
6. *Settings* — **Appointment Detection & Callbacks** (toggle: rileva appuntamenti, reminder, no-show; Instant Follow-ups), Webhook URL, **Lead Field Settings** (estrazione automatica di campi dalle conversazioni: nome, email, telefono…)

**Pipelines (kanban):** stage con trigger di avanzamento automatico — New Lead → Contacted (*when first message sent*) → Engaged (*when lead responds*) → Qualified (*when objective achieved*). Drag-drop manuale possibile. Filtri: Objective Met, Channels, pipeline selector.

**Dashboard:** KPI (Appointments, Leads Engaged, Active Leads, **Objectives Met**, Touchpoints, Avg/Lead, **Total Cost $**) · filtro temporale · grafico attività · Touchpoints by Channel · **Engagement Funnel** (Touchpoints → Leads Reached → Responses → Objective Met) con split Text/Voice.

**Takeaway chiave (da applicare in forma nostra, non copiare):**
1. Il wizard guidato con template È il prodotto; il canvas libero non esiste nemmeno. Per un utente non tecnico funziona meglio.
2. "Objective Met" è la metrica regina: tutto (pipeline, analytics, funnel) converge su "l'agente ha raggiunto l'obiettivo?".
3. Trigger automatici di stage in pipeline = zero lavoro manuale sui lead.
4. AI Enhance sul prompt = feature ad alto valore e basso costo per noi (una chiamata a Claude).
5. Creazione entità sempre minimale (solo nome) → configurazione dopo, con default sensati.

---

## 2. Perché il tuo Wafiq è diverso (e dove tagliare)

Tu vuoi usarlo per **te**, non rivenderlo (per ora). Quindi:

| Modulo Bookedin | Per te, fase MVP | Motivo |
|---|---|---|
| Agent Builder | ✅ Core | È il cuore: l'agente per barbiere/hotel |
| Chat preview con AI reale | ✅ Core | Devi testare l'agente vero |
| Booking + Google Calendar | ✅ Core | Prenotazioni reali = il valore per te |
| Workflow Builder visuale | ✅ Core (richiesto) | Lo vuoi vero |
| Unified Inbox | 🟡 Fase 1.5 | Utile ma non blocca il valore iniziale |
| Analytics | 🟡 Fase 1.5 | Bastano 4 numeri all'inizio |
| Client Portal white-label | 🔴 Fase 2 | Serve solo se rivendi |
| Multi-tenant per agenzie | 🔴 Fase 2 | Complessità enorme, valore zero per te ora |
| Sistema crediti / markup | 🔴 Fase 2 | Paghi i token tuoi e basta |

**Conseguenza architetturale:** costruiamo comunque con `workspace_id` ovunque (così il multi-tenant è già predisposto), ma NON costruiamo il billing, il markup crediti e il portale white-label finché non decidi di rivendere. Predisporre ≠ implementare.

---

## 3. Mappa funzionale completa (moduli)

### 3.1 Dashboard
KPI in alto (card): agenti attivi, conversazioni gestite (periodo), messaggi inviati, lead qualificati, appuntamenti prenotati, tasso di conversione. Sotto: feed ultime conversazioni + lista workflow attivi con stato. Filtro per periodo e per agente.

### 3.2 Agent Builder
Form strutturato + anteprima live affiancata:
- Nome agente
- Tipo: Receptionist · Sales Agent · Customer Support · Lead Reactivation
- Canali (multi): Voice · SMS · WhatsApp · Email · Web Chat
- Lingua, Tono di voce
- Obiettivo (one-liner che guida il system prompt)
- Prompt principale (generabile in linguaggio naturale → system prompt strutturato)
- Regole di comportamento (do / don't)
- Domande di qualifica (lista ordinata)
- Condizioni di prenotazione (quando l'agente può/deve proporre un booking)
- Knowledge base (upload FAQ, listino, orari)

### 3.3 Setup Builder guidato (wizard 6 step)
1. **Tipo sistema:** Customer Support · Instant Response · Lead Reactivation · Appointment Booking · Sales Follow-up
2. **Canale:** Voice · SMS · WhatsApp · Email · Website Chat
3. **Dati azienda:** nome, servizi, orari, area geografica, prezzi/pacchetti, FAQ
4. **Collega strumenti:** Google Calendar · Calendly · CRM · Email · Webhook · Stripe (opz.)
5. **Test agente:** chat preview · simulazione chiamata · test prenotazione · log conversazione
6. **Deploy:** attiva · copia widget chat · collega numero · collega WhatsApp · attiva workflow

### 3.4 Workflow Builder (drag-and-drop, React Flow)
- **Trigger:** nuovo lead · chiamata iniziata · chiamata finita · form compilato · messaggio ricevuto
- **Azioni:** invia SMS · invia email · crea appuntamento · aggiorna CRM · assegna tag
- **Condizioni:** cliente interessato · non risponde · appuntamento confermato
- **Delay:** aspetta 1 ora / 1 giorno
- **Webhook:** invia dati a sistema esterno

### 3.5 Inbox unica
Lista conversazioni multicanale (SMS, voce, email, WhatsApp, chat sito) con stato lead, note interne, tag, azioni rapide. Pannello conversazione a destra con timeline messaggi.

### 3.6 Client Portal white-label (fase 2)
Logo/colori personalizzati, statistiche risultati, appuntamenti generati, conversazioni, report mensile, ROI stimato, export PDF.

### 3.7 Analytics
Totale conversazioni, lead contattati, risposte ricevute, appuntamenti prenotati, chiamate perse recuperate, tasso conversione, tempo medio risposta, revenue stimato.

### 3.8 Settings
Profilo azienda, utenti & ruoli, integrazioni, API key, billing, piano, white-label, sicurezza, logs.

---

## 4. Architettura tecnica

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND — Next.js 15 (App Router) + Tailwind + shadcn/ui   │
│  Framer Motion (micro-interactions) · React Flow (workflow)  │
└───────────────┬─────────────────────────────────────────────┘
                │ REST + WebSocket (chat live)
┌───────────────┴─────────────────────────────────────────────┐
│  BACKEND — Next.js API Routes / Route Handlers               │
│  (per scalare: estrarre in servizio FastAPI dedicato)        │
│  • Agent runtime (LLM + tool/function calling)               │
│  • Queue (BullMQ/Redis) per automazioni & follow-up          │
│  • Background jobs (cron) per delay e reactivation           │
│  • Webhook receiver (Twilio, WhatsApp, Calendly)             │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────┴───────────┐   ┌──────────────────────────────┐
│  DATABASE — PostgreSQL     │   │  PROVIDER ESTERNI             │
│  (Supabase: Auth+DB+RLS)   │   │  • LLM provider (vedi sotto)  │
│  + pgvector per KB         │   │  • Twilio (Voice/SMS)         │
└────────────────────────────┘   │  • WhatsApp Business API      │
                                  │  • Google Calendar / Calendly │
                                  │  • Resend (email)             │
                                  │  • Stripe (fase 2)            │
                                  └──────────────────────────────┘
```

### Scelta dello stack AI (mi avevi lasciato decidere)
**Layer di astrazione provider-agnostico**, default su due modelli:
- **Claude (Anthropic)** come modello primario per il ragionamento dell'agente e il tool-calling: gestisce bene istruzioni lunghe e strutturate (i tuoi system prompt per receptionist/sales) e il function calling è robusto.
- **OpenAI** come fallback/alternativa, perché l'ecosistema voice (realtime) e alcuni tool di terze parti lo assumono di default.

Il motivo dell'astrazione non è teorico: con un'interfaccia `LLMProvider` unica eviti il lock-in e, se un domani rivendi, puoi fare esattamente quello che fa Bookedin (far portare al cliente la sua chiave). Tutto passa da `lib/ai/provider.ts`.

Per la **voce** all'MVP: NON costruire il voice agent realtime subito. È la parte più costosa e fragile (latenza, telefonia, costi al minuto). Parti da **chat + SMS/WhatsApp testuali**, che danno il 90% del valore per barbiere e hotel, e aggiungi la voce in fase 1.5 con Twilio + un provider voice.

### Knowledge base
Upload file → chunking → embeddings in `pgvector` → retrieval al momento della risposta. Per barbiere/hotel la KB è piccola (listino, orari, FAQ, politiche), quindi anche un semplice retrieval va benissimo.

---

## 5. Schema database

Convenzioni: ogni tabella business ha `workspace_id` (multi-tenant ready), `created_at`, `updated_at`. PK = `uuid`. Pensato per Supabase/PostgreSQL con RLS per `workspace_id`.

### users
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | = auth.users.id |
| email | text unique | |
| full_name | text | |
| avatar_url | text | |
| created_at | timestamptz | default now() |

### workspaces
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| name | text | es. "Barbiere Foued" |
| owner_id | uuid FK→users | |
| brand_logo_url | text | per white-label fase 2 |
| brand_color | text | |
| settings | jsonb | |

`workspace_members(workspace_id, user_id, role)` con role ∈ {owner, admin, agent, viewer}. **Indice:** `(user_id)`.

### clients
Aziende finali servite (fase 2, per agenzie). Per te = un solo record per business.
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | |
| name, industry, timezone | text | |
| business_hours | jsonb | |

### agents
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | **idx** |
| name | text | |
| type | text | receptionist\|sales\|support\|reactivation |
| channels | text[] | {webchat,sms,whatsapp,email,voice} |
| language | text | es. "it-IT" |
| tone | text | |
| goal | text | |
| status | text | draft\|active\|paused |
| config | jsonb | regole, condizioni booking |

**Esempio JSON `config`:**
```json
{
  "behavior_rules": ["Non promettere sconti non autorizzati", "Rispondi in italiano"],
  "qualifying_questions": ["Per quale servizio?", "Hai una data preferita?"],
  "booking_conditions": { "require_service": true, "min_lead_time_hours": 2 }
}
```

### agent_prompts
Versioning del system prompt (storico = audit + rollback).
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| agent_id | uuid FK | **idx** |
| version | int | |
| system_prompt | text | |
| is_active | bool | |

### agent_tools
Tool/function abilitati per agente (function calling).
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| agent_id | uuid FK | **idx** |
| tool_key | text | check_availability\|create_booking\|… |
| config | jsonb | es. calendar_id |

### workflows
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | **idx** |
| name | text | |
| status | text | draft\|active\|paused |
| graph | jsonb | snapshot rapido nodi+edge per il runner |

### workflow_nodes
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workflow_id | uuid FK | **idx** |
| type | text | trigger\|action\|condition\|delay\|webhook |
| subtype | text | new_lead\|send_sms\|if_interested\|… |
| position | jsonb | {x,y} per React Flow |
| data | jsonb | config nodo |

### workflow_edges
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workflow_id | uuid FK | **idx** |
| source_node_id | uuid FK | |
| target_node_id | uuid FK | |
| condition_label | text | es. "yes"/"no" |

### conversations
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | **idx** |
| agent_id | uuid FK | |
| lead_id | uuid FK null | |
| channel | text | |
| status | text | open\|qualified\|booked\|closed |
| sentiment | text | positive\|neutral\|negative |
| last_message_at | timestamptz | **idx** per ordinamento inbox |

### messages
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid FK | **idx** |
| role | text | user\|assistant\|system\|tool |
| content | text | |
| tool_calls | jsonb | |
| created_at | timestamptz | **idx (conversation_id, created_at)** |

### leads
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | **idx** |
| name, phone, email | text | |
| status | text | new\|contacted\|qualified\|booked\|lost |
| tags | text[] | |
| source | text | |
| score | int | |

**Esempio JSON lead:**
```json
{ "name": "Marco Rossi", "phone": "+393331234567", "status": "qualified",
  "tags": ["taglio","cliente-nuovo"], "source": "webchat", "score": 80 }
```

### bookings
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | **idx** |
| lead_id | uuid FK | |
| agent_id | uuid FK | |
| service | text | |
| start_at, end_at | timestamptz | **idx (workspace_id, start_at)** |
| status | text | confirmed\|cancelled\|completed\|no_show |
| external_event_id | text | id evento Google Calendar |

### integrations
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | **idx** |
| provider | text | google_calendar\|calendly\|twilio\|whatsapp\|resend\|stripe |
| credentials | jsonb | **cifrato** (mai in chiaro) |
| status | text | connected\|error\|disconnected |

### webhook_events
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | |
| provider | text | |
| payload | jsonb | |
| processed | bool | **idx (processed)** per il worker |

### analytics_events
| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | **idx (workspace_id, type, created_at)** |
| type | text | message_sent\|call_handled\|lead_qualified\|booking_created |
| meta | jsonb | |

### subscriptions (fase 2)
plan, status, stripe_customer_id, stripe_subscription_id, credits_balance.

### audit_logs
actor_id, workspace_id, action, target_type, target_id, meta, created_at. **idx (workspace_id, created_at)**.

### Relazioni in breve
workspace 1—N agents · agent 1—N agent_prompts/agent_tools · workspace 1—N workflows · workflow 1—N nodes/edges · conversation 1—N messages · lead 1—N conversations/bookings.

---

## 6. Roadmap MVP (4 settimane) — versione "per te"

> Aggiornata dopo la verifica live di Bookedin (§1.bis): **wizard guidato come esperienza principale**, canvas React Flow declassato a vista avanzata. Più "Objective Met" come metrica centrale e trigger automatici di stage.

**Settimana 1 — Fondamenta + Agente**
Auth (Supabase) · Dashboard con KPI mock→reali · Creazione agente minimale (solo nome) + editor a sezioni · Prompt editor con generazione system prompt + **AI Enhance** (Claude riscrive il prompt su richiesta) · Campo "Obiettivo" obbligatorio sull'agente · **Chat preview con AI reale** (Claude) sempre visibile a fianco. ✅ obiettivo: parlare col tuo agente barbiere.

**Settimana 2 — Lead & Booking reale**
Lead inbox · Conversazioni persistite · **Pipeline kanban con avanzamento automatico** (nuovo → contattato quando l'agente scrive → ingaggiato quando il lead risponde → qualificato quando l'obiettivo è raggiunto) · **Google Calendar OAuth + create event reale** · Tool `check_availability` e `create_booking` collegati al function calling · Estrazione automatica campi lead dalle conversazioni (nome, telefono, servizio). ✅ obiettivo: l'agente prenota davvero sul tuo calendario e i lead si muovono da soli.

**Settimana 3 — Wizard "Crea Sistema" + Follow-up**
**Wizard guidato a step** (template: Receptionist Barbiere · Receptionist Hotel · Riattivazione clienti) → nome → canali → agente → calendario → genera il sistema con diagramma lineare `Contatti → Agente → Risultati` · Sequenze follow-up come lista ordinata di passi (non canvas) · Esecuzione base via queue · Email reale (Resend) + SMS (Twilio, anche solo sandbox) · Logs. ✅ obiettivo: follow-up automatico "non hai prenotato → SMS dopo 1h". *(React Flow come vista avanzata facoltativa, solo se avanza tempo.)*

**Settimana 4 — Rifinitura**
Analytics con **"Obiettivi raggiunti"** come metrica centrale + funnel ingaggio (contattati → risposte → obiettivo) · Settings + integrazioni · Deploy su Vercel + Supabase. (Client portal e billing → rimandati a quando rivendi.)

> **Suggerimento di automazione/ripetibilità:** la generazione del system prompt da "tipo agente + dati azienda" è perfetta da incapsulare in una **Claude Skill** dedicata (es. `wafiq-agent-prompt`), così riusi la stessa logica nel barbiere, nell'hotel e per futuri clienti senza riscriverla. Quando avrai 3-4 agenti reali in produzione, rivedi questa skill e le tue preferenze in base a cosa funziona davvero.

---

## 7. Codice iniziale
Vedi lo scaffold Next.js allegato (`wafiq-scaffold/`) e il prototipo UI navigabile (`wafiq-prototype.html`). Lo scaffold contiene struttura cartelle, layout dashboard, sidebar, le pagine Agent Builder / Workflow / Inbox / Analytics / Settings, schema SQL, API routes di esempio, prompt agenti di esempio e demo data.
