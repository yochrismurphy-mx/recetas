import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { parseRecipe } from "../lib/anthropic";
import { NEW_RECIPES } from "./seed/new-recipes";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const here = dirname(fileURLToPath(import.meta.url));

const TYPE_EMOJI: Record<string, string> = {
  Aves: "🍗", Carne: "🥩", Pescado: "🐟", Leguminosas: "🫘", Ensalada: "🥗",
  "Sopa/Curry": "🍲", "Granos/Pasta": "🍚", Verduras: "🥦", Postre: "🍮",
  Desayuno: "🥣", "Pan/Masa": "🫓", "Salsas/Dips": "🫙", Untables: "🥜",
};
const norm = (t: string) =>
  (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const added: string[] = [], skipped: string[] = [], failed: string[] = [];
const seen = new Set<string>();
const collId = new Map<string, string>();

async function insert(p: any, collection: string, sourceUrl: string | null) {
  if (!p?.title) return;
  const key = norm(p.title);
  if (seen.has(key)) { skipped.push(p.title); return; }
  const type = p.type && TYPE_EMOJI[p.type] ? p.type : "Sopa/Curry";
  const emoji = TYPE_EMOJI[type] || p.emoji || null;
  const ingredients = (p.groups || []).filter((g: any) => g.kind === "ing").map((g: any) => ({ label: g.label ?? null, items: g.items }));
  const steps = (p.groups || []).filter((g: any) => g.kind === "step").map((g: any) => ({ label: g.label ?? null, items: g.items }));
  const { data, error } = await s.from("recipes").insert({
    title: p.title, emoji, type, language: p.language || "es",
    porciones: p.porciones ?? null, source_url: sourceUrl ?? (p.source_urls?.[0] ?? null),
    ingredients, steps,
  }).select("id").single();
  if (error) { failed.push(`${p.title}: ${error.message}`); return; }
  const cid = collId.get(collection);
  if (cid) await s.from("recipe_collections").insert({ recipe_id: data.id, collection_id: cid });
  for (const n of p.notes || []) if (n?.trim()) await s.from("recipe_notes").insert({ recipe_id: data.id, body: n.trim() });
  seen.add(key);
  added.push(p.title);
}

async function splitThanksgiving(text: string): Promise<any[]> {
  const sys = `Split this Thanksgiving recipe document (Spanish) into distinct recipes. Keep Spanish; do NOT translate. Return ONLY a JSON array. Each object: {"emoji": one emoji, "title": string, "type": one of Aves,Carne,Pescado,Leguminosas,Ensalada,Sopa/Curry,Granos/Pasta,Verduras,Postre,Desayuno,Pan/Masa,Salsas/Dips,Untables, "porciones": string|null, "source_urls": [], "groups": [{"label": string|null, "kind": "ing"|"step", "items": [string]}], "notes": [string], "language": "es"}. The shared "Masa para pay casera" is its own recipe. No commentary.`;
  const msg = await ai.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 8000, system: sys,
    messages: [{ role: "user", content: text }],
  });
  const t = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("")
    .replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(t);
}

async function main() {
  const { data: cols } = await s.from("collections").select("id, name");
  for (const c of cols ?? []) collId.set(c.name, c.id);
  const { data: existing } = await s.from("recipes").select("title");
  for (const r of existing ?? []) seen.add(norm(r.title));

  console.log(`Processing ${NEW_RECIPES.length} new recipes...`);
  for (const r of NEW_RECIPES) {
    try {
      const input = r.text.trim() === r.url.trim() ? r.url : r.text;
      const p = await parseRecipe(input, { translate: false });
      await insert(p, "Personal", r.url);
    } catch (e: any) {
      failed.push(`${r.url}: ${e.message || e}`);
    }
  }

  console.log("Splitting Thanksgiving block...");
  try {
    const tg = await splitThanksgiving(readFileSync(join(here, "seed", "thanksgiving.txt"), "utf8"));
    for (const p of tg) await insert(p, "Thanksgiving", null);
  } catch (e: any) {
    failed.push(`thanksgiving: ${e.message || e}`);
  }

  const { count } = await s.from("recipes").select("*", { count: "exact", head: true });
  console.log(`\nAdded ${added.length}, skipped ${skipped.length} dup, failed ${failed.length}. Total recipes: ${count}.`);
  if (skipped.length) console.log("Skipped (already exist):", skipped.join(", "));
  if (failed.length) console.log("Failed:\n" + failed.join("\n"));
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
