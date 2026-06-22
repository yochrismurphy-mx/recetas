import type { Recipe, FilterState } from "./types";

type Chip = { facet: "type" | "collection" | "tag"; value: string };

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
    if (chips.length === 0) return true;
    return f.mode === "any"
      ? chips.some((c) => matches(r, c))
      : chips.every((c) => matches(r, c));
  });
}
