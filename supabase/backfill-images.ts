import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function ogImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const patterns = [
      /<meta[^>]+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image)["']/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m && m[1]) {
        try { return new URL(m[1], pageUrl).href; } catch { return m[1]; }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function openverse(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=1&mature=false`,
      { headers: { "user-agent": "recetas/1.0 (personal recipe app)" }, signal: AbortSignal.timeout(12000) },
    );
    if (!res.ok) return null;
    const j = await res.json();
    const r = j.results?.[0];
    return r?.url || r?.thumbnail || null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { data } = await s.from("recipes").select("id, title, source_url, image_url");
  const todo = (data ?? []).filter((r) => !r.image_url);
  console.log(`${todo.length} recipes without an image.`);
  let fromSource = 0, fromSearch = 0, none = 0;
  for (const r of todo) {
    let img: string | null = null;
    if (r.source_url) img = await ogImage(r.source_url as string);
    if (img) fromSource++;
    else {
      img = (await openverse(r.title as string)) || (await openverse(`${r.title} comida plato`));
      if (img) fromSearch++;
    }
    if (img) await s.from("recipes").update({ image_url: img }).eq("id", r.id);
    else none++;
    await sleep(200);
  }
  const { count } = await s
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .not("image_url", "is", null);
  console.log(`From source: ${fromSource}, from search: ${fromSearch}, none: ${none}`);
  console.log(`Recipes with an image now: ${count}/${data?.length}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
