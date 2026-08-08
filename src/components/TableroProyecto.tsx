"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { QuickAdd } from "./QuickAdd";
import { Popover } from "./Popover";
import { CalendarIcon, Check, Dots, ListIcon, Play, Trash } from "./Icons";
import { useDatos } from "@/lib/store";
import { ordenar } from "@/lib/orden";
import { cuando } from "@/lib/fechas";
import { PRIORIDAD_COLOR, Tarea } from "@/lib/types";
import { estaAtrasada } from "@/lib/orden";
import { cn } from "@/lib/ui";

interface Props {
  proyectoId: string;
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
}

const SIN_SECCION = "sin-seccion";

/** El proyecto en columnas: cada sección es una columna. */
export function TableroProyecto({ proyectoId, onAbrir, onFoco }: Props) {
  const { datos, moverASeccion, reordenar } = useDatos();
  const [arrastrada, setArrastrada] = useState<Tarea | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const secciones = useMemo(
    () =>
      datos.secciones
        .filter((s) => s.proyectoId === proyectoId)
        .sort((a, b) => a.orden - b.orden),
    [datos.secciones, proyectoId],
  );

  const columnas = useMemo(() => {
    const tareas = Object.values(datos.tareas).filter(
      (t) => !t.hecha && t.proyectoId === proyectoId,
    );
    return [
      {
        id: SIN_SECCION,
        nombre: "Backlog",
        tareas: ordenar(tareas.filter((t) => !t.seccionId)),
      },
      ...secciones.map((seccion) => ({
        id: seccion.id,
        nombre: seccion.nombre,
        tareas: ordenar(tareas.filter((t) => t.seccionId === seccion.id)),
      })),
    ];
  }, [datos.tareas, proyectoId, secciones]);

  const columnaDe = (tareaId: string) =>
    columnas.find((columna) => columna.tareas.some((t) => t.id === tareaId));

  const destinoDe = (over: DragOverEvent["over"]): string | undefined => {
    if (!over) return undefined;
    const data = over.data.current as { tipo?: string; columnaId?: string } | undefined;
    if (data?.columnaId) return data.columnaId;
    if (data?.tipo === "tarea") return columnaDe(String(over.id))?.id;
    return undefined;
  };

  function alPasar(evento: DragOverEvent) {
    const { active, over } = evento;
    if (!over) return;
    const origen = columnaDe(String(active.id));
    const destino = destinoDe(over);
    if (!origen || !destino || origen.id === destino) return;
    moverASeccion(String(active.id), destino === SIN_SECCION ? null : destino, Date.now());
  }

  function alSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    setArrastrada(null);
    if (!over) return;

    const columna = columnaDe(String(active.id));
    const data = over.data.current as { tipo?: string } | undefined;
    if (!columna || data?.tipo !== "tarea") return;

    const ids = columna.tareas.map((t) => t.id);
    const desde = ids.indexOf(String(active.id));
    const hasta = ids.indexOf(String(over.id));
    if (desde < 0 || hasta < 0 || desde === hasta) return;

    const reordenados = [...ids];
    const [movida] = reordenados.splice(desde, 1);
    reordenados.splice(hasta, 0, movida);
    reordenar(reordenados);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setArrastrada(datos.tareas[String(e.active.id)] ?? null)}
      onDragOver={alPasar}
      onDragEnd={alSoltar}
      onDragCancel={() => setArrastrada(null)}
    >
      <div data-tablero className="h-full overflow-x-auto">
        <div className="flex h-full items-start gap-2.5 px-6 pt-2 pb-6 sm:px-10">
          {columnas.map((columna) => (
            <Columna
              key={columna.id}
              id={columna.id}
              nombre={columna.nombre}
              tareas={columna.tareas}
              proyectoId={proyectoId}
              onAbrir={onAbrir}
              onFoco={onFoco}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
        {arrastrada && (
          <div className="w-[264px] rotate-2">
            <Tarjeta tarea={arrastrada} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Columna({
  id,
  nombre,
  tareas,
  proyectoId,
  onAbrir,
  onFoco,
}: {
  id: string;
  nombre: string;
  tareas: Tarea[];
  proyectoId: string;
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
}) {
  const { actualizarSeccion, borrarSeccion } = useDatos();
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${id}`,
    data: { tipo: "columna", columnaId: id },
  });
  const [menu, setMenu] = useState(false);
  const [ancla, setAncla] = useState<HTMLElement | null>(null);
  const esSeccionReal = id !== SIN_SECCION;

  return (
    <div className="flex min-w-[208px] max-w-[330px] flex-1 basis-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <h3
          className={cn(
            "truncate text-[16px] font-medium",
            esSeccionReal ? "text-ink-soft" : "text-titulo",
          )}
        >
          {nombre}
        </h3>
        {!esSeccionReal && (
          <span className="rounded-md border border-dashed border-line-strong px-1.5 py-px text-[11px] text-ink-faint">
            sin sección
          </span>
        )}
        <span className="text-[12px] text-ink-faint tabular-nums">{tareas.length}</span>
        {esSeccionReal && (
          <>
            <button
              ref={setAncla}
              onClick={() => setMenu((v) => !v)}
              className="ml-auto rounded-md p-1 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <Dots width={14} height={14} />
            </button>
            {menu && (
              <Popover anchor={ancla} onClose={() => setMenu(false)} width={220}>
                <input
                  value={nombre}
                  onChange={(e) => actualizarSeccion(id, { nombre: e.target.value })}
                  className="mb-2 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-brand/40"
                />
                <button
                  onClick={() => {
                    borrarSeccion(id);
                    setMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-rose-400 transition-colors hover:bg-rose-500/10"
                >
                  <Trash width={14} height={14} />
                  Borrar sección
                </button>
                <p className="px-2 pt-1.5 text-[11.5px] text-ink-faint">
                  Las tareas vuelven al Backlog.
                </p>
              </Popover>
            )}
          </>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[80px] flex-col gap-2 rounded-xl p-1 transition-colors",
          isOver && "bg-brand/5",
        )}
      >
        <SortableContext items={tareas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {tareas.map((tarea) => (
              <TarjetaArrastrable
                key={tarea.id}
                tarea={tarea}
                columnaId={id}
                onAbrir={onAbrir}
                onFoco={onFoco}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        <QuickAdd
          proyectoId={proyectoId}
          seccionId={esSeccionReal ? id : undefined}
        />
      </div>
    </div>
  );
}

function TarjetaArrastrable({
  tarea,
  columnaId,
  onAbrir,
  onFoco,
}: {
  tarea: Tarea;
  columnaId: string;
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: tarea.id,
    data: { tipo: "tarea", columnaId },
  });

  return (
    <motion.div
      layout="position"
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-manipulation active:cursor-grabbing"
    >
      <Tarjeta tarea={tarea} onAbrir={onAbrir} onFoco={onFoco} />
    </motion.div>
  );
}

function Tarjeta({
  tarea,
  onAbrir,
  onFoco,
}: {
  tarea: Tarea;
  onAbrir?: (id: string) => void;
  onFoco?: (id: string) => void;
}) {
  const { completar } = useDatos();
  const pasos = tarea.pasos.length;
  const hechos = tarea.pasos.filter((p) => p.hecho).length;
  const atrasada = estaAtrasada(tarea);

  return (
    <div className="group rounded-xl border border-line bg-surface/70 p-2.5 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            completar(tarea.id);
          }}
          className="mt-0.5 grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border-[1.5px] text-transparent transition-all hover:scale-110"
          style={{ borderColor: PRIORIDAD_COLOR[tarea.prioridad] }}
        >
          <Check width={10} height={10} strokeWidth={3.5} />
        </button>

        <button
          onClick={() => onAbrir?.(tarea.id)}
          className="min-w-0 flex-1 text-left text-[13.5px] leading-snug break-words text-ink"
        >
          {tarea.titulo || "Sin título"}
        </button>

        {onFoco && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFoco(tarea.id);
            }}
            title="Foco"
            className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-brand"
          >
            <Play width={13} height={13} />
          </button>
        )}
      </div>

      {(tarea.vence || pasos > 0) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5 pl-[27px] text-[11.5px]">
          {tarea.vence && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                atrasada ? "text-amber-500/90" : "text-ink-faint",
              )}
            >
              <CalendarIcon width={11} height={11} />
              {cuando(tarea.vence)}
            </span>
          )}
          {pasos > 0 && (
            <span className="inline-flex items-center gap-1 text-ink-faint">
              <ListIcon width={11} height={11} />
              {hechos}/{pasos}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
