"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Popover } from "./Popover";
import { CalendarIcon, Check, ListIcon, Play, Trash } from "./Icons";
import { useDatos } from "@/lib/store";
import { Tarea } from "@/lib/types";
import { cuandoRango, duracion, hoyISO, sumarDias } from "@/lib/fechas";
import { estaAtrasada } from "@/lib/orden";
import { cn } from "@/lib/ui";

interface Props {
  tarea: Tarea;
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
  /** En vistas por fecha no hace falta repetir el día en cada fila. */
  ocultarFecha?: boolean;
}

/** Cuántos pasos se ven en la fila antes de mandar a abrir la tarea. */
const TOPE_PASOS = 6;

/** Una fila de la lista. Todo lo importante se ve sin abrir nada. */
export function TareaFila({ tarea, onAbrir, onFoco, ocultarFecha }: Props) {
  const { datos, completar, reabrir, borrar, programar, editarPaso } = useDatos();
  const [menuFecha, setMenuFecha] = useState(false);
  const [ancla, setAncla] = useState<HTMLElement | null>(null);

  const proyecto = datos.proyectos.find((p) => p.id === tarea.proyectoId);
  // Como en la tarjeta: los primeros pasos a la vista y el resto a un click.
  const visibles = tarea.pasos.slice(0, TOPE_PASOS);
  const ocultos = tarea.pasos.length - visibles.length;
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
        "group relative flex items-start gap-3 border-b border-line/60 py-2.5 pr-1 pl-3.5 transition-colors last:border-b-0 hover:bg-white/[0.02]",
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

      <div className="min-w-0 flex-1">
        <button
          onClick={() => onAbrir(tarea.id)}
          className={cn(
            "block w-full text-left text-[14.5px] leading-snug break-words text-ink",
            tarea.hecha && "text-ink-faint line-through",
          )}
        >
          {tarea.titulo || "Sin título"}
        </button>

        {/* Lo mismo que muestra la tarjeta del tablero: una fila no tiene por
            qué contar menos que una tarjeta. */}
        {tarea.notas.trim() && (
          <button
            onClick={() => onAbrir(tarea.id)}
            className="mt-0.5 line-clamp-3 w-full text-left text-[12px] leading-relaxed break-words whitespace-pre-wrap text-ink-faint"
          >
            {tarea.notas.trim()}
          </button>
        )}

        {visibles.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {visibles.map((paso) => (
              <button
                key={paso.id}
                onClick={() => editarPaso(tarea.id, paso.id, { hecho: !paso.hecho })}
                className="flex w-full items-start gap-2 rounded-md py-0.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className={cn(
                    "mt-[3px] grid h-[13px] w-[13px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                    paso.hecho
                      ? "border-brand bg-brand text-white"
                      : "border-brand/60 text-transparent hover:border-brand",
                  )}
                >
                  <Check width={8} height={8} strokeWidth={4} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[12px] leading-snug break-words",
                    paso.hecho ? "text-ink-faint line-through" : "text-titulo",
                  )}
                >
                  {paso.texto}
                </span>
              </button>
            ))}
            {ocultos > 0 && (
              <button
                onClick={() => onAbrir(tarea.id)}
                className="pl-[21px] text-[11.5px] text-ink-faint transition-colors hover:text-ink"
              >
                +{ocultos} {ocultos === 1 ? "paso más" : "pasos más"}
              </button>
            )}
          </div>
        )}

        <span className="mt-1 flex flex-wrap items-center gap-2.5 text-[11.5px]">
          {tarea.pausa && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFoco(tarea.id);
              }}
              title="Seguir esta sesión donde la dejaste"
              className="inline-flex items-center gap-1 rounded-md border border-brand/50 px-1.5 py-px text-brand transition-colors hover:bg-brand/10"
            >
              <Play width={10} height={10} />
              Reanudar {duracion(tarea.pausa.segundos)}
            </button>
          )}
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
          {pasos > 0 && (
            <span className="inline-flex items-center gap-1 text-ink-faint">
              <ListIcon width={11} height={11} />
              {hechos}/{pasos}
            </span>
          )}
          {tarea.minutosDeFoco > 0 && (
            <span className="text-ink-faint">{tarea.minutosDeFoco} min de foco</span>
          )}
        </span>
      </div>

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
