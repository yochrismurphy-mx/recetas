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
  - [ ] **Ideas from what's in the fridge** — generate recipe ideas from the current fridge-contents list ("usa lo que tenemos"). Chris flagged this as a wanted feature (2026-06-22); not building yet. Depends on the Fridge contents item below.
  - [ ] Recipes pulled from our own old cookbooks / files (import Chris's existing recipe files)

## Weekly Ideas & Grocery List

- [ ] **General structuring improvement** of the weekly + shopping flow
- [~] **Pantry staples** — decided NOT to build a feature for now. Instead Claude proposes a candidate staples list (from the recipe corpus + common pantry items), Chris confirms what he actually has, and they get added to the existing "Mis básicos" on /compras. (in progress 2026-06-22)
- [ ] **Fridge contents** — share what's currently in the refrigerator so the list and ideas account for it
- [ ] **Beyond-recipe buys** — capture what we want / usually buy outside the recipes; have it prompt us about these
- [ ] **Automate Uber Eats / Sumesa cart** — push the finished list into a Sumesa shopping cart

## Translation

- [~] **EN/ES toggle**, careful Mexican-Spanish (precise MX ingredient names). DECIDED 2026-06-27: persist both languages per recipe (`title_es/_en`, `ingredients_es/_en`, `steps_es/_en`); default language Spanish; cook sheet (hoja) stays Spanish always. Existing Spanish is copied verbatim and never re-translated (trusted); the model only fills the missing side (mostly ES→EN, since 96 of 124 recipes are Spanish). IN PROGRESS: schema migration pending (run via Supabase SQL editor — pooler self-signed cert blocks direct `pg` DDL), then a 5-recipe sample for quality sign-off before the full batch, then the toggle + UI-string i18n.
- [ ] **Edit-sync between the two language versions** (raised 2026-06-27) — once both languages are stored, editing one side makes the other stale. Need a rule for: which column an edit writes to (the currently-displayed language), and how the other side updates. Recommended approach: do NOT auto-re-translate on save (that would silently clobber a hand-corrected translation and burn an API call every edit). Instead mark the other side **stale** (a per-recipe `translation_stale` flag or per-field marker) and offer a one-click "Actualizar traducción" that regenerates the stale side for review. This respects the "trust existing / hand-correctable" principle. Also resolve source-of-truth: make `_es/_en` canonical and retire the legacy `title/ingredients/steps` columns. Open Qs: per-field vs whole-recipe staleness; whether to show a small "traducción desactualizada" badge.

## Recipe structure & organization

- [ ] **Combine / split recipes (component sub-recipes)** — some recipes bundle multiple parts (a salad or protein PLUS a sauce/dressing), but Chris often wants to make just one part (e.g. only the sauce). Today that forces an awkward choice: one combined recipe you can't partially cook, or two separate entries that clutter search. Explore ways to model a recipe as having named components/sub-recipes, so you can: (a) keep them under one library entry instead of two, (b) add just one component to the week, and (c) split a component out or merge a standalone one back in. Open design Qs: data model (sub-recipes vs. tagged ingredient/step groups — note ingredients/steps already support `label` groups), how the cook sheet + shopping list handle a partial selection, and the search/library UX so components don't double-list. Raised 2026-06-27.

## Recipe enrichment (per-recipe extras)

- [~] **Show / embed a recipe's video** — SHIPPED 2026-06-27: `video_url` column; optional video field in the add + edit forms; `lib/video.ts` parses YouTube (watch/shorts/youtu.be/embed) and Instagram (reel/p) links; YouTube plays **inline** on the recipe detail, Instagram shows a "Ver video en Instagram" link-out (no embed, per decision); ▶ badge on library cards that have a video. Manually attached 3 Jonathan Zaragoza salsa recipes as the first set.
  - Still open: (a) **auto-detect** a video per recipe via a search pass across the library (source page / IG / YouTube) instead of pasting the link by hand — needs match + false-positive control; (b) Instagram inline embed is deliberately NOT done (oEmbed/login walls make reels unreliable); (c) short/vertical videos play in a 16:9 frame (letterboxed) — fine for now.
  - DECIDED 2026-06-27 (shelved): **transcribe a video → auto-generate a recipe.** YouTube has walled programmatic caption access (direct fetch empty, InnerTube blocked, yt-dlp needs a PO token/login). The robust path is download-audio + a transcription service (Deepgram/AssemblyAI/Whisper), which also covers IG/TikTok. Not building until a video without a written recipe makes it worth it. See `lib/video.ts`.
- [ ] **Flag special equipment per recipe** (Chris not yet convinced — parking so it isn't lost) — some recipes need specific gear, e.g. Mantequilla de Nueces needs a high-powered blender. Could surface a small "equipo especial" note on the recipe. Open Q: free-text vs. a controlled equipment list; whether the data-entry is worth it. Raised 2026-06-27.

## Recipe data quality / cleanup

- [ ] Fill in recipes missing ingredients or steps — use the "Por completar" filter to find them.
- [ ] Two recipes imported with no ingredient text, need full text: "Creamy Jalapeño-Basil Edamame Spread", "Delicious sweet potato".
- [x] Deleted the empty "Crispy Rice Salad" stub (kept the full "…with Creamy Sweet Chilli Dressing"). (2026-06-22)

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
