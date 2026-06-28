export type Group = { label: string | null; items: string[] };

export type CookStatus = "sin_probar" | "cocinada" | "cabecera";

export const COOK_STATUS_LABELS: Record<CookStatus, string> = {
  sin_probar: "Sin probar",
  cocinada: "Ya cocinada",
  cabecera: "De cabecera",
};

export type Recipe = {
  id: string;
  title: string;
  emoji: string | null;
  type: string | null;
  language: string;
  porciones: string | null;
  fridge_life_days: number | null;
  rating: number | null;
  tried: boolean;
  times_cooked: number;
  cook_status: CookStatus;
  last_cooked: string | null;
  source_url: string | null;
  image_url: string | null;
  video_url: string | null;
  ingredients: Group[];
  steps: Group[];
  collections: string[];
  tags: string[];
};

export type FilterState = {
  q: string;
  types: string[];
  collections: string[];
  tags: string[];
  mode: "all" | "any";
  incompleteOnly: boolean;
  minRating: number | null;
  fridge: string[];
  status: CookStatus[];
};
