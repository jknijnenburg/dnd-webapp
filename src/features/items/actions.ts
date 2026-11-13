"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { runAdminAction } from "@/lib/admin-action";
import { formDataToObject, idSchema } from "@/lib/validation";
import { itemInputSchema } from "./schemas";
import { createItem, deleteItem, getItem, updateItem } from "./service";

export async function createItemAction(campaignId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const cid = idSchema.parse(campaignId);
    await createItem(db, cid, itemInputSchema.parse(formDataToObject(formData)));
    redirect(`/admin/items?campaign=${cid}&saved=1`);
  });
}

export async function updateItemAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await updateItem(db, idSchema.parse(id), itemInputSchema.parse(formDataToObject(formData)));
    return "Gegenstand gespeichert.";
  });
}

export async function deleteItemAction(id: string): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const item = await getItem(db, idSchema.parse(id));
    await deleteItem(db, idSchema.parse(id));
    redirect(item ? `/admin/items?campaign=${item.campaignId}&deleted=1` : "/admin/items");
  });
}
