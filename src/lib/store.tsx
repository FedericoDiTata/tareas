"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { STORE_KV, idbGet, idbSet } from "./idb";
import { deleteBlob } from "./files";
import { emptyState, seedState } from "./seed";
import {
  AppState,
  Camera,
  Card,
  CardFile,
  CardImage,
  CardLink,
  CardNote,
  ChecklistItem,
  ColorKey,
  Column,
  ID,
  Sticky,
  StickyKind,
  Surface,
  emptyCard,
  uid,
} from "./types";

const STATE_KEY = "state.v1";
const HISTORY_LIMIT = 40;

interface Actions {
  // Columnas
  addColumn: (title?: string) => ID;
  renameColumn: (id: ID, title: string) => void;
  setColumnColor: (id: ID, color: ColorKey) => void;
  deleteColumn: (id: ID) => void;
  moveColumn: (from: number, to: number) => void;

  // Tarjetas
  addCard: (columnId: ID, title: string, atTop?: boolean) => ID;
  updateCard: (id: ID, patch: Partial<Card>) => void;
  deleteCard: (id: ID) => void;
  moveCard: (cardId: ID, toColumnId: ID, toIndex: number) => void;
  toggleStar: (id: ID) => void;
  duplicateCard: (id: ID) => void;

  // Bloques dentro de una tarjeta
  addCheck: (cardId: ID, text: string) => void;
  updateCheck: (cardId: ID, itemId: ID, patch: Partial<ChecklistItem>) => void;
  deleteCheck: (cardId: ID, itemId: ID) => void;
  addLink: (cardId: ID, url: string, label?: string) => void;
  deleteLink: (cardId: ID, linkId: ID) => void;
  addImages: (cardId: ID, images: Omit<CardImage, "id">[]) => void;
  deleteImage: (cardId: ID, imageId: ID) => void;
  addFiles: (cardId: ID, files: Omit<CardFile, "id">[]) => void;
  deleteFile: (cardId: ID, fileId: ID) => void;
  addNote: (cardId: ID, color?: ColorKey) => ID;
  updateNote: (cardId: ID, noteId: ID, patch: Partial<CardNote>) => void;
  deleteNote: (cardId: ID, noteId: ID) => void;

  // Post-its y elementos libres
  addSticky: (partial: Partial<Sticky> & { surface: Surface; kind: StickyKind }) => ID;
  updateSticky: (id: ID, patch: Partial<Sticky>) => void;
  deleteSticky: (id: ID) => void;
  bringToFront: (id: ID) => void;

  // Escritorio
  addEdge: (from: ID, to: ID) => void;
  deleteEdge: (id: ID) => void;
  setCamera: (camera: Camera) => void;

  // Global
  undo: () => void;
  canUndo: boolean;
  replaceState: (state: AppState) => void;
  resetAll: () => void;
}

