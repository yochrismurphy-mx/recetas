import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// One model for every call. Structured output (output_config.format) guarantees valid JSON,
// and server-side fallbacks retry on another model if a request is declined.
const MODEL = "claude-opus-5-5";

async function callJSON<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const msg = await client.beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "low", format: { type: "json_schema", schema: opts.schema } },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  } as never) as unknown as Anthropic.Beta.BetaMessage;
  if (msg.stop_reason === "refusal") throw new Error("El modelo no pudo procesar este texto.");
  if (msg.stop_reason === "max_tokens") throw new Error("La respuesta quedó incompleta; intenta con un texto más corto.");
  const text = msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(text) as T;
}

const TYPES = ["Aves", "Carne", "Pescado", "Leguminosas", "Ensalada", "Sopa/Curry", "Granos/Pasta", "Verduras", "Postre", "Desayuno", "Pan/Masa", "Salsas/Dips", "Untables"];
const STR = { type: "string" };
const STR_ARR = { type: "array", items: STR };
const RECIPE_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["is_recipe", "emoji", "title", "type", "porciones", "source_urls", "groups", "notes", "tags", "language"],
  properties: {
    is_recipe: { type: "boolean" },
    emoji: STR, title: STR,
    type: { type: "string", enum: TYPES },
    porciones: { anyOf: [STR, { type: "null" }] },
    source_urls: STR_ARR,
    groups: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "kind", "items"],
      properties: { label: { anyOf: [STR, { type: "null" }] }, kind: { type: "string", enum: ["ing", "step"] }, items: STR_ARR } } },
    notes: STR_ARR,
    tags: STR_ARR,
    language: { type: "string", enum: ["es", "en"] },
  },
};

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

const FIELDS = `Fields:
- is_recipe: false if the input is not a recipe (then fill the other fields with empty values).
- emoji: one emoji by dish type: 🍗 aves · 🥩 carne · 🐟 pescado/mariscos · 🫘 leguminosas · 🥗 ensalada · 🍲 sopa/caldo/curry/guiso · 🍚 arroz/granos/pasta · 🥦 verduras/guarnición · 🍮 postre/dulce · 🥣 desayuno · 🫓 pan/masa · 🫙 salsa/dip · 🥜 untable.
- type: the dish type.
- porciones: servings as stated (e.g. "4 porciones" or "6 servings"), or null.
- source_urls: the source URL if one was provided, else [].
- groups: ingredient groups first (kind "ing"), then step groups (kind "step"); label is a short sub-group name or null; one line per item, list markers stripped.
- notes: only tips or macros that the source itself states; [] if none. Never write your own tips.
- tags: only from this list, conservative (cuisine only if clearly that cuisine; "Vegetariano" if no meat, poultry or fish; "Vegano" if no animal products at all, plus Vegetariano; "Rápido" if quick and simple; "Picante" if notably spicy): ${TAG_VOCAB.join(", ")}.
Do not invent ingredients, amounts or steps.`;

const SYSTEM = `You parse a recipe (a web page's text or pasted text) into structured data for a household recipe app, translating it to natural Mexican Spanish if it is in another language (Mexican ingredient names: jitomate, betabel, elote, chícharo, ejotes, camote, cacahuate, calabacita, cebollín). Title, groups and notes all in Spanish; language "es".
${FIELDS}`;

const SYSTEM_KEEP = `You parse a recipe (a web page's text or pasted text) into structured data for a household recipe app. Keep it in its ORIGINAL language; do not translate. language is the detected language ("es" or "en").
${FIELDS}`;

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
  const parsed = await callJSON<ParsedRecipe & { is_recipe: boolean }>({
    system: translate ? SYSTEM : SYSTEM_KEEP,
    user: body,
    schema: RECIPE_SCHEMA,
  });
  if (!parsed.is_recipe) throw new Error("No parece una receta.");
  if (isUrl && (!parsed.source_urls || parsed.source_urls.length === 0)) {
    parsed.source_urls = [trimmed];
  }
  parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t: string) => TAG_VOCAB.includes(t)) : [];
  parsed.image_candidate = scrapedImage;
  return parsed as ParsedRecipe;
}

// --- Recipe translation (server-side) ---
type TGroup = { label: string | null; items: string[] };

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
  const system = `You translate recipe text into ${toLang === "es" ? "Spanish" : "English"}. You receive a JSON array of N strings (title, then ingredient and step lines). Return exactly N translations in the same order: translate each faithfully; do not add, drop, merge, or reorder. If a string is already in the target language, or is only symbols or emoji, return it unchanged. Preserve numbers, quantities and units.${mx}`;

  let tr: string[] | null = null;
  for (let attempt = 0; attempt < 3 && !tr; attempt++) {
    const out = await callJSON<{ translations: string[] }>({
      system,
      user: JSON.stringify(strings),
      schema: { type: "object", additionalProperties: false, required: ["translations"], properties: { translations: STR_ARR } },
    });
    if (out.translations.length === strings.length) tr = out.translations;
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
- Keep names short, in Spanish.`;

  const user = JSON.stringify({
    ingredientes_recetas: opts.ingredients,
    basicos: opts.staples,
    ya_tengo: opts.onHand,
  });

  const out = await callJSON<{ groups: ShoppingGroup[] }>({
    system: sys,
    user,
    schema: {
      type: "object", additionalProperties: false, required: ["groups"],
      properties: { groups: { type: "array", items: { type: "object", additionalProperties: false, required: ["aisle", "items"], properties: {
        aisle: { type: "string", enum: opts.aisles },
        items: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "qty"],
          properties: { name: STR, qty: { anyOf: [STR, { type: "null" }] } } } },
      } } } },
    },
  });
  return out.groups;
}
