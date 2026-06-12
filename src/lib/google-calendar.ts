import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase";

export function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(workspaceId: string): string {
  const client = makeOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forza il refresh token anche se già autorizzato
    scope: ["https://www.googleapis.com/auth/calendar"],
    state: workspaceId,
  });
}

export async function getCalendarTokens(workspaceId: string) {
  const { data } = await supabaseAdmin
    .from("integrations")
    .select("credentials")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google_calendar")
    .eq("status", "connected")
    .single();
  return data?.credentials ?? null;
}

export async function getAuthenticatedCalendar(workspaceId: string) {
  const tokens = await getCalendarTokens(workspaceId);
  if (!tokens) return null;
  const auth = makeOAuth2Client();
  auth.setCredentials(tokens);
  return google.calendar({ version: "v3", auth });
}

export async function checkAvailability(
  workspaceId: string,
  date: string,
  service?: string
): Promise<string> {
  const calendar = await getAuthenticatedCalendar(workspaceId);
  if (!calendar) return "Calendario non connesso. Chiedi al cliente di scegliere un orario.";

  try {
    const day = new Date(date);
    const timeMin = new Date(day.setHours(9, 0, 0, 0)).toISOString();
    const timeMax = new Date(day.setHours(19, 0, 0, 0)).toISOString();

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      },
    });

    const busy = res.data.calendars?.primary?.busy ?? [];
    const slots: string[] = [];
    let current = new Date(timeMin);
    const end = new Date(timeMax);

    while (current < end) {
      const slotEnd = new Date(current.getTime() + 60 * 60 * 1000); // slot da 1h
      const isBusy = busy.some(b => {
        const bs = new Date(b.start!);
        const be = new Date(b.end!);
        return current < be && slotEnd > bs;
      });
      if (!isBusy) {
        slots.push(
          `${current.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}–${slotEnd.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
        );
      }
      current = slotEnd;
    }

    if (slots.length === 0) return `Nessuno slot libero il ${date}.`;
    return `Slot disponibili il ${date}: ${slots.join(", ")}.`;
  } catch {
    return "Errore nel controllare il calendario. Chiedi al cliente un orario preferito.";
  }
}

export async function createCalendarBooking(opts: {
  workspaceId: string;
  leadId?: string;
  agentId?: string;
  start: string;
  service: string;
  name: string;
  phone?: string;
}): Promise<{ eventId: string | null; bookingId: string | null }> {
  const calendar = await getAuthenticatedCalendar(opts.workspaceId);
  const startDate = new Date(opts.start);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1h default

  let eventId: string | null = null;

  if (calendar) {
    try {
      const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: `${opts.service} — ${opts.name}`,
          description: opts.phone ? `Tel: ${opts.phone}` : undefined,
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() },
        },
      });
      eventId = event.data.id ?? null;
    } catch {
      // Continua comunque a salvare la prenotazione su Supabase
    }
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .insert({
      workspace_id: opts.workspaceId,
      lead_id: opts.leadId ?? null,
      agent_id: opts.agentId ?? null,
      service: opts.service,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      status: "confirmed",
      external_event_id: eventId,
    })
    .select()
    .single();

  // Promuovi lead a "booked"
  if (opts.leadId) {
    await supabaseAdmin
      .from("leads")
      .update({ status: "booked" })
      .eq("id", opts.leadId);
  }

  return { eventId, bookingId: booking?.id ?? null };
}
