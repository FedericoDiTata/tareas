"use client";

import { motion } from "motion/react";
import { X } from "./Icons";
import { useEscape } from "@/lib/ui";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "En cualquier lado",
    items: [
      ["Ctrl K  ·  /", "Ir al buscador"],
      ["1  /  2", "Tablero / Escritorio"],
      ["Ctrl Z", "Deshacer lo último que borraste"],
      ["Esc", "Cerrar lo que esté abierto"],
      ["?", "Ver esta ayuda"],
    ],
  },
  {
    title: "Tablero",
    items: [
      ["+", "Nueva tarjeta arriba de la columna"],
      ["Enter", "Crear la tarjeta y seguir escribiendo"],
      ["Arrastrar", "Mover tarjetas y columnas"],
      ["Click", "Abrir la tarjeta"],
    ],
  },
  {
    title: "Escritorio",
    items: [
      ["Doble click", "Nuevo post-it donde clickeaste"],
      ["Ctrl V", "Pegar una captura o un texto"],
      ["Arrastrar el fondo", "Mover la vista"],
      ["Ctrl + rueda", "Zoom"],
      ["Arrastrar archivos", "Soltar imágenes en el canvas"],
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
        className="fixed inset-0 z-70 bg-black/45 backdrop-blur-sm"
      />
      <div className="pointer-events-none fixed inset-0 z-70 grid place-items-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
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
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
                  {group.title}
                </h3>
                <div className="space-y-1.5">
                  {group.items.map(([key, description]) => (
                    <div key={key} className="flex items-center gap-3 text-[13px]">
                      <kbd className="min-w-24 rounded-lg border border-line bg-surface-2 px-2 py-1 text-center text-[11px] font-medium text-ink-soft">
                        {key}
                      </kbd>
                      <span className="text-ink-soft">{description}</span>
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
