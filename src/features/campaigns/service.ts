import { asc, count, desc, eq } from "drizzle-orm";
import type { Db, DbOrTx } from "@/lib/db";
import { isUniqueViolation, lockCampaign, recordEvent } from "@/lib/db/helpers";
import { campaignEvents, campaignThemes, campaigns, items, shops } from "@/lib/db/schema";
import { NotFoundError, UserFacingError } from "@/lib/errors";
import { DEFAULT_THEME, type ThemeConfig } from "@/lib/theme";
import type { CampaignCreateInput, CampaignInput, ThemeInput } from "./schemas";

const themeColumns = {
  primaryColor: campaignThemes.primaryColor,
  secondaryColor: campaignThemes.secondaryColor,
  accentColor: campaignThemes.accentColor,
  backgroundColor: campaignThemes.backgroundColor,
  fontPreset: campaignThemes.fontPreset,
  backgroundImagePath: campaignThemes.backgroundImagePath,
  layoutPreset: campaignThemes.layoutPreset,
};

const campaignColumns = {
  id: campaigns.id,
  slug: campaigns.slug,
  name: campaigns.name,
  description: campaigns.description,
  currentDay: campaigns.currentDay,
  coverImagePath: campaigns.coverImagePath,
};

export interface CampaignWithTheme {
  id: string;
  slug: string;
  name: string;
  description: string;
  currentDay: number;
  coverImagePath: string | null;
  theme: ThemeConfig;
}

type Row = Omit<CampaignWithTheme, "theme">;

function withTheme(row: { campaign: Row; theme: ThemeConfig | null }): CampaignWithTheme {
  return { ...row.campaign, theme: row.theme ?? DEFAULT_THEME };
}

function baseQuery(db: DbOrTx) {
  return db
    .select({ campaign: campaignColumns, theme: themeColumns })
    .from(campaigns)
    .leftJoin(campaignThemes, eq(campaignThemes.campaignId, campaigns.id));
}

export async function listCampaigns(db: DbOrTx): Promise<CampaignWithTheme[]> {
  const rows = await baseQuery(db).orderBy(asc(campaigns.name));
  return rows.map(withTheme);
}

export async function getCampaignBySlug(db: DbOrTx, slug: string): Promise<CampaignWithTheme | null> {
  const [row] = await baseQuery(db).where(eq(campaigns.slug, slug)).limit(1);
  return row ? withTheme(row) : null;
}

export async function getCampaignById(db: DbOrTx, id: string): Promise<CampaignWithTheme | null> {
  const [row] = await baseQuery(db).where(eq(campaigns.id, id)).limit(1);
  return row ? withTheme(row) : null;
}

export interface CampaignStats {
  campaignId: string;
  shopCount: number;
  itemCount: number;
}

export async function getCampaignStats(db: DbOrTx): Promise<Map<string, CampaignStats>> {
  const [shopRows, itemRows] = await Promise.all([
    db.select({ campaignId: shops.campaignId, n: count() }).from(shops).groupBy(shops.campaignId),
    db.select({ campaignId: items.campaignId, n: count() }).from(items).groupBy(items.campaignId),
  ]);
  const stats = new Map<string, CampaignStats>();
  const get = (id: string) => {
    if (!stats.has(id)) stats.set(id, { campaignId: id, shopCount: 0, itemCount: 0 });
    return stats.get(id)!;
  };
  for (const r of shopRows) get(r.campaignId).shopCount = r.n;
  for (const r of itemRows) get(r.campaignId).itemCount = r.n;
  return stats;
}

const SLUG_TAKEN = "Dieser URL-Slug wird bereits von einer anderen Kampagne verwendet.";

export async function createCampaign(db: Db, input: CampaignCreateInput, actorRole: string): Promise<string> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(campaigns)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
          coverImagePath: input.coverImagePath,
          currentDay: input.startDay,
        })
        .returning({ id: campaigns.id });
      await tx.insert(campaignThemes).values({ campaignId: created.id, ...DEFAULT_THEME });
      await recordEvent(tx, {
        campaignId: created.id,
        actorRole,
        eventType: "campaign_created",
        after: { name: input.name, slug: input.slug, currentDay: input.startDay },
      });
      return created.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserFacingError(SLUG_TAKEN);
    throw error;
  }
}

export async function updateCampaign(db: Db, id: string, input: CampaignInput): Promise<void> {
  try {
    const updated = await db
      .update(campaigns)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        coverImagePath: input.coverImagePath,
      })
      .where(eq(campaigns.id, id))
      .returning({ id: campaigns.id });
    if (updated.length === 0) throw new NotFoundError("Die Kampagne wurde nicht gefunden.");
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserFacingError(SLUG_TAKEN);
    throw error;
  }
}

/** Deletes the campaign and – by cascade – its theme, shops, lists, items and events. */
export async function deleteCampaign(db: Db, id: string): Promise<void> {
  const deleted = await db.delete(campaigns).where(eq(campaigns.id, id)).returning({ id: campaigns.id });
  if (deleted.length === 0) throw new NotFoundError("Die Kampagne wurde nicht gefunden.");
}

export async function updateTheme(db: Db, campaignId: string, input: ThemeInput, actorRole: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockCampaign(tx, campaignId);
    await tx
      .insert(campaignThemes)
      .values({ campaignId, ...input })
      .onConflictDoUpdate({ target: campaignThemes.campaignId, set: { ...input, updatedAt: new Date() } });
    await recordEvent(tx, { campaignId, actorRole, eventType: "theme_updated", after: input });
  });
}

export async function listCampaignEvents(db: DbOrTx, campaignId: string, limit = 25) {
  return db
    .select()
    .from(campaignEvents)
    .where(eq(campaignEvents.campaignId, campaignId))
    .orderBy(desc(campaignEvents.createdAt))
    .limit(limit);
}
