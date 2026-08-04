"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useEstanteria } from "@/lib/store";
import { useEscape } from "@/lib/ui";

interface Props {
  onCerrar: () => void;
}

/**
 * Capturar no es organizar.
 *
 * Escribís, Enter, se guarda en la bandeja y podés seguir escribiendo. Cero
 * preguntas: ni fecha, ni prioridad, ni dónde va. Todo eso se decide después, y
 * de a poco, en la revisión.
 */
export function Captura({ onCerrar }: Props) {
  const { capturar } = useEstanteria();
  const [texto, setTexto] = useState("");
  const [guardadas, setGuardadas] = useState<string[]>([]);

  useEscape(true, onCerrar);

  function guardar() {
    const limpio = texto.trim();
    if (!limpio) return;
    capturar(limpio);
    setGuardadas((previas) => [limpio, ...previas].slice(0, 3));
    setTexto("");
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCerrar}
        className="fixed inset-0 z-70 bg-black/60 backdrop-blur-sm"
      />
      <div className="pointer-events-none fixed inset-0 z-70 flex items-start justify-center p-4 pt-[22vh]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto w-full max-w-xl"
        >
          <textarea
            autoFocus
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                guardar();
              }
            }}
            placeholder="¿Qué tenés en la cabeza?"
            className="panel w-full resize-none rounded-3xl px-6 py-5 text-[17px] leading-relaxed outline-none placeholder:text-ink-faint focus:border-brand/40"
          />

          <div className="mt-3 px-2 text-[12px] text-ink-faint">
            <AnimatePresence mode="popLayout">
              {guardadas.length > 0 ? (
                guardadas.map((linea, i) => (
                  <motion.p
                    key={`${linea}-${i}`}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1 - i * 0.3, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    guardado · {linea}
                  </motion.p>
                ))
              ) : (
                <motion.p key="pista" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Enter guarda y te deja seguir. No te va a preguntar nada más.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}
