"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useEstanteria } from "@/lib/store";
import { Contexto, pendientes } from "@/lib/foco";
import { hoyISO } from "@/lib/fechas";
import { Cosa, MAX_CLAVES } from "@/lib/types";
import { useEscape } from "@/lib/ui";

interface Props {
  onCerrar: () => void;
}

type Pregunta =
  | { tipo: "dormida"; cosa: Cosa }
  | { tipo: "bandeja"; cosa: Cosa }
  | { tipo: "sugerida"; cosa: Cosa };

const MAXIMO = 6;

/**
 * El único momento de organización del sistema.
 *
 * De a una cosa por vez, botones grandes, seis como mucho. No es una pantalla
 * que visitás: aparece cuando hace falta y se termina sola. Si fuera una lista
 * con todo junto sería exactamente la lista enorme que paraliza.
 */
export function Revision({ onCerrar }: Props) {
  const { estado, marcarClave, sacarDeBandeja, pausar, descartar, despertar, cerrarRevision } =
    useEstanteria();
  const hoy = hoyISO();
  const ctx: Contexto = useMemo(
    () => ({ hoy, pocaCabeza: estado.pocaCabezaEn === hoy }),
    [estado.pocaCabezaEn, hoy],
  );

  // La cola se arma una sola vez: si se recalculara con cada respuesta, las
  // preguntas se moverían debajo del dedo.
  const [cola] = useState<Pregunta[]>(() => {
    const p = pendientes(estado, ctx);
    return [
      ...p.dormidas.map((cosa) => ({ tipo: "dormida" as const, cosa })),
      ...p.bandeja.map((cosa) => ({ tipo: "bandeja" as const, cosa })),
      ...p.sugeridas.map((cosa) => ({ tipo: "sugerida" as const, cosa })),
    ].slice(0, MAXIMO);
  });

  const [indice, setIndice] = useState(0);
  const actual = cola[indice];
  const termino = indice >= cola.length;

  const claves = Object.values(estado.cosas).filter(
    (cosa) => cosa.clave && cosa.estado === "activa",
  );
  const semanaLlena = claves.length >= MAX_CLAVES;

  useEscape(true, () => cerrar());

  function cerrar() {
    cerrarRevision();
    onCerrar();
  }

  const siguiente = () => setIndice((i) => i + 1);

  function responder(accion: "semana" | "despues" | "soltar" | "pausa") {
    if (!actual) return;
    const { id } = actual.cosa;
    if (accion === "semana") {
      if (actual.tipo === "dormida") despertar(id);
      marcarClave(id, true);
    }
    if (accion === "despues") {
      if (actual.tipo === "dormida") despertar(id);
      sacarDeBandeja(id);
      marcarClave(id, false);
    }
    if (accion === "pausa") pausar(id);
    if (accion === "soltar") descartar(id);
    siguiente();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-80 flex flex-col items-center justify-center bg-bg/95 px-6 backdrop-blur-xl"
    >
      {!termino && (
        <div className="absolute top-6 flex items-center gap-1.5">
          {cola.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === indice ? "w-6 bg-brand" : i < indice ? "w-1.5 bg-brand/40" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {actual ? (
          <motion.div
            key={actual.cosa.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl text-center"
          >
            <p className="mb-4 text-[12.5px] text-ink-faint">
              {actual.tipo === "dormida"
                ? `La salteaste ${new Set(actual.cosa.saltos).size} veces`
                : actual.tipo === "bandeja"
                  ? "Anotaste esto"
                  : "Podría entrar en tu semana"}
            </p>

            <h2 className="font-display text-[clamp(1.4rem,3.6vw,2.1rem)] leading-tight font-semibold tracking-tight text-balance text-ink">
              {actual.cosa.titulo || "Sin título"}
            </h2>

            {actual.cosa.notas && (
              <p className="mx-auto mt-4 line-clamp-3 max-w-md text-[13.5px] leading-relaxed text-ink-soft">
                {actual.cosa.notas}
              </p>
            )}

            <p className="mt-8 text-[13px] text-ink-faint">
              {actual.tipo === "dormida" ? "¿Sigue viva?" : "¿Qué hacemos con esto?"}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                disabled={semanaLlena}
                onClick={() => responder("semana")}
                title={semanaLlena ? "Tu semana ya tiene cinco" : undefined}
                className="rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-5 py-3 text-[13.5px] font-medium text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Esta semana
              </button>
              <button
                onClick={() => responder("despues")}
                className="rounded-2xl border border-line px-5 py-3 text-[13.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                Puede esperar
              </button>
              {actual.tipo === "dormida" && (
                <button
                  onClick={() => responder("pausa")}
                  className="rounded-2xl border border-line px-5 py-3 text-[13.5px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                >
                  Que descanse
                </button>
              )}
              <button
                onClick={() => responder("soltar")}
                className="rounded-2xl px-4 py-3 text-[13.5px] text-ink-faint transition-colors hover:text-rose-400"
              >
                Soltala
              </button>
            </div>

            {semanaLlena && (
              <p className="mt-5 text-[12px] text-ink-faint">
                Tu semana ya tiene cinco. Para meter otra hay que sacar una.
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="final"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md text-center"
          >
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {claves.length > 0 ? "Esta semana" : "Listo"}
            </h2>

            {claves.length > 0 ? (
              <ul className="mt-6 space-y-2 text-left">
                {claves.map((cosa) => (
                  <li
                    key={cosa.id}
                    className="rounded-2xl border border-line px-4 py-3 text-[14px] text-ink"
                  >
                    {cosa.titulo || "Sin título"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
                No elegiste nada para esta semana, y está bien. La app va a seguir proponiéndote lo
                que tenga más sentido.
              </p>
            )}

            <button
              onClick={cerrar}
              className="mt-8 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
            >
              Listo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!termino && (
        <button
          onClick={cerrar}
          className="absolute bottom-8 text-[12.5px] text-ink-faint transition-colors hover:text-ink-soft"
        >
          seguir después
        </button>
      )}
    </motion.div>
  );
}
