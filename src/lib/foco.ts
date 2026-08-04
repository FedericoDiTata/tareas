import { Cosa, Estanteria, MAX_CLAVES } from "./types";
import { ISODate, diferenciaDias, fechaCorta, nombreDiaSemana, toISO } from "./fechas";

/**
 * El motor de foco.
 *
 * La idea de fondo: el problema no es guardar cosas, es elegir. Así que acá se
 * calcula el criterio que falta a las 9 de la mañana. Cada cosa saca un puntaje
 * y, más importante, un motivo en una línea: un ranking que no se puede explicar
 * genera desconfianza, y la desconfianza genera que abras la app y no le creas.
 */

export interface Contexto {
  hoy: ISODate;
  /** Día de poca cabeza: el motor prefiere lo corto. */
  pocaCabeza: boolean;
}

export interface Puntaje {
  cosa: Cosa;
  puntos: number;
  /** Por qué está arriba, en las palabras que usarías vos. */
  motivo: string;
  /** true si el motivo es una fecha que ya pasó (se muestra distinto, sin rojo). */
  atrasada: boolean;
}

interface Termino {
  puntos: number;
  motivo?: string;
  /** Sólo los términos positivos compiten por explicar el puntaje. */
  prioridadDelMotivo?: number;
}

const DIA = 86_400_000;

const diasDesde = (marca: number, hoy: ISODate) => diferenciaDias(toISO(new Date(marca)), hoy);

/** Saltos en días distintos dentro de la última quincena. */
function saltosRecientes(cosa: Cosa, hoy: ISODate): number {
  const limite = new Date(Date.now() - 14 * DIA);
  return new Set(cosa.saltos.filter((dia) => dia >= toISO(limite))).size;
}

/**
 * Una cosa que salteaste cuatro veces en días distintos y no tiene fecha te está
 * diciendo algo. La app deja de ofrecerla y pregunta una sola vez si sigue viva.
 * Es la regla que evita que el sistema te repita lo mismo hasta hacerte sentir
 * en falta.
 */
export function estaDormida(cosa: Cosa, hoy: ISODate): boolean {
  if (cosa.vence) return false;
  return new Set(cosa.saltos).size >= 4 && saltosRecientes(cosa, hoy) >= 2;
}

export function puntuar(cosa: Cosa, ctx: Contexto): Puntaje | null {
  if (cosa.estado !== "activa" || cosa.enBandeja) return null;
  if (estaDormida(cosa, ctx.hoy)) return null;

  const terminos: Termino[] = [];

  // Vos mandás sobre el motor, siempre.
  if (cosa.fijadaEn === ctx.hoy) {
    terminos.push({ puntos: 1000, motivo: "la fijaste vos", prioridadDelMotivo: 100 });
  }

  if (cosa.vence) {
    const dias = diferenciaDias(ctx.hoy, cosa.vence);
    if (dias < 0) {
      terminos.push({
        puntos: 40,
        motivo: `era para el ${fechaCorta(cosa.vence)}`,
        prioridadDelMotivo: 80,
      });
    } else if (dias === 0) {
      terminos.push({ puntos: 55, motivo: "vence hoy", prioridadDelMotivo: 90 });
    } else if (dias === 1) {
      terminos.push({ puntos: 50, motivo: "vence mañana", prioridadDelMotivo: 88 });
    } else if (dias <= 3) {
      terminos.push({
        puntos: 30,
        motivo: `vence en ${dias} días`,
        prioridadDelMotivo: 70,
      });
    } else if (dias <= 7) {
      terminos.push({
        puntos: 15,
        motivo: `vence el ${nombreDiaSemana(cosa.vence)}`,
        prioridadDelMotivo: 50,
      });
    }
  }

  if (cosa.clave) {
    terminos.push({
      puntos: 25,
      motivo: "la elegiste para esta semana",
      prioridadDelMotivo: 40,
    });
  }

  // Terminar lo empezado pesa más que abrir un frente nuevo.
  const enMarcha = cosa.pasos.some((paso) => paso.hecho) || Boolean(cosa.empezadaEn);
  if (enMarcha) {
    terminos.push({ puntos: 15, motivo: "la dejaste a medias", prioridadDelMotivo: 60 });
  }

  // "Si hace muchos días que ignoro algo importante, recordámelo."
  const sinTocar = diasDesde(cosa.tocadaEn, ctx.hoy);
  if (cosa.clave && sinTocar >= 4) {
    terminos.push({
      puntos: 12,
      motivo: `hace ${sinTocar} días que no la tocás`,
      prioridadDelMotivo: 65,
    });
  }

  // Hoy ya dijiste que no. No insisto hoy.
  const saltosHoy = cosa.saltos.filter((dia) => dia === ctx.hoy).length;
  if (saltosHoy > 0) terminos.push({ puntos: -30 * saltosHoy });

  const previos = saltosRecientes(cosa, ctx.hoy);
  if (previos > 0) terminos.push({ puntos: -Math.min(15, previos * 3) });

  if (ctx.pocaCabeza) {
    terminos.push(
      cosa.corta
        ? { puntos: 20, motivo: "es corta y hoy estás con poca cabeza", prioridadDelMotivo: 75 }
        : { puntos: -15 },
    );
  }

  const puntos = terminos.reduce((total, t) => total + t.puntos, 0);

  const explicacion = terminos
    .filter((t) => t.motivo && t.puntos > 0)
    .sort((a, b) => (b.prioridadDelMotivo ?? 0) - (a.prioridadDelMotivo ?? 0))[0];

  return {
    cosa,
    puntos,
    motivo: explicacion?.motivo ?? "no hay nada más urgente",
    atrasada: Boolean(cosa.vence && diferenciaDias(ctx.hoy, cosa.vence) < 0),
  };
}

