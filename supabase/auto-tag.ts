import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VOCAB = [
  "Mexicano", "Italiano", "Indio", "Tailandés", "Griego", "Japonés", "Coreano",
  "Chino", "Vietnamita", "Mediterráneo", "Medio Oriente", "Americano", "Francés",
  "Africano", "Vegetariano", "Vegano", "Sin gluten", "Rápido", "Saludable",
  "Picante", "Para invitados",
];

async function tagBatch(batch: { i: number; title: string; ing: string }[]): Promise<Record<number, string[]>> {
  const sys = `You tag recipes for a personal recipe app. For each recipe, choose applicable tags ONLY from this list: ${VOCAB.join(", ")}.
Rules: cuisine tag only if the dish is clearly from that cuisine. "Vegetariano" if no meat/poultry/fish. "Vegano" if no animal products at all (also add Vegetariano). "Sin gluten" only if clearly gluten-free. "Rápido" if quick/simple. "Picante" if notably spicy. Be conservative; do not over-tag. Return ONLY a JSON array like [{"i":0,"tags":["Mexicano","Vegetariano"]}].`;
  const user = batch.map((b) => `${b.i}. ${b.title} — ${b.ing}`).join("\n");
  const msg = await ai.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: sys,
    messages: [{ role: "user", content: user }],
  });
  const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("")
    .replace(/```json/gi, "").replace(/```/g, "").trim();
  const arr: { i: number; tags: string[] }[] = JSON.parse(text);
  const out: Record<number, string[]> = {};
  for (const r of arr) out[r.i] = (r.tags || []).filter((t) => VOCAB.includes(t));
  return out;
}

async function main() {
  const { data: recipes } = await s.from("recipes").select("id, title, ingredients");
  const { data: tagRows } = await s.from("tags").select("id, name");
  const tagId = new Map<string, string>();
  for (const t of tagRows ?? []) tagId.set(t.name, t.id);

  async function ensureTag(name: string): Promise<string> {
    if (tagId.has(name)) return tagId.get(name)!;
    const { data } = await s.from("tags").upsert({ name }, { onConflict: "name" }).select("id").single();
    tagId.set(name, data!.id);
    return data!.id;
  }

  const list = (recipes ?? []).map((r, i) => ({
    i, id: r.id, title: r.title,
    ing: ((r.ingredients ?? []) as any[]).flatMap((g) => g.items ?? []).slice(0, 12).join(", ").slice(0, 400),
  }));

  let applied = 0;
  const CH = 20;
  for (let k = 0; k < list.length; k += CH) {
    const batch = list.slice(k, k + CH);
    try {
      const res = await tagBatch(batch.map((b) => ({ i: b.i, title: b.title, ing: b.ing })));
      for (const b of batch) {
        const tags = res[b.i] || [];
        for (const name of tags) {
          const tid = await ensureTag(name);
          await s.from("recipe_tags").upsert({ recipe_id: b.id, tag_id: tid });
          applied++;
        }
      }
      console.log(`tagged ${Math.min(k + CH, list.length)}/${list.length}`);
    } catch (e: any) {
      console.error(`batch ${k} failed: ${e.message || e}`);
    }
  }
  console.log(`Applied ${applied} tag assignments across ${list.length} recipes.`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
