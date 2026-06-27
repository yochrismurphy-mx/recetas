import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { WeekClient } from "./week-client";

export const dynamic = "force-dynamic";

export default async function Semana() {
  const s = getServerClient();
  const planId = await currentPlanId(s);
  let recipes: { id: string; title: string; emoji: string | null }[] = [];
  let tasks: { id: string; text: string }[] = [];
  if (planId) {
    const { data } = await s
      .from("plan_items")
      .select("position, recipes(id, title, title_es, emoji)")
      .eq("plan_id", planId)
      .order("position");
    recipes = (data ?? [])
      .map((x: any) => x.recipes)
      .filter(Boolean)
      .map((r: any) => ({ id: r.id, title: r.title_es || r.title, emoji: r.emoji })); // week view is always Spanish
    const { data: t } = await s
      .from("plan_tasks")
      .select("id, text")
      .eq("plan_id", planId)
      .order("position");
    tasks = t ?? [];
  }
  return <WeekClient recipes={recipes} tasks={tasks} />;
}
