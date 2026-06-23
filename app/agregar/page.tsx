"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ParsedRecipe } from "@/lib/anthropic";
import { saveRecipe } from "./actions";

export default function Agregar() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedRecipe | null>(null);
  const [title, setTitle] = useState("");
  const [saving, start] = useTransition();

  async function process() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo procesar.");
      setPreview(data);
      setTitle(data.title);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!preview) return;
    start(async () => {
      const id = await saveRecipe({ ...preview, title });
      router.push(`/recipe/${id}`);
    });
  }

  const ing = preview?.groups.filter((g) => g.kind === "ing") ?? [];
  const steps = preview?.groups.filter((g) => g.kind === "step") ?? [];

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-ink/75 transition-colors hover:bg-surface hover:text-ink">← Biblioteca</Link>
      <h1 className="mt-4 text-3xl font-medium tracking-tight">Agregar una receta<span className="text-accent">.</span></h1>
      <p className="mt-1 text-sm text-muted">
        Pega un enlace o el texto de una receta. La estructuro y la traduzco al español.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="https://cooking.nytimes.com/…  o pega el texto completo"
        className="input mt-4 min-h-28"
      />
      <button onClick={process} disabled={busy || !input.trim()} className="btn btn-primary mt-2">
        {busy ? "Procesando…" : "Procesar"}
      </button>
      {error && <p className="mt-2 text-sm text-accent-strong">{error}</p>}

      {preview && (
        <div className="card mt-6 p-5">
          <div className="flex items-center gap-3">
            {preview.image_candidate ? (
              <img src={preview.image_candidate} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="text-4xl">{preview.emoji}</span>
            )}
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input flex-1 font-display text-lg font-medium" />
          </div>
          <p className="mt-1.5 text-xs uppercase tracking-wide text-muted">
            {preview.type}
            {preview.porciones ? ` · ${preview.porciones}` : ""}
            {preview.language === "en" ? " · traducido del inglés" : ""}
          </p>
          {preview.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preview.tags.map((t) => (
                <span key={t} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{t}</span>
              ))}
            </div>
          )}

          {ing.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Ingredientes</div>
              {ing.map((g, i) => (
                <div key={i} className="mt-1">
                  {g.label && <div className="text-sm font-semibold">{g.label}</div>}
                  <ul className="list-disc pl-5 text-[15px] text-ink/85">
                    {g.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {steps.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Preparación</div>
              {steps.map((g, i) => (
                <ol key={i} className="list-decimal space-y-1 pl-5 text-[15px] text-ink/85">
                  {g.items.map((it, j) => <li key={j}>{it}</li>)}
                </ol>
              ))}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => setPreview(null)} className="btn btn-ghost">Descartar</button>
          </div>
        </div>
      )}
    </main>
  );
}
