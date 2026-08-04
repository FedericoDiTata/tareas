"use client";

import { useMemo } from "react";
import { Check, Play } from "./Icons";
import { useDatos } from "@/lib/store";
import { ID, PRIORIDAD_COLOR, Tarea } from "@/lib/types";
import { focoDeTarea, segundosPorTarea } from "@/lib/foco";
import { cuando, duracion, fechaCorta, hora, toISO } from "@/lib/fechas";
import { cn } from "@/lib/ui";

interface Props {
  /** Sin proyecto = lo completado de la Bandeja. */
  proyectoId?: ID;
  onAbrir: (id: string) => void;
}

/**
 * Lo terminado, por día: qué era, en qué sección estaba y cuánto foco se le puso.
 *
 * Vive adentro del proyecto y no en una vista aparte porque "qué hice acá" es
 * una pregunta sobre el proyecto, no sobre la app.
 */
export function Hechas({ proyectoId, onAbrir }: Props) {
  const { datos, reabrir } = useDatos();

  const porTarea = useMemo(() => segundosPorTarea(datos.sesiones), [datos.sesiones]);

  const nombreSeccion = useMemo(() => {
    const mapa = new Map<ID, string>();
    datos.secciones.forEach((seccion) => mapa.set(seccion.id, seccion.nombre));
    return mapa;
  }, [datos.secciones]);

  /** El foco de este proyecto por día, sacado de los tramos de cada sesión. */
  const focoPorDia = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const sesion of datos.sesiones) {
      for (const tramo of sesion.tramos) {
        if (tramo.proyectoId !== proyectoId) continue;
        mapa.set(sesion.dia, (mapa.get(sesion.dia) ?? 0) + tramo.segundos);
      }
    }
    return mapa;
  }, [datos.sesiones, proyectoId]);

  const porDia = useMemo(() => {
    const hechas = Object.values(datos.tareas).filter(
      (t) => t.hecha && t.terminadaEn && t.proyectoId === proyectoId,
    );
    const grupos = new Map<string, Tarea[]>();
    for (const tarea of hechas) {
      const dia = toISO(new Date(tarea.terminadaEn!));
      grupos.set(dia, [...(grupos.get(dia) ?? []), tarea]);
    }
    for (const lista of grupos.values()) {
      lista.sort((a, b) => (b.terminadaEn ?? 0) - (a.terminadaEn ?? 0));
    }
    return [...grupos.entries()].sort((a, b) => (a[0] > b[0] ? -1 : 1)).slice(0, 40);
  }, [datos.tareas, proyectoId]);

  const total = porDia.reduce((suma, [, lista]) => suma + lista.length, 0);
  const focoTotal = porDia.reduce((suma, [dia]) => suma + (focoPorDia.get(dia) ?? 0), 0);

  if (total === 0) {
    return (
      <div className="mt-10 text-center">
        <p className="text-[15px] text-ink-soft">Todavía no completaste nada acá</p>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-faint">
          Cuando termines una tarea va a quedar en esta lista con el día
          {proyectoId ? ", la sección" : ""} y el tiempo de foco que le pusiste.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-[13px] text-ink-faint">
        {total} {total === 1 ? "tarea terminada" : "tareas terminadas"}
        {focoTotal > 0 && ` · ${duracion(focoTotal)} de foco`}
      </p>

      {porDia.map(([dia, lista]) => {
        const foco = focoPorDia.get(dia) ?? 0;
        return (
          <section key={dia} className="mb-7">
            <div className="mb-1 flex items-baseline gap-2 border-b border-line pb-1.5">
              <h2 className="text-[16px] font-medium text-titulo">
                {cuando(dia).replace(/^./, (c) => c.toUpperCase())}
              </h2>
              <span className="text-[12px] text-ink-faint">{fechaCorta(dia)}</span>
              <span className="ml-auto flex items-center gap-2 text-[12px] text-ink-faint">
                <span>
                  {lista.length} {lista.length === 1 ? "tarea" : "tareas"}
                </span>
                {foco > 0 && (
                  <span className="flex items-center gap-1 text-ink-soft">
                    <Play width={10} height={10} />
                    {duracion(foco)}
                  </span>
                )}
              </span>
            </div>

            {lista.map((tarea) => {
              const seccion = tarea.seccionId ? nombreSeccion.get(tarea.seccionId) : undefined;
              const suFoco = focoDeTarea(tarea, porTarea);
              return (
                <div
                  key={tarea.id}
                  className="group flex items-center gap-3 border-b border-line/60 py-2.5 pr-1 pl-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <button
                    onClick={() => reabrir(tarea.id)}
                    title="Volver a abrirla"
                    className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] text-white transition-transform hover:scale-110"
                    style={{
                      borderColor: PRIORIDAD_COLOR[tarea.prioridad],
                      background: PRIORIDAD_COLOR[tarea.prioridad],
                    }}
                  >
                    <Check width={11} height={11} strokeWidth={3.5} />
                  </button>

                  <button
                    onClick={() => onAbrir(tarea.id)}
                    className="min-w-0 flex-1 truncate text-left text-[14.5px] text-ink-soft"
                  >
                    {tarea.titulo || "Sin título"}
                  </button>

                  <div className="flex shrink-0 items-center gap-2.5 text-[11.5px] text-ink-faint">
                    {proyectoId && (
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-px",
                          seccion
                            ? "border border-line-strong text-ink-soft"
                            : "border border-dashed border-line-strong",
                        )}
                      >
                        {seccion ?? "Backlog"}
                      </span>
                    )}
                    {suFoco > 0 && <span className="tabular-nums">{duracion(suFoco)}</span>}
                    <span className="w-10 text-right tabular-nums">
                      {hora(tarea.terminadaEn!)}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
