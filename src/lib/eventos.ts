import { Evento, Tarea } from "./types";
import { ISODate, diferenciaDias, fromISO, largoEnDias, sumarDias } from "./fechas";

/** "18:30" → 1110. */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 1110 → "18:30". */
export function aHora(minutos: number): string {
  const total = Math.max(0, Math.min(24 * 60, Math.round(minutos)));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${`${h}`.padStart(2, "0")}:${`${m}`.padStart(2, "0")}`;
}

/** "18:30 → 20:30" */
export const franja = (evento: Evento) => `${evento.desde} – ${evento.hasta}`;

export const duracionEnMinutos = (evento: Evento) =>
  Math.max(15, aMinutos(evento.hasta) - aMinutos(evento.desde));

/** Si el evento cae ese día: por fecha suelta o por repetición semanal. */
export function caeEn(evento: Evento, dia: ISODate): boolean {
  if (evento.dia) return evento.dia === dia;
  if (evento.diaSemana === undefined) return false;
  if (evento.excepciones?.includes(dia)) return false;
  return fromISO(dia).getDay() === evento.diaSemana;
}

/** Los eventos de un día, del más temprano al más tarde. */
export function eventosDe(eventos: Evento[], dia: ISODate): Evento[] {
  return eventos
    .filter((evento) => caeEn(evento, dia))
    .sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde));
}

export interface Colocado {
  evento: Evento;
  /** Fracciones de 0 a 1 dentro de la columna del día. */
  izquierda: number;
  ancho: number;
}

/**
 * Reparte a lo ancho los eventos que se pisan.
 *
 * Se agrupan las cadenas de solapamiento y dentro de cada grupo cada evento
 * toma la primera "pista" libre, como hace cualquier calendario.
 */
export function repartir(eventos: Evento[]): Colocado[] {
  const colocados: Colocado[] = [];
  let grupo: Evento[] = [];
  let finDelGrupo = -1;

  const cerrar = () => {
    if (grupo.length === 0) return;
    const pistas: number[] = [];
    const dePista = new Map<string, number>();

    for (const evento of grupo) {
      const inicio = aMinutos(evento.desde);
      let pista = pistas.findIndex((fin) => fin <= inicio);
      if (pista < 0) pista = pistas.length;
      pistas[pista] = aMinutos(evento.hasta);
      dePista.set(evento.id, pista);
    }

    const cuantas = pistas.length;
    for (const evento of grupo) {
      const pista = dePista.get(evento.id) ?? 0;
      colocados.push({ evento, izquierda: pista / cuantas, ancho: 1 / cuantas });
    }
    grupo = [];
  };

  for (const evento of eventos) {
    if (grupo.length > 0 && aMinutos(evento.desde) >= finDelGrupo) {
      cerrar();
      finDelGrupo = -1;
    }
    grupo.push(evento);
    finDelGrupo = Math.max(finDelGrupo, aMinutos(evento.hasta));
  }
  cerrar();

  return colocados;
}

/** La franja de horas que hay que dibujar para que entre todo, con aire. */
export function rangoDeHoras(eventos: Evento[]): { desde: number; hasta: number } {
  if (eventos.length === 0) return { desde: 8, hasta: 22 };
  let min = 24 * 60;
  let max = 0;
  for (const evento of eventos) {
    min = Math.min(min, aMinutos(evento.desde));
    max = Math.max(max, aMinutos(evento.hasta));
  }
  return {
    desde: Math.max(0, Math.floor(min / 60) - 1),
    hasta: Math.min(24, Math.ceil(max / 60) + 1),
  };
}

/* ── Tramos de tarea en la grilla del mes ────────────────────────────────── */

export interface Franja {
  tarea: Tarea;
  /** Columna donde arranca dentro de la semana (0–6) y cuántos días ocupa. */
  columna: number;
  ancho: number;
  /** El día concreto en que arranca este pedazo de la franja. */
  desde: ISODate;
  /** Si el tramo viene de la semana anterior o sigue en la siguiente. */
  vieneDeAntes: boolean;
  sigueDespues: boolean;
  carril: number;
}

/**
 * Las franjas de una semana: una barra por tarea de varios días, apiladas en
 * carriles para que no se tapen entre ellas.
 */
export function franjasDeSemana(semana: ISODate[], tareas: Tarea[]): Franja[] {
  const primero = semana[0];
  const ultimo = semana[6];
  const ocupacion: boolean[][] = [];

  const candidatas = tareas
    .filter((tarea) => tarea.vence && tarea.hasta && !tarea.hecha)
    .filter((tarea) => tarea.vence! <= ultimo && tarea.hasta! >= primero)
    .sort((a, b) => {
      if (a.vence !== b.vence) return a.vence! < b.vence! ? -1 : 1;
      // La más larga primero: las barras cortas rellenan los huecos.
      return largoEnDias(b.vence!, b.hasta) - largoEnDias(a.vence!, a.hasta);
    });

  return candidatas.map((tarea) => {
    const inicio = Math.max(0, diferenciaDias(primero, tarea.vence!));
    const fin = Math.min(6, diferenciaDias(primero, tarea.hasta!));
    const ancho = fin - inicio + 1;

    let carril = 0;
    while (true) {
      ocupacion[carril] ??= [];
      const libre = ocupacion[carril].slice(inicio, inicio + ancho).every((v) => !v);
      if (libre) {
        for (let i = inicio; i <= fin; i += 1) ocupacion[carril][i] = true;
        break;
      }
      carril += 1;
    }

    return {
      tarea,
      columna: inicio,
      ancho,
      desde: semana[inicio],
      vieneDeAntes: tarea.vence! < primero,
      sigueDespues: tarea.hasta! > ultimo,
      carril,
    };
  });
}

/** Qué día del tramo agarraste, para que al soltarla no salte al primero. */
export function diaAgarrado(tarea: Tarea, dia: ISODate): number {
  if (!tarea.vence) return 0;
  return Math.max(0, diferenciaDias(tarea.vence, dia));
}

export const corridaDesde = (dia: ISODate, offset: number) => sumarDias(dia, -offset);

/** Los días de la semana con su índice de `Date.getDay()`, para los selectores. */
export const DIAS_LARGOS_INDICE = [
  { nombre: "lunes", indice: 1 },
  { nombre: "martes", indice: 2 },
  { nombre: "miércoles", indice: 3 },
  { nombre: "jueves", indice: 4 },
  { nombre: "viernes", indice: 5 },
  { nombre: "sábados", indice: 6 },
  { nombre: "domingos", indice: 0 },
];
