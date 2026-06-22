import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "pg";

const DB = process.env.DATABASE_URL;
if (!DB) {
  console.error("Set DATABASE_URL (Supabase connection string) before running.");
  process.exit(1);
}

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
  const c = new Client({ connectionString: DB });
  await c.connect();
  const { rows } = await c.query(
    "select id from collections where name = 'Personal'",
  );
  const personalId = rows[0].id;
  let inserted = 0;
  for (const o of recipes) {
    const type = resolveType(o);
    const emoji = TYPE_EMOJI[type] || o.emoji || null;
    const r = await c.query(
      `insert into recipes (title, emoji, type, porciones, source_url, ingredients, steps)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [
        o.title,
        emoji,
        type,
        o.porciones ?? null,
        (o.source_urls && o.source_urls[0]) ?? null,
        JSON.stringify(groupsOf(o, "ing")),
        JSON.stringify(groupsOf(o, "step")),
      ],
    );
    const recipeId = r.rows[0].id;
    await c.query(
      "insert into recipe_collections (recipe_id, collection_id) values ($1,$2) on conflict do nothing",
      [recipeId, personalId],
    );
    for (const note of o.notes || []) {
      if (note?.trim()) {
        await c.query(
          "insert into recipe_notes (recipe_id, body) values ($1,$2)",
          [recipeId, note.trim()],
        );
      }
    }
    inserted++;
  }
  const total = await c.query("select count(*)::int as n from recipes");
  console.log(`Inserted ${inserted}. Recipes table now has ${total.rows[0].n}.`);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
