"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Recipe, FilterState } from "@/lib/types";
import { applyFilters, recipeIncomplete } from "@/lib/filters";
import { toggleWeek } from "./semana/actions";

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
  const [f, setF] = useState<FilterState>({
    q: "", types: [], collections: [], tags: [], mode: "all", incompleteOnly: false,
  });
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

  function toggle(facet: "types" | "collections" | "tags", value: string) {
    setF((prev) => {
      const has = prev[facet].includes(value);
      return {
        ...prev,
        [facet]: has ? prev[facet].filter((v) => v !== value) : [...prev[facet], value],
      };
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-line">
        <img
          src="/img/home-hero.jpg"
          alt="Cocinando en casa"
          className="h-48 w-full object-cover object-[center_28%] sm:h-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/5" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <h1 className="font-display text-4xl font-medium tracking-tight text-paper sm:text-5xl">
            Recetas<span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-paper/85">Lo que cocinamos en casa</p>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <p className="text-sm text-muted">
          {filtered.length} {filtered.length === 1 ? "receta" : "recetas"}
          {filtered.length !== recipes.length ? ` de ${recipes.length}` : ""}
        </p>
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
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            placeholder="Buscar por nombre o ingrediente…"
            className="input max-w-md"
          />
          {incompleteCount > 0 && (
            <button
              className="chip"
              data-on={f.incompleteOnly || undefined}
              onClick={() => setF({ ...f, incompleteOnly: !f.incompleteOnly })}
            >
              Por completar · {incompleteCount}
            </button>
          )}
        </div>
        <FilterRow label="Colección" options={allCollections} active={f.collections}
          onToggle={(v) => toggle("collections", v)} />
        <FilterRow label="Tipo" options={allTypes} active={f.types}
          onToggle={(v) => toggle("types", v)} square />
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted">Etiqueta</span>
            {allTags.map((t) => (
              <button key={t} className="chip" data-on={f.tags.includes(t) || undefined}
                onClick={() => toggle("tags", t)}>{t}</button>
            ))}
            <button
              onClick={() => setF({ ...f, mode: f.mode === "all" ? "any" : "all" })}
              className="ml-1 text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              {f.mode === "all" ? "coincidir todas" : "coincidir cualquiera"}
            </button>
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
              <div className="mt-1 flex min-h-4 items-center gap-2">
                <Stars n={r.rating} />
                {r.fridge_life_days != null && (
                  <span className="text-[11px] text-muted">{r.fridge_life_days} días</span>
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
      <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted">{label}</span>
      {options.map((o) => (
        <button key={o} className={square ? "chip rounded-md" : "chip"} data-on={active.includes(o) || undefined} onClick={() => onToggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
