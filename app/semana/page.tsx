import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { WeekClient } from "./week-client";

export const dynamic = "force-dynamic";

export default async function Semana() {
  const s = getServerClient();
  const planId = await currentPlanId(s);
  let recipes: { id: string; title: string; emoji: string | null }[] = [];
  if (planId) {
    const { data } = await s
      .from("plan_items")
      .select("position, recipes(id, title, emoji)")
      .eq("plan_id", planId)
      .order("position");
    recipes = (data ?? []).map((x: any) => x.recipes).filter(Boolean);
  }
  return <WeekClient recipes={recipes} />;
}
