"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(next: Lang) {
    if (next === lang) return;
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  }

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-line text-[12px]" data-pending={pending || undefined}>
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          aria-pressed={l === lang}
          className={`px-2.5 py-1 font-medium uppercase transition-colors ${
            l === lang ? "bg-accent text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
