import { getServerClient } from "@/lib/supabase";
import { currentPlanId } from "@/lib/plan";
import { localizeContent } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";
import { notFound } from "next/navigation";
import { RecipeClient } from "./recipe-client";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getServerClient();
  const lang = await getLang();

  const { data: r } = await s
    .from("recipes")
    .select(
      "*, recipe_collections(collection_id), recipe_tags(tag_id), recipe_notes(id, body, created_at)",
    )
    .eq("id", id)
    .single();
  if (!r) notFound();

  const { data: allCollections } = await s.from("collections").select("id, name").order("name");
  const { data: allTags } = await s.from("tags").select("id, name").order("name");

  const c = localizeContent(r as any, lang);
  const recipe = {
    id: r.id as string,
    title: c.title,
    emoji: r.emoji as string | null,
    image_url: r.image_url as string | null,
    type: r.type as string | null,
    porciones: r.porciones as string | null,
    fridge_life_days: r.fridge_life_days as number | null,
    rating: r.rating as number | null,
    tried: r.tried as boolean,
    times_cooked: r.times_cooked as number,
    cook_status: (r.cook_status ?? "sin_probar") as "sin_probar" | "cocinada" | "cabecera",
    source_url: r.source_url as string | null,
    ingredients: c.ingredients,
    steps: c.steps,
    collectionIds: (r.recipe_collections ?? []).map((x: any) => x.collection_id as string),
    tagIds: (r.recipe_tags ?? []).map((x: any) => x.tag_id as string),
    notes: ((r.recipe_notes ?? []) as any[])
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((n) => ({ id: n.id as string, body: n.body as string })),
  };

  const planId = await currentPlanId(s);
  let inWeek = false;
  if (planId) {
    const { data: pi } = await s
      .from("plan_items")
      .select("id")
      .eq("plan_id", planId)
      .eq("recipe_id", id)
      .maybeSingle();
    inWeek = !!pi;
  }

  return (
    <RecipeClient
      recipe={recipe}
      inWeek={inWeek}
      allCollections={(allCollections ?? []) as { id: string; name: string }[]}
      allTags={(allTags ?? []) as { id: string; name: string }[]}
    />
  );
}
