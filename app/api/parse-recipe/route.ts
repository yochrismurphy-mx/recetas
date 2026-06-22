import { NextResponse } from "next/server";
import { parseRecipe } from "@/lib/anthropic";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { input } = await request.json();
    if (!input || !String(input).trim()) {
      return NextResponse.json({ error: "Pega un enlace o el texto de una receta." }, { status: 400 });
    }
    const parsed = await parseRecipe(String(input));
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "No se pudo procesar." }, { status: 500 });
  }
}
