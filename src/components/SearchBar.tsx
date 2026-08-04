"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Resultado, buscar } from "@/lib/search";
import { useEstanteria } from "@/lib/store";
import { cn } from "@/lib/ui";

interface Props {
  onElegir: (resultado: Resultado) => void;
  onCerrar: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Encontrar cualquier cosa, incluso lo que ya terminaste. */
export function SearchBar({ onElegir, onCerrar, inputRef }: Props) {
  const { estado } = useEstanteria();
  const [consulta, setConsulta] = useState("");
  const [cursor, setCursor] = useState(0);
  const caja = useRef<HTMLDivElement>(null);

  const resultados = useMemo(
    () => (consulta.trim() ? buscar(estado, consulta) : []),
    [estado, consulta],
  );

  useEffect(() => setCursor(0), [consulta]);

  useEffect(() => {
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) onCerrar();
    };
    window.addEventListener("pointerdown", afuera);
    return () => window.removeEventListener("pointerdown", afuera);
  }, [onCerrar]);

  function elegir(resultado: Resultado) {
    onElegir(resultado);
    setConsulta("");
    onCerrar();
  }

  return (
    <div ref={caja} className="relative w-full">
      <input
        ref={inputRef}
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, resultados.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          }
          if (e.key === "Enter" && resultados[cursor]) {
            e.preventDefault();
            elegir(resultados[cursor]);
          }
          if (e.key === "Escape") {
            if (consulta) setConsulta("");
            else onCerrar();
          }
        }}
        placeholder="Buscar…"
        className="w-full rounded-lg border border-line bg-surface/60 px-3 py-1.5 text-[13px] outline-none placeholder:text-ink-faint focus:border-brand/40"
      />

      <AnimatePresence>
        {consulta.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="panel absolute top-[calc(100%+6px)] right-0 z-50 max-h-[60vh] w-80 overflow-y-auto rounded-2xl p-1.5"
          >
            {resultados.length === 0 && (
              <p className="px-3 py-5 text-center text-[12.5px] text-ink-faint">
                Nada con “{consulta}”.
              </p>
            )}
            {resultados.map((resultado, indice) => (
              <button
                key={`${resultado.tipo}-${resultado.id}`}
                onMouseEnter={() => setCursor(indice)}
                onClick={() => elegir(resultado)}
                className={cn(
                  "block w-full rounded-xl px-3 py-2 text-left transition-colors",
                  indice === cursor ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                )}
              >
                <span className="block truncate text-[13.5px] text-ink">{resultado.titulo}</span>
                <span className="block truncate text-[11.5px] text-ink-faint">
                  {resultado.fragmento ?? resultado.contexto}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
