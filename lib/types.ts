export type Group = { label: string | null; items: string[] };

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
  last_cooked: string | null;
  source_url: string | null;
  image_url: string | null;
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
};
