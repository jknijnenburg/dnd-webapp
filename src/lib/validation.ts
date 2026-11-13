import { z } from "zod";
import { isAllowedAssetPath } from "./assets";

/** Shared Zod building blocks for server-side input validation (German messages). */
export const idSchema = z.uuid("Ungültige ID.");

export const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} darf höchstens ${max} Zeichen lang sein.`);

export const requiredText = (max: number, label: string) =>
  text(max, label).min(1, `${label} ist erforderlich.`);

/** Empty string -> null, otherwise trimmed text. */
export const optionalText = (max: number, label: string) =>
  text(max, label).transform((v) => (v === "" ? null : v));

/** Empty string -> null, otherwise an allowed relative path below /images. */
export const optionalAssetPath = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || isAllowedAssetPath(v), "Bitte ein Bild aus dem Katalog wählen (Pfad unter /images/…).");

export const intInRange = (min: number, max: number, label: string) =>
  z.coerce
    .number<string | number>(`${label} muss eine ganze Zahl sein.`)
    .int(`${label} muss eine ganze Zahl sein.`)
    .min(min, `${label} muss mindestens ${min} sein.`)
    .max(max, `${label} darf höchstens ${max} sein.`);

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) result[key] = value;
  }
  return result;
}
