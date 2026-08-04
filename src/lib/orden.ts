import { Tarea } from "./types";
import { ISODate, diferenciaDias, hoyISO } from "./fechas";

/**
 * Cómo se ordena una lista. Sin puntajes ni cálculos escondidos: primero lo
 * atrasado, después por prioridad, después por fecha y al final el orden manual.
 * La razón se ve sola en la fila (la fecha y el color de la prioridad están ahí),
 * así que no hace falta que la app te explique nada.
 */
export function ordenar(tareas: Tarea[]): Tarea[] {
  const hoy = hoyISO();
  return [...tareas].sort((a, b) => {
    const atrasadaA = a.vence && a.vence < hoy ? 0 : 1;
    const atrasadaB = b.vence && b.vence < hoy ? 0 : 1;
    if (atrasadaA !== atrasadaB) return atrasadaA - atrasadaB;

    if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;

    if (a.vence !== b.vence) {
      if (!a.vence) return 1;
      if (!b.vence) return -1;
      return a.vence < b.vence ? -1 : 1;
    }

    return a.orden - b.orden;
  });
}

export const estaAtrasada = (tarea: Tarea, hoy: ISODate = hoyISO()) =>
  Boolean(tarea.vence && tarea.vence < hoy && !tarea.hecha);

export const esDeHoy = (tarea: Tarea, hoy: ISODate = hoyISO()) => tarea.vence === hoy;

/** Lo que corresponde hacer hoy: lo de hoy más lo que quedó atrás. */
export function deHoy(tareas: Tarea[]): Tarea[] {
  const hoy = hoyISO();
  return ordenar(
    tareas.filter((tarea) => !tarea.hecha && tarea.vence && tarea.vence <= hoy),
  );
}

export function proximos(tareas: Tarea[], dias = 14): Array<[ISODate, Tarea[]]> {
  const hoy = hoyISO();
  const grupos = new Map<ISODate, Tarea[]>();

  for (const tarea of tareas) {
    if (tarea.hecha || !tarea.vence) continue;
    const distancia = diferenciaDias(hoy, tarea.vence);
    if (distancia < 0 || distancia > dias) continue;
    grupos.set(tarea.vence, [...(grupos.get(tarea.vence) ?? []), tarea]);
  }

  return [...grupos.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([dia, lista]) => [dia, ordenar(lista)] as [ISODate, Tarea[]]);
}
