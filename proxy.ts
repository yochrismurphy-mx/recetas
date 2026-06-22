import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, tokenFor } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const secret = process.env.APP_PASSPHRASE || "";
  const expected = secret ? await tokenFor(secret) : "";
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;

  if (expected && cookie === expected) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!unlock|api/unlock|_next/static|_next/image|img/|favicon.ico).*)"],
};
