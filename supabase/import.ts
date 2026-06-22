import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, "seed", "recipes.json"), "utf8"));
const recipes: any[] = Object.values(raw);

const EMOJI_TYPE: Record<string, string> = {
  "🍗": "Aves", "🥩": "Carne", "🐟": "Pescado", "🫘": "Leguminosas",
  "🥗": "Ensalada", "🍲": "Sopa/Curry", "🍚": "Granos/Pasta", "🥦": "Verduras",
  "🍮": "Postre", "🥣": "Desayuno", "🫓": "Pan/Masa", "🥤": "Salsas/Dips",
  "🥜": "Untables", "🫙": "Salsas/Dips",
};
const TYPE_EMOJI: Record<string, string> = {
  Aves: "🍗", Carne: "🥩", Pescado: "🐟", Leguminosas: "🫘", Ensalada: "🥗",
  "Sopa/Curry": "🍲", "Granos/Pasta": "🍚", Verduras: "🥦", Postre: "🍮",
  Desayuno: "🥣", "Pan/Masa": "🫓", "Salsas/Dips": "🫙", Untables: "🥜",
};

function resolveType(o: any): string {
  let t = EMOJI_TYPE[o.emoji] || "Sopa/Curry";
  if (t === "Salsas/Dips" || t === "Untables") {
    const title = (o.title || "").toLowerCase();
    t = /(mantequilla|butter|cacahuate|peanut|almendra|almond|nuez\b|nut\b)/.test(title)
      ? "Untables"
      : "Salsas/Dips";
  }
  return t;
}

function groupsOf(o: any, kind: "ing" | "step") {
  return (o.groups || [])
    .filter((g: any) => g.kind === kind && g.items?.length)
    .map((g: any) => ({ label: g.label ?? null, items: g.items }));
}

async function main() {
  const { data: coll, error: cErr } = await supabase
    .from("collections")
    .select("id")
    .eq("name", "Personal")
    .single();
  if (cErr) throw cErr;
  const personalId = coll.id;

  let inserted = 0;
  for (const o of recipes) {
    const type = resolveType(o);
    const emoji = TYPE_EMOJI[type] || o.emoji || null;
    const { data: rec, error } = await supabase
      .from("recipes")
      .insert({
        title: o.title,
        emoji,
        type,
        porciones: o.porciones ?? null,
        source_url: (o.source_urls && o.source_urls[0]) ?? null,
        ingredients: groupsOf(o, "ing"),
        steps: groupsOf(o, "step"),
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase
      .from("recipe_collections")
      .insert({ recipe_id: rec.id, collection_id: personalId });

    const notes = (o.notes || [])
      .filter((n: string) => n && n.trim())
      .map((n: string) => ({ recipe_id: rec.id, body: n.trim() }));
    if (notes.length) await supabase.from("recipe_notes").insert(notes);

    inserted++;
  }

  const { count } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });
  console.log(`Inserted ${inserted}. Recipes table now has ${count}.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