export function ranking(cosas: Cosa[], ctx: Contexto): Puntaje[] {
  return cosas
    .map((cosa) => puntuar(cosa, ctx))
    .filter((p): p is Puntaje => p !== null)
    .sort((a, b) => b.puntos - a.puntos || b.cosa.tocadaEn - a.cosa.tocadaEn);
}

export function elegirAhora(cosas: Cosa[], ctx: Contexto): Puntaje | null {
  return ranking(cosas, ctx)[0] ?? null;
}

/* ── Cuándo conviene revisar ─────────────────────────────────────────────── */

export interface Pendientes {
  bandeja: Cosa[];
  dormidas: Cosa[];
  /** Candidatas a clave cuando la semana quedó corta. */
  sugeridas: Cosa[];
  /** La semana venció: pasaron siete días de la última revisión. */
  semanaVencida: boolean;
}

export function pendientes(estado: Estanteria, ctx: Contexto): Pendientes {
  const activas = Object.values(estado.cosas).filter((cosa) => cosa.estado === "activa");

  const bandeja = activas
    .filter((cosa) => cosa.enBandeja)
    .sort((a, b) => a.creadaEn - b.creadaEn);

  const dormidas = activas.filter(
    (cosa) => !cosa.enBandeja && estaDormida(cosa, ctx.hoy),
  );

  const claves = activas.filter((cosa) => cosa.clave && !cosa.enBandeja);

  const sugeridas =
    claves.length >= MAX_CLAVES
      ? []
      : ranking(
          activas.filter((cosa) => !cosa.clave && !cosa.enBandeja),
          ctx,
        )
          .slice(0, MAX_CLAVES - claves.length)
          .map((p) => p.cosa);

  const semanaVencida = estado.ultimaRevision
    ? diferenciaDias(estado.ultimaRevision, ctx.hoy) >= 7
    : true;

  return { bandeja, dormidas, sugeridas, semanaVencida };
}

/**
 * La revisión aparece sola cuando hace falta, nunca porque sí: si te la ofrece
 * todos los días se convierte en la tarea que no querías tener.
 */
export function conviene(p: Pendientes, hayClaves: boolean): boolean {
  if (p.dormidas.length > 0) return true;
  if (p.bandeja.length >= 3) return true;
  if (!hayClaves && (p.bandeja.length > 0 || p.sugeridas.length > 0)) return true;
  return p.semanaVencida && (p.bandeja.length > 0 || p.sugeridas.length > 0);
}
