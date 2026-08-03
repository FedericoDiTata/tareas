/**
 * Fechas como texto "AAAA-MM-DD" y nada más.
 *
 * Por qué no Date directo: `new Date("2026-08-03")` se lee como UTC y en
 * Argentina eso cae el 2 a las 21:00, así que un día se corre solo. Todo lo que
 * entra y sale de acá es local.
 */

export type ISODate = string;

export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function toISO(date: Date): ISODate {
  const mes = `${date.getMonth() + 1}`.padStart(2, "0");
  const dia = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${mes}-${dia}`;
}

export function fromISO(iso: ISODate): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export const hoyISO = (): ISODate => toISO(new Date());

export function sumarDias(iso: ISODate, dias: number): ISODate {
  const date = fromISO(iso);
  date.setDate(date.getDate() + dias);
  return toISO(date);
}

/** Días entre dos fechas (b − a). Positivo si b es posterior. */
export function diferenciaDias(a: ISODate, b: ISODate): number {
  const ms = fromISO(b).getTime() - fromISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

export const esHoy = (iso: ISODate): boolean => iso === hoyISO();

export const esPasado = (iso: ISODate): boolean => iso < hoyISO();

/** Lunes de la semana de esa fecha: acá la semana arranca el lunes. */
export function inicioSemana(date: Date): Date {
  const copia = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dia = (copia.getDay() + 6) % 7;
  copia.setDate(copia.getDate() - dia);
  return copia;
}

/** Las semanas completas que hacen falta para dibujar un mes. */
export function grillaDelMes(year: number, month: number): ISODate[][] {
  const primero = new Date(year, month, 1);
  const ultimo = new Date(year, month + 1, 0);

  const semanas: ISODate[][] = [];
  const cursor = inicioSemana(primero);

  while (cursor <= ultimo || semanas.length === 0) {
    const semana: ISODate[] = [];
    for (let i = 0; i < 7; i += 1) {
      semana.push(toISO(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(semana);
    if (semanas.length > 6) break;
  }

  return semanas;
}

export function nombreMes(year: number, month: number): string {
  return `${MESES[month]} ${year}`;
}

export const numeroDia = (iso: ISODate): number => fromISO(iso).getDate();

export const mesDe = (iso: ISODate): number => fromISO(iso).getMonth();

/** "5 ago" · si es de este año no repite el año. */
export function fechaCorta(iso: ISODate): string {
  const date = fromISO(iso);
  const base = `${date.getDate()} ${MESES_CORTOS[date.getMonth()]}`;
  return date.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} ${date.getFullYear()}`;
}

/** Cómo se lee un tramo: "5 ago", "5 → 8 ago", "hoy". */
export function rango(desde: ISODate, hasta?: string): string {
  if (!hasta || hasta === desde) return esHoy(desde) ? "hoy" : fechaCorta(desde);
  return `${fechaCorta(desde)} → ${fechaCorta(hasta)}`;
}

/** Los días que ocupa una tarjeta, extremos incluidos. */
export function largoEnDias(desde: ISODate, hasta?: string): number {
  if (!hasta || hasta === desde) return 1;
  return Math.max(1, diferenciaDias(desde, hasta) + 1);
}
