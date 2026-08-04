import { ID, SesionFoco, Tarea } from "./types";

/** Cuánto foco acumuló cada tarea, sumando todos los tramos de todas las sesiones. */
export function segundosPorTarea(sesiones: SesionFoco[]): Map<ID, number> {
  const mapa = new Map<ID, number>();
  for (const sesion of sesiones) {
    for (const tramo of sesion.tramos) {
      mapa.set(tramo.tareaId, (mapa.get(tramo.tareaId) ?? 0) + tramo.segundos);
    }
  }
  return mapa;
}

/**
 * El foco de una tarea, en segundos.
 *
 * Las sesiones mandan porque son el registro fino; `minutosDeFoco` queda como
 * respaldo para las tareas de antes de que existiera el registro.
 */
export function focoDeTarea(tarea: Tarea, porTarea: Map<ID, number>): number {
  return porTarea.get(tarea.id) ?? tarea.minutosDeFoco * 60;
}

/** Las sesiones de un día, de la más vieja a la más nueva. */
export function sesionesDelDia(sesiones: SesionFoco[], dia: string): SesionFoco[] {
  return sesiones.filter((s) => s.dia === dia).sort((a, b) => a.inicio - b.inicio);
}

/** Los días que tuvieron al menos una sesión. */
export function diasConFoco(sesiones: SesionFoco[]): Set<string> {
  return new Set(sesiones.map((s) => s.dia));
}
