import type { Group } from "./types";

export type Lang = "es" | "en";

/** Pick a recipe's content for the chosen language, falling back to the legacy
 * columns (and then the other language) so nothing ever renders blank. */
export function localizeContent(
  row: {
    title: string; title_es?: string | null; title_en?: string | null;
    ingredients?: Group[] | null; ingredients_es?: Group[] | null; ingredients_en?: Group[] | null;
    steps?: Group[] | null; steps_es?: Group[] | null; steps_en?: Group[] | null;
  },
  lang: Lang,
): { title: string; ingredients: Group[]; steps: Group[] } {
  const nonEmpty = (g?: Group[] | null) =>
    Array.isArray(g) && g.some((x) => (x.items ?? []).some((i) => i && i.trim())) ? g : null;
  const title = (lang === "en" ? row.title_en : row.title_es) || row.title;
  const ing = (lang === "en" ? nonEmpty(row.ingredients_en) : nonEmpty(row.ingredients_es)) ?? row.ingredients ?? [];
  const steps = (lang === "en" ? nonEmpty(row.steps_en) : nonEmpty(row.steps_es)) ?? row.steps ?? [];
  return { title, ingredients: ing, steps };
}

/** Display labels for the fixed Tipo values (stored in Spanish). */
export const TYPE_LABELS: Record<Lang, Record<string, string>> = {
  es: {},
  en: {
    Aves: "Poultry", Carne: "Meat", Pescado: "Fish/Seafood", Leguminosas: "Legumes",
    Ensalada: "Salad", "Sopa/Curry": "Soup/Curry", "Granos/Pasta": "Grains/Pasta",
    Verduras: "Vegetables", Postre: "Dessert", Desayuno: "Breakfast", "Pan/Masa": "Bread/Dough",
    "Salsas/Dips": "Sauces/Dips", Untables: "Spreads",
  },
};

/** Display labels for the known collection names. */
export const COLLECTION_LABELS: Record<Lang, Record<string, string>> = {
  es: {},
  en: { Semanal: "Weekly", Personal: "Personal", Thanksgiving: "Thanksgiving", "Home Sweet Home": "Home Sweet Home" },
};

export const COOK_STATUS_LABELS: Record<Lang, Record<string, string>> = {
  es: { sin_probar: "Sin probar", cocinada: "Ya cocinada", cabecera: "De cabecera" },
  en: { sin_probar: "Untried", cocinada: "Cooked", cabecera: "Go-to" },
};

/** Display labels for the known Etiqueta (tag) vocabulary. */
export const TAG_LABELS: Record<Lang, Record<string, string>> = {
  es: {},
  en: {
    Mexicano: "Mexican", Italiano: "Italian", Indio: "Indian", "Tailandés": "Thai",
    Griego: "Greek", "Japonés": "Japanese", Coreano: "Korean", Chino: "Chinese",
    Vietnamita: "Vietnamese", "Mediterráneo": "Mediterranean", "Medio Oriente": "Middle Eastern",
    Americano: "American", "Francés": "French", Africano: "African", Vegetariano: "Vegetarian",
    Vegano: "Vegan", "Sin gluten": "Gluten-free", "Rápido": "Quick", Saludable: "Healthy",
    Picante: "Spicy", "Para invitados": "For guests",
  },
};

export const typeLabel = (lang: Lang, v: string | null) => (v ? TYPE_LABELS[lang][v] ?? v : "");
export const collLabel = (lang: Lang, v: string) => COLLECTION_LABELS[lang][v] ?? v;
export const tagLabel = (lang: Lang, v: string) => TAG_LABELS[lang][v] ?? v;

