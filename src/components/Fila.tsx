"use client";

import { motion } from "motion/react";
import { Check, ListIcon, Play } from "./Icons";
import { Cosa } from "@/lib/types";
import { useEstanteria } from "@/lib/store";
import { cuando } from "@/lib/fechas";
import { cn } from "@/lib/ui";

interface Props {
  cosa: Cosa;
  /** La línea gris de abajo. Si no viene, se arma sola. */
  nota?: string;
  onAbrir: (id: string) => void;
  onEmpezar?: (id: string) => void;
  /** En las listas de cosas terminadas no hay nada que hacer. */
  soloLectura?: boolean;
}

/** Una fila de lista. Sin bordes, sin sombras: texto y aire. */
export function Fila({ cosa, nota, onAbrir, onEmpezar, soloLectura }: Props) {
  const { terminar } = useEstanteria();
  const pasos = cosa.pasos.length;
  const hechos = cosa.pasos.filter((paso) => paso.hecho).length;

  const detalle =
    nota ??
    [
      cosa.vence ? `vence ${cuando(cosa.vence)}` : null,
      pasos > 0 ? `${hechos}/${pasos}` : null,
      cosa.etiquetas[0] ?? null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25 }}
      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.025]"
    >
      {!soloLectura && (
        <button
          onClick={() => terminar(cosa.id)}
          title="Listo"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line-strong text-transparent transition-colors hover:border-emerald-500/60 hover:text-emerald-400"
        >
          <Check width={11} height={11} strokeWidth={3} />
        </button>
      )}

      <button onClick={() => onAbrir(cosa.id)} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block truncate text-[14.5px] text-ink",
            soloLectura && "text-ink-soft line-through decoration-ink-faint/40",
          )}
        >
          {cosa.titulo || "Sin título"}
        </span>
        {detalle && (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-ink-faint">
            {pasos > 0 && !nota && <ListIcon width={11} height={11} />}
            {detalle}
          </span>
        )}
      </button>

      {onEmpezar && !soloLectura && (
        <button
          onClick={() => onEmpezar(cosa.id)}
          title="Empezar"
          className="shrink-0 rounded-lg p-1.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-brand"
        >
          <Play width={14} height={14} />
        </button>
      )}
    </motion.div>
  );
}
