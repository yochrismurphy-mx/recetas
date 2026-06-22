import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { error } = await supabase.storage.createBucket("recipe-images", {
    public: true,
    fileSizeLimit: "15MB",
  });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log("recipe-images bucket:", error ? "already exists" : "created");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
