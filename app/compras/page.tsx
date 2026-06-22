import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { ComprasClient } from "./compras-client";

export const dynamic = "force-dynamic";

export default async function Compras() {
  const s = getServerClient();
  const planId = await currentPlanId(s);

  const { data: staples } = await s.from("staples").select("id, name, aisle").order("name");
  let items: any[] = [];
  let weekCount = 0;
  if (planId) {
    const { data } = await s
      .from("shopping_items")
      .select("id, name, aisle, qty, checked, source")
      .eq("plan_id", planId);
    items = data ?? [];
    const { count } = await s
      .from("plan_items")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", planId);
    weekCount = count ?? 0;
  }
  const { data: aisleSetting } = await s.from("settings").select("value").eq("key", "aisles").single();
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
