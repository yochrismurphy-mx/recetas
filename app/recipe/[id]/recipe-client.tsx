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
  const [uploading, setUploading] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => { await fn(); router.refresh(); });

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
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm text-muted transition-colors hover:text-accent">
        ← Biblioteca
      </Link>

      <div className="relative mt-4 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-surface text-7xl">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="opacity-80">{recipe.emoji ?? "🍽️"}</span>
        )}
        <label className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-ink backdrop-blur transition-colors hover:bg-white">
          {uploading ? "Subiendo…" : recipe.image_url ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/*" className="hidden" onChange={onPickFile} disabled={uploading} />
        </label>
      </div>

      <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight">{recipe.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex text-2xl leading-none">
          {[1, 2, 3, 4, 5].map((i) => {
            const filled = i <= (hoverStar || recipe.rating || 0);
            return (
              <button
                key={i}
                disabled={pending}
                onMouseEnter={() => setHoverStar(i)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => run(() => setRating(recipe.id, i === recipe.rating ? null : i))}
                className={`px-0.5 transition-transform hover:scale-125 ${filled ? "text-accent" : "text-line"}`}
                aria-label={`${i} estrellas`}
              >
                ★
              </button>
            );
          })}
        </div>
        <button onClick={() => run(() => markCooked(recipe.id))} disabled={pending} className="btn btn-ghost">
          Marcar cocinada{recipe.times_cooked ? ` · ${recipe.times_cooked}` : ""}
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">
        {recipe.porciones ? `${recipe.porciones} porciones · ` : ""}
        {recipe.fridge_life_days != null ? `aguanta ${recipe.fridge_life_days} días` : ""}
        {recipe.source_url ? (
          <>
            {recipe.porciones || recipe.fridge_life_days != null ? " · " : ""}
            <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Fuente
            </a>
          </>
        ) : null}
      </p>

      <Section title="Colecciones">
        <div className="flex flex-wrap gap-1.5">
          {allCollections.map((c) => (
            <button key={c.id} className="chip" data-on={collOn.has(c.id) || undefined} disabled={pending}
              onClick={() => run(() => setCollection(recipe.id, c.id, !collOn.has(c.id)))}>{c.name}</button>
          ))}
          <AddInline value={newColl} setValue={setNewColl} disabled={pending}
            onAdd={() => { run(() => addCollection(recipe.id, newColl)); setNewColl(""); }} />
        </div>
      </Section>

      <Section title="Etiquetas">
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button key={t.id} className="chip" data-on={tagOn.has(t.id) || undefined} disabled={pending}
              onClick={() => run(() => setTag(recipe.id, t.id, !tagOn.has(t.id)))}>{t.name}</button>
          ))}
          <AddInline value={newTag} setValue={setNewTag} disabled={pending}
            onAdd={() => { run(() => addTag(recipe.id, newTag)); setNewTag(""); }} />
        </div>
      </Section>

      {recipe.ingredients.length > 0 && (
        <Section title="Ingredientes">
          {recipe.ingredients.map((g, i) => (
            <div key={i} className="mb-2">
              {g.label && <div className="text-sm font-semibold">{g.label}</div>}
              <ul className="list-disc pl-5 text-[15px] leading-relaxed text-ink/85">
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
              {g.label && <div className="text-sm font-semibold">{g.label}</div>}
              <ol className="list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-ink/85">
                {g.items.map((it, j) => <li key={j} className="pl-1">{it}</li>)}
              </ol>
            </div>
          ))}
        </Section>
      )}

      <Section title="Notas">
        {recipe.notes.length > 0 ? (
          <div className="mb-3 space-y-1.5">
            {recipe.notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-surface/60 px-3 py-2 text-sm text-ink/85">{n.body}</div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted">Sin notas aún.</p>
        )}
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar una nota…" className="input flex-1" />
          <button disabled={pending || !note.trim()} onClick={() => { run(() => addNote(recipe.id, note)); setNote(""); }} className="btn btn-ghost">
            Guardar
          </button>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-line pt-5">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      {children}
    </section>
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
      className="w-24 rounded-full border border-dashed border-line bg-transparent px-3 py-1 text-xs text-ink outline-none transition-colors focus:border-accent"
    />
  );
}
