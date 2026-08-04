import { Cosa, Estanteria, PostIt, nuevaCosa, uid } from "./types";

export function estanteriaVacia(): Estanteria {
  return {
    version: 2,
    cosas: {},
    orden: [],
    postits: [],
    uniones: [],
    camara: { x: 0, y: 0, scale: 1 },
    z: 1,
  };
}

/**
 * El primer arranque enseña el sistema usándolo, no explicándolo: tres cosas,
 * una elegida para la semana. Nada de tableros de ejemplo llenos de tarjetas —
 * abrir la app y encontrarse quince cosas ajenas es justo lo contrario.
 */
export function estanteriaInicial(): Estanteria {
  const ahora = Date.now();
  const cosas: Record<string, Cosa> = {};
  const orden: string[] = [];

  const agregar = (parcial: Partial<Cosa>) => {
    const cosa = nuevaCosa(parcial);
    cosas[cosa.id] = cosa;
    orden.push(cosa.id);
    return cosa.id;
  };

  agregar({
    titulo: "Probar cómo se siente esto",
    notas:
      "Esta pantalla te muestra una sola cosa a la vez y te dice por qué esa.\n\nSi no es el momento, tocá «Ahora no» y te propone otra. No pasa nada: decir que no es información, no es una falta.",
    clave: true,
    enBandeja: false,
    corta: true,
    color: "violet",
    pasos: [
      { id: uid(), texto: "Apretar Empezar y ver el modo foco", hecho: false },
      { id: uid(), texto: "Capturar algo que tengas en la cabeza", hecho: false },
    ],
  });

  agregar({
    titulo: "Tirar acá todo lo que tengas dando vueltas",
    notas:
      "Capturar no es organizar. Escribís, se guarda en la bandeja y seguís con lo tuyo.\n\nDespués, una vez por semana, la app te va a hacer unas pocas preguntas para saber qué importa. Ese es todo el trabajo de organización que tiene este sistema.",
    enBandeja: false,
    color: "blue",
  });

  agregar({
    titulo: "Algo que puede esperar tranquilo",
    notas:
      "Esto vive en «El resto». Existe, está guardado, no lo vas a perder — pero no te lo voy a poner adelante hasta que tenga sentido.",
    enBandeja: false,
    color: "slate",
  });

  const postits: PostIt[] = [
    {
      id: uid(),
      tipo: "texto",
      texto: "Una cosa\na la vez.",
      color: "violet",
      x: 120,
      y: 100,
      w: 420,
      h: 160,
      rot: -1,
      z: 1,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: uid(),
      tipo: "nota",
      texto: "Doble click en cualquier lado para pegar un papelito.",
      color: "amber",
      x: 150,
      y: 320,
      w: 220,
      h: 190,
      rot: -3,
      z: 2,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ];

  return { ...estanteriaVacia(), cosas, orden, postits };
}
