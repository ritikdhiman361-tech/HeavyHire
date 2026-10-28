import { env, features } from "../config/env";
import { logger } from "./logger";

// MSG91 sends our OTP SMS and WhatsApp messages (Indian provider, DLT-compliant).
// Without keys (development), messages are printed in the terminal instead.

const toMsg91Number = (phone: string) => phone.replace(/^\+/, ""); // +9198.. → 9198..

/** Sends the login OTP by SMS using your DLT-approved MSG91 OTP template. */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (!features.sms) {
    logger.warn(`📱 [DEV MODE] OTP for ${phone} is ${code}`);
    return;
  }
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", env.MSG91_OTP_TEMPLATE_ID!);
  url.searchParams.set("mobile", toMsg91Number(phone));
  url.searchParams.set("otp", code);
  url.searchParams.set("otp_expiry", "5");

  const res = await fetch(url, { method: "POST", headers: { authkey: env.MSG91_AUTH_KEY! } });
  const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
  if (!res.ok || body.type === "error") {
    throw new Error(`MSG91 OTP failed: ${body.message ?? res.status}`);
  }
}

/**
 * Sends a WhatsApp template message. Templates must first be created and
 * approved in the MSG91 dashboard with the SAME name and number of variables
 * as in src/modules/notifications/templates.ts.
 */
export async function sendWhatsApp(
  phone: string,
  template: string,
  language: "en" | "hi",
  params: string[],
  previewText: string,
): Promise<void> {
  if (!features.whatsapp) {
    logger.info(`💬 [DEV MODE] WhatsApp to ${phone} (${template}):\n${previewText}`);
    return;
  }

  // Template variables are sent as body_1, body_2, ... in MSG91's format.
  const components = Object.fromEntries(params.map((value, i) => [`body_${i + 1}`, { type: "text", value }]));

  const res = await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
    method: "POST",
    headers: { authkey: env.MSG91_AUTH_KEY!, "content-type": "application/json" },
    body: JSON.stringify({
      integrated_number: env.MSG91_WHATSAPP_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: template,
          language: { code: language, policy: "deterministic" },
          to_and_components: [{ to: [toMsg91Number(phone)], components }],
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`MSG91 WhatsApp failed: ${res.status} ${await res.text()}`);
}
