import { ISODate, diferenciaDias, hoyISO, toISO } from "./fechas";

/**
 * Lee un diario escrito en texto plano y lo parte en días.
 *
 * Reconoce encabezados como "Jueves 01/01", "01/01", "1/1/2026" o "12-08-26".
 * Todo lo que viene después de un encabezado pertenece a ese día hasta el
 * encabezado siguiente.
 */

export interface EntradaImportada {
  dia: ISODate;
  texto: string;
}

const DIAS_SEMANA =
  "(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)";

const CABECERA = new RegExp(
  `^\\s*(?:${DIAS_SEMANA}\\s*,?\\s*)?(\\d{1,2})[/\\-.](\\d{1,2})(?:[/\\-.](\\d{2,4}))?\\s*$`,
  "i",
);

/** Las líneas de guiones que separan secciones no son de ningún día. */
const SEPARADOR = /^\s*-{3,}.*-{3,}\s*$/;

const AÑO_DEL_TITULO = /\bdiario\s+(\d{4})\b/i;

export function parsearDiario(texto: string): EntradaImportada[] {
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n");
  const anioPorDefecto = Number(texto.match(AÑO_DEL_TITULO)?.[1]) || new Date().getFullYear();

  const entradas: EntradaImportada[] = [];
  let actual: { dia: ISODate; lineas: string[] } | null = null;

  const cerrar = () => {
    if (!actual) return;
    const cuerpo = actual.lineas.join("\n").trim();
    if (cuerpo) entradas.push({ dia: actual.dia, texto: cuerpo });
    actual = null;
  };

  for (const linea of lineas) {
    if (SEPARADOR.test(linea)) continue;

    const encabezado = linea.match(CABECERA);
    if (encabezado) {
      cerrar();
      const dia = resolverFecha(
        Number(encabezado[1]),
        Number(encabezado[2]),
        encabezado[3],
        anioPorDefecto,
      );
      if (dia) actual = { dia, lineas: [] };
      continue;
    }

    if (actual) actual.lineas.push(linea);
  }
  cerrar();

  return entradas;
}

function resolverFecha(
  dia: number,
  mes: number,
  anioTexto: string | undefined,
  anioPorDefecto: number,
): ISODate | null {
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  let anio = anioPorDefecto;
  if (anioTexto) {
    const numero = Number(anioTexto);
    anio = anioTexto.length === 2 ? 2000 + numero : numero;
  }

  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getDate() !== dia || fecha.getMonth() !== mes - 1) return null;

  const iso = toISO(fecha);
  // Un diario no habla del futuro: si cae adelante, era del año pasado.
  if (!anioTexto && diferenciaDias(hoyISO(), iso) > 7) {
    return toISO(new Date(anio - 1, mes - 1, dia));
  }
  return iso;
}