/** UI chrome strings. */
export const UI: Record<Lang, Record<string, string>> = {
  es: {
    title: "La cocina de Norma y Chris", thisWeek: "Esta semana", shopping: "Compras",
    addRecipe: "Agregar receta", recipe: "receta", recipes: "recetas", of: "de",
    searchPlaceholder: "Buscar por nombre o ingrediente…", filters: "Filtros", hide: "Ocultar",
    clear: "Limpiar", clearFilters: "Limpiar filtros", collection: "Colección", type: "Tipo",
    tag: "Etiqueta", rating: "Calificación", freshness: "Frescura", status: "Estado", other: "Otros",
    matchAll: "coincidir todas", matchAny: "coincidir cualquiera", orMore: "o más",
    fridgeShort: "≤3 días", fridgeMid: "4–6 días", fridgeLong: "7+ días",
    toComplete: "Por completar", showLess: "ver menos", more: "más",
    noMatch: "Nada coincide con esos filtros.", days: "días",
    goto: "De cabecera", cooked: "cocinada", addWeek: "+ semana", inWeek: "✓ semana",
    back: "Biblioteca", edit: "Editar", del: "Eliminar", delConfirm: "¿Eliminar?",
    delYes: "Sí, eliminar", cancel: "Cancelar", uploading: "Subiendo…", changePhoto: "Cambiar foto",
    uploadPhoto: "Subir foto", servingsLabel: "Porciones", fridgeLabel: "Días en refri",
    sourceLabel: "Liga / fuente", ingredients: "Ingredientes", prep: "Preparación",
    ingHelp: "Un ingrediente por línea. Empieza una línea con “# ” para un subgrupo.",
    stepHelp: "Un paso por línea.", saveChanges: "Guardar cambios",
    inWeekBtn: "✓ en la semana", addWeekBtn: "+ a la semana", servingsWord: "porciones",
    keeps: "aguanta", source: "Fuente", collections: "Colecciones", tags: "Etiquetas",
    tagsHelp: "Etiquetas libres (cocina, dieta, etc.). El tipo de platillo se edita arriba con “Editar”.",
    notes: "Notas", noNotes: "Sin notas aún.", addNotePlaceholder: "Agregar una nota…",
    save: "Guardar", newItem: "+ nueva", staleBadge: "Traducción desactualizada",
    retranslate: "Actualizar traducción", updating: "Actualizando…",
  },
  en: {
    title: "Norma & Chris's Kitchen", thisWeek: "This week", shopping: "Shopping",
    addRecipe: "Add recipe", recipe: "recipe", recipes: "recipes", of: "of",
    searchPlaceholder: "Search by name or ingredient…", filters: "Filters", hide: "Hide",
    clear: "Clear", clearFilters: "Clear filters", collection: "Collection", type: "Type",
    tag: "Tag", rating: "Rating", freshness: "Freshness", status: "Status", other: "Other",
    matchAll: "match all", matchAny: "match any", orMore: "or more",
    fridgeShort: "≤3 days", fridgeMid: "4–6 days", fridgeLong: "7+ days",
    toComplete: "Incomplete", showLess: "show less", more: "more",
    noMatch: "Nothing matches those filters.", days: "days",
    goto: "Go-to", cooked: "cooked", addWeek: "+ week", inWeek: "✓ week",
    back: "Library", edit: "Edit", del: "Delete", delConfirm: "Delete?",
    delYes: "Yes, delete", cancel: "Cancel", uploading: "Uploading…", changePhoto: "Change photo",
    uploadPhoto: "Add photo", servingsLabel: "Servings", fridgeLabel: "Days in fridge",
    sourceLabel: "Link / source", ingredients: "Ingredients", prep: "Method",
    ingHelp: "One ingredient per line. Start a line with “# ” for a subgroup.",
    stepHelp: "One step per line.", saveChanges: "Save changes",
    inWeekBtn: "✓ in the week", addWeekBtn: "+ add to week", servingsWord: "servings",
    keeps: "keeps", source: "Source", collections: "Collections", tags: "Tags",
    tagsHelp: "Free tags (cuisine, diet, etc.). The dish type is edited above with “Edit”.",
    notes: "Notes", noNotes: "No notes yet.", addNotePlaceholder: "Add a note…",
    save: "Save", newItem: "+ new", staleBadge: "Translation out of date",
    retranslate: "Update translation", updating: "Updating…",
  },
};
