import { defineRouting } from "next-intl/routing";

// Every page exists in English and Hindi: /en/search and /hi/search.
export const routing = defineRouting({
  locales: ["en", "hi"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];
