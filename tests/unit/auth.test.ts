import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  ADMIN_SESSION_SECONDS,
  PLAYER_SESSION_SECONDS,
  createSessionToken,
  dropAdmin,
  elevateToAdmin,
  newPlayerPayload,
  safeRedirectPath,
  verifySessionToken,
} from "@/lib/auth/session-token";
import { isAllowedAssetPath } from "@/lib/assets";
import { themeToCssVars } from "@/lib/theme";

const SECRET = "test-secret-test-secret-test-secret-1234";
const NOW = 1_800_000_000;

describe("password hashing", () => {
  it("verifies the right password and rejects wrong ones", async () => {
    const hash = await hashPassword("Drachenhort!42");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(hash).not.toContain("Drachenhort");
    expect(hash).not.toContain("$"); // safe inside .env files
    expect(await verifyPassword("Drachenhort!42", hash)).toBe(true);
    expect(await verifyPassword("drachenhort!42", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("uses a random salt", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("returns false for malformed verifiers instead of throwing", async () => {
    for (const bad of ["", "plaintext", "scrypt:1:2", "scrypt:x:8:1:AAAA:BBBB", "scrypt:99999999999:8:1:AAAAAAAAAAAA:BBBB"]) {
      expect(await verifyPassword("pw", bad)).toBe(false);
    }
  });
});

describe("session tokens", () => {
  const playerToken = createSessionToken(newPlayerPayload(NOW), SECRET);

  it("accepts a valid player token", () => {
    expect(verifySessionToken(playerToken, SECRET, NOW + 10)).toMatchObject({ role: "player" });
  });

  it("rejects missing, garbage, tampered and wrongly signed tokens", () => {
    expect(verifySessionToken(undefined, SECRET, NOW)).toBeNull();
    expect(verifySessionToken("", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("a.b.c", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("garbage", SECRET, NOW)).toBeNull();
    expect(verifySessionToken(playerToken, "another-secret-another-secret-another-1", NOW)).toBeNull();
    expect(verifySessionToken(playerToken, "", NOW)).toBeNull();

    // Forge an admin payload but keep the player signature.
    const forgedBody = Buffer.from(JSON.stringify({ v: 1, exp: NOW + 999, adminExp: NOW + 999 })).toString("base64url");
    const forged = `${forgedBody}.${playerToken.split(".")[1]}`;
    expect(verifySessionToken(forged, SECRET, NOW)).toBeNull();
    // Unsigned token.
    expect(verifySessionToken(`${forgedBody}.`, SECRET, NOW)).toBeNull();
  });

  it("expires", () => {
    expect(verifySessionToken(playerToken, SECRET, NOW + PLAYER_SESSION_SECONDS - 1)).not.toBeNull();
    expect(verifySessionToken(playerToken, SECRET, NOW + PLAYER_SESSION_SECONDS)).toBeNull();
  });

  it("admin elevation is time-limited and falls back to player", () => {
    const session = verifySessionToken(playerToken, SECRET, NOW)!;
    const adminToken = createSessionToken(elevateToAdmin(session, NOW), SECRET);
    expect(verifySessionToken(adminToken, SECRET, NOW + 60)?.role).toBe("admin");
    expect(verifySessionToken(adminToken, SECRET, NOW + ADMIN_SESSION_SECONDS + 1)?.role).toBe("player");
    const dropped = createSessionToken(dropAdmin(verifySessionToken(adminToken, SECRET, NOW)!), SECRET);
    expect(verifySessionToken(dropped, SECRET, NOW + 60)?.role).toBe("player");
  });

  it("only allows same-site redirect targets", () => {
    expect(safeRedirectPath("/campaigns/x", "/campaigns")).toBe("/campaigns/x");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)", "", null, 5]) {
      expect(safeRedirectPath(bad, "/campaigns")).toBe("/campaigns");
    }
  });
});

describe("asset paths and theme output", () => {
  it("accepts only relative paths below /images", () => {
    expect(isAllowedAssetPath("/images/items/potion.svg")).toBe(true);
    for (const bad of [
      "https://example.com/a.png",
      "//example.com/a.png",
      "/images/../secret.svg",
      "/images/items/a.svg?x=1",
      "images/items/a.svg",
      "/images/items/a.exe",
      "/images/items/A b.svg",
      'url("javascript:1")',
    ]) {
      expect(isAllowedAssetPath(bad)).toBe(false);
    }
  });

  it("never passes unvalidated values into CSS variables", () => {
    const vars = themeToCssVars({
      primaryColor: "red; background:url(https://evil.example)",
      secondaryColor: "#123456",
      accentColor: "#abcdef",
      backgroundColor: "#ffffff",
      fontPreset: "'; injected",
      backgroundImagePath: "https://evil.example/x.png",
      layoutPreset: "cards",
    }) as Record<string, string>;
    expect(vars["--primary"]).toBe("#9d382c");
    expect(vars["--bg-image"]).toBe("none");
    expect(vars["--font-heading"]).toContain("Cinzel");
    // Light background -> dark text for contrast.
    expect(vars["--foreground"]).toBe("#1a1512");
  });
});