interface StoreValue extends Actions {
  state: AppState;
  ready: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Normaliza estados viejos o importados para que nunca falte un campo. */
function normalize(raw: Partial<AppState> | null | undefined): AppState {
  const base = emptyState();
  if (!raw) return base;
  return {
    version: 1,
    columns: Array.isArray(raw.columns)
      ? raw.columns.map((c) => ({
          id: c.id ?? uid(),
          title: c.title ?? "",
          color: (c.color ?? "slate") as ColorKey,
          cardIds: Array.isArray(c.cardIds) ? c.cardIds : [],
        }))
      : base.columns,
    cards: Object.fromEntries(
      Object.entries(raw.cards ?? {}).map(([id, c]) => [
        id,
        {
          ...emptyCard({ id }),
          ...c,
          checklist: c.checklist ?? [],
          links: c.links ?? [],
          images: c.images ?? [],
          files: c.files ?? [],
          notes: c.notes ?? [],
        },
      ]),
    ),
    stickies: Array.isArray(raw.stickies) ? raw.stickies : [],
    edges: Array.isArray(raw.edges) ? raw.edges : [],
    camera: raw.camera ?? { x: 0, y: 0, scale: 1 },
    z: raw.z ?? 1,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<AppState[]>([]);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Espejo del estado para leerlo dentro de acciones sin ensuciar los updaters.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hidratación
  useEffect(() => {
    let alive = true;
    idbGet<AppState>(STORE_KV, STATE_KEY)
      .then((saved) => {
        if (!alive) return;
        setState(saved ? normalize(saved) : seedState());
      })
      .catch(() => {
        if (alive) setState(seedState());
      })
      .finally(() => {
        if (!alive) return;
        hydrated.current = true;
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Autoguardado con debounce: escribir en cada tecla sería un desperdicio.
  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      idbSet(STORE_KV, STATE_KEY, state).catch(() => {});
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  // Guardado inmediato al cerrar la pestaña.
  useEffect(() => {
    const flush = () => {
      if (hydrated.current) idbSet(STORE_KV, STATE_KEY, state).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [state]);

  const snapshot = useCallback(() => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), stateRef.current]);
  }, []);

  const patchCard = useCallback((id: ID, fn: (card: Card) => Card) => {
    setState((s) => {
      const card = s.cards[id];
      if (!card) return s;
      return {
        ...s,
        cards: { ...s.cards, [id]: { ...fn(card), updatedAt: Date.now() } },
      };
    });
  }, []);

  const actions: Actions = useMemo(() => {
    return {
      addColumn: (title = "Nueva columna") => {
        const col: Column = { id: uid(), title, color: "slate", cardIds: [] };
        setState((s) => ({ ...s, columns: [...s.columns, col] }));
        return col.id;
      },

      renameColumn: (id, title) =>
        setState((s) => ({
          ...s,
          columns: s.columns.map((c) => (c.id === id ? { ...c, title } : c)),
        })),

      setColumnColor: (id, color) =>
        setState((s) => ({
          ...s,
          columns: s.columns.map((c) => (c.id === id ? { ...c, color } : c)),
        })),

      deleteColumn: (id) => {
        snapshot();
        stateRef.current.columns
          .find((c) => c.id === id)
          ?.cardIds.forEach((cid) => {
            const card = stateRef.current.cards[cid];
            card?.images.forEach((i) => deleteBlob(i.blobId));
            card?.files.forEach((f) => deleteBlob(f.blobId));
          });
        setState((s) => {
          const col = s.columns.find((c) => c.id === id);
          if (!col) return s;
          const cards = { ...s.cards };
          col.cardIds.forEach((cid) => delete cards[cid]);
          return { ...s, columns: s.columns.filter((c) => c.id !== id), cards };
        });
      },

      moveColumn: (from, to) =>
        setState((s) => {
          const columns = [...s.columns];
          const [moved] = columns.splice(from, 1);
          if (!moved) return s;
          columns.splice(to, 0, moved);
          return { ...s, columns };
        }),

      addCard: (columnId, title, atTop = true) => {
        const card = emptyCard({ title });
        setState((s) => {
          const column = s.columns.find((c) => c.id === columnId);
          if (!column) return s;
          return {
            ...s,
            cards: { ...s.cards, [card.id]: { ...card, color: column.color } },
            columns: s.columns.map((c) =>
              c.id === columnId
                ? { ...c, cardIds: atTop ? [card.id, ...c.cardIds] : [...c.cardIds, card.id] }
                : c,
            ),
          };
        });
        return card.id;
      },

      updateCard: (id, patch) => patchCard(id, (card) => ({ ...card, ...patch })),

      deleteCard: (id) => {
        snapshot();
        const doomed = stateRef.current.cards[id];
        if (doomed) {
          doomed.images.forEach((i) => deleteBlob(i.blobId));
          doomed.files.forEach((f) => deleteBlob(f.blobId));
        }
        setState((s) => {
          const cards = { ...s.cards };
          delete cards[id];
          return {
            ...s,
            cards,
            columns: s.columns.map((c) => ({
              ...c,
              cardIds: c.cardIds.filter((cid) => cid !== id),
            })),
          };
        });
      },

      moveCard: (cardId, toColumnId, toIndex) =>
        setState((s) => {
          const columns = s.columns.map((c) => ({
            ...c,
            cardIds: c.cardIds.filter((id) => id !== cardId),
          }));
          const target = columns.find((c) => c.id === toColumnId);
          if (!target) return s;
          const index = Math.max(0, Math.min(toIndex, target.cardIds.length));
          target.cardIds.splice(index, 0, cardId);
          return { ...s, columns };
        }),

      toggleStar: (id) => patchCard(id, (card) => ({ ...card, starred: !card.starred })),

      duplicateCard: (id) =>
        setState((s) => {
          const card = s.cards[id];
          if (!card) return s;
          const copy: Card = {
            ...structuredClone(card),
            id: uid(),
            title: card.title ? `${card.title} (copia)` : "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return {
            ...s,
            cards: { ...s.cards, [copy.id]: copy },
            columns: s.columns.map((c) =>
              c.cardIds.includes(id)
                ? {
                    ...c,
                    cardIds: c.cardIds.flatMap((cid) => (cid === id ? [cid, copy.id] : [cid])),
                  }
                : c,
            ),
          };
        }),

      addCheck: (cardId, text) =>
        patchCard(cardId, (card) => ({
          ...card,
          checklist: [...card.checklist, { id: uid(), text, done: false }],
        })),

      updateCheck: (cardId, itemId, patch) =>
        patchCard(cardId, (card) => ({
          ...card,
          checklist: card.checklist.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
        })),

      deleteCheck: (cardId, itemId) =>
        patchCard(cardId, (card) => ({
          ...card,
          checklist: card.checklist.filter((i) => i.id !== itemId),
        })),

      addLink: (cardId, url, label) => {
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const link: CardLink = { id: uid(), url: href, label: label?.trim() || hostOf(href) };
        patchCard(cardId, (card) => ({ ...card, links: [...card.links, link] }));
      },

      deleteLink: (cardId, linkId) =>
        patchCard(cardId, (card) => ({
          ...card,
          links: card.links.filter((l) => l.id !== linkId),
        })),

      addImages: (cardId, images) =>
        patchCard(cardId, (card) => ({
          ...card,
          images: [...card.images, ...images.map((i) => ({ ...i, id: uid() }))],
        })),

      deleteImage: (cardId, imageId) => {
        const image = stateRef.current.cards[cardId]?.images.find((i) => i.id === imageId);
        if (image) deleteBlob(image.blobId);
        patchCard(cardId, (card) => ({
          ...card,
          images: card.images.filter((i) => i.id !== imageId),
        }));
      },

      addFiles: (cardId, files) =>
        patchCard(cardId, (card) => ({
          ...card,
          files: [...card.files, ...files.map((f) => ({ ...f, id: uid() }))],
        })),

      deleteFile: (cardId, fileId) => {
        const file = stateRef.current.cards[cardId]?.files.find((f) => f.id === fileId);
        if (file) deleteBlob(file.blobId);
        patchCard(cardId, (card) => ({
          ...card,
          files: card.files.filter((f) => f.id !== fileId),
        }));
      },

      addNote: (cardId, color = "amber") => {
        const note: CardNote = { id: uid(), text: "", color };
        patchCard(cardId, (card) => ({ ...card, notes: [...card.notes, note] }));
        return note.id;
      },

      updateNote: (cardId, noteId, patch) =>
        patchCard(cardId, (card) => ({
          ...card,
          notes: card.notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
        })),

      deleteNote: (cardId, noteId) =>
        patchCard(cardId, (card) => ({
          ...card,
          notes: card.notes.filter((n) => n.id !== noteId),
        })),

      addSticky: (partial) => {
        const id = uid();
        const now = Date.now();
        setState((s) => {
          const z = s.z + 1;
          const sticky: Sticky = {
            id,
            surface: partial.surface,
            kind: partial.kind,
            text: partial.text ?? "",
            color: partial.color ?? "amber",
            x: partial.x ?? 0,
            y: partial.y ?? 0,
            w: partial.w ?? defaultSize(partial.kind).w,
            h: partial.h ?? defaultSize(partial.kind).h,
            rot: partial.rot ?? randomTilt(),
            z,
            blobId: partial.blobId,
            checked: partial.checked ?? (partial.kind === "goal" ? false : undefined),
            createdAt: now,
            updatedAt: now,
          };
          return { ...s, stickies: [...s.stickies, sticky], z };
        });
        return id;
      },

      updateSticky: (id, patch) =>
        setState((s) => ({
          ...s,
          stickies: s.stickies.map((st) =>
            st.id === id ? { ...st, ...patch, updatedAt: Date.now() } : st,
          ),
        })),

      deleteSticky: (id) => {
        snapshot();
        const sticky = stateRef.current.stickies.find((st) => st.id === id);
        if (sticky?.blobId) deleteBlob(sticky.blobId);
        setState((s) => {
          return {
            ...s,
            stickies: s.stickies.filter((st) => st.id !== id),
            edges: s.edges.filter((e) => e.from !== id && e.to !== id),
          };
        });
      },

      bringToFront: (id) =>
        setState((s) => {
          const z = s.z + 1;
          return {
            ...s,
            z,
            stickies: s.stickies.map((st) => (st.id === id ? { ...st, z } : st)),
          };
        }),

      addEdge: (from, to) =>
        setState((s) => {
          if (from === to) return s;
          const exists = s.edges.some(
            (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
          );
          if (exists) return s;
          return { ...s, edges: [...s.edges, { id: uid(), from, to }] };
        }),

      deleteEdge: (id) =>
        setState((s) => ({ ...s, edges: s.edges.filter((e) => e.id !== id) })),

      setCamera: (camera) => setState((s) => ({ ...s, camera })),

      undo: () =>
        setHistory((h) => {
          const prev = h[h.length - 1];
          if (prev) setState(prev);
          return h.slice(0, -1);
        }),

      canUndo: history.length > 0,

      replaceState: (next) => {
        snapshot();
        setState(normalize(next));
      },

      resetAll: () => {
        snapshot();
        setState(emptyState());
      },
    };
  }, [patchCard, snapshot, history.length]);

  const value: StoreValue = useMemo(
    () => ({ ...actions, state, ready }),
    [actions, state, ready],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore fuera de StoreProvider");
  return ctx;
}

function defaultSize(kind: StickyKind): { w: number; h: number } {
  switch (kind) {
    case "note":
      return { w: 220, h: 200 };
    case "text":
      return { w: 380, h: 120 };
    case "image":
      return { w: 300, h: 220 };
    case "goal":
      return { w: 300, h: 84 };
  }
}

function randomTilt(): number {
  return Math.round((Math.random() * 5 - 2.5) * 10) / 10;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
