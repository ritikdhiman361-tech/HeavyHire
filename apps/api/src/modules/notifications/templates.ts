// Every WhatsApp message HeavyHire sends, in English and Hindi.
//
// IMPORTANT for production: create a WhatsApp template in the MSG91 dashboard
// for each entry, with the same NAME and the variables {{1}}, {{2}}... in the
// same ORDER as `params`. The `en`/`hi` text below is what to submit for approval.

export interface TemplateData {
  bookingNo?: string;
  machine?: string;
  when?: string;
  place?: string;
  amount?: string;
  name?: string;
  phone?: string;
  reason?: string;
  link?: string;
}

interface Template {
  params: (keyof TemplateData)[];
  en: string;
  hi: string;
}

export const templates = {
  booking_requested: {
    params: ["bookingNo", "machine", "when", "place", "link"],
    en: "🚜 New booking {{1}}: {{2}} on {{3}} at {{4}}. Please accept within 2 hours: {{5}}",
    hi: "🚜 नई बुकिंग {{1}}: {{2}}, {{3}} को {{4}} में। कृपया 2 घंटे में स्वीकार करें: {{5}}",
  },
  booking_confirmed: {
    params: ["bookingNo", "machine", "when", "name", "phone"],
    en: "✅ Booking {{1}} confirmed! {{2}} on {{3}}. Operator: {{4}} ({{5}}).",
    hi: "✅ बुकिंग {{1}} पक्की हो गई! {{2}}, {{3}} को। ऑपरेटर: {{4}} ({{5}})।",
  },
  booking_rejected: {
    params: ["bookingNo", "machine", "amount"],
    en: "Sorry, {{2}} is not available for booking {{1}}. Your refund of {{3}} has started (3–5 days).",
    hi: "माफ़ कीजिए, बुकिंग {{1}} के लिए {{2}} उपलब्ध नहीं है। आपका {{3}} का रिफंड शुरू हो गया है (3–5 दिन)।",
  },
  booking_expired: {
    params: ["bookingNo", "machine", "amount"],
    en: "The owner of {{2}} did not reply for booking {{1}}. Your refund of {{3}} has started (3–5 days).",
    hi: "{{2}} के मालिक ने बुकिंग {{1}} का जवाब नहीं दिया। आपका {{3}} का रिफंड शुरू हो गया है (3–5 दिन)।",
  },
  booking_cancelled: {
    params: ["bookingNo", "machine", "reason"],
    en: "Booking {{1}} for {{2}} was cancelled. {{3}}",
    hi: "{{2}} की बुकिंग {{1}} रद्द कर दी गई। {{3}}",
  },
  booking_on_the_way: {
    params: ["bookingNo", "machine", "name", "phone"],
    en: "🚚 {{2}} is on the way for booking {{1}}. Operator {{3}}: {{4}}",
    hi: "🚚 बुकिंग {{1}} के लिए {{2}} रास्ते में है। ऑपरेटर {{3}}: {{4}}",
  },
  booking_working: {
    params: ["bookingNo", "machine"],
    en: "🔧 {{2}} has reached your site and started work (booking {{1}}).",
    hi: "🔧 {{2}} आपकी साइट पर पहुँच गई है और काम शुरू हो गया है (बुकिंग {{1}})।",
  },
  booking_completed: {
    params: ["bookingNo", "machine", "link"],
    en: "🎉 Job done for booking {{1}} ({{2}}). Please rate your experience: {{3}}",
    hi: "🎉 बुकिंग {{1}} ({{2}}) का काम पूरा हुआ। कृपया अपना अनुभव बताएं: {{3}}",
  },
  vendor_reminder: {
    params: ["bookingNo", "machine", "when", "place"],
    en: "⏰ Reminder: booking {{1}} — {{2}} at {{3}}, {{4}}.",
    hi: "⏰ याद दिलाना: बुकिंग {{1}} — {{2}}, {{3}} को, {{4}}।",
  },
  vendor_approved: {
    params: ["name", "link"],
    en: "🎉 Welcome to HeavyHire, {{1}}! Your account is approved. Add your machines: {{2}}",
    hi: "🎉 HeavyHire में आपका स्वागत है, {{1}}! आपका खाता मंज़ूर हो गया है। अपनी मशीनें जोड़ें: {{2}}",
  },
  vendor_rejected: {
    params: ["reason", "link"],
    en: "Your HeavyHire vendor account needs changes: {{1}}. Update here: {{2}}",
    hi: "आपके HeavyHire वेंडर खाते में बदलाव ज़रूरी हैं: {{1}}। यहाँ अपडेट करें: {{2}}",
  },
  machine_approved: {
    params: ["machine"],
    en: "✅ Your {{1}} is now live on HeavyHire. You'll get a message when someone books it.",
    hi: "✅ आपकी {{1}} अब HeavyHire पर दिख रही है। बुकिंग आने पर आपको संदेश मिलेगा।",
  },
  machine_rejected: {
    params: ["machine", "reason", "link"],
    en: "Your {{1}} listing needs changes: {{2}}. Update here: {{3}}",
    hi: "आपकी {{1}} की लिस्टिंग में बदलाव ज़रूरी हैं: {{2}}। यहाँ अपडेट करें: {{3}}",
  },
} satisfies Record<string, Template>;

export type TemplateName = keyof typeof templates;

/** Fills {{1}}, {{2}}... with the values, for logs and dev-mode previews. */
export function renderTemplate(name: TemplateName, lang: "en" | "hi", data: TemplateData) {
  const t: Template = templates[name];
  const params = t.params.map((key) => data[key] || "-");
  const text = t[lang].replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
  return { params, text };
}
