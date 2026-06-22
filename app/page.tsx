import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import type { Recipe } from "@/lib/types";
import { LibraryClient } from "./library-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_collections(collections(name)), recipe_tags(tags(name))")
    .order("title");
  if (error) throw new Error(error.message);

  const recipes: Recipe[] = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    type: row.type,
    language: row.language,
    porciones: row.porciones,
    fridge_life_days: row.fridge_life_days,
    rating: row.rating,
    tried: row.tried,
    times_cooked: row.times_cooked,
    last_cooked: row.last_cooked,
    source_url: row.source_url,
    image_url: row.image_url,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    collections: (row.recipe_collections ?? [])
      .map((x: any) => x.collections?.name)
      .filter(Boolean),
    tags: (row.recipe_tags ?? []).map((x: any) => x.tags?.name).filter(Boolean),
  }));

  const planId = await currentPlanId(supabase);
  let weekIds: string[] = [];
  if (planId) {
    const { data: items } = await supabase
      .from("plan_items")
      .select("recipe_id")
      .eq("plan_id", planId);
    weekIds = (items ?? []).map((x: any) => x.recipe_id as string);
  }

  return <LibraryClient recipes={recipes} weekIds={weekIds} />;
}
