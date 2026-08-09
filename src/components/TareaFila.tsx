"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Popover } from "./Popover";
import { CalendarIcon, Check, ListIcon, Play, Trash } from "./Icons";
import { useDatos } from "@/lib/store";
import { Tarea } from "@/lib/types";
import { cuandoRango, hoyISO, sumarDias } from "@/lib/fechas";
import { estaAtrasada } from "@/lib/orden";
import { cn } from "@/lib/ui";

interface Props {
  tarea: Tarea;
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
  /** En vistas por fecha no hace falta repetir el día en cada fila. */
  ocultarFecha?: boolean;
}

/** Una fila de la lista. Todo lo importante se ve sin abrir nada. */
export function TareaFila({ tarea, onAbrir, onFoco, ocultarFecha }: Props) {
  const { datos, completar, reabrir, borrar, programar } = useDatos();
  const [menuFecha, setMenuFecha] = useState(false);
  const [ancla, setAncla] = useState<HTMLElement | null>(null);

  const proyecto = datos.proyectos.find((p) => p.id === tarea.proyectoId);
  const pasos = tarea.pasos.length;
  const hechos = tarea.pasos.filter((paso) => paso.hecho).length;
  const atrasada = estaAtrasada(tarea);

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative flex items-start gap-3 border-b border-line/60 py-2.5 pr-1 pl-1 transition-colors last:border-b-0 hover:bg-white/[0.02]",
        tarea.color && `tone-${tarea.color}`,
      )}
      style={
        tarea.color
          ? { background: "color-mix(in srgb, rgb(var(--tone)) 8%, transparent)" }
          : undefined
      }
    >
      {tarea.color && (
        <span
          className="absolute inset-y-1 left-0 w-[2.5px] rounded-full"
          style={{ background: "rgb(var(--tone))" }}
        />
      )}
      <button
        onClick={() => (tarea.hecha ? reabrir(tarea.id) : completar(tarea.id))}
        title={tarea.hecha ? "Volver a abrir" : "Completar"}
        className={cn(
          "mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-all",
          tarea.hecha
            ? "border-brand bg-brand text-white"
            : "border-line-strong text-transparent hover:scale-110 hover:border-brand",
        )}
      >
        <Check width={11} height={11} strokeWidth={3.5} />
      </button>

      <button onClick={() => onAbrir(tarea.id)} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block text-[14.5px] leading-snug text-ink",
            tarea.hecha && "text-ink-faint line-through",
          )}
        >
          {tarea.titulo || "Sin título"}
        </span>

        {(tarea.notas || pasos > 0) && (
          <span className="mt-0.5 block truncate text-[12px] text-ink-faint">
            {pasos > 0 && (
              <span className="mr-2 inline-flex items-center gap-1 align-middle">
                <ListIcon width={11} height={11} />
                {hechos}/{pasos}
              </span>
            )}
            {tarea.notas.split("\n")[0]}
          </span>
        )}

        <span className="mt-1 flex flex-wrap items-center gap-2.5 text-[11.5px]">
          {!ocultarFecha && tarea.vence && (
            <span className={cn("inline-flex items-center gap-1", atrasada ? "text-amber-500/90" : "text-ink-faint")}>
              <CalendarIcon width={11} height={11} />
              {cuandoRango(tarea.vence, tarea.hasta)}
            </span>
          )}
          {proyecto && (
            <span className={`tone-${proyecto.color} inline-flex items-center gap-1.5 text-ink-faint`}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "rgb(var(--tone))" }}
              />
              {proyecto.nombre}
            </span>
          )}
          {tarea.minutosDeFoco > 0 && (
            <span className="text-ink-faint">{tarea.minutosDeFoco} min de foco</span>
          )}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {!tarea.hecha && (
          <button
            onClick={() => onFoco(tarea.id)}
            title="Entrar en foco con esta"
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-brand"
          >
            <Play width={14} height={14} />
          </button>
        )}
        <button
          ref={setAncla}
          onClick={() => setMenuFecha((v) => !v)}
          title="Cuándo"
          className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
        >
          <CalendarIcon width={14} height={14} />
        </button>
        <button
          onClick={() => borrar(tarea.id)}
          title="Eliminar"
          className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-rose-400"
        >
          <Trash width={14} height={14} />
        </button>
      </div>

      {menuFecha && (
        <Popover anchor={ancla} onClose={() => setMenuFecha(false)} width={190}>
          {[
            { texto: "Hoy", valor: hoyISO() },
            { texto: "Mañana", valor: sumarDias(hoyISO(), 1) },
            { texto: "En una semana", valor: sumarDias(hoyISO(), 7) },
            { texto: "Sin fecha", valor: null },
          ].map((opcion) => (
            <button
              key={opcion.texto}
              onClick={() => {
                programar(tarea.id, opcion.valor);
                setMenuFecha(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              {opcion.texto}
              {tarea.vence === opcion.valor && <Check width={13} height={13} />}
            </button>
          ))}
        </Popover>
      )}
    </motion.div>
  );
}
