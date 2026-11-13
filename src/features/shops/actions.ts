"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { runAdminAction } from "@/lib/admin-action";
import { formDataToObject, idSchema } from "@/lib/validation";
import {
  directionSchema,
  listItemInputSchema,
  listItemUpdateSchema,
  listNameSchema,
  shopInputSchema,
} from "./schemas";
import {
  addItemToList,
  createInventoryList,
  createShop,
  deleteInventoryList,
  deleteShop,
  getShopForAdmin,
  moveInventoryList,
  moveListItem,
  removeListItem,
  renameInventoryList,
  rotateShopManually,
  setActiveInventoryList,
  updateListItem,
  updateShop,
} from "./service";

export async function createShopAction(campaignId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const id = await createShop(db, idSchema.parse(campaignId), shopInputSchema.parse(formDataToObject(formData)), "admin");
    redirect(`/admin/shops/${id}?created=1`);
  });
}

export async function updateShopAction(shopId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await updateShop(db, idSchema.parse(shopId), shopInputSchema.parse(formDataToObject(formData)), "admin");
    return "Händler gespeichert.";
  });
}

export async function deleteShopAction(shopId: string): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const id = idSchema.parse(shopId);
    const view = await getShopForAdmin(db, id);
    await deleteShop(db, id);
    redirect(view ? `/admin/shops?campaign=${view.campaign.id}&deleted=1` : "/admin/shops");
  });
}

export async function rotateShopAction(shopId: string, expectedActiveListId: string | null): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await rotateShopManually(db, idSchema.parse(shopId), z.nullable(idSchema).parse(expectedActiveListId), "admin");
    return "Sortiment gewechselt. Der geplante Wechseltag bleibt unverändert.";
  });
}

export async function createListAction(shopId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const { name } = listNameSchema.parse(formDataToObject(formData));
    await createInventoryList(db, idSchema.parse(shopId), name);
    return "Inventarliste angelegt.";
  });
}

export async function renameListAction(listId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    const { name } = listNameSchema.parse(formDataToObject(formData));
    await renameInventoryList(db, idSchema.parse(listId), name);
    return "Liste umbenannt.";
  });
}

export async function deleteListAction(listId: string): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await deleteInventoryList(db, idSchema.parse(listId));
    return "Inventarliste gelöscht.";
  });
}

export async function moveListAction(listId: string, direction: "up" | "down"): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await moveInventoryList(db, idSchema.parse(listId), directionSchema.parse(direction));
    return "Reihenfolge geändert.";
  });
}

export async function setActiveListAction(listId: string): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await setActiveInventoryList(db, idSchema.parse(listId), "admin");
    return "Liste ist jetzt aktiv. Der geplante Wechseltag bleibt unverändert.";
  });
}

export async function addListItemAction(listId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await addItemToList(db, idSchema.parse(listId), listItemInputSchema.parse(formDataToObject(formData)));
    return "Gegenstand hinzugefügt.";
  });
}

export async function updateListItemAction(entryId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await updateListItem(db, idSchema.parse(entryId), listItemUpdateSchema.parse(formDataToObject(formData)));
    return "Eintrag gespeichert.";
  });
}

export async function removeListItemAction(entryId: string): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await removeListItem(db, idSchema.parse(entryId));
    return "Gegenstand aus der Liste entfernt.";
  });
}

export async function moveListItemAction(entryId: string, direction: "up" | "down"): Promise<ActionState> {
  return runAdminAction(async (db) => {
    await moveListItem(db, idSchema.parse(entryId), directionSchema.parse(direction));
    return "Reihenfolge geändert.";
  });
}
