export type ID = string;

/** Paleta compartida por tarjetas, columnas y post-its. */
export type ColorKey =
  | "slate"
  | "blue"
  | "violet"
  | "pink"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose";

export const COLOR_KEYS: ColorKey[] = [
  "slate",
  "blue",
  "violet",
  "pink",
  "amber",
  "emerald",
  "cyan",
  "rose",
];

export const COLOR_LABEL: Record<ColorKey, string> = {
  slate: "Neutro",
  blue: "Azul",
  violet: "Violeta",
  pink: "Rosa",
  amber: "Ámbar",
  emerald: "Verde",
  cyan: "Cian",
  rose: "Coral",
};

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export interface CardLink {
  id: ID;
  url: string;
  label: string;
}

export interface CardImage {
  id: ID;
  blobId: string;
  name: string;
  w: number;
  h: number;
}

export interface CardFile {
  id: ID;
  blobId: string;
  name: string;
  size: number;
  type: string;
}

export interface CardNote {
  id: ID;
  text: string;
  color: ColorKey;
}

export interface Card {
  id: ID;
  title: string;
  description: string;
  color: ColorKey;
  starred: boolean;
  checklist: ChecklistItem[];
  links: CardLink[];
  images: CardImage[];
  files: CardFile[];
  notes: CardNote[];
  createdAt: number;
  updatedAt: number;
}

export interface Column {
  id: ID;
  title: string;
  color: ColorKey;
  cardIds: ID[];
}

/** Cosas que flotan libres: post-its, frases, imágenes y objetivos. */
export type StickyKind = "note" | "text" | "image" | "goal";
export type Surface = "board" | "desk";

export interface Sticky {
  id: ID;
  surface: Surface;
  kind: StickyKind;
  text: string;
  color: ColorKey;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
  blobId?: string;
  checked?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Conexión entre dos elementos del escritorio (mapas mentales). */
export interface Edge {
  id: ID;
  from: ID;
  to: ID;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface AppState {
  version: number;
  columns: Column[];
  cards: Record<ID, Card>;
  stickies: Sticky[];
  edges: Edge[];
  camera: Camera;
  z: number;
}

export const uid = (): ID =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function emptyCard(partial: Partial<Card> = {}): Card {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    description: "",
    color: "slate",
    starred: false,
    checklist: [],
    links: [],
    images: [],
    files: [],
    notes: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function cardIsEmpty(card: Card): boolean {
  return (
    !card.title.trim() &&
    !card.description.trim() &&
    card.checklist.length === 0 &&
    card.links.length === 0 &&
    card.images.length === 0 &&
    card.files.length === 0 &&
    card.notes.length === 0
  );
}
