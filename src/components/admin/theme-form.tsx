"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { FALLBACK_ITEM_IMAGE } from "@/lib/assets";
import { FONT_PRESETS, FONT_PRESET_LABELS, LAYOUT_PRESETS, LAYOUT_PRESET_LABELS } from "@/lib/constants";
import { DEFAULT_THEME, contrastRatio, isHexColor, readableTextOn, themeToCssVars, type ThemeConfig } from "@/lib/theme";
import { ActionForm, Field, SubmitButton } from "@/components/action-form";
import { AssetSelect } from "@/components/asset-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { DayBadge, RarityBadge } from "@/components/misc";

const COLOR_FIELDS = [
  { key: "primaryColor", label: "Primärfarbe", hint: "Überschriften-Akzente, Schaltflächen, Preise" },
  { key: "secondaryColor", label: "Sekundärfarbe", hint: "Sekundäre Schaltflächen" },
  { key: "accentColor", label: "Akzentfarbe", hint: "Hervorhebungen" },
  { key: "backgroundColor", label: "Hintergrundfarbe", hint: "Seitenhintergrund; die Textfarbe passt sich automatisch an" },
] as const;

interface ThemeFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  theme: ThemeConfig;
  campaignName: string;
  currentDay: number;
  backgrounds: readonly string[];
}

export function ThemeForm({ action, theme: initial, campaignName, currentDay, backgrounds }: ThemeFormProps) {
  const [theme, setTheme] = useState<ThemeConfig>(initial);
  const set = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => setTheme((t) => ({ ...t, [key]: value }));
  const background = isHexColor(theme.backgroundColor) ? theme.backgroundColor : DEFAULT_THEME.backgroundColor;
  const primary = isHexColor(theme.primaryColor) ? theme.primaryColor : DEFAULT_THEME.primaryColor;
  const textContrast = contrastRatio(readableTextOn(background), background);
  const primaryContrast = contrastRatio(primary, background);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ActionForm action={action} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map(({ key, label, hint }) => (
            <Field key={key} name={key} label={label} hint={hint}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${label} wählen`}
                  value={isHexColor(theme[key]) ? theme[key] : "#000000"}
                  onChange={(e) => set(key, e.target.value)}
                  className="size-10 shrink-0 rounded-md border border-border bg-transparent"
                />
                <Input
                  id={key}
                  name={key}
                  value={theme[key]}
                  onChange={(e) => set(key, e.target.value)}
                  maxLength={7}
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
            </Field>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="fontPreset" label="Schriftstil">
            <NativeSelect id="fontPreset" name="fontPreset" value={theme.fontPreset} onChange={(e) => set("fontPreset", e.target.value)}>
              {FONT_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {FONT_PRESET_LABELS[preset]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field name="layoutPreset" label="Layout" hint="Bestimmt die Darstellung von Händlern und Waren.">
            <NativeSelect id="layoutPreset" name="layoutPreset" value={theme.layoutPreset} onChange={(e) => set("layoutPreset", e.target.value)}>
              {LAYOUT_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {LAYOUT_PRESET_LABELS[preset]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field name="backgroundImagePath" label="Hintergrundbild" hint="Gekacheltes Muster aus public/images/backgrounds.">
          <AssetSelect
            id="backgroundImagePath"
            name="backgroundImagePath"
            assets={backgrounds}
            defaultValue={initial.backgroundImagePath}
            emptyLabel="Kein Hintergrundbild"
            fallbackPreview={FALLBACK_ITEM_IMAGE}
            onValueChange={(value) => set("backgroundImagePath", value || null)}
          />
        </Field>

        {(textContrast < 4.5 || primaryContrast < 3) && (
          <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Achtung: geringer Kontrast
            {primaryContrast < 3 ? " zwischen Primär- und Hintergrundfarbe" : ""}. Texte könnten schwer lesbar sein.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <SubmitButton>Design speichern</SubmitButton>
          <Button type="button" variant="outline" onClick={() => setTheme({ ...DEFAULT_THEME, backgroundImagePath: theme.backgroundImagePath })}>
            Standardfarben einsetzen
          </Button>
        </div>
      </ActionForm>

      <section aria-label="Vorschau" className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 text-sm font-semibold text-muted">Vorschau (noch nicht gespeichert)</p>
        <div style={themeToCssVars(theme)} className="theme-scope campaign-backdrop overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-3">
            <span className="truncate font-display text-lg font-semibold">{campaignName}</span>
            <DayBadge day={currentDay} />
          </div>
          <div className="space-y-4 p-4">
            <h3 className="text-xl font-semibold">Händler</h3>
            {theme.layoutPreset === "compact" ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/95">
                {["Heiltrank", "Langschwert"].map((name, i) => (
                  <li key={name} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>
                      <span className="font-semibold">{name}</span>
                      <span className="ml-2 text-sm text-muted">{i === 0 ? "Trank" : "Waffe"}</span>
                    </span>
                    <span className="font-display font-semibold text-primary">{i === 0 ? "50 GM" : "15 GM"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {["Heiltrank", "Langschwert"].map((name, i) => (
                  <div key={name} className="rounded-lg border border-border bg-surface/95 p-3">
                    <p className="font-display font-semibold">{name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="muted">{i === 0 ? "Trank" : "Waffe"}</Badge>
                      <RarityBadge rarity={i === 0 ? "common" : "uncommon"} />
                    </div>
                    <p className="mt-2 text-sm text-muted">Beispieltext für eine Beschreibung.</p>
                    <p className="mt-2 text-right font-display font-semibold text-primary">{i === 0 ? "50 GM" : "15 GM"}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" tabIndex={-1}>
                <Store aria-hidden /> Primär
              </Button>
              <Button type="button" size="sm" variant="secondary" tabIndex={-1}>
                Sekundär
              </Button>
              <span className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground">Akzent</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
