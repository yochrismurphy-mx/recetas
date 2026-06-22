"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
    >
      Imprimir / PDF
    </button>
  );
}
