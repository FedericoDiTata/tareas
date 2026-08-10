import { ID, SesionFoco, Tarea, TramoFoco } from "./types";

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

/**
 * De qué proyecto es un rato de foco.
 *
 * Mientras la tarea exista manda ella, aunque la hayas movido a la Bandeja
 * después: "sin proyecto" es una respuesta, no la falta de una. La copia que
 * guarda el tramo es el respaldo para cuando la tarea ya no está.
 */
export function proyectoDelTramo(
  tramo: TramoFoco,
  tareas: Record<ID, Tarea>,
): ID | undefined {
  const tarea = tareas[tramo.tareaId];
  return tarea ? tarea.proyectoId : tramo.proyectoId;
}

/** Cuánto llevó cada paso, sumando todos los ratos en que se lo trabajó. */
export function segundosPorPaso(sesiones: SesionFoco[]): Map<ID, number> {
  const mapa = new Map<ID, number>();
  for (const sesion of sesiones) {
    for (const tramo of sesion.tramos) {
      for (const paso of tramo.pasos ?? []) {
        mapa.set(paso.id, (mapa.get(paso.id) ?? 0) + paso.segundos);
      }
    }
  }
  return mapa;
}

/** Las sesiones de un día, de la más vieja a la más nueva. */
export function sesionesDelDia(sesiones: SesionFoco[], dia: string): SesionFoco[] {
  return sesiones.filter((s) => s.dia === dia).sort((a, b) => a.inicio - b.inicio);
}

/** Los días que tuvieron al menos una sesión. */
export function diasConFoco(sesiones: SesionFoco[]): Set<string> {
  return new Set(sesiones.map((s) => s.dia));
}
