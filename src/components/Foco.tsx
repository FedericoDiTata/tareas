"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Play, Skip, X } from "./Icons";
import { useDatos } from "@/lib/store";
import { primerPaso } from "@/lib/types";
import { cn } from "@/lib/ui";

interface Props {
  /** La cola de la sesión. Con una sola tarea también funciona. */
  ids: string[];
  onSalir: () => void;
}

/**
 * Modo foco: la pantalla se vacía hasta que queda una sola tarea.
 *
 * La gracia no es el cronómetro, es el encadenado: cuando terminás una, te
 * ofrece la siguiente sin volver a la lista. Volver a la lista es donde se corta
 * el envión y arranca de nuevo la duda de por dónde seguir.
 *
 * El cronómetro cuenta para arriba a propósito: una cuenta regresiva es presión,
 * un cronómetro que sube es sólo un dato.
 */
export function Foco({ ids, onSalir }: Props) {
  const { datos, completar, editarPaso, agregarPaso, sumarFoco } = useDatos();
  const [indice, setIndice] = useState(0);
  const [desde, setDesde] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  const [salida, setSalida] = useState(false);
  const [pasoNuevo, setPasoNuevo] = useState("");
  const [hechas, setHechas] = useState(0);
  const [minutosTotales, setMinutosTotales] = useState(0);

  const pendientes = useMemo(
    () => ids.map((id) => datos.tareas[id]).filter((t) => t && !t.hecha),
    // Sólo al montar: si se recalculara, completar una tarea la sacaría de la
    // cola y saltaría dos posiciones de golpe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  );

  const tarea = datos.tareas[pendientes[indice]?.id ?? ""];
  const paso = tarea ? primerPaso(tarea) : undefined;
  const sinPasos = Boolean(tarea && tarea.pasos.length === 0);

  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const minutos = Math.floor((ahora - desde) / 60000);
  const segundos = Math.floor(((ahora - desde) % 60000) / 1000);

  function guardarTiempo() {
    if (tarea && minutos > 0) {
      sumarFoco(tarea.id, minutos);
      setMinutosTotales((total) => total + minutos);
    }
  }

  function avanzar() {
    guardarTiempo();
    setDesde(Date.now());
    setAhora(Date.now());
    setIndice((i) => i + 1);
  }

  function terminarActual() {
    if (!tarea) return;
    completar(tarea.id);
    setHechas((n) => n + 1);
    avanzar();
  }

  function salir() {
    guardarTiempo();
    onSalir();
  }

  const quedan = pendientes.length - indice - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-80 flex flex-col items-center justify-center bg-[#050508] px-6"
    >
      <button
        onClick={() => setSalida(true)}
        aria-label="Salir del foco"
        className="absolute top-5 right-5 grid h-9 w-9 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-white/[0.04] hover:text-ink"
      >
        <X width={17} height={17} />
      </button>

      <AnimatePresence mode="wait">
        {tarea ? (
          <motion.div
            key={tarea.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl text-center"
          >
            <span className="mb-6 block text-[12px] text-ink-faint tabular-nums">
              {minutos}:{`${segundos}`.padStart(2, "0")}
            </span>

            <h1 className="font-display text-[clamp(1.7rem,4.2vw,2.8rem)] leading-[1.15] font-semibold tracking-tight text-balance text-ink">
              {tarea.titulo || "Sin título"}
            </h1>

            {sinPasos ? (
              <div className="mx-auto mt-8 max-w-md">
                <p className="mb-3 text-[13px] text-ink-faint">
                  ¿Cuál es el primer paso concreto?
                </p>
                <input
                  autoFocus
                  value={pasoNuevo}
                  onChange={(e) => setPasoNuevo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pasoNuevo.trim()) {
                      agregarPaso(tarea.id, pasoNuevo.trim());
                      setPasoNuevo("");
                    }
                  }}
                  placeholder="Abrir el archivo y escribir el título…"
                  className="w-full rounded-2xl border border-line bg-surface/60 px-4 py-3 text-center text-[15px] outline-none placeholder:text-ink-faint focus:border-brand/50"
                />
              </div>
            ) : (
              <div className="mx-auto mt-8 max-w-md space-y-1">
                {tarea.pasos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => editarPaso(tarea.id, p.id, { hecho: !p.hecho })}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn(
                        "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors",
                        p.hecho
                          ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-400"
                          : "border-line-strong text-transparent group-hover:border-ink-faint",
                      )}
                    >
                      <Check width={10} height={10} strokeWidth={3.5} />
                    </span>
                    <span
                      className={cn(
                        "text-[14.5px] leading-relaxed",
                        p.hecho ? "text-ink-faint line-through" : "text-ink-soft",
                        paso?.id === p.id && "text-ink",
                      )}
                    >
                      {p.texto}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={terminarActual}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
              >
                <Check width={15} height={15} />
                Terminé
              </button>
              {quedan > 0 && (
                <button
                  onClick={avanzar}
                  className="flex items-center gap-2 rounded-2xl border border-line px-5 py-3 text-[14px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                >
                  <Skip width={15} height={15} />
                  Siguiente
                </button>
              )}
            </div>

            {quedan > 0 && (
              <p className="mt-6 text-[12px] text-ink-faint">
                {quedan} {quedan === 1 ? "más" : "más"} en esta sesión
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="final"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-md text-center"
          >
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              {hechas > 0 ? "Buena sesión" : "Listo"}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
              {hechas > 0
                ? `Completaste ${hechas} ${hechas === 1 ? "tarea" : "tareas"}${
                    minutosTotales > 0 ? ` en ${minutosTotales} minutos` : ""
                  }.`
                : "No quedó nada pendiente en esta sesión."}
            </p>
            <button
              onClick={onSalir}
              className="mt-8 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
            >
              Volver
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {salida && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-[#050508]/92 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="text-[15px] text-ink-soft">¿Seguís o cortás acá?</p>
              <div className="mt-5 flex justify-center gap-2.5">
                <button
                  onClick={() => setSalida(false)}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-5 py-2.5 text-[13.5px] font-medium text-white"
                >
                  <Play width={14} height={14} />
                  Sigo
                </button>
                <button
                  onClick={salir}
                  className="rounded-2xl border border-line px-5 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:text-ink"
                >
                  Corto
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
