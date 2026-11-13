import type { CSSProperties } from "react";
import { isAllowedAssetPath } from "./assets";
import { FONT_PRESETS, LAYOUT_PRESETS, type FontPreset, type LayoutPreset } from "./constants";

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontPreset: string;
  backgroundImagePath: string | null;
  layoutPreset: string;
}

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#9d382c",
  secondaryColor: "#735037",
  accentColor: "#16756b",
  backgroundColor: "#efdcaf",
  fontPreset: "classic",
  backgroundImagePath: "/images/backgrounds/paper-grain.svg",
  layoutPreset: "cards",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export function isHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

function channel(hex: string, index: number): number {
  const c = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT_TEXT = "#f3ead7";
const DARK_TEXT = "#1a1512";

/** Picks the readable text colour for an arbitrary background. */
export function readableTextOn(background: string): string {
  return contrastRatio(LIGHT_TEXT, background) >= contrastRatio(DARK_TEXT, background)
    ? LIGHT_TEXT
    : DARK_TEXT;
}

const FONT_STACKS: Record<FontPreset, { heading: string; body: string }> = {
  classic: {
    heading: "'Cinzel Variable', 'Times New Roman', serif",
    body: "'Crimson Pro Variable', Georgia, serif",
  },
  chronicle: {
    heading: "'Cormorant Variable', Georgia, serif",
    body: "'Crimson Pro Variable', Georgia, serif",
  },
  modern: {
    heading: "'Inter Variable', system-ui, sans-serif",
    body: "'Inter Variable', system-ui, sans-serif",
  },
};

export function normalizeFontPreset(value: string): FontPreset {
  return (FONT_PRESETS as readonly string[]).includes(value) ? (value as FontPreset) : "classic";
}
export function normalizeLayoutPreset(value: string): LayoutPreset {
  return (LAYOUT_PRESETS as readonly string[]).includes(value) ? (value as LayoutPreset) : "cards";
}

/**
 * Converts a stored theme into a controlled set of CSS custom properties.
 * Every value is validated again here, so nothing free-form reaches `style`.
 */
export function themeToCssVars(theme: ThemeConfig): CSSProperties {
  const safe = (value: string, fallback: string) => (isHexColor(value) ? value : fallback);
  // Give campaigns using the original stock palette the new art direction.
  // Explicitly customized campaign palettes remain editable and are preserved.
  const stockPalette = theme.backgroundColor.toLowerCase() === "#14110f"
    && theme.primaryColor.toLowerCase() === "#c9a227"
    && theme.secondaryColor.toLowerCase() === "#7a4b2a"
    && theme.accentColor.toLowerCase() === "#8f2d2d";
  const palette = stockPalette ? DEFAULT_THEME : theme;
  const background = safe(palette.backgroundColor, DEFAULT_THEME.backgroundColor);
  const primary = safe(palette.primaryColor, DEFAULT_THEME.primaryColor);
  const secondary = safe(palette.secondaryColor, DEFAULT_THEME.secondaryColor);
  const accent = safe(palette.accentColor, DEFAULT_THEME.accentColor);
  const fonts = FONT_STACKS[normalizeFontPreset(theme.fontPreset)];
  const image =
    theme.backgroundImagePath && isAllowedAssetPath(theme.backgroundImagePath)
      ? `url("${theme.backgroundImagePath}")`
      : "none";
  return {
    colorScheme: relativeLuminance(background) > 0.179 ? "light" : "dark",
    "--background": background,
    "--foreground": readableTextOn(background),
    "--primary": primary,
    "--primary-foreground": readableTextOn(primary),
    "--secondary": secondary,
    "--secondary-foreground": readableTextOn(secondary),
    "--accent": accent,
    "--accent-foreground": readableTextOn(accent),
    "--font-heading": fonts.heading,
    "--font-body": fonts.body,
    "--bg-image": image,
  } as CSSProperties;
}
