"use client";

import { useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { Fila } from "./Fila";
import { useEstanteria } from "@/lib/store";
import { Contexto, ranking } from "@/lib/foco";
import { hoyISO } from "@/lib/fechas";
import { MAX_CLAVES } from "@/lib/types";

interface Props {
  onAbrir: (id: string) => void;
  onEmpezar: (id: string) => void;
  onRevisar: () => void;
  onVerResto: () => void;
}

/**
 * Las cinco de la semana. El techo es la función, no una limitación: una lista
 * sin límite es exactamente lo que te deja mirándola sin poder elegir.
 */
export function Semana({ onAbrir, onEmpezar, onRevisar, onVerResto }: Props) {
  const { estado } = useEstanteria();
  const hoy = hoyISO();
  const ctx: Contexto = useMemo(
    () => ({ hoy, pocaCabeza: estado.pocaCabezaEn === hoy }),
    [estado.pocaCabezaEn, hoy],
  );

  const cosas = useMemo(() => Object.values(estado.cosas), [estado.cosas]);
  const claves = useMemo(
    () =>
      ranking(
        cosas.filter((cosa) => cosa.clave && cosa.estado === "activa"),
        ctx,
      ),
    [cosas, ctx],
  );

  const resto = cosas.filter(
    (cosa) => cosa.estado === "activa" && !cosa.clave && !cosa.enBandeja,
  ).length;
  const bandeja = cosas.filter((cosa) => cosa.estado === "activa" && cosa.enBandeja).length;

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Esta semana
        </h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          {claves.length === 0
            ? "Todavía no elegiste nada."
            : `${claves.length} de ${MAX_CLAVES}. Lo demás puede esperar.`}
        </p>
      </header>

      <div className="-mx-3">
        <AnimatePresence initial={false}>
          {claves.map((p) => (
            <Fila
              key={p.cosa.id}
              cosa={p.cosa}
              nota={p.motivo}
              onAbrir={onAbrir}
              onEmpezar={onEmpezar}
            />
          ))}
        </AnimatePresence>
      </div>

      {claves.length === 0 && (
        <button
          onClick={onRevisar}
          className="w-full rounded-2xl border border-dashed border-line py-8 text-[13.5px] text-ink-faint transition-colors hover:border-brand/40 hover:text-ink-soft"
        >
          Elegir en un minuto
        </button>
      )}

      <footer className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-[12.5px] text-ink-faint">
        {claves.length > 0 && claves.length < MAX_CLAVES && (
          <button onClick={onRevisar} className="transition-colors hover:text-ink-soft">
            sumar otra
          </button>
        )}
        <button onClick={onVerResto} className="transition-colors hover:text-ink-soft">
          el resto ({resto})
        </button>
        {bandeja > 0 && (
          <button onClick={onRevisar} className="transition-colors hover:text-ink-soft">
            bandeja ({bandeja})
          </button>
        )}
      </footer>
    </div>
  );
}
