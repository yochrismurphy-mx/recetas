import type { SupabaseClient } from "@supabase/supabase-js";

// The "current week" is the most recently created plan. Reads never create;
// pass create=true (from a write action) to start one if none exists.
export async function currentPlanId(
  s: SupabaseClient,
  create = false,
): Promise<string | null> {
  const { data } = await s
    .from("plans")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) return data.id as string;
  if (!create) return null;
  const { data: c } = await s
    .from("plans")
    .insert({ label: "Semana actual" })
    .select("id")
    .single();
  return c!.id as string;
}
