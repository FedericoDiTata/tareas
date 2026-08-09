"use client";

import { useMemo, useState } from "react";
import { Check, Play, Undo } from "./Icons";
import { useDatos } from "@/lib/store";
import { ID, Tarea } from "@/lib/types";
import { focoDeTarea, segundosPorTarea } from "@/lib/foco";
import { cuando, duracion, fechaCorta, hora, toISO } from "@/lib/fechas";
import { cn } from "@/lib/ui";

interface Props {
  /** Sin proyecto = lo completado de la Bandeja. */
  proyectoId?: ID;
  onAbrir: (id: string) => void;
}

/** Clave del filtro para lo que nunca tuvo sección. */
const BACKLOG = "backlog";

/**
 * Lo terminado, por día: qué era, en qué sección estaba y cuánto foco se le puso.
 *
 * Vive adentro del proyecto y no en una vista aparte porque "qué hice acá" es
 * una pregunta sobre el proyecto, no sobre la app. Y se puede filtrar por
 * sección, que es como se lee de verdad: "qué hice con este cliente", "qué hice
 * en esta materia".
 */
export function Hechas({ proyectoId, onAbrir }: Props) {
  const { datos, reabrir, reabrirSeccion } = useDatos();
  const [filtro, setFiltro] = useState<string | null>(null);

  const porTarea = useMemo(() => segundosPorTarea(datos.sesiones), [datos.sesiones]);

  const secciones = useMemo(
    () =>
      datos.secciones
        .filter((s) => s.proyectoId === proyectoId)
        .sort((a, b) => a.orden - b.orden),
    [datos.secciones, proyectoId],
  );

  const nombreSeccion = useMemo(() => {
    const mapa = new Map<ID, string>();
    datos.secciones.forEach((seccion) => mapa.set(seccion.id, seccion.nombre));
    return mapa;
  }, [datos.secciones]);

  const terminadas = useMemo(
    () =>
      Object.values(datos.tareas).filter(
        (t) => t.hecha && t.terminadaEn && t.proyectoId === proyectoId,
      ),
    [datos.tareas, proyectoId],
  );

  /** Cuántas terminadas tiene cada sección, para los filtros de arriba. */
  const cuentaPorSeccion = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const tarea of terminadas) {
      const clave = tarea.seccionId ?? BACKLOG;
      mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
    }
    return mapa;
  }, [terminadas]);

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
    const filtradas = terminadas.filter(
      (t) =>
        filtro === null || (filtro === BACKLOG ? !t.seccionId : t.seccionId === filtro),
    );
    const grupos = new Map<string, Tarea[]>();
    for (const tarea of filtradas) {
      const dia = toISO(new Date(tarea.terminadaEn!));
      grupos.set(dia, [...(grupos.get(dia) ?? []), tarea]);
    }
    for (const lista of grupos.values()) {
      lista.sort((a, b) => (b.terminadaEn ?? 0) - (a.terminadaEn ?? 0));
    }
    return [...grupos.entries()].sort((a, b) => (a[0] > b[0] ? -1 : 1)).slice(0, 40);
  }, [terminadas, filtro]);

  const seccionElegida = secciones.find((s) => s.id === filtro);

  /** El foco de una sección sale de sus tareas: los tramos no guardan sección. */
  const focoDeSeccion = useMemo(() => {
    if (!seccionElegida) return 0;
    return Object.values(datos.tareas)
      .filter((t) => t.seccionId === seccionElegida.id)
      .reduce((suma, tarea) => suma + focoDeTarea(tarea, porTarea), 0);
  }, [datos.tareas, seccionElegida, porTarea]);

  const total = porDia.reduce((suma, [, lista]) => suma + lista.length, 0);
  const focoTotal = porDia.reduce((suma, [dia]) => suma + (focoPorDia.get(dia) ?? 0), 0);

  // Se muestran todas las secciones que tengan algo terminado, más las
  // completadas aunque estén vacías: son parte del registro igual.
  const filtros = [
    ...secciones
      .filter((s) => s.completadaEn || cuentaPorSeccion.get(s.id))
      .map((s) => ({
        clave: s.id,
        nombre: s.nombre,
        cuenta: cuentaPorSeccion.get(s.id) ?? 0,
        cerrada: Boolean(s.completadaEn),
      })),
    ...(cuentaPorSeccion.get(BACKLOG)
      ? [
          {
            clave: BACKLOG,
            nombre: "Backlog",
            cuenta: cuentaPorSeccion.get(BACKLOG) ?? 0,
            cerrada: false,
          },
        ]
      : []),
  ];

  if (terminadas.length === 0 && filtros.length === 0) {
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
      {filtros.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <Chip activo={filtro === null} onClick={() => setFiltro(null)}>
            Todo
          </Chip>
          {filtros.map((f) => (
            <Chip key={f.clave} activo={filtro === f.clave} onClick={() => setFiltro(f.clave)}>
              {f.cerrada && <Check width={11} height={11} strokeWidth={3} />}
              {f.nombre}
              <span className="text-ink-faint tabular-nums">{f.cuenta}</span>
            </Chip>
          ))}
        </div>
      )}

      {seccionElegida?.completadaEn && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-line bg-white/[0.02] px-4 py-3">
          <span className="text-[13px] text-ink-soft">
            Sección completada el {fechaCorta(toISO(new Date(seccionElegida.completadaEn)))}
          </span>
          {focoDeSeccion > 0 && (
            <span className="text-[12.5px] text-ink-faint">
              {duracion(focoDeSeccion)} de foco en total
            </span>
          )}
          <button
            onClick={() => reabrirSeccion(seccionElegida.id)}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-1.5 text-[12.5px] text-ink-faint transition-colors hover:border-brand/40 hover:text-ink"
          >
            <Undo width={13} height={13} />
            Volver a abrirla
          </button>
        </div>
      )}

      {total === 0 ? (
        <p className="mt-8 text-center text-[13px] text-ink-faint">
          Nada terminado{seccionElegida ? ` en ${seccionElegida.nombre}` : ""} todavía.
        </p>
      ) : (
        <>
          <p className="mb-6 text-[13px] text-ink-faint">
            {total} {total === 1 ? "tarea terminada" : "tareas terminadas"}
            {filtro === null && focoTotal > 0 && ` · ${duracion(focoTotal)} de foco`}
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
                    {filtro === null && foco > 0 && (
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
                        className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-brand bg-brand text-white transition-transform hover:scale-110"
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
                        {proyectoId && filtro === null && (
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
        </>
      )}
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-colors",
        activo
          ? "border-brand/40 bg-white/[0.06] text-ink"
          : "border-line text-ink-faint hover:border-line-strong hover:text-ink-soft",
      )}
    >
      {children}
    </button>
  );
}
