"use server";

import { getServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

async function touch(id: string) {
  revalidatePath(`/recipe/${id}`);
  revalidatePath("/");
}

export async function setRating(id: string, rating: number | null) {
  const s = getServerClient();
  await s.from("recipes").update({ rating }).eq("id", id);
  await touch(id);
}

export async function setCookStatus(
  id: string,
  status: "sin_probar" | "cocinada" | "cabecera",
) {
  const s = getServerClient();
  const update: Record<string, unknown> = { cook_status: status, tried: status !== "sin_probar" };
  if (status !== "sin_probar") update.last_cooked = new Date().toISOString().slice(0, 10);
  await s.from("recipes").update(update).eq("id", id);
  await touch(id);
}

export async function addNote(id: string, body: string) {
  if (!body.trim()) return;
  const s = getServerClient();
  await s.from("recipe_notes").insert({ recipe_id: id, body: body.trim() });
  await touch(id);
}

export async function setCollection(id: string, collectionId: string, on: boolean) {
  const s = getServerClient();
  if (on) await s.from("recipe_collections").upsert({ recipe_id: id, collection_id: collectionId });
  else await s.from("recipe_collections").delete().eq("recipe_id", id).eq("collection_id", collectionId);
  await touch(id);
}

export async function setTag(id: string, tagId: string, on: boolean) {
  const s = getServerClient();
  if (on) await s.from("recipe_tags").upsert({ recipe_id: id, tag_id: tagId });
  else await s.from("recipe_tags").delete().eq("recipe_id", id).eq("tag_id", tagId);
  await touch(id);
}

export async function addCollection(id: string, name: string) {
  if (!name.trim()) return;
  const s = getServerClient();
  const { data } = await s
    .from("collections")
    .upsert({ name: name.trim() }, { onConflict: "name" })
    .select("id")
    .single();
  if (data) await s.from("recipe_collections").upsert({ recipe_id: id, collection_id: data.id });
  await touch(id);
}

export async function deleteRecipe(id: string) {
  const s = getServerClient();
  await s.from("recipes").delete().eq("id", id);
  revalidatePath("/");
}

export async function updateRecipe(
  id: string,
  fields: {
    title: string;
    type: string;
    porciones: string | null;
    fridge_life_days: number | null;
    source_url: string | null;
    ingredients: { label: string | null; items: string[] }[];
    steps: { label: string | null; items: string[] }[];
  },
) {
  const s = getServerClient();
  await s.from("recipes").update(fields).eq("id", id);
  await touch(id);
}

export async function addTag(id: string, name: string) {
  if (!name.trim()) return;
  const s = getServerClient();
  const { data } = await s
    .from("tags")
    .upsert({ name: name.trim() }, { onConflict: "name" })
    .select("id")
    .single();
  if (data) await s.from("recipe_tags").upsert({ recipe_id: id, tag_id: data.id });
  await touch(id);
}
