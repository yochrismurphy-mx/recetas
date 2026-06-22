import { describe, it, expect } from "vitest";
import { applyFilters } from "../lib/filters";
import type { Recipe } from "../lib/types";

function r(p: Partial<Recipe>): Recipe {
  return {
    id: "x", title: "X", emoji: null, type: null, language: "es",
    porciones: null, fridge_life_days: null, rating: null, tried: false,
    times_cooked: 0, last_cooked: null, source_url: null, image_url: null,
    ingredients: [], steps: [], collections: [], tags: [], ...p,
  };
}
const base = { q: "", types: [], collections: [], tags: [], mode: "all" as const };

const data: Recipe[] = [
  r({ id: "1", title: "Curry rojo", type: "Sopa/Curry", tags: ["Vegetariano", "Indio"] }),
  r({ id: "2", title: "Tinga de pollo", type: "Aves", tags: ["Rápido"] }),
  r({ id: "3", title: "Hummus", type: "Salsas/Dips", tags: ["Vegetariano"],
      ingredients: [{ label: null, items: ["garbanzos", "tahini"] }] }),
];

describe("applyFilters", () => {
  it("returns all with no filters", () => {
    expect(applyFilters(data, base).length).toBe(3);
  });
  it("search matches title and ingredients", () => {
    expect(applyFilters(data, { ...base, q: "curry" }).map((x) => x.id)).toEqual(["1"]);
    expect(applyFilters(data, { ...base, q: "tahini" }).map((x) => x.id)).toEqual(["3"]);
  });
  it("multiple tags narrow (AND) by default", () => {
    expect(
      applyFilters(data, { ...base, tags: ["Vegetariano", "Indio"] }).map((x) => x.id),
    ).toEqual(["1"]);
  });
  it("mode any widens (OR)", () => {
    expect(
      applyFilters(data, { ...base, tags: ["Indio", "Rápido"], mode: "any" }).map((x) => x.id).sort(),
    ).toEqual(["1", "2"]);
  });
  it("combines facets across type and tag (AND)", () => {
    expect(
      applyFilters(data, { ...base, types: ["Salsas/Dips"], tags: ["Vegetariano"] }).map((x) => x.id),
    ).toEqual(["3"]);
  });
});
