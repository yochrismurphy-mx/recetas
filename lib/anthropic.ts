import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Etiqueta vocabulary the model may suggest on add (keep in sync with supabase/auto-tag.ts).
export const TAG_VOCAB = [
  "Mexicano", "Italiano", "Indio", "Tailandés", "Griego", "Japonés", "Coreano",
  "Chino", "Vietnamita", "Mediterráneo", "Medio Oriente", "Americano", "Francés",
  "Africano", "Vegetariano", "Vegano", "Sin gluten", "Rápido", "Saludable",
  "Picante", "Para invitados",
];

export type ParsedGroup = { label: string | null; kind: "ing" | "step"; items: string[] };
export type ParsedRecipe = {
  emoji: string;
  title: string;
  type: string;
  porciones: string | null;
  source_urls: string[];
  groups: ParsedGroup[];
  notes: string[];
  language: "es" | "en";
  tags: string[];
  image_candidate: string | null;
};

const SYSTEM = `You parse a recipe (given as a URL's page text or pasted text) into clean structured JSON for a recipe app, and translate it to Spanish if it is in English. Output ONLY a valid JSON object, no markdown, no commentary.

Schema:
{
  "emoji": one emoji from this legend by dish type: 🍗 aves · 🥩 carne · 🐟 pescado/mariscos · 🫘 leguminosas · 🥗 ensalada · 🍲 sopa/caldo/curry/guiso · 🍚 arroz/granos/pasta · 🥦 verduras/guarnición · 🍮 postre/dulce · 🥣 desayuno · 🫓 pan/masa · 🫙 salsa/dip · 🥜 untable,
  "title": dish name in Spanish (translate if needed; trim),
  "type": one of: Aves, Carne, Pescado, Leguminosas, Ensalada, Sopa/Curry, Granos/Pasta, Verduras, Postre, Desayuno, Pan/Masa, Salsas/Dips, Untables,
  "porciones": e.g. "4 porciones" if stated, else null,
  "source_urls": array with the source URL if one was provided, else [],
  "groups": array of { "label": short sub-group label or null, "kind": "ing" or "step", "items": [strings] } — ingredients first, then steps, all in Spanish, markers stripped,
  "notes": array of short tips in Spanish, or [],
  "tags": array of applicable labels chosen ONLY from this list — conservative, do not over-tag (cuisine only if clearly that cuisine; "Vegetariano" if no meat/poultry/fish; "Vegano" if no animal products at all, also add Vegetariano; "Rápido" if quick/simple; "Picante" if notably spicy): ${TAG_VOCAB.join(", ")},
  "language": "es"
}

Translate everything to Spanish. Do not invent ingredients or steps. If the input is not a recipe, return {"error":"not a recipe"}.`;

const SYSTEM_KEEP = `You parse a recipe (URL page text or pasted text) into clean structured JSON for a recipe app. Keep the recipe in its ORIGINAL language; do NOT translate. Output ONLY a valid JSON object, no markdown.

Schema:
{
  "emoji": one emoji by dish type: 🍗 aves · 🥩 carne · 🐟 pescado · 🫘 leguminosas · 🥗 ensalada · 🍲 sopa/curry · 🍚 granos/pasta · 🥦 verduras · 🍮 postre · 🥣 desayuno · 🫓 pan/masa · 🫙 salsa/dip · 🥜 untable,
  "title": dish name in its original language (trim),
  "type": one of: Aves, Carne, Pescado, Leguminosas, Ensalada, Sopa/Curry, Granos/Pasta, Verduras, Postre, Desayuno, Pan/Masa, Salsas/Dips, Untables,
  "porciones": e.g. "4 porciones"/"6 servings" if stated, else null,
  "source_urls": [the source URL if provided, else []],
  "groups": [{ "label": sub-group label or null, "kind": "ing" or "step", "items": [strings] }] — ingredients first, then steps, markers stripped, ORIGINAL language,
  "notes": [short tips or macros in original language, or []],
  "tags": array of applicable labels chosen ONLY from this list — conservative, do not over-tag (cuisine only if clearly that cuisine; "Vegetariano" if no meat/poultry/fish; "Vegano" if no animal products at all, also add Vegetariano; "Rápido" if quick/simple; "Picante" if notably spicy): ${TAG_VOCAB.join(", ")},
  "language": "es" or "en" as detected
}
Do not invent ingredients or steps. If the input is not a recipe, return {"error":"not a recipe"}.`;

function resolveUrl(u: string, base: string): string {
  if (u.startsWith("//")) return "https:" + u;
  try { return new URL(u, base).href; } catch { return u; }
}

// Pull the page's hero image (og:image, with twitter:image fallback).
function extractOgImage(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/i,
  ];
  for (const re of patterns) {
    const cand = html.match(re)?.[1]?.trim();
    if (cand && /^((https?:)?\/\/|\/)/.test(cand)) return resolveUrl(cand, baseUrl);
  }
  return null;
}

async function fetchPage(url: string): Promise<{ text: string; image: string | null }> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      accept: "text/html",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  const image = extractOgImage(html, url);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14000);
  return { text, image };
}

