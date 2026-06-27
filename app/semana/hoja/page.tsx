import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type Group = { label: string | null; items: string[] };

export default async function Hoja() {
  const s = getServerClient();
  const planId = await currentPlanId(s);
  let rows: any[] = [];
  let tasks: { text: string }[] = [];
  if (planId) {
    const { data } = await s
      .from("plan_items")
      .select("position, recipes(title, title_es, emoji, porciones, fridge_life_days, ingredients, ingredients_es, steps, steps_es)")
      .eq("plan_id", planId)
      .order("position");
    rows = (data ?? []).map((x: any) => x.recipes).filter(Boolean);
    const { data: t } = await s
      .from("plan_tasks")
      .select("text")
      .eq("plan_id", planId)
      .order("position");
    tasks = t ?? [];
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-6 text-black">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mb-4 flex items-center justify-between">
        <a href="/semana" className="text-sm text-neutral-500 hover:underline">← Esta semana</a>
        <PrintButton />
      </div>

      <h1 className="border-b-2 border-amber-700 pb-1 text-xl font-medium">Recetas de la semana</h1>

      {rows.length === 0 && <p className="mt-6 text-neutral-400">No hay recetas en la semana.</p>}

      {rows.map((r, i) => {
        // The cook sheet is always Spanish: prefer the _es columns, fall back to legacy.
        const hasEs = (g: any) => Array.isArray(g) && g.length > 0;
        const ing = (hasEs(r.ingredients_es) ? r.ingredients_es : r.ingredients ?? []) as Group[];
        const steps = (hasEs(r.steps_es) ? r.steps_es : r.steps ?? []) as Group[];
        const esTitle = r.title_es || r.title;
        return (
          <div key={i} className="mt-4" style={{ breakInside: "avoid" }}>
            <div className="text-base font-medium">{r.emoji} {esTitle}</div>
            <div className="text-xs text-neutral-500">
              {r.porciones ? `${r.porciones} · ` : ""}
              {r.fridge_life_days != null ? `aguanta ${r.fridge_life_days} días` : ""}
            </div>
            {ing.length > 0 && (
              <>
                <div className="mt-1 text-sm font-medium">Ingredientes</div>
                {ing.map((g, gi) => (
                  <div key={gi}>
                    {g.label && <div className="text-sm font-medium">{g.label}</div>}
                    <ul className="list-disc pl-5 text-sm">
                      {g.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </>
            )}
            {steps.length > 0 && (
              <>
                <div className="mt-1 text-sm font-medium">Preparación</div>
                {steps.map((g, gi) => (
                  <ol key={gi} className="list-decimal pl-5 text-sm">
                    {g.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ol>
                ))}
              </>
            )}
          </div>
        );
      })}

      {tasks.length > 0 && (
        <div className="mt-8" style={{ breakInside: "avoid" }}>
          <h2 className="border-b-2 border-amber-700 pb-1 text-xl font-medium">Otras tareas</h2>
          {tasks.map((t, i) => (
            <div key={i} className="mt-4 flex items-baseline gap-2 text-base font-medium">
              <span className="text-neutral-400">☐</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
