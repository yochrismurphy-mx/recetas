"use client";

import { Children, useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import type { Recipe, FilterState, CookStatus } from "@/lib/types";
import { applyFilters, recipeIncomplete, FRIDGE_BUCKETS, RATING_OPTIONS } from "@/lib/filters";
import { UI, typeLabel, collLabel, tagLabel, COOK_STATUS_LABELS as STATUS_LABELS, type Lang } from "@/lib/i18n";
import { LangToggle } from "./lang-toggle";
import { toggleWeek } from "./semana/actions";

const EMPTY_FILTERS: FilterState = {
  q: "", types: [], collections: [], tags: [], mode: "all",
  incompleteOnly: false, minRating: null, fridge: [], status: [],
};

const TYPE_TINT: Record<string, string> = {
  Aves: "#fdeede", Carne: "#f8e3dd", Pescado: "#e6eef0", Leguminosas: "#f4e6d6",
  Ensalada: "#e9f0df", "Sopa/Curry": "#fbeed3", "Granos/Pasta": "#f0ebe0",
  Verduras: "#eaf0dd", Postre: "#f8e6ee", Desayuno: "#efe9f2", "Pan/Masa": "#f3e7d6",
  "Salsas/Dips": "#f8e2da", Untables: "#f4e6d6",
};

/** Order facet values by frequency (most-used first), tie-broken alphabetically. */
function byFreq(values: string[], counts: Record<string, number>): string[] {
  return [...values].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b));
}

