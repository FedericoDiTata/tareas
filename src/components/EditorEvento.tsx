"use client";

import { motion } from "motion/react";
import { ColorPicker } from "./ColorPicker";
import { Trash, X } from "./Icons";
import { useDatos } from "@/lib/store";
import { Evento } from "@/lib/types";
import { DIAS_LARGOS_INDICE } from "@/lib/eventos";
import { fechaCorta } from "@/lib/fechas";
import { useEscape } from "@/lib/ui";

interface Props {
  evento: Evento;
  /** El día concreto en que se lo abrió, para poder saltear sólo esa fecha. */
  dia?: string;
  onCerrar: () => void;
  onAbrirTarea?: (id: string) => void;
}

/** Editar un bloque del calendario: qué es, cuándo, de qué color. */
export function EditorEvento({ evento, dia, onCerrar, onAbrirTarea }: Props) {
  const { actualizarEvento, borrarEvento, saltearEvento } = useDatos();
  useEscape(true, onCerrar);

  const repite = evento.diaSemana !== undefined;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onCerrar}
        className="fixed inset-0 z-80 bg-black/50 backdrop-blur-[2px]"
      />
      <div className="pointer-events-none fixed inset-0 z-80 grid place-items-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={`panel tone-${evento.color} pointer-events-auto w-full max-w-sm rounded-2xl p-5`}
        >
          <div className="mb-4 flex items-start gap-2">
            <span
              className="mt-2 h-3 w-3 shrink-0 rounded-full"
              style={{ background: "rgb(var(--tone))" }}
            />
            <input
              autoFocus={!evento.titulo}
              value={evento.titulo}
              onChange={(e) => actualizarEvento(evento.id, { titulo: e.target.value })}
              placeholder="¿Qué es?"
              className="min-w-0 flex-1 bg-transparent text-[17px] font-medium outline-none placeholder:text-ink-faint"
            />
            <button
              onClick={onCerrar}
              className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <X width={15} height={15} />
            </button>
          </div>

          <div className="space-y-3 text-[13px]">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-ink-faint">Horario</span>
              <input
                type="time"
                value={evento.desde}
                onChange={(e) => actualizarEvento(evento.id, { desde: e.target.value })}
                className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 outline-none focus:border-brand/40"
              />
              <span className="text-ink-faint">a</span>
              <input
                type="time"
                value={evento.hasta}
                onChange={(e) => actualizarEvento(evento.id, { hasta: e.target.value })}
                className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 outline-none focus:border-brand/40"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-ink-faint">Cuándo</span>
              <select
                value={repite ? `s${evento.diaSemana}` : "fecha"}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor === "fecha") {
                    actualizarEvento(evento.id, {
                      diaSemana: undefined,
                      excepciones: undefined,
                      dia: dia ?? evento.dia,
                    });
                  } else {
                    actualizarEvento(evento.id, {
                      diaSemana: Number(valor.slice(1)),
                      dia: undefined,
                    });
                  }
                }}
                className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 outline-none focus:border-brand/40"
              >
                <option value="fecha">Una sola vez</option>
                {DIAS_LARGOS_INDICE.map(({ nombre, indice }) => (
                  <option key={indice} value={`s${indice}`}>
                    Todos los {nombre}
                  </option>
                ))}
              </select>
            </div>

            {!repite && (
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-ink-faint">Día</span>
                <input
                  type="date"
                  value={evento.dia ?? ""}
                  onChange={(e) => actualizarEvento(evento.id, { dia: e.target.value })}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 outline-none focus:border-brand/40"
                />
              </div>
            )}

            <div className="flex items-start gap-3">
              <span className="w-16 shrink-0 pt-1.5 text-ink-faint">Color</span>
              <ColorPicker
                value={evento.color}
                onChange={(color) => actualizarEvento(evento.id, { color })}
                size="sm"
              />
            </div>

            <div className="flex items-start gap-3">
              <span className="w-16 shrink-0 pt-1.5 text-ink-faint">Nota</span>
              <textarea
                value={evento.nota ?? ""}
                onChange={(e) => actualizarEvento(evento.id, { nota: e.target.value })}
                placeholder="Presencial, virtual, dónde…"
                rows={2}
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 leading-relaxed outline-none focus:border-brand/40"
              />
            </div>
          </div>

          {evento.tareaId && onAbrirTarea && (
            <button
              onClick={() => {
                onCerrar();
                onAbrirTarea(evento.tareaId!);
              }}
              className="mt-4 w-full rounded-xl border border-line py-2 text-[12.5px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
            >
              Ver la tarea
            </button>
          )}

          <div className="mt-5 flex items-center gap-2 border-t border-line pt-3">
            {repite && dia && (
              <button
                onClick={() => {
                  saltearEvento(evento.id, dia);
                  onCerrar();
                }}
                title={`No va el ${fechaCorta(dia)}`}
                className="rounded-xl px-2.5 py-2 text-[12.5px] text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                Saltear el {fechaCorta(dia)}
              </button>
            )}
            <button
              onClick={() => {
                borrarEvento(evento.id);
                onCerrar();
              }}
              className="ml-auto flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12.5px] text-rose-400 transition-colors hover:bg-rose-500/10"
            >
              <Trash width={13} height={13} />
              Borrar
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
