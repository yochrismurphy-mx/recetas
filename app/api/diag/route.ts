// TEMPORARY (2026-10-19): timing probe for the region move. Returns timings only, never data. Remove after measuring.
import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const bootedAt = Date.now();
let hits = 0;

export async function GET() {
  hits++;
  const s = getServerClient();
  const time = async (fn: () => PromiseLike<unknown>) => { const a = performance.now(); await fn(); return Math.round(performance.now() - a); };
  const rid = "dc472991-35e6-4e8b-80d1-3a2d2cd505c4";
  // Same shape as the recipe page today: five queries one after another.
  const seq: number[] = [];
  const a = performance.now();
  seq.push(await time(() => s.from("recipes").select("*, recipe_collections(collections(name)), recipe_tags(tags(name)), recipe_notes(id, body)").eq("id", rid).single()));
  seq.push(await time(() => s.from("collections").select("id, name").order("name")));
  seq.push(await time(() => s.from("tags").select("id, name").order("name")));
  seq.push(await time(() => s.from("plans").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle()));
  seq.push(await time(() => s.from("plan_items").select("recipe_id").limit(50)));
  const seqTotal = Math.round(performance.now() - a);
  const b = performance.now();
  await Promise.all([
    s.from("recipes").select("id").eq("id", rid).single(), s.from("collections").select("id, name"),
    s.from("tags").select("id, name"), s.from("plans").select("id").limit(1),
  ]);
  const parallel = Math.round(performance.now() - b);
  return NextResponse.json({ region: process.env.VERCEL_REGION ?? "local", warm: hits > 1, hits, uptimeS: Math.round((Date.now() - bootedAt) / 1000), queriesMs: seq, sequentialTotalMs: seqTotal, parallelTotalMs: parallel });
}
