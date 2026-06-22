import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file") as File | null;
  const recipeId = String(form.get("recipeId") || "");
  if (!file || !recipeId) {
    return NextResponse.json({ error: "missing file or recipeId" }, { status: 400 });
  }

  const s = getServerClient();
  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const path = `${recipeId}/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await s.storage
    .from("recipe-images")
    .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data } = s.storage.from("recipe-images").getPublicUrl(path);
  await s.from("recipes").update({ image_url: data.publicUrl }).eq("id", recipeId);
  return NextResponse.json({ url: data.publicUrl });
}
