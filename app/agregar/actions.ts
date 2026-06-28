"use server";

import { getServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { ParsedRecipe } from "@/lib/anthropic";

const TYPE_EMOJI: Record<string, string> = {
  Aves: "🍗", Carne: "🥩", Pescado: "🐟", Leguminosas: "🫘", Ensalada: "🥗",
  "Sopa/Curry": "🍲", "Granos/Pasta": "🍚", Verduras: "🥦", Postre: "🍮",
  Desayuno: "🥣", "Pan/Masa": "🫓", "Salsas/Dips": "🫙", Untables: "🥜",
};

const IMG_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};

// Download a scraped image URL and store it in our bucket. Returns the public
// URL, or null on any failure (hotlink protection, non-image, too small, etc.).
async function storeImage(
  s: ReturnType<typeof getServerClient>,
  recipeId: string,
  url: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "user-agent": "Mozilla/5.0" } });
    const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!res.ok || !ct.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 2000) return null;
    const path = `${recipeId}/scraped-${Date.now()}.${IMG_EXT[ct] || "jpg"}`;
    const { error } = await s.storage.from("recipe-images").upload(path, bytes, { contentType: ct, upsert: true });
    if (error) return null;
    return s.storage.from("recipe-images").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export async function saveRecipe(p: ParsedRecipe, videoUrl?: string | null): Promise<string> {
  const s = getServerClient();
  const emoji = TYPE_EMOJI[p.type] || p.emoji || null;
  const ingredients = (p.groups || [])
    .filter((g) => g.kind === "ing")
    .map((g) => ({ label: g.label ?? null, items: g.items }));
  const steps = (p.groups || [])
    .filter((g) => g.kind === "step")
    .map((g) => ({ label: g.label ?? null, items: g.items }));
  const lang = (p.language === "en" ? "en" : "es") as "es" | "en";

  const { data, error } = await s
    .from("recipes")
    .insert({
      title: p.title,
      emoji,
      type: p.type,
      language: lang,
      porciones: p.porciones ?? null,
      source_url: p.source_urls?.[0] ?? null,
      video_url: videoUrl?.trim() || null,
      ingredients,
      steps,
      // Seed the matching-language columns; the other side stays empty until the
      // translation tool fills it (the app falls back so it still displays).
      [`title_${lang}`]: p.title,
      [`ingredients_${lang}`]: ingredients,
      [`steps_${lang}`]: steps,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: coll } = await s.from("collections").select("id").eq("name", "Personal").single();
  if (coll) await s.from("recipe_collections").insert({ recipe_id: data.id, collection_id: coll.id });

  // Scrape + store the page's hero image, if one was found.
  if (p.image_candidate) {
    const img = await storeImage(s, data.id as string, p.image_candidate);
    if (img) await s.from("recipes").update({ image_url: img }).eq("id", data.id);
  }

  // Auto-apply suggested etiquetas.
  for (const name of p.tags || []) {
    const { data: tag } = await s.from("tags").upsert({ name }, { onConflict: "name" }).select("id").single();
    if (tag) await s.from("recipe_tags").upsert({ recipe_id: data.id, tag_id: tag.id });
  }

  for (const n of p.notes || []) {
    if (n?.trim()) await s.from("recipe_notes").insert({ recipe_id: data.id, body: n.trim() });
  }

  revalidatePath("/");
  return data.id as string;
}
