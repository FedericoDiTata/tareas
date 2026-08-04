"use client";

import { ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import { QuickAdd } from "./QuickAdd";
import { TareaFila } from "./TareaFila";
import { Tarea } from "@/lib/types";

export interface Grupo {
  clave: string;
  titulo?: string;
  nota?: string;
  accion?: ReactNode;
  tareas: Tarea[];
  /** Valores por defecto para lo que se agregue dentro del grupo. */
  quickAdd?: { vence?: string; proyectoId?: string; seccionId?: string };
}

interface Props {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
  grupos: Grupo[];
  quickAdd?: { proyectoId?: string; vence?: string } | null;
  vacio?: { titulo: string; detalle: string };
  /** Va abajo de todo (agregar sección, por ejemplo). */
  pie?: ReactNode;
  ocultarFecha?: boolean;
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
}

/** El armazón de todas las vistas: encabezado, lista y el campo para agregar. */
export function Lista({
  titulo,
  subtitulo,
  accion,
  grupos,
  quickAdd,
  vacio,
  pie,
  ocultarFecha,
  onAbrir,
  onFoco,
}: Props) {
  const total = grupos.reduce((suma, grupo) => suma + grupo.tareas.length, 0);

  return (
    <div className="mx-auto h-full w-full max-w-3xl overflow-y-auto px-6 py-8 sm:px-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-titulo">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1 text-[12.5px] text-ink-faint">{subtitulo}</p>}
        </div>
        {accion}
      </header>

      {grupos.map((grupo) => (
        <section key={grupo.clave} className="mb-7">
          {grupo.titulo && (
            <div className="mb-1 flex items-baseline gap-2 border-b border-line pb-1.5">
              <h2 className="text-[13px] font-medium text-titulo">{grupo.titulo}</h2>
              {grupo.nota && <span className="text-[11.5px] text-ink-faint">{grupo.nota}</span>}
              <span className="ml-auto">{grupo.accion}</span>
            </div>
          )}

          <AnimatePresence initial={false}>
            {grupo.tareas.map((tarea) => (
              <TareaFila
                key={tarea.id}
                tarea={tarea}
                onAbrir={onAbrir}
                onFoco={onFoco}
                ocultarFecha={ocultarFecha}
              />
            ))}
          </AnimatePresence>

          {grupo.quickAdd && (
            <QuickAdd
              vence={grupo.quickAdd.vence}
              proyectoId={grupo.quickAdd.proyectoId}
              seccionId={grupo.quickAdd.seccionId}
            />
          )}
        </section>
      ))}

      {quickAdd && <QuickAdd proyectoId={quickAdd.proyectoId} vence={quickAdd.vence} />}

      {pie && <div className="mt-2">{pie}</div>}

      {total === 0 && vacio && (
        <div className="mt-10 text-center">
          <p className="text-[15px] text-ink-soft">{vacio.titulo}</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-faint">
            {vacio.detalle}
          </p>
        </div>
      )}
    </div>
  );
}
