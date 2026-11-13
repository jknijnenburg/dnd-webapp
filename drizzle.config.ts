import { defineConfig } from "drizzle-kit";

// Load .env.local / .env for CLI usage (Next.js loads them itself at runtime).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* file not present */
  }
}

// Migrations should use a direct (non-pooled) connection when one is available.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
});
