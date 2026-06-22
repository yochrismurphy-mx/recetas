import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type Group = { label: string | null; items: string[] };

export default async function Hoja() {
  const s = getServerClient();
  const planId = await currentPlanId(s);
  let rows: any[] = [];
  if (planId) {
    const { data } = await s
      .from("plan_items")
      .select("position, recipes(title, emoji, porciones, fridge_life_days, ingredients, steps)")
      .eq("plan_id", planId)
      .order("position");
    rows = (data ?? []).map((x: any) => x.recipes).filter(Boolean);
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
        const ing = (r.ingredients ?? []) as Group[];
        const steps = (r.steps ?? []) as Group[];
        return (
          <div key={i} className="mt-4" style={{ breakInside: "avoid" }}>
            <div className="text-base font-medium">{r.emoji} {r.title}</div>
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
    </main>
  );
}
