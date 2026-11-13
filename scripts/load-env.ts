// Loads .env.local / .env for CLI scripts (Next.js does this itself at runtime).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* file not present */
  }
}
