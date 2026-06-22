"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  setRating, setCookStatus, addNote, setCollection, setTag, addCollection, addTag,
  deleteRecipe, updateRecipe,
} from "./actions";
import { toggleWeek } from "../../semana/actions";
import { COOK_STATUS_LABELS, type CookStatus } from "@/lib/types";

type Group = { label: string | null; items: string[] };
type Recipe = {
  id: string; title: string; emoji: string | null; image_url: string | null; type: string | null;
  porciones: string | null; fridge_life_days: number | null; rating: number | null;
  tried: boolean; times_cooked: number; cook_status: CookStatus; source_url: string | null;
  ingredients: Group[]; steps: Group[];
  collectionIds: string[]; tagIds: string[];
  notes: { id: string; body: string }[];
};
type Opt = { id: string; name: string };

const TYPES = ["Aves", "Carne", "Pescado", "Leguminosas", "Ensalada", "Sopa/Curry",
  "Granos/Pasta", "Verduras", "Postre", "Desayuno", "Pan/Masa", "Salsas/Dips", "Untables"];

function groupsToText(groups: Group[]): string {
  return groups.map((g) => (g.label ? `# ${g.label}\n` : "") + g.items.join("\n")).join("\n\n");
}
function textToGroups(text: string): Group[] {
  const groups: Group[] = [];
  let cur: Group | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      cur = { label: line.slice(2).trim(), items: [] };
      groups.push(cur);
    } else {
      if (!cur) { cur = { label: null, items: [] }; groups.push(cur); }
      cur.items.push(line);
    }
  }
  return groups;
}

export function RecipeClient({
  recipe, inWeek, allCollections, allTags,
}: { recipe: Recipe; inWeek: boolean; allCollections: Opt[]; allTags: Opt[] }) {
  const router = useRouter();
  const [inWk, setInWk] = useState(inWeek);
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [newColl, setNewColl] = useState("");
  const [newTag, setNewTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [confirmDel, setConfirmDel] = useState(false);

  const [editing, setEditing] = useState(false);
  const [eTitle, setETitle] = useState(recipe.title);
  const [eType, setEType] = useState(recipe.type ?? "Sopa/Curry");
  const [ePorc, setEPorc] = useState(recipe.porciones ?? "");
  const [eFridge, setEFridge] = useState(recipe.fridge_life_days?.toString() ?? "");
  const [eSource, setESource] = useState(recipe.source_url ?? "");
  const [eIng, setEIng] = useState(groupsToText(recipe.ingredients));
  const [eSteps, setESteps] = useState(groupsToText(recipe.steps));

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

  function saveEdit() {
    start(async () => {
      await updateRecipe(recipe.id, {
        title: eTitle.trim() || recipe.title,
        type: eType,
        porciones: ePorc.trim() || null,
        fridge_life_days: eFridge.trim() ? Number(eFridge) : null,
        source_url: eSource.trim() || null,
        ingredients: textToGroups(eIng),
        steps: textToGroups(eSteps),
      });
      setEditing(false);
      router.refresh();
    });
  }

  const collOn = new Set(recipe.collectionIds);
  const tagOn = new Set(recipe.tagIds);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted transition-colors hover:text-accent">← Biblioteca</Link>
        {!editing && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="btn btn-ghost px-3 py-1.5 text-xs">Editar</button>
            {confirmDel ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted">¿Eliminar?</span>
                <button
                  onClick={() => start(async () => { await deleteRecipe(recipe.id); router.push("/"); })}
                  className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-strong"
                >
                  Sí, eliminar
                </button>
                <button onClick={() => setConfirmDel(false)} className="btn btn-ghost px-3 py-1.5 text-xs">Cancelar</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="px-2 py-1.5 text-xs text-muted transition-colors hover:text-accent-strong">
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>

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

      {editing ? (
        <div className="mt-4 space-y-3">
          <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className="input font-display text-xl font-medium" />
          <div className="flex flex-wrap gap-2">
            <select value={eType} onChange={(e) => setEType(e.target.value)} className="input w-44">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={ePorc} onChange={(e) => setEPorc(e.target.value)} placeholder="porciones" className="input w-32" />
            <input value={eFridge} onChange={(e) => setEFridge(e.target.value)} placeholder="días en refri" inputMode="numeric" className="input w-32" />
          </div>
          <input
            value={eSource}
            onChange={(e) => setESource(e.target.value)}
            placeholder="Liga / fuente (https://…)"
            inputMode="url"
            className="input"
          />
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Ingredientes</label>
            <p className="mb-1 text-xs text-muted">Un ingrediente por línea. Empieza una línea con “# ” para un subgrupo.</p>
            <textarea value={eIng} onChange={(e) => setEIng(e.target.value)} className="input min-h-40 font-mono text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Preparación</label>
            <p className="mb-1 text-xs text-muted">Un paso por línea.</p>
            <textarea value={eSteps} onChange={(e) => setESteps(e.target.value)} className="input min-h-40 font-mono text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={pending} className="btn btn-primary">Guardar cambios</button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost">Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight">{recipe.title}</h1>
          {recipe.type && (
            <div className="mt-2">
              <span className="inline-block rounded-md bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-strong">
                {recipe.type}
              </span>
            </div>
          )}

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
            <button
              onClick={() => { setInWk(!inWk); start(() => toggleWeek(recipe.id)); }}
              disabled={pending}
              className={inWk ? "btn btn-primary" : "btn btn-ghost"}
            >
              {inWk ? "✓ en la semana" : "+ a la semana"}
            </button>
          </div>

          <div className="mt-3 inline-flex rounded-lg border border-line p-0.5">
            {(["sin_probar", "cocinada", "cabecera"] as CookStatus[]).map((st) => (
              <button
                key={st}
                disabled={pending}
                onClick={() => run(() => setCookStatus(recipe.id, st))}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  recipe.cook_status === st ? "bg-accent text-white" : "text-muted hover:text-ink"
                }`}
              >
                {COOK_STATUS_LABELS[st]}
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm text-muted">
            {recipe.porciones ? `${recipe.porciones} porciones · ` : ""}
            {recipe.fridge_life_days != null ? `aguanta ${recipe.fridge_life_days} días` : ""}
            {recipe.source_url ? (
              <>
                {recipe.porciones || recipe.fridge_life_days != null ? " · " : ""}
                <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">Fuente</a>
              </>
            ) : null}
          </p>

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
        </>
      )}

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
        <p className="mb-2 text-xs text-muted">
          Etiquetas libres (cocina, dieta, etc.). El tipo de platillo se edita arriba con “Editar”.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button key={t.id} className="chip" data-on={tagOn.has(t.id) || undefined} disabled={pending}
              onClick={() => run(() => setTag(recipe.id, t.id, !tagOn.has(t.id)))}>{t.name}</button>
          ))}
          <AddInline value={newTag} setValue={setNewTag} disabled={pending}
            onAdd={() => { run(() => addTag(recipe.id, newTag)); setNewTag(""); }} />
        </div>
      </Section>

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
