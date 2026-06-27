/**
 * Fill the missing-language columns (title/ingredients/steps _es|_en) for recipes.
 * Existing same-language content is trusted and never re-translated; we only
 * generate the side that is empty (or incomplete). EN->ES uses careful Mexican Spanish.
 *
 * Robustness: we translate a FLAT list of strings (title + labels + items) 1:1 and
 * reassemble them into the original structure ourselves, so the model can never drop
 * or restructure content. A length mismatch triggers a retry, then a hard error (no
 * partial / empty write).
 *
 *   npx tsx --env-file=.env.local supabase/translate-recipes.ts sample
 *   npx tsx --env-file=.env.local supabase/translate-recipes.ts all
 */
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Group = { label: string | null; items: string[] };
type Recipe = {
  id: string; language: string | null; rating: number | null; cook_status: string;
  title_es: string | null; title_en: string | null;
  ingredients_es: Group[] | null; ingredients_en: Group[] | null;
  steps_es: Group[] | null; steps_en: Group[] | null;
};

const hasContent = (g: Group[] | null) => Array.isArray(g) && g.some((x) => (x.items ?? []).some((i) => i && i.trim()));

function sysFor(tgt: "es" | "en") {
  const mx = tgt === "es"
    ? ` Use natural MEXICAN Spanish and the ingredient names a Mexican home cook uses (e.g. betabel, elote, jitomate, chícharo, ejotes, camote, cacahuate, crema, queso fresco). Keep quantities/units as written unless a unit would be unnatural.`
    : "";
  return `You translate recipe text into ${tgt === "es" ? "Spanish" : "English"} for a bilingual recipe app.
You receive a JSON array of N strings (the recipe's title, then ingredient lines and step lines, in order). Translate EACH string.${mx}
Translate faithfully; do not add, drop, merge, or reorder. If a string is already in ${tgt === "es" ? "Spanish" : "English"}, return it verbatim. Preserve numbers, quantities and units.
Return your answer via the return_translations tool: a single "result" string containing the N translations in order, each separated by a line that contains only ~~~ (three tildes). Do not number them. Produce exactly N translations and no other commentary. Keep each translation on a single line (no internal line breaks).`;
}

const SEP = /\n*~~~\n*/;
const TOOL = {
  name: "return_translations",
  description: "Return the translations as one string, separated by lines containing only ~~~.",
  input_schema: {
    type: "object",
    properties: { result: { type: "string" } },
    required: ["result"],
  },
} as const;

function flatten(src: { title: string; ingredients: Group[]; steps: Group[] }) {
  const strings: string[] = [];
  const add = (s: string) => (strings.push(s), strings.length - 1);
  const titleIdx = add(src.title);
  const enc = (groups: Group[]) =>
    groups.map((g) => ({
      labelIdx: g.label != null && g.label.trim() ? add(g.label) : -1,
      itemIdxs: (g.items ?? []).map((it) => add(it)),
    }));
  const ingShape = enc(src.ingredients);
  const stepShape = enc(src.steps);
  return { strings, titleIdx, ingShape, stepShape };
}

async function callModel(strings: string[], tgt: "es" | "en"): Promise<string[]> {
  const msg = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: sysFor(tgt),
    tools: [TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: "return_translations" },
    messages: [{ role: "user", content: JSON.stringify(strings) }],
  });
  const tu = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!tu) throw new Error("model did not return the tool call");
  const result = (tu.input as { result?: unknown }).result;
  if (typeof result !== "string") throw new Error("result not a string");
  return result.split(SEP).map((x) => x.trim()).filter((x) => x.length > 0);
}

async function translate(src: { title: string; ingredients: Group[]; steps: Group[] }, tgt: "es" | "en") {
  const { strings, titleIdx, ingShape, stepShape } = flatten(src);
  let tr: string[] | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const out = await callModel(strings, tgt);
    if (out.length === strings.length) { tr = out; break; }
  }
  if (!tr) throw new Error(`length mismatch after retries (expected ${strings.length})`);
  const rebuild = (shape: { labelIdx: number; itemIdxs: number[] }[]): Group[] =>
    shape.map((g) => ({ label: g.labelIdx >= 0 ? tr![g.labelIdx] : null, items: g.itemIdxs.map((i) => tr![i]) }));
  return { title: tr[titleIdx], ingredients: rebuild(ingShape), steps: rebuild(stepShape) };
}