export async function parseRecipe(
  input: string,
  opts: { translate?: boolean } = {},
): Promise<ParsedRecipe> {
  const translate = opts.translate !== false;
  const trimmed = input.trim();
  const isUrl = /^https?:\/\/\S+$/i.test(trimmed);
  let body = trimmed;
  let scrapedImage: string | null = null;
  if (isUrl) {
    const { text, image } = await fetchPage(trimmed);
    scrapedImage = image;
    body = `Source URL: ${trimmed}\n\nPage text:\n${text}`;
  }
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: translate ? SYSTEM : SYSTEM_KEEP,
    messages: [{ role: "user", content: body }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const json = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(json);
  if (parsed.error) throw new Error("No parece una receta.");
  if (isUrl && (!parsed.source_urls || parsed.source_urls.length === 0)) {
    parsed.source_urls = [trimmed];
  }
  parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t: string) => TAG_VOCAB.includes(t)) : [];
  parsed.image_candidate = scrapedImage;
  return parsed as ParsedRecipe;
}

// --- Recipe translation (server-side; mirrors supabase/translate-recipes.ts) ---
type TGroup = { label: string | null; items: string[] };
const T_SEP = /\n*~~~\n*/;

export async function translateRecipeContent(
  src: { title: string; ingredients: TGroup[]; steps: TGroup[] },
  toLang: "es" | "en",
): Promise<{ title: string; ingredients: TGroup[]; steps: TGroup[] }> {
  const strings: string[] = [];
  const add = (s: string) => (strings.push(s), strings.length - 1);
  const titleIdx = add(src.title);
  const enc = (groups: TGroup[]) =>
    (groups ?? []).map((g) => ({
      labelIdx: g.label != null && g.label.trim() ? add(g.label) : -1,
      itemIdxs: (g.items ?? []).map((it) => add(it)),
    }));
  const ingShape = enc(src.ingredients);
  const stepShape = enc(src.steps);

  const mx = toLang === "es"
    ? " Use natural MEXICAN Spanish and the ingredient names a Mexican home cook uses (betabel, elote, jitomate, chícharo, ejotes, camote, cacahuate, crema, queso fresco)."
    : "";
  const system = `You translate recipe text into ${toLang === "es" ? "Spanish" : "English"}. You receive a JSON array of N strings (title, then ingredient and step lines). Translate each faithfully; do not add, drop, merge, or reorder. If a string is already in the target language, return it verbatim. Preserve numbers/quantities/units.${mx}
Return via the return_translations tool a single "result" string with the N translations in order, each separated by a line containing only ~~~ (three tildes). Exactly N, each on one line, no numbering, no commentary.`;

  let tr: string[] | null = null;
  for (let attempt = 0; attempt < 3 && !tr; attempt++) {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system,
      tools: [{
        name: "return_translations",
        description: "Return the translations as one string separated by ~~~ lines.",
        input_schema: { type: "object", properties: { result: { type: "string" } }, required: ["result"] },
      }],
      tool_choice: { type: "tool", name: "return_translations" },
      messages: [{ role: "user", content: JSON.stringify(strings) }],
    });
    const tu = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const result = tu && (tu.input as { result?: unknown }).result;
    if (typeof result === "string") {
      const parts = result.split(T_SEP).map((x) => x.trim()).filter((x) => x.length > 0);
      if (parts.length === strings.length) tr = parts;
    }
  }
  if (!tr) throw new Error("translation length mismatch");
  const rebuild = (shape: { labelIdx: number; itemIdxs: number[] }[]): TGroup[] =>
    shape.map((g) => ({ label: g.labelIdx >= 0 ? tr![g.labelIdx] : null, items: g.itemIdxs.map((i) => tr![i]) }));
  return { title: tr[titleIdx], ingredients: rebuild(ingShape), steps: rebuild(stepShape) };
}

export type ShoppingGroup = { aisle: string; items: { name: string; qty: string | null }[] };

export async function consolidateShopping(opts: {
  ingredients: string[];
  staples: { name: string; aisle: string | null }[];
  onHand: string[];
  aisles: string[];
}): Promise<ShoppingGroup[]> {
  const sys = `You build a grocery shopping list in Spanish for a household.
Input: recipe ingredient lines (with quantities), recurring staples to always include, and items already on hand to EXCLUDE.
Produce a consolidated buy list:
- Merge duplicate ingredients across recipes and sum quantities sensibly (e.g. three "1 cebolla" -> "3 cebollas").
- EXCLUDE anything already on hand.
- INCLUDE every staple.
- Group items by aisle, choosing from: ${opts.aisles.join(", ")}.
- Keep names short, in Spanish.
Return ONLY a JSON array: [{"aisle":"...","items":[{"name":"...","qty":"..."|null}]}]. No commentary.`;

  const user = JSON.stringify({
    ingredientes_recetas: opts.ingredients,
    basicos: opts.staples,
    ya_tengo: opts.onHand,
  });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: sys,
    messages: [{ role: "user", content: user }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const json = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(json) as ShoppingGroup[];
}
