"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pause, Play, Skip, X } from "./Icons";
import { useDatos } from "@/lib/store";
import { SesionFoco, primerPaso, uid } from "@/lib/types";
import { duracion, hoyISO } from "@/lib/fechas";
import { cn } from "@/lib/ui";

interface Props {
  /** La cola de la sesión. Con una sola tarea también funciona. */
  ids: string[];
  onSalir: () => void;
}

const dosDigitos = (n: number) => `${n}`.padStart(2, "0");

/** El anillo marca el minuto en curso: da sensación de reloj sin meter presión. */
const RADIO = 67;
const VUELTA = 2 * Math.PI * RADIO;

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
  const { datos, completar, editarPaso, agregarPaso, sumarFoco, guardarSesion } = useDatos();
  const [indice, setIndice] = useState(0);
  const [desde, setDesde] = useState<number | null>(() => Date.now());
  const [acumulado, setAcumulado] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());
  const [salida, setSalida] = useState(false);
  const [pasoNuevo, setPasoNuevo] = useState("");
  const [hechas, setHechas] = useState(0);
  const [segundosTotales, setSegundosTotales] = useState(0);

  // El registro de la sesión. Se guarda tarea por tarea, mientras pasa: si
  // cerrás la pestaña a la mitad, lo que ya hiciste igual quedó anotado.
  const registro = useRef<SesionFoco>({
    id: uid(),
    dia: hoyISO(),
    inicio: Date.now(),
    fin: Date.now(),
    segundos: 0,
    tramos: [],
  });

  const pendientes = useMemo(
    () => ids.map((id) => datos.tareas[id]).filter((t) => t && !t.hecha),
    // Sólo al montar: si se recalculara, completar una tarea la sacaría de la
    // cola y saltaría dos posiciones de golpe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  );

  const tarea = datos.tareas[pendientes[indice]?.id ?? ""];
  const proyecto = datos.proyectos.find((p) => p.id === tarea?.proyectoId);
  const paso = tarea ? primerPaso(tarea) : undefined;
  const sinPasos = Boolean(tarea && tarea.pasos.length === 0);
  const corriendo = desde !== null;

  useEffect(() => {
    if (!corriendo) return;
    // Cada 250 ms para que el anillo barra parejo en vez de saltar de segundo
    // en segundo. Es un subárbol chico: no cuesta nada.
    const timer = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(timer);
  }, [corriendo]);

  const transcurrido = acumulado + (desde ? ahora - desde : 0);
  const totalSegundos = Math.floor(transcurrido / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const reloj =
    (horas > 0 ? `${horas}:${dosDigitos(Math.floor(totalSegundos / 60) % 60)}` : `${dosDigitos(Math.floor(totalSegundos / 60))}`) +
    `:${dosDigitos(totalSegundos % 60)}`;
  const vueltaMinuto = (transcurrido % 60000) / 60000;

  // Los handlers viven en un ref para que los atajos no reenganchen listeners
  // en cada tick del cronómetro.
  const acciones = useRef({ terminar: () => {}, avanzar: () => {}, pausar: () => {} });

  /** Cierra el tramo de la tarea actual y lo deja anotado en la sesión. */
  function anotarTramo(completada: boolean) {
    const segundos = Math.round(transcurrido / 1000);
    // Menos de cinco segundos es haber pasado de largo, no haber trabajado.
    if (!tarea || segundos < 5) return;

    const minutos = Math.floor(segundos / 60);
    if (minutos > 0) sumarFoco(tarea.id, minutos);
    setSegundosTotales((total) => total + segundos);

    registro.current = {
      ...registro.current,
      fin: Date.now(),
      segundos: registro.current.segundos + segundos,
      tramos: [
        ...registro.current.tramos,
        {
          tareaId: tarea.id,
          titulo: tarea.titulo || "Sin título",
          proyectoId: tarea.proyectoId,
          segundos,
          completada,
        },
      ],
    };
    guardarSesion(registro.current);
  }

  function avanzar(completada = false) {
    anotarTramo(completada);
    setAcumulado(0);
    setDesde(Date.now());
    setAhora(Date.now());
    setIndice((i) => i + 1);
  }

  function terminarActual() {
    if (!tarea) return;
    completar(tarea.id);
    setHechas((n) => n + 1);
    avanzar(true);
  }

  function alternarPausa() {
    if (desde === null) {
      setDesde(Date.now());
      setAhora(Date.now());
    } else {
      setAcumulado((ms) => ms + Date.now() - desde);
      setDesde(null);
    }
  }

  function salir() {
    anotarTramo(false);
    onSalir();
  }

  useEffect(() => {
    acciones.current = {
      terminar: terminarActual,
      avanzar: () => avanzar(false),
      pausar: alternarPausa,
    };
  });

  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      const dentroDeTexto =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
      if (e.key === "Escape") {
        e.preventDefault();
        setSalida((v) => !v);
        return;
      }
      if (dentroDeTexto || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        acciones.current.terminar();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        acciones.current.avanzar();
      } else if (e.key === " ") {
        e.preventDefault();
        acciones.current.pausar();
      }
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, []);

  const quedan = pendientes.length - indice - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-80 flex flex-col overflow-hidden bg-[#050508] text-ink"
    >
      {/* Un solo halo, quieto y muy tenue: da profundidad sin distraer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-[58%] rounded-full opacity-[0.55] blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 22%, transparent) 0%, transparent 62%)",
        }}
      />

      {/* ── Barra de arriba ──────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8">
        <div className={cn("flex items-center gap-2.5", !tarea && "opacity-0")}>
          <span
            className={cn(
              "h-[7px] w-[7px] rounded-full",
              corriendo ? "animate-pulse bg-[var(--brand)]" : "bg-ink-faint",
            )}
          />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            {corriendo ? "En foco" : "En pausa"}
          </span>
          {proyecto && (
            <span className={`tone-${proyecto.color} flex items-center gap-1.5`}>
              <span className="text-ink-faint">·</span>
              <span
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: "rgb(var(--tone))" }}
              />
              <span className="text-[12.5px] text-ink-soft">{proyecto.nombre}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {tarea && pendientes.length > 1 && (
            <span className="text-[12.5px] text-ink-faint tabular-nums">
              {Math.min(indice + 1, pendientes.length)} de {pendientes.length}
            </span>
          )}
          <button
            onClick={() => setSalida(true)}
            aria-label="Salir del foco"
            className="grid h-9 w-9 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <X width={17} height={17} />
          </button>
        </div>
      </header>

      {/* ── Centro ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {tarea ? (
            <motion.div
              key={tarea.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full max-w-xl flex-col items-center"
            >
              {/* Cronómetro */}
              <div className="relative grid place-items-center">
                <svg
                  viewBox="0 0 154 154"
                  className="h-[158px] w-[158px] -rotate-90"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="foco-anillo" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" />
                      <stop offset="100%" stopColor="var(--brand-2)" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="77"
                    cy="77"
                    r={RADIO}
                    fill="none"
                    stroke="rgb(255 255 255 / 0.07)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="77"
                    cy="77"
                    r={RADIO}
                    fill="none"
                    stroke="url(#foco-anillo)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={VUELTA}
                    strokeDashoffset={VUELTA * (1 - vueltaMinuto)}
                    className={cn(!corriendo && "opacity-40")}
                  />
                </svg>

                <div className="absolute inset-0 grid place-content-center text-center">
                  <span
                    className={cn(
                      "font-display text-[42px] leading-none font-semibold tracking-tight tabular-nums transition-opacity",
                      corriendo ? "text-ink" : "text-ink-faint",
                    )}
                  >
                    {reloj}
                  </span>
                  {/* Sólo aparece en pausa: el resto del tiempo el número solo alcanza. */}
                  <span className="mt-2 block h-[12px] text-[10px] font-semibold tracking-[0.2em] text-ink-faint uppercase">
                    {corriendo ? "" : "En pausa"}
                  </span>
                </div>
              </div>

              <button
                onClick={alternarPausa}
                className="mt-4 flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink"
              >
                {corriendo ? <Pause width={12} height={12} /> : <Play width={12} height={12} />}
                {corriendo ? "Pausar" : "Seguir"}
              </button>

              {/* Tarea */}
              <h1 className="mt-8 text-center font-display text-[clamp(1.9rem,4.4vw,3rem)] leading-[1.12] font-semibold tracking-tight text-balance text-ink">
                {tarea.titulo || "Sin título"}
              </h1>

              {sinPasos ? (
                <div className="mt-7 w-full max-w-md">
                  <p className="mb-3 text-center text-[13px] text-ink-faint">
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
                    className="w-full rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-center text-[15px] outline-none placeholder:text-ink-faint focus:border-brand/50"
                  />
                </div>
              ) : (
                <div className="mt-7 w-full max-w-md rounded-2xl border border-line bg-white/[0.02] p-1.5">
                  {tarea.pasos.map((p) => {
                    const actual = paso?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => editarPaso(tarea.id, p.id, { hecho: !p.hecho })}
                        className={cn(
                          "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          actual ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                        )}
                      >
                        {actual && (
                          <span className="absolute top-1/2 left-0 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-[var(--brand)]" />
                        )}
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
                            actual && !p.hecho && "text-ink",
                          )}
                        >
                          {p.texto}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Acciones */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={terminarActual}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-12px_var(--brand)] transition-transform hover:brightness-110 active:scale-[0.98]"
                >
                  <Check width={15} height={15} />
                  Terminé
                  <kbd className="ml-1 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-normal text-white/75">
                    ↵
                  </kbd>
                </button>
                {quedan > 0 && (
                  <button
                    onClick={() => avanzar(false)}
                    className="flex items-center gap-2 rounded-2xl border border-line px-5 py-3 text-[14px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                  >
                    <Skip width={15} height={15} />
                    Siguiente
                    <kbd className="ml-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">
                      →
                    </kbd>
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="final"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md text-center"
            >
              <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
                {hechas > 0 ? "Buena sesión" : "Listo"}
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
                {hechas > 0
                  ? "Esto es lo que sacaste adelante."
                  : "No quedó nada pendiente en esta sesión."}
              </p>

              {hechas > 0 && (
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    { valor: `${hechas}`, texto: hechas === 1 ? "tarea" : "tareas" },
                    { valor: duracion(segundosTotales), texto: "de foco" },
                  ].map((dato) => (
                    <div
                      key={dato.texto}
                      className="rounded-2xl border border-line bg-white/[0.02] px-4 py-5"
                    >
                      <span className="font-display block text-[30px] leading-none font-semibold tracking-tight text-titulo tabular-nums">
                        {dato.valor}
                      </span>
                      <span className="mt-2 block text-[11px] tracking-[0.14em] text-ink-faint uppercase">
                        {dato.texto}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {registro.current.tramos.length > 0 && (
                <p className="mt-6 text-[12.5px] text-ink-faint">
                  Queda anotado en el Diario de hoy y en cada proyecto.
                </p>
              )}

              <button
                onClick={onSalir}
                className="mt-6 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-12px_var(--brand)] transition-transform hover:brightness-110 active:scale-[0.98]"
              >
                Volver
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Progreso de la sesión ────────────────────────────────────────── */}
      {tarea && pendientes.length > 1 && (
        <footer className="relative z-10 flex shrink-0 flex-col items-center gap-2.5 px-6 pt-4 pb-7">
          <div className="flex w-full max-w-xs gap-1.5">
            {pendientes.map((t, i) => (
              <span
                key={t.id}
                className={cn(
                  "h-[3px] flex-1 rounded-full transition-colors duration-500",
                  i < indice && "bg-[var(--brand)]/55",
                  i === indice && "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)]",
                  i > indice && "bg-white/10",
                )}
              />
            ))}
          </div>
          <span className="text-[11.5px] text-ink-faint">
            {quedan > 0
              ? `${quedan} ${quedan === 1 ? "tarea más" : "tareas más"} en esta sesión`
              : "Última de la sesión"}
          </span>
        </footer>
      )}

      {/* ── Salir ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {salida && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 grid place-items-center bg-[#050508]/90 px-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-3xl border border-line bg-surface/80 p-7 text-center"
            >
              <p className="font-display text-[19px] font-semibold tracking-tight text-ink">
                ¿Seguís o cortás acá?
              </p>
              {transcurrido >= 60000 && (
                <p className="mt-2 text-[13px] text-ink-faint">
                  Llevás {Math.floor(transcurrido / 60000)} min en esta tarea.
                </p>
              )}
              <div className="mt-6 flex justify-center gap-2.5">
                <button
                  onClick={() => setSalida(false)}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-5 py-2.5 text-[13.5px] font-medium text-white transition-transform active:scale-[0.98]"
                >
                  <Play width={14} height={14} />
                  Sigo
                </button>
                <button
                  onClick={salir}
                  className="rounded-2xl border border-line px-5 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                >
                  Corto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
