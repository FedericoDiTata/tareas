"use client";

import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { motion } from "motion/react";
import { Search } from "./Icons";
import { Resultado, buscar } from "@/lib/search";
import { useDatos } from "@/lib/store";
import { cn, useEscape } from "@/lib/ui";

interface Props {
  onElegir: (resultado: Resultado) => void;
  onCerrar: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Buscador central. Encuentra también lo completado. */
export function SearchBar({ onElegir, onCerrar, inputRef }: Props) {
  const { datos } = useDatos();
  const [consulta, setConsulta] = useState("");
  const [cursor, setCursor] = useState(0);

  const resultados = useMemo(
    () => (consulta.trim() ? buscar(datos, consulta) : []),
    [datos, consulta],
  );

  useEffect(() => setCursor(0), [consulta]);
  useEscape(true, onCerrar);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onCerrar}
        className="fixed inset-0 z-70 bg-black/50 backdrop-blur-sm"
      />
      <div className="pointer-events-none fixed inset-0 z-70 flex items-start justify-center p-4 pt-[14vh]">
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="panel pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Search width={16} height={16} className="shrink-0 text-ink-faint" />
            <input
              ref={inputRef}
              autoFocus
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
                  onElegir(resultados[cursor]);
                }
              }}
              placeholder="Buscar tareas, notas, papelitos…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-1.5">
            {consulta.trim() && resultados.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-faint">
                Nada con “{consulta}”.
              </p>
            )}
            {!consulta.trim() && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-faint">
                Escribí para buscar en todo.
              </p>
            )}
            {resultados.map((resultado, indice) => (
              <button
                key={`${resultado.tipo}-${resultado.id}`}
                onMouseEnter={() => setCursor(indice)}
                onClick={() => onElegir(resultado)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  indice === cursor ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                  {resultado.titulo}
                </span>
                <span className="shrink-0 text-[11.5px] text-ink-faint">{resultado.contexto}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
