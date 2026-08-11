import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/lib/server-only.test-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "**/.tmp/**", "**/*.rules.test.ts", "e2e/**"],
  },
});
