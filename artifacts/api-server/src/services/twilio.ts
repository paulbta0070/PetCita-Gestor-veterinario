import { ReplitConnectors } from "@replit/connectors-sdk";

const whatsappAddress = (value: string) =>
  value.startsWith("whatsapp:") ? value : `whatsapp:${value}`;

const accountSid = () => process.env.TWILIO_ACCOUNT_SID?.trim();
const whatsappFrom = () => process.env.TWILIO_WHATSAPP_FROM?.trim();

export function getTwilioStatus() {
  return {
    provider: "Twilio",
    connected: true,
    configuredForSending: Boolean(accountSid() && whatsappFrom()),
    whatsappFrom: whatsappFrom() ? "configured" : null,
    webhookPath: "/api/webhooks/twilio/whatsapp",
    missingConfiguration: [
      !accountSid() ? "TWILIO_ACCOUNT_SID" : null,
      !whatsappFrom() ? "TWILIO_WHATSAPP_FROM" : null,
    ].filter(Boolean),
  };
}

export async function sendWhatsappMessage(to: string, body: string) {
  const sid = accountSid();
  const from = whatsappFrom();
  if (!sid || !from) {
    return {
      delivered: false,
      reason: "missing_configuration" as const,
    };
  }

  const connectors = new ReplitConnectors();
  const response = await connectors.proxy(
    "twilio",
    `/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        To: whatsappAddress(to),
        From: whatsappAddress(from),
        Body: body,
      }).toString(),
    },
  );
  const raw = await response.text();
  let payload: unknown = raw;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Twilio may return a plain text error through the connector proxy.
  }

  if (!response.ok) {
    throw new Error(`Twilio no pudo enviar el mensaje (${response.status})`);
  }

  return {
    delivered: true,
    messageSid:
      typeof payload === "object" && payload !== null && "sid" in payload
        ? String(payload.sid)
        : null,
  };
}

export function twimlMessage(message: string) {
  const escaped = message
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}