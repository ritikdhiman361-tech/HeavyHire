import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://localhost:5432/heavyhire_test",
      JWT_ACCESS_SECRET: "test-secret-test-secret-test-secret-123",
      FILE_URL_SECRET: "test-file-secret-test-file-secret-1234",
    },
  },
});
