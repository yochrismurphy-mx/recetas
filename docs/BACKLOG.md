# Recetas — Features Backlog

Living list of what we want to build. Newest thinking at top of each section.
Check items off as they ship. Keep it honest: "partially done" notes call out
what already exists vs. what's still missing.

Conventions: `[ ]` open · `[~]` partially done · `[x]` done (kept briefly for context, then pruned).

---

## Finding & Adding New Recipes

- [~] **Add a recipe from a link** — scrape the recipe, pull the image, grab + link the source, auto-tag.
  - Now: `/agregar` accepts a pasted link or text, AI-parses into structured ingredients/steps, and translates to Spanish. Source link is now editable on the recipe.
  - Gaps: it doesn't reliably *scrape the page image*, doesn't auto-capture the source URL from a pasted link, and doesn't auto-apply Etiquetas on add (tags are applied in a separate batch step).
- [ ] **Generate new ideas**
  - [ ] Brand-new recipes
  - [ ] Innovations / variations on existing recipes
  - [ ] Recipes by diet, plan, or constraint (e.g. high-protein, vegetarian week, what's in season)
  - [ ] Recipes pulled from our own old cookbooks / files (import Chris's existing recipe files)

## Weekly Ideas & Grocery List

- [ ] **General structuring improvement** of the weekly + shopping flow
- [ ] **Pantry staples** — share/maintain what we keep on hand (partially exists: "Mis básicos" on /compras; revisit as the canonical pantry)
- [ ] **Fridge contents** — share what's currently in the refrigerator so the list and ideas account for it
- [ ] **Beyond-recipe buys** — capture what we want / usually buy outside the recipes; have it prompt us about these
- [ ] **Automate Uber Eats / Sumesa cart** — push the finished list into a Sumesa shopping cart

## Translation (deferred from 2026-06-22)

- [ ] **EN/ES toggle**, careful Mexican-Spanish (precise MX ingredient names). Decide: persist both languages per recipe (editable, toggle) vs. on-the-fly. Recipes currently stored in mixed original languages.

## Recipe data quality / cleanup

- [ ] Fill in recipes missing ingredients or steps — use the "Por completar" filter to find them.
- [ ] Two recipes imported with no ingredient text, need full text: "Creamy Jalapeño-Basil Edamame Spread", "Delicious sweet potato".
- [ ] Decide on near-duplicate: empty "Crispy Rice Salad" (its own IG source) vs. the full "…with Creamy Sweet Chilli Dressing".

## Images

- [ ] Re-source dead image URLs (high 404 rate from hotlink protection). Current still-needs-a-photo list lives in `supabase/seed/titles-needing-images.txt`.

## Design / UX (smaller polish)

- [ ] Ongoing polish as we use it; no specific items queued right now.

---

## Recently shipped (for orientation)

- Welcoming unlock (password) page with kitchen photo; clean cards header; title "La cocina de Norma y Chris."
- 3-state cook status (Sin probar / Ya cocinada / De cabecera) replacing the broken counter.
- Source-link editing on recipes.
- Filter overhaul: search + Filtros panel with removable chips; new facets (calificación, frescura, estado, por completar).
- Cook to-dos for the week ("Otras tareas") that print on the cook sheet.
- ~120 of 137 recipes now have real photos.
