"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { runAdminAction } from "@/lib/admin-action";
import { MAX_ADVANCE_DAYS, MAX_DAY } from "@/lib/constants";
import { formDataToObject, idSchema, intInRange } from "@/lib/validation";
import { advanceCampaignDay } from "@/features/ingame-time/service";
import { campaignCreateSchema, campaignInputSchema, themeInputSchema } from "./schemas";
import { createCampaign, deleteCampaign, updateCampaign, updateTheme } from "./service";

export async function createCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const input = campaignCreateSchema.parse(formDataToObject(formData));
    const id = await createCampaign(db, input, "admin");
    redirect(`/admin/campaigns/${id}?created=1`);
  });
}

export async function updateCampaignAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await updateCampaign(db, idSchema.parse(id), campaignInputSchema.parse(formDataToObject(formData)));
    return "Kampagne gespeichert.";
  });
}

export async function deleteCampaignAction(id: string): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await deleteCampaign(db, idSchema.parse(id));
    redirect("/admin/campaigns?deleted=1");
  });
}

export async function updateThemeAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await updateTheme(db, idSchema.parse(id), themeInputSchema.parse(formDataToObject(formData)), "admin");
    return "Design gespeichert.";
  });
}

const advanceSchema = z.object({
  days: intInRange(1, MAX_ADVANCE_DAYS, "Die Anzahl der Tage"),
  expectedCurrentDay: intInRange(0, MAX_DAY, "Der erwartete Tag"),
});

export async function advanceDayAction(campaignId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const input = advanceSchema.parse(formDataToObject(formData));
    const result = await advanceCampaignDay(db, {
      campaignId: idSchema.parse(campaignId),
      days: input.days,
      expectedCurrentDay: input.expectedCurrentDay,
      actorRole: "admin",
    });
    const rotated = result.rotations.length;
    return `Jetzt Tag ${result.newDay}. ${
      rotated === 0
        ? "Kein Händler hat sein Sortiment gewechselt."
        : `${rotated} Händler ${rotated === 1 ? "hat" : "haben"} das Sortiment gewechselt.`
    }`;
  });
}
