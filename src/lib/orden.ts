import { Tarea } from "./types";
import { ISODate, diferenciaDias, hoyISO, largoEnDias, sumarDias } from "./fechas";

/**
 * Cómo se ordena una lista. Sin puntajes ni cálculos escondidos: primero lo
 * atrasado, después por prioridad, después por fecha y al final el orden manual.
 * La razón se ve sola en la fila (la fecha y el color de la prioridad están ahí),
 * así que no hace falta que la app te explique nada.
 */
export function ordenar(tareas: Tarea[]): Tarea[] {
  const hoy = hoyISO();
  return [...tareas].sort((a, b) => {
    const atrasadaA = estaAtrasada(a, hoy) ? 0 : 1;
    const atrasadaB = estaAtrasada(b, hoy) ? 0 : 1;
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

/** El último día que ocupa: el final del tramo, o el único día que tiene. */
export const finDe = (tarea: Tarea): ISODate | undefined => tarea.hasta ?? tarea.vence;

/** Si la tarea ocupa ese día, tramo incluido. */
export const cubre = (tarea: Tarea, dia: ISODate): boolean =>
  Boolean(tarea.vence && tarea.vence <= dia && (finDe(tarea) as string) >= dia);

/** Atrasada recién cuando pasó el último día: un tramo en curso no lo está. */
export const estaAtrasada = (tarea: Tarea, hoy: ISODate = hoyISO()) =>
  Boolean(tarea.vence && (finDe(tarea) as string) < hoy && !tarea.hecha);

export const esDeHoy = (tarea: Tarea, hoy: ISODate = hoyISO()) =>
  Boolean(tarea.vence && cubre(tarea, hoy));

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
    // Un tramo se ve en cada uno de sus días, no sólo en el primero.
    const largo = largoEnDias(tarea.vence, tarea.hasta);
    for (let i = 0; i < largo; i += 1) {
      const dia = sumarDias(tarea.vence, i);
      const distancia = diferenciaDias(hoy, dia);
      if (distancia < 0 || distancia > dias) continue;
      grupos.set(dia, [...(grupos.get(dia) ?? []), tarea]);
    }
  }

  return [...grupos.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([dia, lista]) => [dia, ordenar(lista)] as [ISODate, Tarea[]]);
}
