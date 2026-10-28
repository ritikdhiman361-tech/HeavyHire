import { defineConfig } from "tsup";

// Bundles the server into dist/index.js for production.
// The shared package is bundled in (it's TypeScript source, not on npm).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  noExternal: ["@heavyhire/shared"],
  sourcemap: true,
  clean: true,
});
