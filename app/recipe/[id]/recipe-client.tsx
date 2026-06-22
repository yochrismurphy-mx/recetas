"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  setRating, markCooked, addNote, setCollection, setTag, addCollection, addTag,
} from "./actions";

type Group = { label: string | null; items: string[] };
type Recipe = {
  id: string; title: string; emoji: string | null; image_url: string | null; type: string | null;
  porciones: string | null; fridge_life_days: number | null; rating: number | null;
  tried: boolean; times_cooked: number; source_url: string | null;
  ingredients: Group[]; steps: Group[];
  collectionIds: string[]; tagIds: string[];
  notes: { id: string; body: string }[];
};
type Opt = { id: string; name: string };

export function RecipeClient({
  recipe, allCollections, allTags,
}: { recipe: Recipe; allCollections: Opt[]; allTags: Opt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [newColl, setNewColl] = useState("");
  const [newTag, setNewTag] = useState("");

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const [uploading, setUploading] = useState(false);
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("recipeId", recipe.id);
    await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    e.target.value = "";
    router.refresh();
  }

  const collOn = new Set(recipe.collectionIds);
  const tagOn = new Set(recipe.tagIds);

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Biblioteca
      </Link>

      <div className="relative mt-3 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-6xl">
        {recipe.emoji ?? "🍽️"}
        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>

      <label className="mt-2 inline-block cursor-pointer text-sm text-blue-600 hover:underline">
        {uploading ? "Subiendo..." : recipe.image_url ? "Cambiar foto" : "Subir foto"}
        <input type="file" accept="image/*" className="hidden" onChange={onPickFile} disabled={uploading} />
      </label>

      <h1 className="mt-3 text-2xl font-medium">{recipe.title}</h1>

      <div className="mt-2 flex items-center gap-3">
        <div className="text-xl">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              disabled={pending}
              onClick={() => run(() => setRating(recipe.id, i === recipe.rating ? null : i))}
              className={i <= (recipe.rating ?? 0) ? "text-amber-500" : "text-neutral-300"}
              aria-label={`${i} estrellas`}
            >
              ★
            </button>
          ))}
        </div>
        <button
          disabled={pending}
          onClick={() => run(() => markCooked(recipe.id))}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
        >
          Marcar cocinada{recipe.times_cooked ? ` (${recipe.times_cooked})` : ""}
        </button>
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        {recipe.porciones ? `${recipe.porciones} porciones · ` : ""}
        {recipe.fridge_life_days != null ? `aguanta ${recipe.fridge_life_days} días` : ""}
        {recipe.source_url ? (
          <>
            {" · "}
            <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              Fuente
            </a>
          </>
        ) : null}
      </p>

      <Section title="Colecciones">
        <div className="flex flex-wrap gap-1.5">
          {allCollections.map((c) => (
            <Toggle key={c.id} label={c.name} on={collOn.has(c.id)} disabled={pending}
              onClick={() => run(() => setCollection(recipe.id, c.id, !collOn.has(c.id)))} />
          ))}
          <AddInline value={newColl} setValue={setNewColl} disabled={pending}
            onAdd={() => { run(() => addCollection(recipe.id, newColl)); setNewColl(""); }} />
        </div>
      </Section>

      <Section title="Etiquetas">
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <Toggle key={t.id} label={t.name} on={tagOn.has(t.id)} disabled={pending}
              onClick={() => run(() => setTag(recipe.id, t.id, !tagOn.has(t.id)))} />
          ))}
          <AddInline value={newTag} setValue={setNewTag} disabled={pending}
            onAdd={() => { run(() => addTag(recipe.id, newTag)); setNewTag(""); }} />
        </div>
      </Section>

      {recipe.ingredients.length > 0 && (
        <Section title="Ingredientes">
          {recipe.ingredients.map((g, i) => (
            <div key={i} className="mb-2">
              {g.label && <div className="text-sm font-medium">{g.label}</div>}
              <ul className="list-disc pl-5 text-sm text-neutral-700">
                {g.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {recipe.steps.length > 0 && (
        <Section title="Preparación">
          {recipe.steps.map((g, i) => (
            <div key={i} className="mb-2">
              {g.label && <div className="text-sm font-medium">{g.label}</div>}
              <ol className="list-decimal pl-5 text-sm text-neutral-700">
                {g.items.map((it, j) => <li key={j}>{it}</li>)}
              </ol>
            </div>
          ))}
        </Section>
      )}

      <Section title="Notas">
        {recipe.notes.length > 0 ? (
          <div className="mb-2 space-y-1">
            {recipe.notes.map((n) => (
              <div key={n.id} className="border-b border-neutral-100 py-1 text-sm text-neutral-700">
                {n.body}
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-2 text-sm text-neutral-400">Sin notas aún.</p>
        )}
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Agregar una nota..."
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <button
            disabled={pending || !note.trim()}
            onClick={() => { run(() => addNote(recipe.id, note)); setNote(""); }}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-neutral-200 pt-4">
      <h2 className="mb-2 text-sm font-medium text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({
  label, on, disabled, onClick,
}: { label: string; on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs ${
        on ? "border-blue-500 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );
}

function AddInline({
  value, setValue, onAdd, disabled,
}: { value: string; setValue: (v: string) => void; onAdd: () => void; disabled: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
      disabled={disabled}
      placeholder="+ nueva"
      className="w-24 rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs outline-none focus:border-neutral-500"
    />
  );
}
