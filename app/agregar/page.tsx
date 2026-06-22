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
    <main className="mx-auto max-w-2xl px-5 py-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">← Biblioteca</Link>
      <h1 className="mt-3 text-2xl font-medium">Agregar una receta</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pega un enlace o el texto de una receta. La estructuro y la traduzco al español.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="https://cooking.nytimes.com/...  o pega el texto completo"
        className="mt-3 min-h-24 w-full rounded-md border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-500"
      />
      <button
        onClick={process}
        disabled={busy || !input.trim()}
        className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
      >
        {busy ? "Procesando..." : "Procesar"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {preview && (
        <div className="mt-5 rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{preview.emoji}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-lg font-medium outline-none focus:border-neutral-500"
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {preview.type}
            {preview.porciones ? ` · ${preview.porciones}` : ""}
            {preview.language === "en" ? " · traducido del inglés" : ""}
          </p>

          {ing.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium">Ingredientes</div>
              {ing.map((g, i) => (
                <div key={i}>
                  {g.label && <div className="text-sm font-medium text-neutral-600">{g.label}</div>}
                  <ul className="list-disc pl-5 text-sm text-neutral-700">
                    {g.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {steps.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium">Preparación</div>
              {steps.map((g, i) => (
                <ol key={i} className="list-decimal pl-5 text-sm text-neutral-700">
                  {g.items.map((it, j) => <li key={j}>{it}</li>)}
                </ol>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
