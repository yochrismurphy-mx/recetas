"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleWeek, clearWeek } from "./actions";

type R = { id: string; title: string; emoji: string | null };

export function WeekClient({ recipes }: { recipes: R[] }) {
  const [pending, start] = useTransition();
  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">← Biblioteca</Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Esta semana</h1>
        <div className="flex gap-2">
          <Link href="/semana/hoja" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white">
            Hoja de cocina
          </Link>
          <button
            onClick={() => start(() => clearWeek())}
            disabled={pending || recipes.length === 0}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40"
          >
            Vaciar
          </button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <p className="mt-8 text-neutral-400">Marca recetas con “+ sem” en la biblioteca.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {recipes.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2">
              <span className="w-5 text-sm text-neutral-400">{i + 1}</span>
              <span className="text-xl">{r.emoji ?? "🍽️"}</span>
              <Link href={`/recipe/${r.id}`} className="flex-1 text-sm font-medium hover:underline">
                {r.title}
              </Link>
              <button
                onClick={() => start(() => toggleWeek(r.id))}
                disabled={pending}
                className="text-neutral-400 hover:text-red-600"
                aria-label="quitar"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
