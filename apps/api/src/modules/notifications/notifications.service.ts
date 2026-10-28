import { prisma } from "../../lib/prisma";
import { sendWhatsApp } from "../../lib/msg91";
import { logger } from "../../lib/logger";
import { renderTemplate, type TemplateData, type TemplateName } from "./templates";

/**
 * Sends a WhatsApp message to a user in THEIR language and logs it.
 * Never throws: a failed message must not break a booking or payment.
 * Call it without await if you don't want to wait:  void notify(...)
 */
export async function notify(userId: string, template: TemplateName, data: TemplateData): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, language: true } });
    if (!user) return;

    const lang = user.language === "HI" ? "hi" : "en";
    const { params, text } = renderTemplate(template, lang, data);
    const log = await prisma.notification.create({
      data: { userId, channel: "WHATSAPP", template, payload: { ...data, lang } },
    });

    try {
      await sendWhatsApp(user.phone, template, lang, params, text);
      await prisma.notification.update({ where: { id: log.id }, data: { status: "SENT" } });
    } catch (err) {
      await prisma.notification.update({
        where: { id: log.id },
        data: { status: "FAILED", error: String((err as Error).message).slice(0, 500) },
      });
      throw err;
    }
  } catch (err) {
    logger.error({ err, userId, template }, "Notification failed");
  }
}