function Stars({ n }: { n: number | null }) {
  if (!n) return null;
  return (
    <span className="text-[13px] tracking-tight text-accent" aria-label={`${n} de 5`}>
      {"★".repeat(n)}
      <span className="text-line">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export function LibraryClient({
  recipes, weekIds, allCollections, allTags, lang,
}: {
  recipes: Recipe[];
  weekIds: string[];
  allCollections: string[];
  allTags: string[];
  lang: Lang;
}) {
  const [, startWeek] = useTransition();
  const [week, setWeek] = useState<Set<string>>(new Set(weekIds));
  const [f, setF] = useState<FilterState>(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  // Desktop-only filter sidebar; collapse state persists across visits. Mobile
  // ignores this and keeps the `panelOpen` dropdown below.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    if (localStorage.getItem("recetas:sidebar") === "0") setSidebarOpen(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("recetas:sidebar", sidebarOpen ? "1" : "0");
  }, [sidebarOpen]);
  const incompleteCount = useMemo(
    () => recipes.filter(recipeIncomplete).length,
    [recipes],
  );

  function toggleWeekLocal(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWeek((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    startWeek(() => toggleWeek(id));
  }

  // Facet chips ordered by how many recipes carry each value (most common first).
  const collCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of recipes) for (const c of r.collections) m[c] = (m[c] ?? 0) + 1;
    return m;
  }, [recipes]);
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of recipes) if (r.type) m[r.type] = (m[r.type] ?? 0) + 1;
    return m;
  }, [recipes]);
  const tagCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of recipes) for (const t of r.tags) m[t] = (m[t] ?? 0) + 1;
    return m;
  }, [recipes]);
  const collectionsByFreq = useMemo(() => byFreq(allCollections, collCounts), [allCollections, collCounts]);
  const allTypes = useMemo(() => byFreq(Object.keys(typeCounts), typeCounts), [typeCounts]);
  const tagsByFreq = useMemo(() => byFreq(allTags, tagCounts), [allTags, tagCounts]);
  const filtered = useMemo(() => {
    // Thanksgiving recipes are hidden by default (too particular); selecting the
    // Thanksgiving collection chip brings them back.
    const base = f.collections.includes("Thanksgiving")
      ? recipes
      : recipes.filter((r) => !r.collections.includes("Thanksgiving"));
    // Default sort: highest star rating first, unrated last, then A–Z.
    return applyFilters(base, f).sort(
      (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title),
    );
  }, [recipes, f]);

  function toggle(facet: "types" | "collections" | "tags" | "fridge" | "status", value: string) {
    setF((prev) => {
      const arr = prev[facet] as string[];
      const has = arr.includes(value);
      return { ...prev, [facet]: has ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }
  function clearAll() {
    setF((prev) => ({ ...EMPTY_FILTERS, q: prev.q }));
  }

  const t = UI[lang];
  const statusLabels = STATUS_LABELS[lang];
  const fridgeLabel = (k: string) => (k === "short" ? t.fridgeShort : k === "mid" ? t.fridgeMid : t.fridgeLong);

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  f.collections.forEach((v) => activeChips.push({ key: `c:${v}`, label: collLabel(lang, v), clear: () => toggle("collections", v) }));
  f.types.forEach((v) => activeChips.push({ key: `t:${v}`, label: typeLabel(lang, v), clear: () => toggle("types", v) }));
  f.tags.forEach((v) => activeChips.push({ key: `g:${v}`, label: tagLabel(lang, v), clear: () => toggle("tags", v) }));
  if (f.minRating != null) activeChips.push({ key: "r", label: `${f.minRating}★ ${t.orMore}`, clear: () => setF((p) => ({ ...p, minRating: null })) });
  f.fridge.forEach((k) => activeChips.push({ key: `f:${k}`, label: fridgeLabel(k), clear: () => toggle("fridge", k) }));
  f.status.forEach((s) => activeChips.push({ key: `s:${s}`, label: statusLabels[s], clear: () => toggle("status", s) }));
  if (f.incompleteOnly) activeChips.push({ key: "inc", label: t.toComplete, clear: () => setF((p) => ({ ...p, incompleteOnly: false })) });

  // Shared facet controls, rendered in the desktop sidebar and the mobile dropdown.
  const filterGrid = (
    <div className="grid grid-cols-[5.5rem_1fr] items-start gap-x-3 gap-y-2.5">
      {allCollections.length > 0 && (
        <>
          <FLabel>{t.collection}</FLabel>
          <FChips>
            {collectionsByFreq.map((c) => (
              <button key={c} className="chip" data-on={f.collections.includes(c) || undefined} onClick={() => toggle("collections", c)}>{collLabel(lang, c)}</button>
            ))}
          </FChips>
        </>
      )}
      {allTypes.length > 0 && (
        <>
          <FLabel>{t.type}</FLabel>
          <FChips>
            {allTypes.map((ty) => (
              <button key={ty} className="chip rounded-md" data-on={f.types.includes(ty) || undefined} onClick={() => toggle("types", ty)}>{typeLabel(lang, ty)}</button>
            ))}
          </FChips>
        </>
      )}
      {allTags.length > 0 && (
        <>
          <FLabel>{t.tag}</FLabel>
          <FChips>
            {tagsByFreq.map((tg) => (
              <button key={tg} className="chip" data-on={f.tags.includes(tg) || undefined} onClick={() => toggle("tags", tg)}>{tagLabel(lang, tg)}</button>
            ))}
            <button
              onClick={() => setF({ ...f, mode: f.mode === "all" ? "any" : "all" })}
              className="ml-1 self-center text-[11px] text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              {f.mode === "all" ? t.matchAll : t.matchAny}
            </button>
          </FChips>
        </>
      )}

      <div className="col-span-2 my-1 border-t border-line/70" />

      <FLabel>{t.rating}</FLabel>
      <FChips>
        {RATING_OPTIONS.map((n) => (
          <button key={n} className="chip" data-on={f.minRating === n || undefined}
            onClick={() => setF((p) => ({ ...p, minRating: p.minRating === n ? null : n }))}>
            {n}★{n < 5 ? "+" : ""}
          </button>
        ))}
      </FChips>

      <FLabel>{t.freshness}</FLabel>
      <FChips>
        {FRIDGE_BUCKETS.map((b) => (
          <button key={b.key} className="chip" data-on={f.fridge.includes(b.key) || undefined}
            onClick={() => toggle("fridge", b.key)}>{fridgeLabel(b.key)}</button>
        ))}
      </FChips>

      <FLabel>{t.status}</FLabel>
      <FChips>
        {(["sin_probar", "cocinada", "cabecera"] as CookStatus[]).map((s) => (
          <button key={s} className="chip" data-on={f.status.includes(s) || undefined}
            onClick={() => toggle("status", s)}>{statusLabels[s]}</button>
        ))}
      </FChips>

      {incompleteCount > 0 && (
        <>
          <FLabel>{t.other}</FLabel>
          <FChips>
            <button className="chip" data-on={f.incompleteOnly || undefined}
              onClick={() => setF((p) => ({ ...p, incompleteOnly: !p.incompleteOnly }))}>
              {t.toComplete} · {incompleteCount}
            </button>
          </FChips>
        </>
      )}
    </div>
  );

  // Denser, full-width stacked version for the desktop sidebar: each header sits
  // above its chips, which wrap across the full sidebar width (no tall narrow column).
  const filterStack = (
    <div className="space-y-2.5">
      {allCollections.length > 0 && (
        <FacetSection label={t.collection} moreLabel={t.more} lessLabel={t.showLess}>
          {collectionsByFreq.map((c) => (
            <button key={c} className="chip" data-on={f.collections.includes(c) || undefined} onClick={() => toggle("collections", c)}>{collLabel(lang, c)}</button>
          ))}
        </FacetSection>
      )}
      {allTypes.length > 0 && (
        <FacetSection label={t.type} preview={8} moreLabel={t.more} lessLabel={t.showLess}>
          {allTypes.map((ty) => (
            <button key={ty} className="chip rounded-md" data-on={f.types.includes(ty) || undefined} onClick={() => toggle("types", ty)}>{typeLabel(lang, ty)}</button>
          ))}
        </FacetSection>
      )}
      {allTags.length > 0 && (
        <FacetSection
          label={t.tag}
          preview={8}
          moreLabel={t.more}
          lessLabel={t.showLess}
          extra={
            <button
              onClick={() => setF({ ...f, mode: f.mode === "all" ? "any" : "all" })}
              className="self-center text-[11px] text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              {f.mode === "all" ? t.matchAll : t.matchAny}
            </button>
          }
        >
          {tagsByFreq.map((tg) => (
            <button key={tg} className="chip" data-on={f.tags.includes(tg) || undefined} onClick={() => toggle("tags", tg)}>{tagLabel(lang, tg)}</button>
          ))}
        </FacetSection>
      )}

      <div className="border-t border-line/70" />

      <FacetSection label={t.rating} moreLabel={t.more} lessLabel={t.showLess}>
        {RATING_OPTIONS.map((n) => (
          <button key={n} className="chip" data-on={f.minRating === n || undefined}
            onClick={() => setF((p) => ({ ...p, minRating: p.minRating === n ? null : n }))}>
            {n}★{n < 5 ? "+" : ""}
          </button>
        ))}
      </FacetSection>

      <FacetSection label={t.freshness} moreLabel={t.more} lessLabel={t.showLess}>
        {FRIDGE_BUCKETS.map((b) => (
          <button key={b.key} className="chip" data-on={f.fridge.includes(b.key) || undefined}
            onClick={() => toggle("fridge", b.key)}>{fridgeLabel(b.key)}</button>
        ))}
      </FacetSection>

      <FacetSection label={t.status} moreLabel={t.more} lessLabel={t.showLess}>
        {(["sin_probar", "cocinada", "cabecera"] as CookStatus[]).map((s) => (
          <button key={s} className="chip" data-on={f.status.includes(s) || undefined}
            onClick={() => toggle("status", s)}>{statusLabels[s]}</button>
        ))}
      </FacetSection>

      {incompleteCount > 0 && (
        <FacetSection label={t.other} moreLabel={t.more} lessLabel={t.showLess}>
          <button className="chip" data-on={f.incompleteOnly || undefined}
            onClick={() => setF((p) => ({ ...p, incompleteOnly: !p.incompleteOnly }))}>
            {t.toComplete} · {incompleteCount}
          </button>
        </FacetSection>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {t.title}<span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? t.recipe : t.recipes}
            {filtered.length !== recipes.length ? ` ${t.of} ${recipes.length}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} />
          <Link href="/semana" className="btn btn-ghost">
            {t.thisWeek} · {week.size}
          </Link>
          <Link href="/compras" className="btn btn-ghost">
            {t.shopping}
          </Link>
          <Link href="/agregar" className="btn btn-primary">
            {t.addRecipe}
          </Link>
        </div>
      </header>

      <div className="mt-6 md:flex md:items-start md:gap-7">
        {sidebarOpen && (
          <aside className="hidden md:block md:w-64 md:shrink-0">
            <div className="sticky top-8 rounded-2xl border border-line bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {t.filters}{activeChips.length ? ` · ${activeChips.length}` : ""}
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
                >
                  {t.hide}
                </button>
              </div>
              <div className="filter-sidebar">{filterStack}</div>
              {activeChips.length > 0 && (
                <button onClick={clearAll} className="mt-3 text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink">
                  {t.clearFilters}
                </button>
              )}
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {!sidebarOpen && (
                <button
                  className="chip hidden md:inline-flex"
                  data-on={activeChips.length > 0 || undefined}
                  onClick={() => setSidebarOpen(true)}
                >
                  {t.filters}{activeChips.length ? ` · ${activeChips.length}` : ""}
                </button>
              )}
              <input
                value={f.q}
                onChange={(e) => setF({ ...f, q: e.target.value })}
                placeholder={t.searchPlaceholder}
                className="input max-w-md"
              />
              <button
                className="chip md:hidden"
                data-on={(panelOpen || activeChips.length > 0) || undefined}
                onClick={() => setPanelOpen((o) => !o)}
              >
                {t.filters}{activeChips.length ? ` · ${activeChips.length}` : ""}
              </button>
            </div>

            {activeChips.length > 0 && (
              <div className={`flex flex-wrap items-center gap-1.5 ${sidebarOpen ? "md:hidden" : ""}`}>
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    onClick={c.clear}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[12px] text-white transition-colors hover:bg-accent-strong"
                  >
                    {c.label} <span className="text-white/80">✕</span>
                  </button>
                ))}
                <button onClick={clearAll} className="ml-1 text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink">
                  {t.clear}
                </button>
              </div>
            )}

            {panelOpen && (
              <div className="filter-panel rounded-2xl border border-line bg-card p-4 md:hidden">
                {filterGrid}
              </div>
            )}
          </div>

      <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(195px,1fr))] gap-4">
        {filtered.map((r) => (
          <Link key={r.id} href={`/recipe/${r.id}`} className="card group block overflow-hidden">
            <div
              className="relative flex h-32 items-center justify-center overflow-hidden text-5xl"
              style={{ background: TYPE_TINT[r.type ?? ""] ?? "var(--color-surface)" }}
            >
              {r.image_url ? (
                <img src={r.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="opacity-80">{r.emoji ?? "🍽️"}</span>
              )}
              {recipeIncomplete(r) && (
                <span className="absolute left-2 top-2 z-10 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                  {t.toComplete}
                </span>
              )}
              <button
                onClick={(e) => toggleWeekLocal(r.id, e)}
                className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur transition-colors ${
                  week.has(r.id)
                    ? "bg-accent text-white"
                    : "bg-white/85 text-ink hover:bg-white"
                }`}
              >
                {week.has(r.id) ? t.inWeek : t.addWeek}
              </button>
            </div>
            <div className="p-3">
              <div className="font-display text-[15px] font-medium leading-snug">{r.title}</div>
              <div className="mt-1 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
                <Stars n={r.rating} />
                {r.fridge_life_days != null && (
                  <span className="text-[11px] text-muted">{r.fridge_life_days} {t.days}</span>
                )}
                {r.cook_status === "cabecera" && (
                  <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-strong">★ {t.goto}</span>
                )}
                {r.cook_status === "cocinada" && (
                  <span className="text-[11px] text-muted">✓ {t.cooked}</span>
                )}
              </div>
              <div className="mt-2 space-y-1.5">
                {r.type && (
                  <div>
                    <span className="inline-block rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-strong">
                      {typeLabel(lang, r.type)}
                    </span>
                  </div>
                )}
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.tags.slice(0, 3).map((tg) => (
                      <span key={tg} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">{tagLabel(lang, tg)}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
          {filtered.length === 0 && (
            <p className="mt-16 text-center text-muted">{t.noMatch}</p>
          )}
        </div>
      </div>
    </main>
  );
}

function FLabel({ children }: { children: React.ReactNode }) {
  return <div className="pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{children}</div>;
}
function FChips({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}
function FacetSection({
  label,
  preview,
  extra,
  moreLabel = "más",
  lessLabel = "ver menos",
  children,
}: {
  label: string;
  preview?: number;
  extra?: React.ReactNode;
  moreLabel?: string;
  lessLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const items = Children.toArray(children);
  const canTruncate = preview != null && items.length > preview;
  const shown = canTruncate && !showAll ? items.slice(0, preview) : items;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted transition-colors hover:text-ink"
      >
        <span>{label}</span>
        <span className="text-[8px] opacity-70">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {shown}
          {canTruncate && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="text-[11px] text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              {showAll ? lessLabel : `+${items.length - preview!} ${moreLabel}`}
            </button>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
