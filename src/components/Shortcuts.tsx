"use client";

import { motion } from "motion/react";
import { X } from "./Icons";
import { useEscape } from "@/lib/ui";

const GRUPOS: { titulo: string; items: [string, string][] }[] = [
  {
    titulo: "En cualquier lado",
    items: [
      ["Ctrl N", "Anotar algo (no pregunta nada más)"],
      ["Ctrl K", "Buscar, incluso en lo terminado"],
      ["1 · 2 · 3 · 4", "Ahora · Semana · Horizonte · Escritorio"],
      ["Ctrl Z", "Deshacer lo último que borraste"],
      ["Esc", "Cerrar lo que esté abierto"],
      ["?", "Ver esto"],
    ],
  },
  {
    titulo: "En Ahora",
    items: [
      ["Empezar", "Entra al modo foco, con cronómetro"],
      ["Ahora no", "Te propone otra. No pasa nada"],
      ["Fijar", "Manda sobre el motor por hoy"],
    ],
  },
  {
    titulo: "En el Escritorio",
    items: [
      ["Doble click", "Papelito nuevo donde clickeaste"],
      ["Ctrl V", "Pegar una captura o un texto"],
      ["Arrastrar el fondo", "Mover la vista"],
      ["Ctrl + rueda", "Zoom"],
    ],
  },
];

export function Shortcuts({ onClose }: { onClose: () => void }) {
  useEscape(true, onClose);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-80 bg-black/60 backdrop-blur-sm"
      />
      <div className="pointer-events-none fixed inset-0 z-80 grid place-items-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="panel pointer-events-auto w-full max-w-lg rounded-3xl p-6"
        >
          <div className="mb-5 flex items-center">
            <h2 className="font-display text-xl font-semibold tracking-tight">Atajos</h2>
            <button
              onClick={onClose}
              className="ml-auto rounded-xl p-2 text-ink-faint transition-colors hover:bg-line hover:text-ink"
            >
              <X width={17} height={17} />
            </button>
          </div>

          <div className="space-y-5">
            {GRUPOS.map((grupo) => (
              <div key={grupo.titulo}>
                <h3 className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                  {grupo.titulo}
                </h3>
                <div className="space-y-1.5">
                  {grupo.items.map(([tecla, que]) => (
                    <div key={tecla} className="flex items-center gap-3 text-[13px]">
                      <kbd className="min-w-28 rounded-lg border border-line bg-surface-2 px-2 py-1 text-center text-[11px] font-medium text-ink-soft">
                        {tecla}
                      </kbd>
                      <span className="text-ink-soft">{que}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
