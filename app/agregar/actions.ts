"use server";

import { getServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { ParsedRecipe } from "@/lib/anthropic";

const TYPE_EMOJI: Record<string, string> = {
  Aves: "🍗", Carne: "🥩", Pescado: "🐟", Leguminosas: "🫘", Ensalada: "🥗",
  "Sopa/Curry": "🍲", "Granos/Pasta": "🍚", Verduras: "🥦", Postre: "🍮",
  Desayuno: "🥣", "Pan/Masa": "🫓", "Salsas/Dips": "🫙", Untables: "🥜",
};

export async function saveRecipe(p: ParsedRecipe): Promise<string> {
  const s = getServerClient();
  const emoji = TYPE_EMOJI[p.type] || p.emoji || null;
  const ingredients = (p.groups || [])
    .filter((g) => g.kind === "ing")
    .map((g) => ({ label: g.label ?? null, items: g.items }));
  const steps = (p.groups || [])
    .filter((g) => g.kind === "step")
    .map((g) => ({ label: g.label ?? null, items: g.items }));

  const { data, error } = await s
    .from("recipes")
    .insert({
      title: p.title,
      emoji,
      type: p.type,
      language: p.language || "es",
      porciones: p.porciones ?? null,
      source_url: p.source_urls?.[0] ?? null,
      ingredients,
      steps,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: coll } = await s.from("collections").select("id").eq("name", "Personal").single();
  if (coll) await s.from("recipe_collections").insert({ recipe_id: data.id, collection_id: coll.id });

  for (const n of p.notes || []) {
    if (n?.trim()) await s.from("recipe_notes").insert({ recipe_id: data.id, body: n.trim() });
  }

  revalidatePath("/");
  return data.id as string;
}
