import { z } from "zod";

/**
 * Server-side configuration. Values are read lazily so that `next build`
 * works without secrets; every consumer gets a clear error at request time.
 * Never expose any of these through NEXT_PUBLIC_ variables.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PLAYER_PASSWORD_HASH: z.string().startsWith("scrypt:"),
  ADMIN_PASSWORD_HASH: z.string().startsWith("scrypt:"),
  SESSION_SECRET: z.string().min(32),
});

export type ServerEnv = z.infer<typeof envSchema>;
export type EnvKey = keyof ServerEnv;

export class ConfigError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing or invalid server configuration: ${missing.join(", ")}`);
    this.name = "ConfigError";
  }
}

const validators: { [K in EnvKey]: z.ZodType<ServerEnv[K]> } = envSchema.shape;

/** Returns the requested variables or throws a ConfigError naming (only) the keys. */
export function getEnv<K extends EnvKey>(...keys: K[]): Pick<ServerEnv, K> {
  const result: Partial<ServerEnv> = {};
  const missing: string[] = [];
  for (const key of keys) {
    const parsed = validators[key].safeParse(process.env[key]);
    if (parsed.success) result[key] = parsed.data;
    else missing.push(key);
  }
  if (missing.length > 0) throw new ConfigError(missing);
  return result as Pick<ServerEnv, K>;
}

export function missingEnvKeys(): string[] {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return [];
  return [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
}
