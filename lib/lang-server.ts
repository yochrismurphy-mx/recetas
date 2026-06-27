import { cookies } from "next/headers";
import type { Lang } from "./i18n";

/** Read the language preference (cookie), defaulting to Spanish. Server-only. */
export async function getLang(): Promise<Lang> {
  const c = await cookies();
  return c.get("lang")?.value === "en" ? "en" : "es";
}
