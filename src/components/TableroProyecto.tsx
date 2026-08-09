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
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { QuickAdd } from "./QuickAdd";
import { Popover } from "./Popover";
import { CalendarIcon, Check, Dots, ListIcon, Play, Trash } from "./Icons";
import { useDatos } from "@/lib/store";
import { ordenar } from "@/lib/orden";
import { cuandoRango } from "@/lib/fechas";
import { Tarea } from "@/lib/types";
import { estaAtrasada } from "@/lib/orden";
import { cn } from "@/lib/ui";

interface Props {
  proyectoId: string;
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
}

const SIN_SECCION = "sin-seccion";
/** Cuántos pasos se ven en la tarjeta antes de mandar a abrirla. */
const TOPE_PASOS = 6;

/** El proyecto en columnas: cada sección es una columna. */
export function TableroProyecto({ proyectoId, onAbrir, onFoco }: Props) {
  const { datos, moverASeccion, reordenar, reordenarSecciones } = useDatos();
  const [arrastrada, setArrastrada] = useState<Tarea | null>(null);
  const [columnaEnMano, setColumnaEnMano] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // Las secciones completadas salen del tablero: el cuatrimestre que terminó no
  // tiene por qué seguir ocupando pantalla.
  const secciones = useMemo(
    () =>
      datos.secciones
        .filter((s) => s.proyectoId === proyectoId && !s.completadaEn)
        .sort((a, b) => a.orden - b.orden),
    [datos.secciones, proyectoId],
  );

  const columnas = useMemo(() => {
    const tareas = Object.values(datos.tareas).filter(
      (t) => !t.hecha && t.proyectoId === proyectoId,
    );
    const activas = new Set(secciones.map((s) => s.id));
    return [
      {
        id: SIN_SECCION,
        nombre: "Backlog",
        // Si una tarea quedó apuntando a una sección completada, cae acá: nada
        // puede volverse invisible.
        tareas: ordenar(tareas.filter((t) => !t.seccionId || !activas.has(t.seccionId))),
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

  /**
   * Tareas y columnas se arrastran en el mismo tablero, así que cada arrastre
   * sólo ve los destinos que le corresponden. Sin esto, una tarjeta puede
   * "aterrizar" sobre el contenedor de la columna y quedarse sin destino.
   */
  function detectar(args: Parameters<typeof closestCorners>[0]) {
    const moviendoColumna = args.active.data.current?.tipo === "seccion";
    const sirve = (tipo?: string) =>
      moviendoColumna ? tipo === "seccion" : tipo === "columna" || tipo === "tarea";
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) =>
        sirve(c.data.current?.tipo as string | undefined),
      ),
    });
  }

  function alEmpezar(evento: DragStartEvent) {
    if (evento.active.data.current?.tipo === "seccion") {
      setColumnaEnMano(String(evento.active.data.current.seccionId));
      return;
    }
    setArrastrada(datos.tareas[String(evento.active.id)] ?? null);
  }

  function alSoltarColumna(evento: DragEndEvent) {
    const { active, over } = evento;
    setColumnaEnMano(null);
    if (!over || active.id === over.id) return;

    const ids = secciones.map((s) => s.id);
    const desde = ids.indexOf(String(active.data.current?.seccionId));
    const hasta = ids.indexOf(String(over.data.current?.seccionId));
    if (desde < 0 || hasta < 0 || desde === hasta) return;

    const reordenadas = [...ids];
    const [movida] = reordenadas.splice(desde, 1);
    reordenadas.splice(hasta, 0, movida);
    reordenarSecciones(reordenadas);
  }

  function alPasar(evento: DragOverEvent) {
    const { active, over } = evento;
    if (!over || active.data.current?.tipo === "seccion") return;
    const origen = columnaDe(String(active.id));
    const destino = destinoDe(over);
    if (!origen || !destino || origen.id === destino) return;
    moverASeccion(String(active.id), destino === SIN_SECCION ? null : destino, Date.now());
  }

  function alSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (active.data.current?.tipo === "seccion") {
      alSoltarColumna(evento);
      return;
    }
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
      collisionDetection={detectar}
      onDragStart={alEmpezar}
      onDragOver={alPasar}
      onDragEnd={alSoltar}
      onDragCancel={() => {
        setArrastrada(null);
        setColumnaEnMano(null);
      }}
    >
      <div data-tablero className="h-full overflow-x-auto">
        <div className="flex h-full items-start gap-2.5 px-6 pt-2 pb-6 sm:px-10">
          {/* El Backlog no se ordena: es el colchón y va siempre primero. */}
          <SortableContext
            items={secciones.map((s) => `sec-${s.id}`)}
            strategy={horizontalListSortingStrategy}
          >
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
          </SortableContext>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
        {arrastrada && (
          <div className="w-[264px] rotate-2">
            <Tarjeta tarea={arrastrada} />
          </div>
        )}
        {columnaEnMano && (
          <div className="panel w-[240px] rounded-xl px-3 py-2 text-[15px] font-medium text-ink-soft">
            {secciones.find((s) => s.id === columnaEnMano)?.nombre}
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
  const { actualizarSeccion, borrarSeccion, completarSeccion } = useDatos();
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${id}`,
    data: { tipo: "columna", columnaId: id },
  });
  const [menu, setMenu] = useState(false);
  const [ancla, setAncla] = useState<HTMLElement | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const esSeccionReal = id !== SIN_SECCION;

  // El Backlog no se arrastra: siempre va primero.
  const orden = useSortable({
    id: `sec-${id}`,
    disabled: !esSeccionReal,
    data: esSeccionReal ? { tipo: "seccion", seccionId: id } : { tipo: "backlog" },
  });

  const abiertas = tareas.length;

  return (
    <div
      ref={orden.setNodeRef}
      style={{
        transform: CSS.Translate.toString(orden.transform),
        transition: orden.transition,
      }}
      className={cn(
        "flex min-w-[208px] max-w-[272px] flex-1 basis-0 flex-col",
        orden.isDragging && "opacity-40",
      )}
    >
      {/* El encabezado entero es la agarradera: un ícono al lado del título le
          comía 25px a cada columna incluso estando invisible. */}
      <div
        {...(esSeccionReal ? orden.attributes : {})}
        {...(esSeccionReal ? orden.listeners : {})}
        title={esSeccionReal ? "Arrastrar para reordenar" : undefined}
        className={cn(
          "mb-2 flex items-center gap-1.5 px-1",
          esSeccionReal && "cursor-grab select-none active:cursor-grabbing",
        )}
      >
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
              className="ml-auto cursor-pointer rounded-md p-1 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <Dots width={14} height={14} />
            </button>
            {menu && (
              <Popover
                anchor={ancla}
                onClose={() => {
                  setMenu(false);
                  setCerrando(false);
                }}
                width={244}
              >
                <input
                  value={nombre}
                  onChange={(e) => actualizarSeccion(id, { nombre: e.target.value })}
                  className="mb-2 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-brand/40"
                />

                {cerrando && abiertas > 0 ? (
                  <div className="rounded-xl border border-line bg-surface-2 p-2">
                    <p className="px-1 pb-2 text-[12px] leading-relaxed text-ink-soft">
                      {abiertas === 1
                        ? "Queda 1 sin terminar. ¿Qué hago con esa?"
                        : `Quedan ${abiertas} sin terminar. ¿Qué hago con esas?`}
                    </p>
                    <button
                      onClick={() => {
                        completarSeccion(id, "completar");
                        setMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-ink"
                    >
                      <Check width={13} height={13} />
                      Darlas por terminadas
                    </button>
                    <button
                      onClick={() => {
                        completarSeccion(id, "backlog");
                        setMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-ink"
                    >
                      <ListIcon width={13} height={13} />
                      Mandarlas al Backlog
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (abiertas > 0) {
                        setCerrando(true);
                        return;
                      }
                      completarSeccion(id, "completar");
                      setMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-ink"
                  >
                    <Check width={14} height={14} />
                    Completar sección
                  </button>
                )}

                <p className="px-2 pt-1.5 pb-2 text-[11.5px] leading-relaxed text-ink-faint">
                  Sale del tablero pero no se borra: queda en Completadas con todo lo que hiciste.
                </p>

                <div className="my-1 h-px bg-line" />

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
  const { completar, editarPaso } = useDatos();
  const pasos = tarea.pasos.length;
  const hechos = tarea.pasos.filter((p) => p.hecho).length;
  const atrasada = estaAtrasada(tarea);

  // Una tarea con quince pasos rompería la columna: se muestran los primeros y
  // el resto queda a un click.
  const visibles = tarea.pasos.slice(0, TOPE_PASOS);
  const ocultos = pasos - visibles.length;

  return (
    <div className="group rounded-xl border border-line bg-surface/70 p-2.5 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            completar(tarea.id);
          }}
          className="mt-0.5 grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border-[1.5px] border-line-strong text-transparent transition-all hover:scale-110 hover:border-brand"
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

      {/* Las notas se leen desde el tablero: si hay que abrir la tarjeta para
          saber qué decía, la nota no sirve de nada. */}
      {tarea.notas.trim() && (
        <button
          onClick={() => onAbrir?.(tarea.id)}
          className="mt-1.5 line-clamp-3 w-full pl-[27px] text-left text-[12px] leading-relaxed break-words whitespace-pre-wrap text-ink-faint"
        >
          {tarea.notas.trim()}
        </button>
      )}

      {visibles.length > 0 && (
        <div className="mt-2 space-y-0.5 pl-[27px]">
          {visibles.map((paso) => (
            <button
              key={paso.id}
              onClick={(e) => {
                e.stopPropagation();
                editarPaso(tarea.id, paso.id, { hecho: !paso.hecho });
              }}
              className="flex w-full items-start gap-2 rounded-md py-0.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              {/* En violeta para que la lista de pasos se despegue de las notas. */}
              <span
                className={cn(
                  "mt-[3px] grid h-[13px] w-[13px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                  paso.hecho
                    ? "border-brand bg-brand text-white"
                    : "border-brand/60 text-transparent hover:border-brand",
                )}
              >
                <Check width={8} height={8} strokeWidth={4} />
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-[12px] leading-snug break-words",
                  paso.hecho ? "text-ink-faint line-through" : "text-titulo",
                )}
              >
                {paso.texto}
              </span>
            </button>
          ))}
          {ocultos > 0 && (
            <button
              onClick={() => onAbrir?.(tarea.id)}
              className="pl-[21px] text-[11.5px] text-ink-faint transition-colors hover:text-ink"
            >
              +{ocultos} {ocultos === 1 ? "paso más" : "pasos más"}
            </button>
          )}
        </div>
      )}

      {(tarea.vence || pasos > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2.5 pl-[27px] text-[11.5px]">
          {tarea.vence && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                atrasada ? "text-amber-500/90" : "text-ink-faint",
              )}
            >
              <CalendarIcon width={11} height={11} />
              {cuandoRango(tarea.vence, tarea.hasta)}
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
