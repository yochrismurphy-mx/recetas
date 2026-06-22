import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const here = dirname(fileURLToPath(import.meta.url));

const norm = (t: string) =>
  (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};

async function main() {
  // Each line: "Recipe title | https://image-url"  (also tolerates tab or "->" separators)
  const raw = readFileSync(join(here, "seed", "image-urls.txt"), "utf8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  const { data: recipes } = await s.from("recipes").select("id, title");
  const byTitle = new Map<string, string>();
  for (const r of recipes ?? []) byTitle.set(norm(r.title), r.id);

  let ok = 0;
  const unmatched: string[] = [], failed: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(.*?)\s*(?:\||\t|->)\s*(https?:\/\/\S+)\s*$/);
    if (!m) { failed.push(`bad line: ${line.slice(0, 60)}`); continue; }
    const title = m[1].trim();
    const url = m[2].trim();
    const id = byTitle.get(norm(title));
    if (!id) { unmatched.push(title); continue; }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "Mozilla/5.0" } });
      const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
      if (!res.ok || !ct.startsWith("image/")) { failed.push(`${title}: not an image (${res.status} ${ct})`); continue; }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength < 2000) { failed.push(`${title}: too small`); continue; }
      const ext = EXT[ct] || "jpg";
      const path = `${id}/gpt-${Date.now()}.${ext}`;
      const { error: upErr } = await s.storage.from("recipe-images").upload(path, bytes, { contentType: ct, upsert: true });
      if (upErr) { failed.push(`${title}: ${upErr.message}`); continue; }
      const { data: pub } = s.storage.from("recipe-images").getPublicUrl(path);
      await s.from("recipes").update({ image_url: pub.publicUrl }).eq("id", id);
      ok++;
    } catch (e: any) {
      failed.push(`${title}: ${e.message || e}`);
    }
  }

  console.log(`Uploaded ${ok}.`);
  if (unmatched.length) console.log(`\nNo recipe matched these titles (fix the title to match exactly):\n- ${unmatched.join("\n- ")}`);
  if (failed.length) console.log(`\nFailed:\n- ${failed.join("\n- ")}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
