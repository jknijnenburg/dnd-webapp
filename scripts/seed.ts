/**
 * Optional sample data. Runs ONLY when invoked explicitly (`npm run db:seed`).
 * - Repeatable: a sample campaign whose slug already exists is skipped untouched.
 * - `npm run db:seed -- --reset` deletes and recreates ONLY the two sample campaigns.
 * - Never touches passwords, sessions or other campaigns.
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "../src/lib/db";
import { campaigns } from "../src/lib/db/schema";
import type { ItemCategory, Rarity } from "../src/lib/constants";
import { parsePriceToCopper, type Currency } from "../src/lib/money";
import type { ThemeInput } from "../src/features/campaigns/schemas";
import { createCampaign, deleteCampaign, updateTheme } from "../src/features/campaigns/service";
import { createItem } from "../src/features/items/service";
import { addItemToList, createInventoryList, createShop } from "../src/features/shops/service";

type SeedItem = [key: string, name: string, category: ItemCategory, rarity: Rarity, price: string, currency: Currency, description: string, properties?: string];
type SeedEntry = [itemKey: string, quantity: number, priceOverride?: string];
interface SeedShop {
  name: string;
  merchantName: string;
  category: string;
  imagePath: string;
  description: string;
  refreshIntervalDays: number;
  isVisible?: boolean;
  lists: { name: string; entries: SeedEntry[] }[];
}
interface SeedCampaign {
  slug: string;
  name: string;
  description: string;
  coverImagePath: string;
  startDay: number;
  theme: ThemeInput;
  items: SeedItem[];
  shops: SeedShop[];
}

const SAMPLE: SeedCampaign[] = [
  {
    slug: "asche-und-gold",
    name: "Asche & Gold",
    description:
      "Unter den rauchenden Gipfeln der Glutzinnen ringen Handelshäuser um die letzten Adern Sonnenerz.\nDie Gruppe hat ihr Lager in der Minenstadt Kesselgrund aufgeschlagen.",
    coverImagePath: "/images/covers/ember-peaks.svg",
    startDay: 12,
    theme: {
      primaryColor: "#c9a227",
      secondaryColor: "#7a4b2a",
      accentColor: "#8f2d2d",
      backgroundColor: "#14110f",
      fontPreset: "classic",
      layoutPreset: "cards",
      backgroundImagePath: "/images/backgrounds/parchment-dark.svg",
    },
    items: [
      ["heiltrank", "Kleiner Heiltrank", "potion", "common", "50", "gp", "Ein rubinrotes Elixier in einer bauchigen Phiole.\nSchließt kleinere Wunden binnen Augenblicken.", "Stellt beim Trinken etwas Lebenskraft wieder her."],
      ["glutsalbe", "Glutsalbe", "potion", "uncommon", "120", "gp", "Zähe, warm pulsierende Salbe aus Aschemoos.", "Schützt eine Stunde lang vor Kälte."],
      ["nebeltinktur", "Nebeltinktur", "potion", "uncommon", "90", "gp", "Wer sie entkorkt, hüllt sich in dichten grauen Dunst."],
      ["rauchbombe", "Rußkugel", "gear", "common", "15", "gp", "Tönerne Kugel, die beim Aufprall eine Rußwolke freisetzt."],
      ["gegengift", "Gegengift", "potion", "common", "25", "gp", "Bitterer Sud aus Kesselgrunder Bergkräutern."],
      ["langschwert", "Kesselgrunder Langschwert", "weapon", "common", "15", "gp", "Solide Klinge mit dem Hammerzeichen der Schmiedegilde."],
      ["glutklinge", "Glutklinge", "weapon", "rare", "1450", "gp", "Die Schneide glimmt wie Kohle kurz vor dem Erlöschen.", "Leuchtet schwach; verursacht zusätzlichen Feuerschaden."],
      ["wurfbeil", "Wurfbeil", "weapon", "common", "5", "gp", "Ausbalanciert für kurze Würfe."],
      ["kettenhemd", "Kettenhemd", "armor", "common", "50", "gp", "Geölte Ringe, sorgfältig vernietet."],
      ["aschenschild", "Aschenschild", "armor", "uncommon", "320", "gp", "Ein mit Vulkanglas beschlagener Rundschild.", "Gewährt Schutz gegen Funkenflug und Flammenodem."],
      ["bolzen", "Armbrustbolzen (20)", "gear", "common", "1", "gp", "Ein Bündel gefiederter Bolzen."],
      ["schriftrolle-licht", "Schriftrolle: Wanderndes Licht", "scroll", "common", "30", "gp", "Eng beschriebenes Pergament mit silbriger Tinte."],
      ["schriftrolle-bann", "Schriftrolle: Bannkreis", "scroll", "rare", "600", "gp", "Die Zeichen scheinen sich zu bewegen, wenn man nicht hinsieht."],
      ["karte-stollen", "Karte der Alten Stollen", "other", "uncommon", "75", "gp", "Unvollständig, aber die einzige ihrer Art.", "Zeigt drei verschüttete Eingänge."],
      ["siegelring", "Siegelring des Hauses Varn", "ring", "very_rare", "4000", "gp", "Schwerer Goldring mit eingeschnittenem Wappen."],
      ["funkenstab", "Funkenstab", "wand", "uncommon", "250", "gp", "Ein Stab aus Schwarzeiche mit Kupferkappe.", "7 Ladungen."],
      ["sonnenerz", "Splitter Sonnenerz", "wondrous", "legendary", "25000", "gp", "Ein faustgroßer Splitter, der im Dunkeln wie eine kleine Sonne strahlt."],
      ["fackel", "Fackeln (5)", "gear", "common", "5", "cp", "Pechgetränkte Fackeln."],
      ["dietriche", "Dietrichset", "gear", "uncommon", "25", "gp", "In Wachstuch gerollt. Herkunft besser nicht erfragen."],
      ["unbekannt", "Versiegelte Bleikassette", "other", "unknown", "300", "gp", "Niemand weiß, was darin ist. Sie summt leise."],
    ],
    shops: [
      {
        name: "Zum Kupfernen Kessel",
        merchantName: "Ilda Rußfinger",
        category: "Alchemie",
        imagePath: "/images/shops/alchemist.svg",
        description: "Zwischen brodelnden Kolben verkauft Ilda, was die Bergkräuter hergeben.",
        refreshIntervalDays: 3,
        lists: [
          { name: "Grundsortiment", entries: [["heiltrank", 6], ["gegengift", 4], ["rauchbombe", 5], ["fackel", 10]] },
          { name: "Frische Lieferung", entries: [["heiltrank", 3, "45"], ["glutsalbe", 2], ["nebeltinktur", 2], ["gegengift", 2]] },
          { name: "Restbestände", entries: [["heiltrank", 1, "60"], ["rauchbombe", 2], ["nebeltinktur", 0]] },
        ],
      },
      {
        name: "Hammer & Glut",
        merchantName: "Borin Eisenbart",
        category: "Schmiede",
        imagePath: "/images/shops/blacksmith.svg",
        description: "Die Esse brennt Tag und Nacht. Borin feilscht nicht – meistens.",
        refreshIntervalDays: 7,
        lists: [
          { name: "Alltagsware", entries: [["langschwert", 3], ["wurfbeil", 6], ["kettenhemd", 2], ["bolzen", 12]] },
          { name: "Meisterstücke", entries: [["glutklinge", 1], ["aschenschild", 1], ["langschwert", 2], ["kettenhemd", 1, "45"]] },
          { name: "Nach der Karawane", entries: [["wurfbeil", 3], ["bolzen", 20], ["aschenschild", 1, "290"]] },
        ],
      },
      {
        name: "Flüsternde Seiten",
        merchantName: "Meister Quill",
        category: "Schriften",
        imagePath: "/images/shops/bookshop.svg",
        description: "Staubige Regale bis unter die Decke. Bitte nichts laut vorlesen.",
        refreshIntervalDays: 10,
        lists: [
          { name: "Regal A", entries: [["schriftrolle-licht", 4], ["karte-stollen", 1], ["funkenstab", 1]] },
          { name: "Regal B", entries: [["schriftrolle-licht", 2], ["schriftrolle-bann", 1], ["siegelring", 1]] },
        ],
      },
      {
        name: "Der Schwarze Tresen",
        merchantName: "„Niemand“",
        category: "Hehlerware",
        imagePath: "/images/shops/curio.svg",
        description: "Nur für Eingeweihte. Für Spieler unsichtbar, bis die Spielleitung ihn freischaltet.",
        refreshIntervalDays: 5,
        isVisible: false,
        lists: [{ name: "Unter der Theke", entries: [["dietriche", 2], ["unbekannt", 1], ["sonnenerz", 1]] }],
      },
    ],
  },
  {
    slug: "gezeiten-von-marrow",
    name: "Gezeiten von Marrow",
    description:
      "Die Hafenstadt Marrow lebt vom Strandgut eines Meeres, das mehr anspült, als es sollte.\nZwischen den Gezeiten liegen Geheimnisse – und Kundschaft.",
    coverImagePath: "/images/covers/tide-harbor.svg",
    startDay: 47,
    theme: {
      primaryColor: "#6cc5d6",
      secondaryColor: "#2f5d6b",
      accentColor: "#c9784a",
      backgroundColor: "#0f171b",
      fontPreset: "chronicle",
      layoutPreset: "compact",
      backgroundImagePath: "/images/backgrounds/dragon-scales.svg",
    },
    items: [
      ["kiementrank", "Kiementrank", "potion", "uncommon", "150", "gp", "Schmeckt nach Tang und Kupfer.", "Erlaubt eine Stunde lang das Atmen unter Wasser."],
      ["salzwasserheiler", "Salzwasser-Heiltrunk", "potion", "common", "40", "gp", "Trüb, salzig, wirksam."],
      ["harpune", "Walbein-Harpune", "weapon", "uncommon", "85", "gp", "Mit Widerhaken und zwanzig Schritt Leine."],
      ["entermesser", "Entermesser", "weapon", "common", "10", "gp", "Kurz, schwer und schartig."],
      ["oelzeug", "Ölzeugmantel", "armor", "common", "8", "gp", "Hält Gischt und leichten Regen ab."],
      ["perlmuttschild", "Perlmuttschild", "armor", "rare", "900", "gp", "Schillert in allen Farben der Dämmerung."],
      ["kompass", "Kompass der Stillen Wasser", "wondrous", "rare", "1200", "gp", "Die Nadel zeigt nicht nach Norden, sondern zur nächsten Flaute."],
      ["flaschenpost", "Versiegelte Flaschenpost", "scroll", "unknown", "20", "gp", "Das Siegel ist ungebrochen. Die Schrift darin ist keine bekannte."],
      ["sturmkarte", "Schriftrolle: Sturmruf", "scroll", "very_rare", "2500", "gp", "Das Pergament ist immer leicht feucht."],
      ["tauwerk", "Tauwerk (15 m)", "gear", "common", "1", "gp", "Geteertes Hanfseil."],
      ["laterne", "Sturmlaterne", "gear", "common", "5", "gp", "Brennt auch bei steifem Wind."],
      ["muschelring", "Ring der Ebbe", "ring", "uncommon", "400", "gp", "Aus einer einzigen Muschel geschliffen."],
      ["seemannszwieback", "Schiffszwieback (1 Woche)", "gear", "common", "35", "sp", "Hart wie Planken, hält ewig."],
      ["krakentinte", "Krakentinte", "other", "uncommon", "60", "gp", "Tiefschwarz und schwer zu entfernen."],
    ],
    shops: [
      {
        name: "Treibgut & Tand",
        merchantName: "Mirelle Salzhand",
        category: "Kuriositäten",
        imagePath: "/images/shops/curio.svg",
        description: "Was die Flut bringt, landet früher oder später in Mirelles Regalen.",
        refreshIntervalDays: 5,
        lists: [
          { name: "Springflut", entries: [["flaschenpost", 3], ["kompass", 1], ["krakentinte", 2], ["muschelring", 1]] },
          { name: "Nippflut", entries: [["flaschenpost", 1], ["kiementrank", 2], ["krakentinte", 4]] },
          { name: "Nach dem Sturm", entries: [["sturmkarte", 1], ["perlmuttschild", 1], ["flaschenpost", 5, "15"], ["kiementrank", 1, "175"]] },
        ],
      },
      {
        name: "Die Segelkammer",
        merchantName: "Kapitän Orlo Vey",
        category: "Ausrüstung",
        imagePath: "/images/shops/general-store.svg",
        description: "Alles, was ein Schiff braucht – und manches, was eine Mannschaft braucht.",
        refreshIntervalDays: 14,
        lists: [
          { name: "Hafenliste", entries: [["tauwerk", 20], ["laterne", 6], ["oelzeug", 5], ["seemannszwieback", 12], ["entermesser", 4]] },
          { name: "Ausrüsterliste", entries: [["harpune", 2], ["salzwasserheiler", 5], ["tauwerk", 8], ["laterne", 3], ["entermesser", 2, "8"]] },
        ],
      },
    ],
  },
];

function copper(amount: string, currency: Currency): number {
  const value = parsePriceToCopper(amount, currency);
  if (value === null) throw new Error(`Invalid seed price: ${amount} ${currency}`);
  return value;
}

async function seedCampaign(db: Db, sample: SeedCampaign): Promise<void> {
  const campaignId = await createCampaign(
    db,
    { name: sample.name, slug: sample.slug, description: sample.description, coverImagePath: sample.coverImagePath, startDay: sample.startDay },
    "system",
  );
  await updateTheme(db, campaignId, sample.theme, "system");

  const itemIds = new Map<string, string>();
  for (const [key, name, category, rarity, price, currency, description, properties] of sample.items) {
    const id = await createItem(db, campaignId, {
      name,
      description,
      category,
      rarity,
      imagePath: null,
      basePriceCopper: copper(price, currency),
      displayCurrency: currency,
      properties: properties ?? "",
      dmNotes: "",
    });
    itemIds.set(key, id);
  }

  for (const shop of sample.shops) {
    const shopId = await createShop(
      db,
      campaignId,
      {
        name: shop.name,
        description: shop.description,
        merchantName: shop.merchantName,
        category: shop.category,
        imagePath: shop.imagePath,
        refreshIntervalDays: shop.refreshIntervalDays,
        isVisible: shop.isVisible ?? true,
      },
      "system",
    );
    for (const list of shop.lists) {
      const listId = await createInventoryList(db, shopId, list.name);
      for (const [itemKey, quantity, priceOverride] of list.entries) {
        const itemId = itemIds.get(itemKey);
        if (!itemId) throw new Error(`Unknown seed item: ${itemKey}`);
        await addItemToList(db, listId, {
          itemId,
          quantity,
          priceOverrideCopper: priceOverride === undefined ? null : copper(priceOverride, "gp"),
        });
      }
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (see .env.example). Nothing was seeded.");
    process.exit(1);
  }
  const reset = process.argv.includes("--reset");
  const { db, pool } = createDb(url, 2);
  try {
    for (const sample of SAMPLE) {
      const [existing] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, sample.slug));
      if (existing && !reset) {
        console.log(`• "${sample.name}" already exists – skipped (use -- --reset to recreate the sample campaigns).`);
        continue;
      }
      if (existing) await deleteCampaign(db, existing.id);
      await seedCampaign(db, sample);
      console.log(`✓ "${sample.name}" seeded (${sample.shops.length} shops, ${sample.items.length} items, day ${sample.startDay}).`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Seeding failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