async function main() {
  const mode = process.argv[2] === "all" ? "all" : "sample";
  const { data, error } = await s
    .from("recipes")
    .select("id, language, rating, cook_status, title_es, title_en, ingredients_es, ingredients_en, steps_es, steps_en")
    .order("rating", { ascending: false, nullsFirst: false });
  if (error) throw error;
  const recipes = (data ?? []) as Recipe[];

  // A recipe "needs" the empty side. es-origin -> generate en; en-origin -> generate es.
  // Re-do if the target is missing OR incomplete relative to the source (e.g. a prior bad write).
  const jobs = recipes
    .map((r) => {
      const tgt: "es" | "en" = r.language === "en" ? "es" : "en";
      const srcTitle = tgt === "en" ? r.title_es : r.title_en;
      const srcIng = (tgt === "en" ? r.ingredients_es : r.ingredients_en) ?? [];
      const srcSteps = (tgt === "en" ? r.steps_es : r.steps_en) ?? [];
      const tgtTitle = tgt === "en" ? r.title_en : r.title_es;
      const tgtIng = (tgt === "en" ? r.ingredients_en : r.ingredients_es) ?? [];
      const tgtSteps = (tgt === "en" ? r.steps_en : r.steps_es) ?? [];
      const done = !!tgtTitle && (!hasContent(srcIng) || hasContent(tgtIng)) && (!hasContent(srcSteps) || hasContent(tgtSteps));
      return { r, tgt, srcTitle, srcIng, srcSteps, done };
    })
    .filter((j) => !j.done && j.srcTitle);

  const esToEn = jobs.filter((j) => j.tgt === "en");
  const enToEs = jobs.filter((j) => j.tgt === "es");
  const batch = mode === "sample" ? [...esToEn.slice(0, 3), ...enToEs.slice(0, 2)] : jobs;

  console.log(`Mode: ${mode}. Pending: ${jobs.length} (es→en ${esToEn.length}, en→es ${enToEs.length}). Translating ${batch.length} now.\n`);

  let ok = 0;
  for (const j of batch) {
    const src = { title: j.srcTitle!, ingredients: j.srcIng as Group[], steps: j.srcSteps as Group[] };
    try {
      const out = await translate(src, j.tgt);
      const patch = j.tgt === "en"
        ? { title_en: out.title, ingredients_en: out.ingredients, steps_en: out.steps }
        : { title_es: out.title, ingredients_es: out.ingredients, steps_es: out.steps };
      const { error: uerr } = await s.from("recipes").update(patch).eq("id", j.r.id);
      if (uerr) throw uerr;
      ok++;
      if (mode === "sample") {
        console.log(`\n===== [→${j.tgt}] ${src.title}  ->  ${out.title} =====`);
        const flat = (g: Group[]) => g.flatMap((x) => [...(x.label ? [`(${x.label})`] : []), ...x.items.map((i) => `• ${i}`)]);
        const pair = (a: Group[], b: Group[], head: string) => {
          console.log(`-- ${head} --`);
          const A = flat(a), B = flat(b);
          for (let i = 0; i < Math.max(A.length, B.length); i++) console.log(`  ${(A[i] ?? "").slice(0, 52).padEnd(54)}${B[i] ?? ""}`);
        };
        pair(src.ingredients, out.ingredients, "INGREDIENTES (orig → traducción)");
        pair(src.steps, out.steps, "PASOS (orig → traducción)");
      } else {
        console.log(`  ✓ [${j.tgt}] ${out.title}`);
      }
    } catch (e: any) {
      console.error(`  ✗ FAILED [${j.tgt}] ${src.title}: ${e.message || e}`);
    }
  }
  console.log(`\nDone. Wrote ${ok}/${batch.length}.`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
