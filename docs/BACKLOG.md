# Recetas — Features Backlog

Living list of what we want to build. Newest thinking at top of each section.
Check items off as they ship. Keep it honest: "partially done" notes call out
what already exists vs. what's still missing.

Conventions: `[ ]` open · `[~]` partially done · `[x]` done (kept briefly for context, then pruned).

---

## Finding & Adding New Recipes

- [x] **Add a recipe from a link** — scrapes the recipe, pulls the page image (og:image → stored in bucket), captures + links the source, auto-applies Etiquetas, translates to Spanish. Preview shows the image + suggested tags before saving. (shipped 2026-06-22)
  - Possible follow-ups: let the user edit/deselect suggested tags in the preview; fall back to a larger in-page image when og:image is low-res; handle paywalled/JS-only pages (some sites won't scrape).
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

- [ ] "Biblioteca" back-nav still re-fetches the whole library (force-dynamic), so it can feel slow on a cold load — consider caching / lighter back-nav if it still drags.
- [ ] Apply the same optimistic-update pattern to any other laggy clicks we notice (week page, compras toggles).

---

## Recently shipped (for orientation)

- Add-by-link: scrapes page image + auto-tags + captures source, with image/tags shown in the add preview.
- Snappier UI: optimistic updates on rating / cook-status / collection+tag toggles (instant, no round-trip lag); stronger hover + back-link affordance.
- Full-bleed unlock (password) page with a big kitchen photo; clean cards header; title "La cocina de Norma y Chris."
- Fridge shelf-life clearly editable (labeled field in Editar).
- 3-state cook status (Sin probar / Ya cocinada / De cabecera) replacing the broken counter.
- Source-link editing on recipes.
- Filter overhaul: search + Filtros panel with removable chips; new facets (calificación, frescura, estado, por completar).
- Cook to-dos for the week ("Otras tareas") that print on the cook sheet.
- ~120 of 137 recipes now have real photos.
