"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Recipe, FilterState, CookStatus } from "@/lib/types";
import { COOK_STATUS_LABELS } from "@/lib/types";
import { applyFilters, recipeIncomplete, FRIDGE_BUCKETS, RATING_OPTIONS } from "@/lib/filters";
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

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
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
  recipes, weekIds, allCollections, allTags,
}: {
  recipes: Recipe[];
  weekIds: string[];
  allCollections: string[];
  allTags: string[];
}) {
  const [, startWeek] = useTransition();
  const [week, setWeek] = useState<Set<string>>(new Set(weekIds));
  const [f, setF] = useState<FilterState>(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
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

  const allTypes = useMemo(
    () => uniqSorted(recipes.map((r) => r.type).filter(Boolean) as string[]),
    [recipes],
  );
  const filtered = useMemo(() => applyFilters(recipes, f), [recipes, f]);

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

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  f.collections.forEach((v) => activeChips.push({ key: `c:${v}`, label: v, clear: () => toggle("collections", v) }));
  f.types.forEach((v) => activeChips.push({ key: `t:${v}`, label: v, clear: () => toggle("types", v) }));
  f.tags.forEach((v) => activeChips.push({ key: `g:${v}`, label: v, clear: () => toggle("tags", v) }));
  if (f.minRating != null) activeChips.push({ key: "r", label: `${f.minRating}★ o más`, clear: () => setF((p) => ({ ...p, minRating: null })) });
  f.fridge.forEach((k) => activeChips.push({ key: `f:${k}`, label: FRIDGE_BUCKETS.find((b) => b.key === k)?.label ?? k, clear: () => toggle("fridge", k) }));
  f.status.forEach((s) => activeChips.push({ key: `s:${s}`, label: COOK_STATUS_LABELS[s], clear: () => toggle("status", s) }));
  if (f.incompleteOnly) activeChips.push({ key: "inc", label: "Por completar", clear: () => setF((p) => ({ ...p, incompleteOnly: false })) });

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            La cocina de Norma y Chris<span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? "receta" : "recetas"}
            {filtered.length !== recipes.length ? ` de ${recipes.length}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/semana" className="btn btn-ghost">
            Esta semana · {week.size}
          </Link>
          <Link href="/compras" className="btn btn-ghost">
            Compras
          </Link>
          <Link href="/agregar" className="btn btn-primary">
            Agregar receta
          </Link>
        </div>
      </header>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            placeholder="Buscar por nombre o ingrediente…"
            className="input max-w-md"
          />
          <button
            className="chip"
            data-on={(panelOpen || activeChips.length > 0) || undefined}
            onClick={() => setPanelOpen((o) => !o)}
          >
            Filtros{activeChips.length ? ` · ${activeChips.length}` : ""}
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
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
              Limpiar
            </button>
          </div>
        )}

        {panelOpen && (
          <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
            <FilterRow label="Colección" options={allCollections} active={f.collections} onToggle={(v) => toggle("collections", v)} />
            <FilterRow label="Tipo" options={allTypes} active={f.types} onToggle={(v) => toggle("types", v)} square />
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted">Etiqueta</span>
                {allTags.map((t) => (
                  <button key={t} className="chip" data-on={f.tags.includes(t) || undefined} onClick={() => toggle("tags", t)}>{t}</button>
                ))}
                <button
                  onClick={() => setF({ ...f, mode: f.mode === "all" ? "any" : "all" })}
                  className="ml-1 text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
                >
                  {f.mode === "all" ? "coincidir todas" : "coincidir cualquiera"}
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted">Calificación</span>
              {RATING_OPTIONS.map((n) => (
                <button key={n} className="chip" data-on={f.minRating === n || undefined}
                  onClick={() => setF((p) => ({ ...p, minRating: p.minRating === n ? null : n }))}>
                  {n}★{n < 5 ? "+" : ""}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted">Frescura</span>
              {FRIDGE_BUCKETS.map((b) => (
                <button key={b.key} className="chip" data-on={f.fridge.includes(b.key) || undefined}
                  onClick={() => toggle("fridge", b.key)}>{b.label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted">Estado</span>
              {(["sin_probar", "cocinada", "cabecera"] as CookStatus[]).map((s) => (
                <button key={s} className="chip" data-on={f.status.includes(s) || undefined}
                  onClick={() => toggle("status", s)}>{COOK_STATUS_LABELS[s]}</button>
              ))}
            </div>
            {incompleteCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted">Otros</span>
                <button className="chip" data-on={f.incompleteOnly || undefined}
                  onClick={() => setF((p) => ({ ...p, incompleteOnly: !p.incompleteOnly }))}>
                  Por completar · {incompleteCount}
                </button>
              </div>
            )}
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
                  Por completar
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
                {week.has(r.id) ? "✓ semana" : "+ semana"}
              </button>
            </div>
            <div className="p-3">
              <div className="font-display text-[15px] font-medium leading-snug">{r.title}</div>
              <div className="mt-1 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
                <Stars n={r.rating} />
                {r.fridge_life_days != null && (
                  <span className="text-[11px] text-muted">{r.fridge_life_days} días</span>
                )}
                {r.cook_status === "cabecera" && (
                  <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-strong">★ De cabecera</span>
                )}
                {r.cook_status === "cocinada" && (
                  <span className="text-[11px] text-muted">✓ cocinada</span>
                )}
              </div>
              <div className="mt-2 space-y-1.5">
                {r.type && (
                  <div>
                    <span className="inline-block rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-strong">
                      {r.type}
                    </span>
                  </div>
                )}
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-16 text-center text-muted">Nada coincide con esos filtros.</p>
      )}
    </main>
  );
}

function FilterRow({
  label, options, active, onToggle, square,
}: { label: string; options: string[]; active: string[]; onToggle: (v: string) => void; square?: boolean }) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted">{label}</span>
      {options.map((o) => (
        <button key={o} className={square ? "chip rounded-md" : "chip"} data-on={active.includes(o) || undefined} onClick={() => onToggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
