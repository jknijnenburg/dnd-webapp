import {
  FALLBACK_COVER_IMAGE,
  FALLBACK_ITEM_IMAGE,
  FALLBACK_SHOP_IMAGE,
  listAssets,
} from "@/lib/assets";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS, RARITIES, RARITY_LABELS } from "@/lib/constants";
import { CURRENCIES, CURRENCY_NAMES, copperToAmountString, isCurrency } from "@/lib/money";
import { Field } from "@/components/action-form";
import { AssetSelect } from "@/components/asset-select";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { NameSlugFields } from "./name-slug-fields";

export function CampaignFields({
  campaign,
  withStartDay,
}: {
  campaign?: { name: string; slug: string; description: string; coverImagePath: string | null };
  withStartDay?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NameSlugFields defaultName={campaign?.name} defaultSlug={campaign?.slug} />
      <Field name="description" label="Beschreibung" className="sm:col-span-2">
        <Textarea id="description" name="description" defaultValue={campaign?.description} maxLength={2000} rows={4} />
      </Field>
      <Field name="coverImagePath" label="Titelbild" hint="Auswahl aus public/images/covers.">
        <AssetSelect
          id="coverImagePath"
          name="coverImagePath"
          assets={listAssets("covers")}
          defaultValue={campaign?.coverImagePath ?? null}
          emptyLabel="Standardbild"
          fallbackPreview={FALLBACK_COVER_IMAGE}
        />
      </Field>
      {withStartDay && (
        <Field name="startDay" label="Starttag" hint="Der Tageszähler dieser Kampagne beginnt hier (empfohlen: 1).">
          <Input id="startDay" name="startDay" type="number" inputMode="numeric" min={0} step={1} defaultValue={1} required />
        </Field>
      )}
    </div>
  );
}

export function ShopFields({
  shop,
  currentDay,
}: {
  shop?: {
    name: string;
    description: string;
    merchantName: string | null;
    category: string | null;
    imagePath: string | null;
    refreshIntervalDays: number;
    nextRefreshDay: number;
    isVisible: boolean;
  };
  currentDay: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Name">
        <Input id="name" name="name" defaultValue={shop?.name} required maxLength={80} />
      </Field>
      <Field name="merchantName" label="Name des Händlers (optional)">
        <Input id="merchantName" name="merchantName" defaultValue={shop?.merchantName ?? ""} maxLength={80} />
      </Field>
      <Field name="description" label="Beschreibung" className="sm:col-span-2">
        <Textarea id="description" name="description" defaultValue={shop?.description} maxLength={2000} rows={3} />
      </Field>
      <Field name="category" label="Kategorie (optional)" hint="Frei wählbar, z. B. „Alchemie“ oder „Schmiede“. Dient als Filter.">
        <Input id="category" name="category" defaultValue={shop?.category ?? ""} maxLength={40} />
      </Field>
      <Field name="imagePath" label="Bild" hint="Auswahl aus public/images/shops.">
        <AssetSelect
          id="imagePath"
          name="imagePath"
          assets={listAssets("shops")}
          defaultValue={shop?.imagePath ?? null}
          emptyLabel="Standardbild"
          fallbackPreview={FALLBACK_SHOP_IMAGE}
        />
      </Field>
      <Field
        name="refreshIntervalDays"
        label="Sortimentswechsel alle … Spieltage"
        hint={
          shop
            ? `Nächster Wechsel aktuell an Tag ${shop.nextRefreshDay}. Wird das Intervall geändert, wird der nächste Wechsel neu ab dem heutigen Tag ${currentDay} berechnet (Tag ${currentDay} + Intervall).`
            : `Der erste Wechsel wird ab dem heutigen Tag ${currentDay} geplant (Tag ${currentDay} + Intervall).`
        }
      >
        <Input
          id="refreshIntervalDays"
          name="refreshIntervalDays"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          defaultValue={shop?.refreshIntervalDays ?? 7}
          required
        />
      </Field>
      <div className="flex items-start gap-3 rounded-md border border-border bg-background/40 p-3">
        <input
          id="isVisible"
          name="isVisible"
          type="checkbox"
          defaultChecked={shop?.isVisible ?? true}
          className="mt-1 size-4 accent-[var(--primary)]"
        />
        <label htmlFor="isVisible" className="text-sm">
          <span className="font-semibold">Für Spieler sichtbar</span>
          <span className="block text-muted">Unsichtbare Händler erscheinen nur in der Verwaltung.</span>
        </label>
      </div>
    </div>
  );
}

export function ItemFields({
  item,
}: {
  item?: {
    name: string;
    description: string;
    category: string;
    rarity: string;
    imagePath: string | null;
    basePriceCopper: number;
    displayCurrency: string;
    properties: string;
    dmNotes: string;
  };
}) {
  const currency = item && isCurrency(item.displayCurrency) ? item.displayCurrency : "gp";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Name" className="sm:col-span-2">
        <Input id="name" name="name" defaultValue={item?.name} required maxLength={120} />
      </Field>
      <Field name="category" label="Kategorie">
        <NativeSelect id="category" name="category" defaultValue={item?.category ?? "other"}>
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ITEM_CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field name="rarity" label="Seltenheit">
        <NativeSelect id="rarity" name="rarity" defaultValue={item?.rarity ?? "common"}>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {RARITY_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field name="priceAmount" label="Grundpreis" hint="Kommazahlen sind erlaubt (z. B. 2,5 GM). Gespeichert wird exakt in Kupfermünzen.">
        <div className="flex gap-2">
          <Input
            id="priceAmount"
            name="priceAmount"
            inputMode="decimal"
            defaultValue={item ? copperToAmountString(item.basePriceCopper, currency) : ""}
            required
            className="flex-1"
          />
          <NativeSelect name="priceCurrency" aria-label="Währung" defaultValue={currency} className="w-40">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_NAMES[c]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Field>
      <Field name="imagePath" label="Bild" hint="Ohne Auswahl wird ein Bild passend zur Kategorie gezeigt.">
        <AssetSelect
          id="imagePath"
          name="imagePath"
          assets={listAssets("items")}
          defaultValue={item?.imagePath ?? null}
          emptyLabel="Automatisch (nach Kategorie)"
          fallbackPreview={FALLBACK_ITEM_IMAGE}
        />
      </Field>
      <Field name="description" label="Beschreibung" hint="Reiner Text; Zeilenumbrüche bleiben erhalten." className="sm:col-span-2">
        <Textarea id="description" name="description" defaultValue={item?.description} maxLength={4000} rows={5} />
      </Field>
      <Field name="properties" label="Besondere Eigenschaften (optional)" hint="Für Spieler sichtbar.">
        <Textarea id="properties" name="properties" defaultValue={item?.properties} maxLength={2000} rows={3} />
      </Field>
      <Field name="dmNotes" label="Notizen der Spielleitung (optional)" hint="Nur in der Verwaltung sichtbar – wird nie an Spieler ausgeliefert.">
        <Textarea id="dmNotes" name="dmNotes" defaultValue={item?.dmNotes} maxLength={2000} rows={3} />
      </Field>
    </div>
  );
}
