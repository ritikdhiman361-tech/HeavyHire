import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The shared package is TypeScript source, so Next.js compiles it too.
  transpilePackages: ["@heavyhire/shared"],
};

export default withNextIntl(nextConfig);
