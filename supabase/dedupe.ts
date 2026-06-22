import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function richness(r: any): number {
  const count = (groups: any[]) =>
    (groups || []).reduce((a, g) => a + (g.items?.length || 0), 0);
  return count(r.ingredients) + count(r.steps) + (r.source_url ? 1 : 0);
}

async function main() {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, ingredients, steps, source_url");
  if (error) throw error;

  const groups = new Map<string, any[]>();
  for (const r of data!) {
    const k = norm(r.title);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const toDelete: string[] = [];
  for (const [, rows] of groups) {
    if (rows.length < 2) continue;
    rows.sort((a, b) => richness(b) - richness(a));
    const keep = rows[0];
    const drop = rows.slice(1);
    console.log(
      `"${keep.title}": keep 1 (richness ${richness(keep)}), remove ${drop.length}`,
    );
    toDelete.push(...drop.map((r) => r.id));
  }

  if (toDelete.length) {
    const { error: delErr } = await supabase
      .from("recipes")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }

  const { count } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });
  console.log(`\nRemoved ${toDelete.length} duplicates. ${count} recipes remain.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
