"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "./Icons";
import { useDatos } from "@/lib/store";
import { parsear } from "@/lib/parseo";
import { cn } from "@/lib/ui";

interface Props {
  /** Valores por defecto de la vista donde estás parado. */
  proyectoId?: string;
  seccionId?: string;
  vence?: string;
  autoFocus?: boolean;
  onListo?: () => void;
}

/**
 * Una tarea entera en un renglón: "Llamar al contador mañana #Trabajo".
 *
 * Mientras escribís se van reconociendo la fecha y el proyecto, y
 * aparecen como chips debajo. Es la diferencia entre anotar en dos segundos o
 * abrir un formulario — y en un formulario la idea se muere.
 */
export function QuickAdd({ proyectoId, seccionId, vence, autoFocus, onListo }: Props) {
  const { datos, agregar, crearProyecto } = useDatos();
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(Boolean(autoFocus));
  const input = useRef<HTMLInputElement>(null);

  const leido = useMemo(() => parsear(texto), [texto]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  function guardar() {
    const { titulo, chips, ...resto } = leido;
    if (!titulo.trim()) return;

    let destino = proyectoId;
    if (resto.proyecto) {
      const existente = datos.proyectos.find(
        (p) => p.nombre.toLowerCase() === resto.proyecto!.toLowerCase(),
      );
      destino = existente?.id ?? crearProyecto(resto.proyecto);
    }

    agregar({
      titulo,
      vence: resto.vence ?? vence,
      proyectoId: destino,
      // Si la tarea se muda de proyecto por el #, la sección deja de aplicar.
      seccionId: destino === proyectoId ? seccionId : undefined,
      orden: Date.now(),
    });

    setTexto("");
    input.current?.focus();
  }

  return (
    <div className="py-1">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
          activo ? "border-brand/40 bg-surface/60" : "border-transparent hover:bg-white/[0.02]",
        )}
      >
        <Plus
          width={16}
          height={16}
          className={cn("shrink-0 transition-colors", activo ? "text-brand" : "text-ink-faint")}
        />
        <input
          ref={input}
          value={texto}
          onFocus={() => setActivo(true)}
          onBlur={() => {
            if (!texto) setActivo(false);
          }}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              guardar();
            }
            if (e.key === "Escape") {
              setTexto("");
              input.current?.blur();
              onListo?.();
            }
          }}
          placeholder="Agregar tarea"
          className="w-full bg-transparent text-[14.5px] outline-none placeholder:text-ink-faint"
        />
      </div>

      <AnimatePresence>
        {leido.chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-1.5 px-10 pt-2 pb-1">
              {leido.chips.map((chip) => (
                <span
                  key={chip.tipo + chip.texto}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11.5px]",
                    chip.tipo === "fecha" && "bg-emerald-500/12 text-emerald-400",
                    chip.tipo === "proyecto" && "bg-brand/12 text-brand",
                  )}
                >
                  {chip.texto}
                </span>
              ))}
              <span className="text-[11.5px] text-ink-faint">· Enter para guardar</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activo && leido.chips.length === 0 && (
        <p className="px-10 pt-1.5 text-[11.5px] text-ink-faint">
          Probá: mañana · el viernes · en 3 días · #Proyecto
        </p>
      )}
    </div>
  );
}
