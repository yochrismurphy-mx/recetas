import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { localizeContent } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";
import type { Recipe } from "@/lib/types";
import { LibraryClient } from "./library-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = getServerClient();
  const lang = await getLang();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_collections(collections(name)), recipe_tags(tags(name))")
    .order("title");
  if (error) throw new Error(error.message);

  const recipes: Recipe[] = (data ?? []).map((row: any) => {
    const c = localizeContent(row, lang);
    return {
      id: row.id,
      title: c.title,
      emoji: row.emoji,
      type: row.type,
      language: row.language,
      porciones: row.porciones,
      fridge_life_days: row.fridge_life_days,
      rating: row.rating,
      tried: row.tried,
      times_cooked: row.times_cooked,
      cook_status: row.cook_status ?? "sin_probar",
      last_cooked: row.last_cooked,
      source_url: row.source_url,
      image_url: row.image_url,
      video_url: row.video_url,
      ingredients: c.ingredients,
      steps: c.steps,
      collections: (row.recipe_collections ?? [])
        .map((x: any) => x.collections?.name)
        .filter(Boolean),
      tags: (row.recipe_tags ?? []).map((x: any) => x.tags?.name).filter(Boolean),
    };
  });

  const planId = await currentPlanId(supabase);
  let weekIds: string[] = [];
  if (planId) {
    const { data: items } = await supabase
      .from("plan_items")
      .select("recipe_id")
      .eq("plan_id", planId);
    weekIds = (items ?? []).map((x: any) => x.recipe_id as string);
  }

  const { data: collRows } = await supabase.from("collections").select("name").order("name");
  const { data: tagRows } = await supabase.from("tags").select("name").order("name");

  return (
    <LibraryClient
      recipes={recipes}
      weekIds={weekIds}
      allCollections={(collRows ?? []).map((c: any) => c.name as string)}
      allTags={(tagRows ?? []).map((t: any) => t.name as string)}
      lang={lang}
    />
  );
}
