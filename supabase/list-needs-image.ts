import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const here = dirname(fileURLToPath(import.meta.url));
const MINE = "supabase.co/storage"; // images already in our bucket (uploads / GPT imports)

async function main() {
  const { data } = await s.from("recipes").select("title, image_url").order("title");
  const need = (data ?? []).filter((r) => !r.image_url || !String(r.image_url).includes(MINE));
  writeFileSync(join(here, "seed", "titles-needing-images.txt"), need.map((r) => r.title).join("\n"));
  console.log(`${need.length} of ${data?.length} recipes need a better photo. Titles written to supabase/seed/titles-needing-images.txt`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
