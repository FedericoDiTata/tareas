import { AppState, Card, Column, Sticky, emptyCard, uid } from "./types";

/** Primer arranque: un tablero que ya se entiende sin leer instrucciones. */
export function seedState(): AppState {
  const cards: Record<string, Card> = {};

  const mk = (partial: Partial<Card>) => {
    const card = emptyCard(partial);
    cards[card.id] = card;
    return card.id;
  };

  const hoy: Column = {
    id: uid(),
    title: "Hoy",
    color: "violet",
    cardIds: [
      mk({
        title: "Abrir esto y vaciar la cabeza",
        description:
          "Escribí todo lo que tengas dando vueltas. No lo ordenes ahora, sólo sacalo de tu cabeza.\n\nDespués movés.",
        color: "violet",
        starred: true,
      }),
      mk({
        title: "Probar el Escritorio",
        description: "El canvas infinito de arriba. Pegá post-its, frases e imágenes donde quieras.",
        color: "blue",
        checklist: [
          { id: uid(), text: "Doble click en el vacío = post-it", done: false },
          { id: uid(), text: "Arrastrar el fondo = mover la vista", done: false },
          { id: uid(), text: "Pegar una captura con Ctrl+V", done: false },
        ],
      }),
    ],
  };

  const enCurso: Column = {
    id: uid(),
    title: "En curso",
    color: "cyan",
    cardIds: [
      mk({
        title: "Una tarjeta puede ser sólo un título",
        description: "",
        color: "cyan",
      }),
    ],
  };

  const luego: Column = {
    id: uid(),
    title: "Después",
    color: "slate",
    cardIds: [
      mk({
        title: "Ideas que no son para hoy",
        description: "Sacarlas de la cabeza también cuenta.",
        color: "amber",
      }),
    ],
  };

  const now = Date.now();
  const stickies: Sticky[] = [
    {
      id: uid(),
      surface: "desk",
      kind: "text",
      text: "Menos cosas.\nMás foco.",
      color: "violet",
      x: 120,
      y: 80,
      w: 420,
      h: 160,
      rot: -1,
      z: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      surface: "desk",
      kind: "note",
      text: "Doble click en cualquier lado del escritorio para crear un post-it.",
      color: "amber",
      x: 150,
      y: 300,
      w: 220,
      h: 200,
      rot: -3,
      z: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      surface: "desk",
      kind: "note",
      text: "Arrastrame. Cambiame el color. Tirame a la basura.\n\nEsto es tuyo.",
      color: "pink",
      x: 420,
      y: 340,
      w: 220,
      h: 200,
      rot: 2,
      z: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      surface: "desk",
      kind: "goal",
      text: "Terminar el mes con la cabeza liviana",
      color: "emerald",
      x: 150,
      y: 560,
      w: 320,
      h: 90,
      rot: 0,
      z: 4,
      checked: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      surface: "board",
      kind: "note",
      text: "Los post-its también viven acá.\nMovelos donde quieras.",
      color: "blue",
      x: 1000,
      y: 150,
      w: 200,
      h: 180,
      rot: -2,
      z: 5,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    version: 1,
    columns: [hoy, enCurso, luego],
    cards,
    stickies,
    edges: [],
    camera: { x: 0, y: 0, scale: 1 },
    z: 6,
  };
}

export function emptyState(): AppState {
  return {
    version: 1,
    columns: [
      { id: uid(), title: "Hoy", color: "violet", cardIds: [] },
      { id: uid(), title: "Después", color: "slate", cardIds: [] },
    ],
    cards: {},
    stickies: [],
    edges: [],
    camera: { x: 0, y: 0, scale: 1 },
    z: 1,
  };
}
