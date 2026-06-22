import type { Recipe, FilterState } from "./types";

type Chip = { facet: "type" | "collection" | "tag"; value: string };

export const FRIDGE_BUCKETS: { key: string; label: string; test: (d: number) => boolean }[] = [
  { key: "short", label: "≤3 días", test: (d) => d <= 3 },
  { key: "mid", label: "4–6 días", test: (d) => d >= 4 && d <= 6 },
  { key: "long", label: "7+ días", test: (d) => d >= 7 },
];

export const RATING_OPTIONS = [5, 4, 3];

/** A recipe is incomplete when it has no ingredient text or no step text. */
export function recipeIncomplete(r: Recipe): boolean {
  const hasText = (groups: Recipe["ingredients"]) =>
    groups.some((g) => g.items.some((s) => s && s.trim().length > 0));
  return !hasText(r.ingredients) || !hasText(r.steps);
}

function matches(r: Recipe, c: Chip): boolean {
  if (c.facet === "type") return r.type === c.value;
  if (c.facet === "collection") return r.collections.includes(c.value);
  return r.tags.includes(c.value);
}

/**
 * Filter recipes. Selected chips narrow by default (mode "all": a recipe must
 * match every selected chip). mode "any" widens (match any chip). The search
 * query always applies on top, matching title or ingredient text.
 */
export function applyFilters(recipes: Recipe[], f: FilterState): Recipe[] {
  const chips: Chip[] = [
    ...f.types.map((v) => ({ facet: "type" as const, value: v })),
    ...f.collections.map((v) => ({ facet: "collection" as const, value: v })),
    ...f.tags.map((v) => ({ facet: "tag" as const, value: v })),
  ];
  const q = f.q.trim().toLowerCase();
  return recipes.filter((r) => {
    if (q) {
      const hay = (
        r.title +
        " " +
        r.ingredients.flatMap((g) => g.items).join(" ")
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.incompleteOnly && !recipeIncomplete(r)) return false;
    if (f.minRating != null && (r.rating == null || r.rating < f.minRating)) return false;
    if (f.status.length > 0 && !f.status.includes(r.cook_status)) return false;
    if (f.fridge.length > 0) {
      const d = r.fridge_life_days;
      const ok = d != null && f.fridge.some((k) => FRIDGE_BUCKETS.find((b) => b.key === k)?.test(d));
      if (!ok) return false;
    }
    if (chips.length === 0) return true;
    return f.mode === "any"
      ? chips.some((c) => matches(r, c))
      : chips.every((c) => matches(r, c));
  });
}
