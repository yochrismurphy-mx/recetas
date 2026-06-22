import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const TAGS = [
  "Mexicano", "Italiano", "Indio", "Tailandés", "Griego", "Japonés", "Coreano",
  "Mediterráneo", "Medio Oriente", "Vegetariano", "Vegano", "Sin gluten",
  "Rápido", "Saludable", "Picante", "Para invitados",
];

async function main() {
  for (const name of TAGS) {
    await s.from("tags").upsert({ name }, { onConflict: "name" });
  }
  const { count } = await s.from("tags").select("*", { count: "exact", head: true });
  console.log(`Tags now: ${count}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
