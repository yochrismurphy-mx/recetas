import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  "language": "es"
}

Translate everything to Spanish. Do not invent ingredients or steps. If the input is not a recipe, return {"error":"not a recipe"}.`;

async function fetchPageText(url: string): Promise<string> {
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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14000);
}

export async function parseRecipe(input: string): Promise<ParsedRecipe> {
  const trimmed = input.trim();
  const isUrl = /^https?:\/\/\S+$/i.test(trimmed);
  let body = trimmed;
  if (isUrl) {
    const pageText = await fetchPageText(trimmed);
    body = `Source URL: ${trimmed}\n\nPage text:\n${pageText}`;
  }
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: SYSTEM,
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
  return parsed as ParsedRecipe;
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
