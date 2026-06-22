"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Recipe, FilterState } from "@/lib/types";
import { applyFilters } from "@/lib/filters";

const TYPE_BG: Record<string, string> = {
  Aves: "bg-amber-50", Carne: "bg-red-50", Pescado: "bg-sky-50",
  Leguminosas: "bg-orange-50", Ensalada: "bg-green-50", "Sopa/Curry": "bg-yellow-50",
  "Granos/Pasta": "bg-stone-100", Verduras: "bg-lime-50", Postre: "bg-pink-50",
  Desayuno: "bg-violet-50", "Pan/Masa": "bg-amber-50", "Salsas/Dips": "bg-rose-50",
  Untables: "bg-orange-50",
};

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function Stars({ n }: { n: number | null }) {
  if (!n) return <span className="text-xs text-neutral-400">sin calificar</span>;
  return (
    <span aria-label={`${n} de 5`} className="text-amber-500">
      {"★".repeat(n)}
      <span className="text-neutral-300">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function Chip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );
}

export function LibraryClient({ recipes }: { recipes: Recipe[] }) {
  const [f, setF] = useState<FilterState>({
    q: "", types: [], collections: [], tags: [], mode: "all",
  });

  const allTypes = useMemo(
    () => uniqSorted(recipes.map((r) => r.type).filter(Boolean) as string[]),
    [recipes],
  );
  const allCollections = useMemo(
    () => uniqSorted(recipes.flatMap((r) => r.collections)),
    [recipes],
  );
  const allTags = useMemo(
    () => uniqSorted(recipes.flatMap((r) => r.tags)),
    [recipes],
  );

  const filtered = useMemo(() => applyFilters(recipes, f), [recipes, f]);

  function toggle(facet: "types" | "collections" | "tags", value: string) {
    setF((prev) => {
      const has = prev[facet].includes(value);
      return {
        ...prev,
        [facet]: has
          ? prev[facet].filter((v) => v !== value)
          : [...prev[facet], value],
      };
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-6">
      <header className="flex items-baseline justify-between border-b border-neutral-200 pb-3">
        <h1 className="text-2xl font-medium">Recetas</h1>
        <span className="text-sm text-neutral-500">
          {filtered.length} de {recipes.length}
        </span>
      </header>

      <div className="mt-4 space-y-3">
        <input
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
          placeholder="Buscar recetas o ingredientes..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
        />
        {allCollections.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-neutral-400">Colección</span>
            {allCollections.map((c) => (
              <Chip key={c} label={c} active={f.collections.includes(c)}
                onClick={() => toggle("collections", c)} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neutral-400">Tipo</span>
          {allTypes.map((t) => (
            <Chip key={t} label={t} active={f.types.includes(t)}
              onClick={() => toggle("types", t)} />
          ))}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-neutral-400">Etiqueta</span>
            {allTags.map((t) => (
              <Chip key={t} label={t} active={f.tags.includes(t)}
                onClick={() => toggle("tags", t)} />
            ))}
            <button
              onClick={() => setF({ ...f, mode: f.mode === "all" ? "any" : "all" })}
              className="ml-1 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500"
            >
              {f.mode === "all" ? "coincidir todas" : "coincidir cualquiera"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
        {filtered.map((r) => (
          <Link key={r.id} href={`/recipe/${r.id}`} className="block rounded-xl border border-neutral-200 p-2.5 hover:border-neutral-400">
            <div className={`relative flex h-24 items-center justify-center overflow-hidden rounded-md text-4xl ${TYPE_BG[r.type ?? ""] ?? "bg-neutral-100"}`}>
              {r.emoji ?? "🍽️"}
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="mt-2 text-sm font-medium leading-tight">{r.title}</div>
            <div className="mt-1 text-sm"><Stars n={r.rating} /></div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {r.type && (
                <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
                  {r.type}
                </span>
              )}
              {r.tags.slice(0, 2).map((t) => (
                <span key={t} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
                  {t}
                </span>
              ))}
            </div>
            {r.fridge_life_days != null && (
              <div className="mt-1.5 text-[11px] text-neutral-400">
                aguanta {r.fridge_life_days} días
              </div>
            )}
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-10 text-center text-neutral-400">Nada coincide con esos filtros.</p>
      )}
    </main>
  );
}
