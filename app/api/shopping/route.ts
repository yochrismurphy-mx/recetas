import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { consolidateShopping } from "@/lib/anthropic";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { onHand } = await request.json().catch(() => ({ onHand: "" }));
    const s = getServerClient();
    const planId = (await currentPlanId(s, true))!;

    const { data: items } = await s
      .from("plan_items")
      .select("recipes(ingredients)")
      .eq("plan_id", planId);
    const ingredients: string[] = [];
    for (const it of items ?? []) {
      const groups = ((it as any).recipes?.ingredients ?? []) as { items: string[] }[];
      for (const g of groups) for (const line of g.items ?? []) ingredients.push(line);
    }

    const { data: staples } = await s.from("staples").select("name, aisle").eq("active", true);
    const { data: aisleSetting } = await s.from("settings").select("value").eq("key", "aisles").single();
    const aisles = (aisleSetting?.value as string[]) ?? ["Verduras y fruta", "Despensa", "Proteína", "Otros"];
    const onHandList = String(onHand || "").split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);

    if (ingredients.length === 0 && (staples?.length ?? 0) === 0) {
      return NextResponse.json({ error: "No hay recetas en la semana ni básicos." }, { status: 400 });
    }

    const groups = await consolidateShopping({
      ingredients,
      staples: staples ?? [],
      onHand: onHandList,
      aisles,
    });

    await s.from("shopping_items").delete().eq("plan_id", planId);
    const rows = groups.flatMap((g) =>
      g.items.map((it) => ({
        plan_id: planId,
        name: it.name,
        aisle: g.aisle,
        qty: it.qty,
        source: "recipe" as const,
        checked: false,
      })),
    );
    if (rows.length) await s.from("shopping_items").insert(rows);
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error" }, { status: 500 });
  }
}
