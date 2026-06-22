"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleWeek, clearWeek, addTask, removeTask } from "./actions";

type R = { id: string; title: string; emoji: string | null };
type T = { id: string; text: string };

export function WeekClient({ recipes, tasks }: { recipes: R[]; tasks: T[] }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState("");

  function submitTask() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    start(() => addTask(text));
  }

  const empty = recipes.length === 0 && tasks.length === 0;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm text-muted transition-colors hover:text-accent">← Biblioteca</Link>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-medium tracking-tight">Esta semana</h1>
        <div className="flex gap-2">
          <Link href="/semana/hoja" className="btn btn-primary">Hoja de cocina</Link>
          <Link href="/compras" className="btn btn-ghost">Compras</Link>
          <button onClick={() => start(() => clearWeek())} disabled={pending || empty} className="btn btn-ghost">
            Vaciar
          </button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <p className="mt-10 text-muted">Marca recetas con “+ semana” en la biblioteca.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {recipes.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-2.5">
              <span className="w-5 font-display text-sm text-muted">{i + 1}</span>
              <span className="text-xl">{r.emoji ?? "🍽️"}</span>
              <Link href={`/recipe/${r.id}`} className="flex-1 font-display text-[15px] font-medium hover:text-accent">
                {r.title}
              </Link>
              <button onClick={() => start(() => toggleWeek(r.id))} disabled={pending} className="text-muted transition-colors hover:text-accent-strong" aria-label="quitar">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-9">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Otras tareas</h2>
        {tasks.length > 0 && (
          <ul className="mt-3 space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-card px-4 py-2.5">
                <span className="text-xl">📝</span>
                <span className="flex-1 font-display text-[15px] font-medium">{t.text}</span>
                <button onClick={() => start(() => removeTask(t.id))} disabled={pending} className="text-muted transition-colors hover:text-accent-strong" aria-label="quitar">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTask(); } }}
            placeholder="p. ej. cortar melón, lavar moras…"
            className="input"
          />
          <button onClick={submitTask} disabled={pending || !draft.trim()} className="btn btn-ghost shrink-0">
            Agregar
          </button>
        </div>
      </section>
    </main>
  );
}
