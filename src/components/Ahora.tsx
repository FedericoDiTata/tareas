"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Pin, Play, Skip } from "./Icons";
import { useEstanteria } from "@/lib/store";
import { Contexto, conviene, elegirAhora, pendientes } from "@/lib/foco";
import { hoyISO } from "@/lib/fechas";
import { primerPaso } from "@/lib/types";
import { cn } from "@/lib/ui";

interface Props {
  onAbrir: (id: string) => void;
  onEmpezar: (id: string) => void;
  onRevisar: () => void;
  onCapturar: () => void;
}

/**
 * La pantalla que ves al abrir. Una sola cosa, el motivo por el que es esa, y
 * tres decisiones posibles. Todo lo demás está a un click pero no se ve: la
 * pantalla no puede darte nada para elegir, porque elegir es justo lo caro.
 */
export function Ahora({ onAbrir, onEmpezar, onRevisar, onCapturar }: Props) {
  const { estado, saltar, terminar, fijar, setPocaCabeza } = useEstanteria();
  const hoy = hoyISO();
  const pocaCabeza = estado.pocaCabezaEn === hoy;

  const ctx: Contexto = useMemo(() => ({ hoy, pocaCabeza }), [hoy, pocaCabeza]);
  const cosas = useMemo(() => Object.values(estado.cosas), [estado.cosas]);

  const elegida = useMemo(() => elegirAhora(cosas, ctx), [cosas, ctx]);
  const p = useMemo(() => pendientes(estado, ctx), [estado, ctx]);
  const hayClaves = cosas.some((cosa) => cosa.clave && cosa.estado === "activa");
  const sugerirRevision = conviene(p, hayClaves);

  const terminadasHoy = cosas.filter(
    (cosa) =>
      cosa.estado === "hecha" &&
      cosa.terminadaEn &&
      new Date(cosa.terminadaEn).toDateString() === new Date().toDateString(),
  ).length;

  const paso = elegida ? primerPaso(elegida.cosa) : undefined;

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6">
      {/* Sugerencia de revisión: discreta, arriba, nunca bloquea */}
      <AnimatePresence>
        {sugerirRevision && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={onRevisar}
            className="absolute top-4 flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[12.5px] text-ink-faint transition-colors hover:border-brand/40 hover:text-ink-soft"
          >
            {p.dormidas.length > 0
              ? `Hay ${p.dormidas.length} que venís salteando`
              : p.bandeja.length > 0
                ? `${p.bandeja.length} sin clasificar`
                : hayClaves
                  ? "Podés terminar de armar tu semana"
                  : "Tu semana está sin definir"}
            <span className="text-brand">· un minuto</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {elegida ? (
          <motion.div
            key={elegida.cosa.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl text-center"
          >
            <p className="mb-5 text-[13px] text-ink-faint">
              Porque {elegida.motivo}.
            </p>

            <h1
              onClick={() => onAbrir(elegida.cosa.id)}
              className="cursor-pointer font-display text-[clamp(1.9rem,5vw,3.2rem)] leading-[1.12] font-semibold tracking-tight text-balance text-ink transition-colors hover:text-brand"
            >
              {elegida.cosa.titulo || "Sin título"}
            </h1>

            {paso && (
              <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-ink-soft">
                <span className="text-ink-faint">Empezá por: </span>
                {paso.texto}
              </p>
            )}

            <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => onEmpezar(elegida.cosa.id)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
              >
                <Play width={15} height={15} />
                Empezar
              </button>
              <button
                onClick={() => saltar(elegida.cosa.id)}
                className="flex items-center gap-2 rounded-2xl border border-line px-5 py-3 text-[14px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <Skip width={15} height={15} />
                Ahora no
              </button>
              <button
                onClick={() => terminar(elegida.cosa.id)}
                className="flex items-center gap-2 rounded-2xl border border-line px-5 py-3 text-[14px] text-ink-soft transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
              >
                <Check width={15} height={15} />
                Listo
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-ink-faint">
              <button
                onClick={() => fijar(elegida.cosa.id)}
                className={cn(
                  "flex items-center gap-1.5 transition-colors hover:text-ink-soft",
                  elegida.cosa.fijadaEn === hoy && "text-brand",
                )}
              >
                <Pin width={12} height={12} />
                {elegida.cosa.fijadaEn === hoy ? "fijada para hoy" : "fijar esta"}
              </button>
              <button
                onClick={() => onAbrir(elegida.cosa.id)}
                className="transition-colors hover:text-ink-soft"
              >
                abrir
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="vacio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md text-center"
          >
            <h1 className="font-display text-[clamp(1.6rem,4vw,2.4rem)] leading-tight font-semibold tracking-tight text-ink">
              {p.bandeja.length > 0 ? "Todo junto en la bandeja" : "No hay nada esperándote"}
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
              {p.bandeja.length > 0
                ? "Tenés cosas capturadas sin clasificar. Un minuto y quedan ordenadas."
                : "En serio. Si algo aparece, lo vas a ver acá."}
            </p>
            <div className="mt-8 flex justify-center gap-2.5">
              {p.bandeja.length > 0 ? (
                <button
                  onClick={onRevisar}
                  className="rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
                >
                  Revisar un minuto
                </button>
              ) : (
                <button
                  onClick={onCapturar}
                  className="rounded-2xl border border-line px-6 py-3 text-[14px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                >
                  Anotar algo
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pie: el estado del día, en voz baja */}
      <div className="absolute bottom-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-ink-faint">
        <button
          onClick={() => setPocaCabeza(!pocaCabeza)}
          className={cn(
            "flex items-center gap-1.5 transition-colors hover:text-ink-soft",
            pocaCabeza && "text-brand",
          )}
        >
          <ChevronDown width={12} height={12} className={pocaCabeza ? "" : "opacity-50"} />
          {pocaCabeza ? "hoy: poca cabeza" : "hoy tengo poca cabeza"}
        </button>
        {terminadasHoy > 0 && (
          <span>
            hoy terminaste {terminadasHoy} {terminadasHoy === 1 ? "cosa" : "cosas"}
          </span>
        )}
      </div>
    </div>
  );
}
