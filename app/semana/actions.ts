"use server";

import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { revalidatePath } from "next/cache";

function touch() {
  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/semana/hoja");
}

export async function toggleWeek(recipeId: string) {
  const s = getServerClient();
  const plan = (await currentPlanId(s, true))!;
  const { data: existing } = await s
    .from("plan_items")
    .select("id")
    .eq("plan_id", plan)
    .eq("recipe_id", recipeId)
    .maybeSingle();
  if (existing) {
    await s.from("plan_items").delete().eq("id", existing.id);
  } else {
    const { count } = await s
      .from("plan_items")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", plan);
    await s.from("plan_items").insert({ plan_id: plan, recipe_id: recipeId, position: count ?? 0 });
  }
  touch();
}

export async function clearWeek() {
  const s = getServerClient();
  // Start a fresh plan; the old one stays as history.
  await s.from("plans").insert({ label: "Semana actual" });
  touch();
}

export async function addTask(text: string) {
  const clean = text.trim();
  if (!clean) return;
  const s = getServerClient();
  const plan = (await currentPlanId(s, true))!;
  const { count } = await s
    .from("plan_tasks")
    .select("*", { count: "exact", head: true })
    .eq("plan_id", plan);
  await s.from("plan_tasks").insert({ plan_id: plan, text: clean, position: count ?? 0 });
  touch();
}

export async function removeTask(id: string) {
  const s = getServerClient();
  await s.from("plan_tasks").delete().eq("id", id);
  touch();
}
