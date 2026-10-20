import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { ComprasClient } from "./compras-client";

export const dynamic = "force-dynamic";

export default async function Compras() {
  const s = getServerClient();
  // Two parallel rounds: what doesn't depend on the plan, then the plan's own rows.
  const [planId, { data: staples }, { data: aisleSetting }] = await Promise.all([
    currentPlanId(s),
    s.from("staples").select("id, name, aisle").order("name"),
    s.from("settings").select("value").eq("key", "aisles").single(),
  ]);
  let items: any[] = [];
  let weekCount = 0;
  if (planId) {
    const [{ data }, { count }] = await Promise.all([
      s.from("shopping_items").select("id, name, aisle, qty, checked, source").eq("plan_id", planId),
      s.from("plan_items").select("*", { count: "exact", head: true }).eq("plan_id", planId),
    ]);
    items = data ?? [];
    weekCount = count ?? 0;
  }
  const aisles = (aisleSetting?.value as string[]) ?? [];

  return (
    <ComprasClient
      staples={(staples ?? []) as { id: string; name: string; aisle: string | null }[]}
      items={items as { id: string; name: string; aisle: string | null; qty: string | null; checked: boolean }[]}
      aisles={aisles}
      weekCount={weekCount}
    />
  );
}
