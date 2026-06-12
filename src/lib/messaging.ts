import { Resend } from "resend";
import twilio from "twilio";

export type Channel = "email" | "sms" | "whatsapp" | "webchat";

export type SendMessageOpts = {
  channel: Channel;
  to: string;
  message: string;
  leadName?: string;
  subject?: string;
};

export type SendResult = {
  ok: boolean;
  provider: string;
  error?: string;
};

export async function sendMessage(opts: SendMessageOpts): Promise<SendResult> {
  if (!opts.to) {
    return { ok: false, provider: opts.channel, error: "Nessun destinatario" };
  }

  switch (opts.channel) {
    case "email":    return sendEmail(opts);
    case "sms":      return sendSMS(opts);
    case "whatsapp": return sendWhatsApp(opts);
    case "webchat":
      // webchat: il messaggio viene consegnato al prossimo polling
      console.log(`[messaging] webchat → ${opts.to}: ${opts.message}`);
      return { ok: true, provider: "webchat" };
    default:
      return { ok: false, provider: opts.channel, error: "Canale non supportato" };
  }
}

async function sendEmail(opts: SendMessageOpts): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[messaging] email stub → ${opts.to}: ${opts.message}`);
    return { ok: true, provider: "resend-stub" };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Wafiq Agents <noreply@wafiqagents.com>",
      to: opts.to,
      subject: opts.subject ?? "Messaggio da Wafiq Agents",
      text: opts.message,
    });
    if (error) return { ok: false, provider: "resend", error: error.message };
    return { ok: true, provider: "resend" };
  } catch (e: any) {
    return { ok: false, provider: "resend", error: e?.message };
  }
}

async function sendSMS(opts: SendMessageOpts): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    console.log(`[messaging] SMS stub → ${opts.to}: ${opts.message}`);
    return { ok: true, provider: "twilio-stub" };
  }
  try {
    const client = twilio(sid, token);
    await client.messages.create({ from, to: opts.to, body: opts.message });
    return { ok: true, provider: "twilio-sms" };
  } catch (e: any) {
    return { ok: false, provider: "twilio-sms", error: e?.message };
  }
}

async function sendWhatsApp(opts: SendMessageOpts): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    console.log(`[messaging] WhatsApp stub → ${opts.to}: ${opts.message}`);
    return { ok: true, provider: "twilio-stub" };
  }
  try {
    const client = twilio(sid, token);
    await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${opts.to}`,
      body: opts.message,
    });
    return { ok: true, provider: "twilio-whatsapp" };
  } catch (e: any) {
    return { ok: false, provider: "twilio-whatsapp", error: e?.message };
  }
}

/** Verifica se i provider sono configurati */
export function getProviderStatus() {
  return {
    email: !!process.env.RESEND_API_KEY,
    sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM),
    whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM),
  };
}
