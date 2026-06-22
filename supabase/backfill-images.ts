import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

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
        try {
          return new URL(m[1], pageUrl).href;
        } catch {
          return m[1];
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, source_url")
    .not("source_url", "is", null)
    .is("image_url", null);
  if (error) throw error;

  let found = 0;
  for (const r of data!) {
    const img = await ogImage(r.source_url as string);
    if (img) {
      await supabase.from("recipes").update({ image_url: img }).eq("id", r.id);
      found++;
      console.log(`✓ ${r.title}`);
    } else {
      console.log(`·  ${r.title} (no image)`);
    }
  }
  console.log(`\nGot photos for ${found} of ${data!.length} recipes that had a source.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
