"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoGrow } from "./AutoGrow";
import { Check, Pause, X } from "./Icons";
import { useEstanteria } from "@/lib/store";
import { primerPaso } from "@/lib/types";
import { cn, useEscape } from "@/lib/ui";

interface Props {
  id: string;
  onSalir: () => void;
}

/**
 * Modo foco: la pantalla se vacía hasta que queda una sola frase.
 *
 * Está pensado para el hiperfoco: una dirección clara y cero estímulo lateral.
 * El cronómetro cuenta para arriba y no para abajo a propósito — una cuenta
 * regresiva es una presión, un cronómetro que sube es sólo un dato.
 */
export function Foco({ id, onSalir }: Props) {
  const { estado, terminar, sumarFoco, agregarPaso, editarPaso } = useEstanteria();
  const cosa = estado.cosas[id];
  const [desde] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  const [preguntando, setPreguntando] = useState(false);
  const [primerPasoTexto, setPrimerPasoTexto] = useState("");

  const paso = cosa ? primerPaso(cosa) : undefined;
  const necesitaPaso = Boolean(cosa && !paso && cosa.pasos.length === 0);

  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const minutos = Math.floor((ahora - desde) / 60000);
  const segundos = Math.floor(((ahora - desde) % 60000) / 1000);

  function salir() {
    if (minutos > 0) sumarFoco(id, minutos);
    onSalir();
  }

  useEscape(true, () => (preguntando ? setPreguntando(false) : setPreguntando(true)));

  useEffect(() => {
    if (!cosa) onSalir();
  }, [cosa, onSalir]);

  if (!cosa) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-80 flex flex-col items-center justify-center bg-[#050508] px-6"
    >
      <span className="absolute top-6 text-[12px] text-ink-faint tabular-nums">
        {minutos}:{`${segundos}`.padStart(2, "0")}
      </span>

      <div className="w-full max-w-2xl text-center">
        <h1 className="font-display text-[clamp(1.8rem,4.5vw,3rem)] leading-[1.14] font-semibold tracking-tight text-balance text-ink">
          {cosa.titulo || "Sin título"}
        </h1>

        {/* La pregunta más útil que existe para arrancar algo grande */}
        {necesitaPaso ? (
          <div className="mx-auto mt-8 max-w-md">
            <p className="mb-3 text-[13px] text-ink-faint">¿Cuál es el primer paso concreto?</p>
            <input
              autoFocus
              value={primerPasoTexto}
              onChange={(e) => setPrimerPasoTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && primerPasoTexto.trim()) {
                  agregarPaso(id, primerPasoTexto.trim());
                  setPrimerPasoTexto("");
                }
              }}
              placeholder="Abrir el archivo y escribir el título…"
              className="w-full rounded-2xl border border-line bg-surface/60 px-4 py-3 text-center text-[15px] outline-none placeholder:text-ink-faint focus:border-brand/50"
            />
          </div>
        ) : paso ? (
          <button
            onClick={() => editarPaso(id, paso.id, { hecho: true })}
            className="group mx-auto mt-8 flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line-strong text-transparent transition-colors group-hover:border-emerald-500/60 group-hover:text-emerald-400">
              <Check width={12} height={12} strokeWidth={3} />
            </span>
            <span className="text-[15px] leading-relaxed text-ink-soft">{paso.texto}</span>
          </button>
        ) : null}
      </div>

      <div className="absolute bottom-8 flex items-center gap-2.5">
        <button
          onClick={() => {
            if (minutos > 0) sumarFoco(id, minutos);
            terminar(id);
            onSalir();
          }}
          className="flex items-center gap-2 rounded-2xl border border-line px-5 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
        >
          <Check width={14} height={14} />
          Terminé
        </button>
        <button
          onClick={salir}
          className="flex items-center gap-2 rounded-2xl border border-line px-5 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          <Pause width={14} height={14} />
          Cortar acá
        </button>
      </div>

      <AnimatePresence>
        {preguntando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-[#050508]/90 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="text-[15px] text-ink-soft">¿Seguís con esto o cambiás?</p>
              <div className="mt-5 flex justify-center gap-2.5">
                <button
                  onClick={() => setPreguntando(false)}
                  className="rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-5 py-2.5 text-[13.5px] font-medium text-white"
                >
                  Sigo
                </button>
                <button
                  onClick={salir}
                  className="rounded-2xl border border-line px-5 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:text-ink"
                >
                  Cambio
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setPreguntando(true)}
        aria-label="Salir del foco"
        className={cn(
          "absolute top-5 right-5 grid h-9 w-9 place-items-center rounded-xl text-ink-faint",
          "transition-colors hover:bg-white/[0.04] hover:text-ink",
        )}
      >
        <X width={17} height={17} />
      </button>
    </motion.div>
  );
}
