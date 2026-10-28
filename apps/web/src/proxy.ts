import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Runs before every page: sends "/search" to "/en/search" (or "/hi/search"
// if the visitor chose Hindi before).
export default createMiddleware(routing);

export const config = {
  // Skip files (images, icons) and Next.js internals.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
