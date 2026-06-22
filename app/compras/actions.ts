"use server";

import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { revalidatePath } from "next/cache";

const touch = () => revalidatePath("/compras");

export async function addStaple(name: string, aisle: string) {
  if (!name.trim()) return;
  const s = getServerClient();
  await s.from("staples").insert({ name: name.trim(), aisle: aisle || null, active: true });
  touch();
}

export async function removeStaple(id: string) {
  const s = getServerClient();
  await s.from("staples").delete().eq("id", id);
  touch();
}

export async function toggleItem(id: string, checked: boolean) {
  const s = getServerClient();
  await s.from("shopping_items").update({ checked }).eq("id", id);
  touch();
}

export async function addManualItem(name: string, aisle: string) {
  if (!name.trim()) return;
  const s = getServerClient();
  const plan = (await currentPlanId(s, true))!;
  await s.from("shopping_items").insert({
    plan_id: plan,
    name: name.trim(),
    aisle: aisle || "Otros",
    source: "manual",
    checked: false,
  });
  touch();
}

export async function clearList() {
  const s = getServerClient();
  const plan = await currentPlanId(s);
  if (plan) await s.from("shopping_items").delete().eq("plan_id", plan);
  touch();
}
