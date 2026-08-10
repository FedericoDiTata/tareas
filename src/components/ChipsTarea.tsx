"use client";

import { CalendarIcon, FileIcon, ImageIcon, LinkIcon, ListIcon, Reloj } from "./Icons";
import { useDatos } from "@/lib/store";
import { ETIQUETA_TAREA, Tarea } from "@/lib/types";
import { cuandoRango } from "@/lib/fechas";
import { cn } from "@/lib/ui";

/**
 * El punto de color de la tarea: cuánto pide.
 *
 * Va también en los registros —el diario, lo completado— porque leer "esto me
 * llevó una hora" junto con "esto lo había marcado como rapidito" es la mitad
 * de la información.
 */
export function PuntoDeTarea({ tarea, className }: { tarea: Tarea; className?: string }) {
  if (!tarea.color) {
    return (
      <span
        title="Sin color"
        className={cn(
          "inline-block h-[7px] w-[7px] shrink-0 rounded-full border border-dashed border-line-strong",
          className,
        )}
      />
    );
  }
  return (
    <span className={`tone-${tarea.color} inline-flex shrink-0`}>
      <span
        title={ETIQUETA_TAREA[tarea.color]}
        className={cn("h-[7px] w-[7px] rounded-full", className)}
        style={{ background: "rgb(var(--tone))" }}
      />
    </span>
  );
}

/**
 * Todo lo que la tarjeta lleva encima, en chips chiquitos: la fecha, los pasos,
 * las imágenes, los archivos, los links y los bloques que le reservaste en el
 * calendario. Es el mismo resumen en la lista, en el diario y en lo completado.
 */
export function ChipsTarea({ tarea, ocultarFecha }: { tarea: Tarea; ocultarFecha?: boolean }) {
  const { datos } = useDatos();

  const pasos = tarea.pasos.length;
  const hechos = tarea.pasos.filter((paso) => paso.hecho).length;
  const bloques = datos.eventos.filter((evento) => evento.tareaId === tarea.id).length;

  const chips: Array<{ clave: string; icono: React.ReactNode; texto: string; titulo: string }> = [];

  if (!ocultarFecha && tarea.vence) {
    chips.push({
      clave: "fecha",
      icono: <CalendarIcon width={11} height={11} />,
      texto: cuandoRango(tarea.vence, tarea.hasta),
      titulo: "Fecha",
    });
  }
  if (pasos > 0) {
    chips.push({
      clave: "pasos",
      icono: <ListIcon width={11} height={11} />,
      texto: `${hechos}/${pasos}`,
      titulo: "Pasos",
    });
  }
  if (bloques > 0) {
    chips.push({
      clave: "calendario",
      icono: <Reloj width={11} height={11} />,
      texto: `${bloques}`,
      titulo: bloques === 1 ? "Un bloque en el calendario" : `${bloques} bloques en el calendario`,
    });
  }
  if (tarea.imagenes.length > 0) {
    chips.push({
      clave: "imagenes",
      icono: <ImageIcon width={11} height={11} />,
      texto: `${tarea.imagenes.length}`,
      titulo: "Imágenes",
    });
  }
  if (tarea.archivos.length > 0) {
    chips.push({
      clave: "archivos",
      icono: <FileIcon width={11} height={11} />,
      texto: `${tarea.archivos.length}`,
      titulo: "Archivos",
    });
  }
  if (tarea.links.length > 0) {
    chips.push({
      clave: "links",
      icono: <LinkIcon width={11} height={11} />,
      texto: `${tarea.links.length}`,
      titulo: "Links",
    });
  }

  if (chips.length === 0) return null;

  return (
    <>
      {chips.map((chip) => (
        <span
          key={chip.clave}
          title={chip.titulo}
          className="inline-flex shrink-0 items-center gap-1 text-ink-faint"
        >
          {chip.icono}
          {chip.texto}
        </span>
      ))}
    </>
  );
}
