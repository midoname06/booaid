# Wafiq Agents — Scaffold Next.js 15

AI Agent Builder no-code. Scaffold di partenza, pulito e scalabile.

## Stack
- Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui
- Framer Motion · React Flow (workflow builder)
- Supabase (Postgres + Auth + RLS) · pgvector (knowledge base)
- Layer AI provider-agnostico (Claude primario, OpenAI fallback)

## Struttura
```
src/
  app/
    (dashboard)/          # gruppo con sidebar condivisa
      layout.tsx
      dashboard/page.tsx
      agents/page.tsx     # Agent Builder + chat preview
      workflow/page.tsx   # React Flow
      inbox/page.tsx
      analytics/page.tsx
      settings/page.tsx
    api/
      agents/route.ts     # CRUD agenti
      chat/route.ts       # runtime agente (AI reale + function calling)
      bookings/route.ts   # Google Calendar
    layout.tsx · globals.css
  components/Sidebar.tsx · KpiCard.tsx
  lib/
    ai/provider.ts        # astrazione LLM
    ai/prompts.ts         # generazione system prompt
    supabase.ts
db/
  schema.sql              # schema completo + indici + RLS
  seed.sql                # demo data
```

## Avvio
```bash
npm install
cp .env.example .env.local   # inserisci le chiavi
# crea il DB su Supabase ed esegui db/schema.sql + db/seed.sql
npm run dev
```

## Ordine consigliato (vedi roadmap nel documento)
1. Auth + Dashboard + Agent Builder + chat preview (AI reale)
2. Booking Google Calendar reale (tool calling)
3. Workflow builder + queue
4. Analytics + deploy
