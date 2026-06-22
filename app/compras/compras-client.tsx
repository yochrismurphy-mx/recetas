"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addStaple, removeStaple, toggleItem, addManualItem, clearList } from "./actions";

type Staple = { id: string; name: string; aisle: string | null };
type Item = { id: string; name: string; aisle: string | null; qty: string | null; checked: boolean };

export function ComprasClient({
  staples, items, aisles, weekCount,
}: { staples: Staple[]; items: Item[]; aisles: string[]; weekCount: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onHand, setOnHand] = useState("");
  const [stapleName, setStapleName] = useState("");
  const [stapleAisle, setStapleAisle] = useState(aisles[0] ?? "Otros");
  const [manual, setManual] = useState("");
  const [checked, setChecked] = useState<Set<string>>(
    new Set(items.filter((i) => i.checked).map((i) => i.id)),
  );

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ onHand }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function flip(id: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      const on = n.has(id);
      if (on) n.delete(id);
      else n.add(id);
      start(() => toggleItem(id, !on));
      return n;
    });
  }

  const byAisle = new Map<string, Item[]>();
  for (const it of items) {
    const k = it.aisle || "Otros";
    if (!byAisle.has(k)) byAisle.set(k, []);
    byAisle.get(k)!.push(it);
  }
  const ordered = [
    ...aisles.filter((a) => byAisle.has(a)),
    ...[...byAisle.keys()].filter((a) => !aisles.includes(a)),
  ];

  function copy() {
    const text = ordered
      .map((a) => `${a}:\n` + byAisle.get(a)!.map((it) => `- ${it.name}${it.qty ? ` (${it.qty})` : ""}`).join("\n"))
      .join("\n\n");
    navigator.clipboard?.writeText(text);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm text-muted transition-colors hover:text-accent">← Biblioteca</Link>
      <h1 className="mt-4 text-3xl font-medium tracking-tight">Compras<span className="text-accent">.</span></h1>
      <p className="mt-1 text-sm text-muted">
        De {weekCount} {weekCount === 1 ? "receta" : "recetas"} en la semana, menos lo que ya tienes, más tus básicos.
      </p>

      <section className="card mt-5 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Generar lista</h2>
        <textarea
          value={onHand}
          onChange={(e) => setOnHand(e.target.value)}
          placeholder="Ya tengo (opcional): cebolla, ajo, arroz…"
          className="input mt-2 min-h-16"
        />
        <button onClick={generate} disabled={busy} className="btn btn-primary mt-2">
          {busy ? "Generando…" : "Generar lista"}
        </button>
        {error && <p className="mt-2 text-sm text-accent-strong">{error}</p>}
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Mis básicos</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {staples.map((s) => (
            <span key={s.id} className="chip" data-on>
              {s.name}
              <button onClick={() => start(() => removeStaple(s.id).then(() => router.refresh()))} aria-label="quitar" className="ml-1 opacity-80 hover:opacity-100">
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={stapleName} onChange={(e) => setStapleName(e.target.value)} placeholder="Agregar básico…" className="input w-44" />
          <select value={stapleAisle} onChange={(e) => setStapleAisle(e.target.value)} className="input w-40">
            {aisles.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            disabled={!stapleName.trim()}
            onClick={() => { start(() => addStaple(stapleName, stapleAisle).then(() => router.refresh())); setStapleName(""); }}
            className="btn btn-ghost"
          >
            Agregar
          </button>
        </div>
      </section>

      {items.length > 0 && (
        <section className="mt-6 border-t border-line pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Lista ({items.length})</h2>
            <div className="flex gap-2">
              <button onClick={copy} className="btn btn-ghost">Copiar</button>
              <button onClick={() => start(() => clearList().then(() => router.refresh()))} className="btn btn-ghost">Vaciar</button>
            </div>
          </div>
          {ordered.map((a) => (
            <div key={a} className="mb-4">
              <div className="mb-1 font-display text-sm font-medium">{a}</div>
              <ul>
                {byAisle.get(a)!.map((it) => {
                  const on = checked.has(it.id);
                  return (
                    <li key={it.id}>
                      <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[15px]">
                        <input type="checkbox" checked={on} onChange={() => flip(it.id)} className="accent-accent" />
                        <span className={on ? "text-muted line-through" : ""}>
                          {it.name}
                          {it.qty ? <span className="text-muted"> · {it.qty}</span> : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Agregar artículo…" className="input flex-1" />
            <button
              disabled={!manual.trim()}
              onClick={() => { start(() => addManualItem(manual, "Otros").then(() => router.refresh())); setManual(""); }}
              className="btn btn-ghost"
            >
              Agregar
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
