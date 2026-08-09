"use client";

import { motion } from "motion/react";
import { X } from "./Icons";
import { useEscape } from "@/lib/ui";

const GRUPOS: { titulo: string; items: [string, string][] }[] = [
  {
    titulo: "Teclado",
    items: [
      ["Enter", "Guardar la tarea y seguir escribiendo"],
      ["F", "Arrancar el modo foco con lo de hoy"],
      ["Ctrl K", "Buscar en todo, incluso lo completado"],
      ["Ctrl Z", "Deshacer"],
      ["Esc", "Cerrar lo que esté abierto"],
      ["?", "Ver esto"],
    ],
  },
  {
    titulo: "Escribiendo una tarea",
    items: [
      ["mañana", "Le pone fecha de mañana"],
      ["el viernes", "El próximo viernes"],
      ["en 3 días", "Tres días desde hoy"],
      ["12/8", "Una fecha exacta"],
      ["#Trabajo", "Proyecto (lo crea si no existe)"],
    ],
  },
  {
    titulo: "En foco",
    items: [
      ["Enter", "Terminé esta tarea, dame la siguiente"],
      ["→", "Saltar a la siguiente sin completarla"],
      ["Espacio", "Pausar o seguir el cronómetro"],
      ["Esc", "Salir del foco"],
    ],
  },
  {
    titulo: "Diario",
    items: [
      ["Ctrl V", "Pegar una captura como papelito"],
      ["Papelito", "Nota suelta en el día que estés"],
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
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="panel pointer-events-auto w-full max-w-lg rounded-2xl p-6"
        >
          <div className="mb-5 flex items-center">
            <h2 className="font-display text-xl font-semibold tracking-tight">Atajos</h2>
            <button
              onClick={onClose}
              className="ml-auto rounded-lg p-2 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <X width={16} height={16} />
            </button>
          </div>

          <div className="space-y-5">
            {GRUPOS.map((grupo) => (
              <div key={grupo.titulo}>
                <h3 className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-titulo uppercase">
                  {grupo.titulo}
                </h3>
                <div className="space-y-1.5">
                  {grupo.items.map(([tecla, que]) => (
                    <div key={tecla} className="flex items-center gap-3 text-[13px]">
                      <kbd className="min-w-24 rounded-lg border border-line bg-surface-2 px-2 py-1 text-center text-[11px] font-medium text-ink-soft">
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
