import { NextResponse } from "next/server";
import { AUTH_COOKIE, checkPassphrase, tokenFor } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const input = String(form.get("passphrase") || "");
  const secret = process.env.APP_PASSPHRASE || "";

  if (!checkPassphrase(input, secret)) {
    return NextResponse.redirect(new URL("/unlock?error=1", request.url), 303);
  }

  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(AUTH_COOKIE, await tokenFor(secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
