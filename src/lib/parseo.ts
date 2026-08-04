import { ISODate, hoyISO, sumarDias, toISO } from "./fechas";

/**
 * Escribir una tarea entera en un solo renglón.
 *
 * "Llamar al contador mañana p1 #Trabajo" sale con fecha, prioridad y proyecto
 * ya puestos. Es la diferencia entre anotar en dos segundos o abrir un
 * formulario: lo segundo es exactamente donde se muere una idea.
 */

export interface Parseo {
  titulo: string;
  vence?: ISODate;
  prioridad?: 1 | 2 | 3 | 4;
  proyecto?: string;
  /** Los pedazos que se reconocieron, para mostrarlos como chips. */
  chips: Array<{ tipo: "fecha" | "prioridad" | "proyecto"; texto: string }>;
}

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  "miércoles": 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  "sábado": 6,
};

const sinAcentos = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Próxima vez que caiga ese día de la semana (hoy no cuenta). */
function proximoDia(objetivo: number): ISODate {
  const hoy = new Date();
  const actual = hoy.getDay();
  let faltan = (objetivo - actual + 7) % 7;
  if (faltan === 0) faltan = 7;
  return sumarDias(hoyISO(), faltan);
}

function fechaDeNumeros(dia: number, mes?: number, anio?: number): ISODate | null {
  const hoy = new Date();
  const m = mes !== undefined ? mes - 1 : hoy.getMonth();
  const a = anio ?? hoy.getFullYear();
  const fecha = new Date(a, m, dia);
  if (fecha.getDate() !== dia || fecha.getMonth() !== m) return null;

  // "el 3" con el 3 ya pasado quiere decir el mes que viene.
  if (mes === undefined && anio === undefined && toISO(fecha) < hoyISO()) {
    return toISO(new Date(a, m + 1, dia));
  }
  return toISO(fecha);
}

export function parsear(entrada: string): Parseo {
  let texto = ` ${entrada} `;
  const chips: Parseo["chips"] = [];
  let vence: ISODate | undefined;
  let prioridad: Parseo["prioridad"];
  let proyecto: string | undefined;

  const comer = (patron: RegExp, alEncontrar: (m: RegExpMatchArray) => boolean) => {
    const match = texto.match(patron);
    if (!match) return;
    if (alEncontrar(match)) texto = texto.replace(patron, " ");
  };

  // Proyecto: #loquesea
  comer(/\s#([\p{L}\p{N}_-]+)/u, (m) => {
    proyecto = m[1];
    chips.push({ tipo: "proyecto", texto: `#${m[1]}` });
    return true;
  });

  // Prioridad: p1 · !1
  comer(/\s[p!]([1-4])\b/i, (m) => {
    prioridad = Number(m[1]) as 1 | 2 | 3 | 4;
    chips.push({ tipo: "prioridad", texto: `P${m[1]}` });
    return true;
  });

  const conFecha = (iso: ISODate, etiqueta: string) => {
    vence = iso;
    chips.push({ tipo: "fecha", texto: etiqueta });
    return true;
  };

  // Fechas, de la expresión más específica a la más suelta
  if (!vence) comer(/\spasado\s+ma(?:ñ|n)ana\b/iu, () => conFecha(sumarDias(hoyISO(), 2), "pasado mañana"));
  if (!vence) comer(/\sma(?:ñ|n)ana\b/iu, () => conFecha(sumarDias(hoyISO(), 1), "mañana"));
  if (!vence) comer(/\shoy\b/i, () => conFecha(hoyISO(), "hoy"));
  if (!vence) comer(/\s(?:la\s+)?pr(?:ó|o)xima\s+semana\b/iu, () => conFecha(proximoDia(1), "la semana que viene"));
  if (!vence) comer(/\s(?:el\s+)?fin\s+de\s+semana\b/i, () => conFecha(proximoDia(6), "el fin de semana"));

  if (!vence)
    comer(/\sen\s+(\d+)\s+d(?:í|i)as?\b/iu, (m) =>
      conFecha(sumarDias(hoyISO(), Number(m[1])), `en ${m[1]} días`),
    );

  if (!vence)
    comer(/\sen\s+(?:(\d+)\s+)?semanas?\b/i, (m) => {
      const semanas = Number(m[1] ?? 1);
      return conFecha(sumarDias(hoyISO(), semanas * 7), `en ${semanas} semana${semanas > 1 ? "s" : ""}`);
    });

  if (!vence)
    comer(/\s(?:el\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/, (m) => {
      const anio = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined;
      const iso = fechaDeNumeros(Number(m[1]), Number(m[2]), anio);
      return iso ? conFecha(iso, `${m[1]}/${m[2]}`) : false;
    });

  if (!vence) {
    const dia = Object.keys(DIAS_SEMANA).find((nombre) =>
      new RegExp(`\\s(?:el\\s+)?${nombre}\\b`, "i").test(sinAcentos(texto)),
    );
    if (dia) {
      const patron = new RegExp(`\\s(?:el\\s+)?${dia}\\b`, "i");
      const contra = sinAcentos(texto).match(patron);
      if (contra) {
        const iso = proximoDia(DIAS_SEMANA[dia]);
        // El texto original tiene acentos; se corta por posición.
        const desde = contra.index ?? 0;
        texto = texto.slice(0, desde) + " " + texto.slice(desde + contra[0].length);
        conFecha(iso, dia);
      }
    }
  }

  if (!vence)
    comer(/\sel\s+(\d{1,2})\b/, (m) => {
      const iso = fechaDeNumeros(Number(m[1]));
      return iso ? conFecha(iso, `el ${m[1]}`) : false;
    });

  return {
    titulo: texto.replace(/\s+/g, " ").trim(),
    vence,
    prioridad,
    proyecto,
    chips,
  };
}
