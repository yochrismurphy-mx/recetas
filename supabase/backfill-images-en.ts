import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function openverse(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=1&mature=false`,
      { headers: { "user-agent": "recetas/1.0" }, signal: AbortSignal.timeout(12000) },
    );
    if (!res.ok) return null;
    const j = await res.json();
    const r = j.results?.[0];
    return r?.url || r?.thumbnail || null;
  } catch {
    return null;
  }
}

async function main() {
  const { data } = await s.from("recipes").select("id, title").is("image_url", null);
  const recipes = data ?? [];
  if (!recipes.length) return console.log("nothing to do");

  const prompt =
    `For each recipe title (Spanish), give a 2-4 word ENGLISH image-search query for a photo of the finished dish. ` +
    `Return ONLY a JSON array like [{"i":0,"q":"green mole"}].\n\n` +
    recipes.map((r, i) => `${i}. ${r.title}`).join("\n");
  const msg = await ai.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const queries: { i: number; q: string }[] = JSON.parse(text);
  const qmap = new Map(queries.map((x) => [x.i, x.q]));

  let found = 0;
  for (let i = 0; i < recipes.length; i++) {
    const q = qmap.get(i);
    if (!q) continue;
    const img = (await openverse(q)) || (await openverse(`${q} food`));
    if (img) {
      await s.from("recipes").update({ image_url: img }).eq("id", recipes[i].id);
      found++;
    }
    await sleep(200);
  }
  const { count } = await s
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .not("image_url", "is", null);
  console.log(`Found ${found} more via English queries. With image now: ${count}/107`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
