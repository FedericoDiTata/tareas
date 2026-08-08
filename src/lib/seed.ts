import { Datos, Evento, PostIt, Tarea, nuevaTarea, nuevoEvento, nuevoProyecto, uid } from "./types";
import { hoyISO, sumarDias } from "./fechas";

export function datosVacios(): Datos {
  return {
    version: 3,
    tareas: {},
    proyectos: [],
    secciones: [],
    diario: {},
    postits: [],
    sesiones: [],
    eventos: [],
  };
}

/**
 * El horario fijo de la semana: clases, oficina y terapia.
 *
 * Está acá y no cableado en la app porque es un punto de partida, no una regla:
 * se carga una vez desde la vista Semana y después se edita o se borra como
 * cualquier otro evento.
 */
export function horarioFijo(): Evento[] {
  const clase = (
    diaSemana: number,
    titulo: string,
    desde: string,
    hasta: string,
    color: Evento["color"],
    nota?: string,
  ): Evento => nuevoEvento({ diaSemana, titulo, desde, hasta, color, nota });

  return [
    clase(1, "Terapia", "14:00", "14:50", "emerald", "Presencial o virtual, según cómo venga la semana"),
    clase(1, "Ingeniería de Requisitos", "18:30", "20:30", "violet", "Presencial"),
    clase(2, "Base de Datos I", "18:00", "22:00", "blue", "Presencial"),
    clase(3, "Oficina", "10:00", "17:30", "slate", "Presencial"),
    clase(3, "Ingeniería de Requisitos", "18:30", "20:30", "violet", "Virtual"),
    clase(4, "Oficina", "10:00", "18:00", "slate", "Presencial"),
    clase(
      5,
      "Herramientas Matemáticas",
      "14:00",
      "18:00",
      "cyan",
      "Presencial. Cada 3 semanas cae oficina de 10 a 18 y no voy: salteá ese día desde el evento",
    ),
  ];
}

/** Arranque: pocas tareas, y que se entiendan solas. */
export function datosIniciales(): Datos {
  const personal = nuevoProyecto("Personal", "cyan", 0);
  const trabajo = nuevoProyecto("Trabajo", "violet", 1);

  const tareas: Record<string, Tarea> = {};
  let orden = 0;
  const agregar = (parcial: Partial<Tarea>) => {
    const tarea = nuevaTarea({ ...parcial, orden: orden++ });
    tareas[tarea.id] = tarea;
  };

  agregar({
    titulo: "Probar el modo foco",
    notas:
      "Pasá el mouse por una tarea y apretá el play, o usá la tecla F. La pantalla se vacía y queda sólo esto, con un cronómetro.\n\nCuando terminás, te ofrece la siguiente sin volver a la lista.",
    proyectoId: personal.id,
    prioridad: 1,
    vence: hoyISO(),
    pasos: [
      { id: uid(), texto: "Arrancar una sesión", hecho: false },
      { id: uid(), texto: "Encadenar con la siguiente", hecho: false },
    ],
  });

  agregar({
    titulo: "Escribir una tarea entera en un renglón",
    notas:
      "En el campo de arriba probá: «Llamar al contador mañana p1 #Trabajo».\n\nLa fecha, la prioridad y el proyecto se reconocen solos mientras escribís.",
    proyectoId: personal.id,
    prioridad: 2,
    vence: hoyISO(),
  });

  agregar({
    titulo: "Revisar los proyectos de la izquierda",
    proyectoId: trabajo.id,
    prioridad: 3,
    vence: sumarDias(hoyISO(), 1),
  });

  agregar({
    titulo: "Algo sin fecha ni proyecto vive en la Bandeja",
    prioridad: 4,
  });

  const ahora = Date.now();
  const postits: PostIt[] = [
    {
      id: uid(),
      dia: hoyISO(),
      tipo: "nota",
      texto: "Los papelitos se pegan al día. Escribí lo que quieras acá.",
      color: "amber",
      rot: -2,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ];

  return { ...datosVacios(), tareas, proyectos: [personal, trabajo], postits };
}
