import { AppState, ColorKey, ID } from "./types";

export interface Hit {
  id: ID;
  kind: "card" | "sticky" | "column";
  title: string;
  context: string;
  snippet?: string;
  color: ColorKey;
  score: number;
  surface?: "board" | "desk";
}

/** Sin acentos ni mayúsculas: "camion" tiene que encontrar "Camión". */
export function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function snippetAround(haystack: string, needle: string): string | undefined {
  const i = norm(haystack).indexOf(needle);
  if (i < 0) return undefined;
  const start = Math.max(0, i - 30);
  const raw = haystack.slice(start, start + 110).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + raw + (start + 110 < haystack.length ? "…" : "");
}

export function search(state: AppState, query: string, limit = 30): Hit[] {
  const q = norm(query.trim());
  if (!q) return [];

  const hits: Hit[] = [];
  const columnOf = new Map<ID, string>();
  state.columns.forEach((col) => col.cardIds.forEach((id) => columnOf.set(id, col.title)));

  for (const col of state.columns) {
    const t = norm(col.title);
    if (t.includes(q)) {
      hits.push({
        id: col.id,
        kind: "column",
        title: col.title || "Columna sin nombre",
        context: `${col.cardIds.length} tarjeta${col.cardIds.length === 1 ? "" : "s"}`,
        color: col.color,
        score: t.startsWith(q) ? 90 : 70,
      });
    }
  }

  for (const card of Object.values(state.cards)) {
    const title = norm(card.title);
    const body = [
      card.description,
      ...card.checklist.map((c) => c.text),
      ...card.notes.map((n) => n.text),
      ...card.links.map((l) => `${l.label} ${l.url}`),
      ...card.files.map((f) => f.name),
    ].join("\n");
    const bodyNorm = norm(body);

    let score = 0;
    if (title.startsWith(q)) score = 100;
    else if (title.includes(q)) score = 85;
    else if (bodyNorm.includes(q)) score = 60;
    if (!score) continue;
    if (card.starred) score += 6;

    hits.push({
      id: card.id,
      kind: "card",
      title: card.title || "Sin título",
      context: columnOf.get(card.id) ?? "Sin columna",
      snippet: score === 60 ? snippetAround(body, q) : undefined,
      color: card.color,
      score,
    });
  }

  for (const sticky of state.stickies) {
    const text = norm(sticky.text);
    if (!text.includes(q)) continue;
    hits.push({
      id: sticky.id,
      kind: "sticky",
      title: sticky.text.trim().split("\n")[0]?.slice(0, 80) || "Post-it",
      context: sticky.surface === "desk" ? "Escritorio" : "Tablero",
      snippet: snippetAround(sticky.text, q),
      color: sticky.color,
      score: text.startsWith(q) ? 80 : 55,
      surface: sticky.surface,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
