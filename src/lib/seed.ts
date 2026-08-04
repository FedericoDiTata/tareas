import { Datos, PostIt, Tarea, nuevaTarea, nuevoProyecto, uid } from "./types";
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
  };
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
