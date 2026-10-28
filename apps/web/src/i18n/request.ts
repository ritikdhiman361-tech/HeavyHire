import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

// Loads the right translation file (messages/en.json or hi.json) for each request.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    timeZone: "Asia/Kolkata",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
