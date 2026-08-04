"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { Grupo, Lista } from "./Lista";
import { QuickAdd } from "./QuickAdd";
import { ChevronDown, Plus } from "./Icons";
import { useDatos } from "@/lib/store";
import { ordenar, proximos } from "@/lib/orden";
import {
  DIAS,
  ISODate,
  cuando,
  diferenciaDias,
  esHoy,
  fechaCorta,
  grillaDelMes,
  hoyISO,
  mesDe,
  nombreDiaSemana,
  nombreMes,
  numeroDia,
  sumarDias,
} from "@/lib/fechas";
import { PRIORIDAD_COLOR, Tarea } from "@/lib/types";
import { cn } from "@/lib/ui";

type Modo = "agenda" | "mes";

interface Props {
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
  onSesion: (ids: string[]) => void;
}

/** Lo que viene, en dos formas: día por día o el mes entero. */
export function Calendario(props: Props) {
  const [modo, setModo] = useState<Modo>("agenda");

  useEffect(() => {
    const guardado = localStorage.getItem("escritorio.calendario");
    if (guardado === "agenda" || guardado === "mes") setModo(guardado);
  }, []);

  function cambiar(nuevo: Modo) {
    setModo(nuevo);
    localStorage.setItem("escritorio.calendario", nuevo);
  }

  const selector = (
    <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5">
      {(
        [
          { id: "agenda" as const, texto: "Agenda" },
          { id: "mes" as const, texto: "Mes" },
        ]
      ).map((opcion) => (
        <button
          key={opcion.id}
          onClick={() => cambiar(opcion.id)}
          className={cn(
            "relative rounded-md px-3 py-1.5 text-[12.5px] transition-colors",
            modo === opcion.id ? "text-ink" : "text-ink-faint hover:text-ink-soft",
          )}
        >
          {modo === opcion.id && (
            <motion.span
              layoutId="modo-calendario"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-md bg-white/[0.07]"
            />
          )}
          <span className="relative">{opcion.texto}</span>
        </button>
      ))}
    </div>
  );

  return modo === "agenda" ? (
    <Agenda {...props} selector={selector} />
  ) : (
    <Mes {...props} selector={selector} />
  );
}

/* ── Agenda ──────────────────────────────────────────────────────────────── */

function Agenda({ onAbrir, onFoco, selector }: Props & { selector: React.ReactNode }) {
  const { datos } = useDatos();
  const tareas = useMemo(() => Object.values(datos.tareas), [datos.tareas]);
  const dias = useMemo(() => proximos(tareas, 21), [tareas]);

  const hoy = hoyISO();
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  const conTareas = new Map(dias);
  const masAdelante = dias.filter(([dia]) => !semana.includes(dia));

  const grupos: Grupo[] = [
    ...semana.map((dia) => ({
      clave: dia,
      titulo: cuando(dia).replace(/^./, (c) => c.toUpperCase()),
      nota: fechaCorta(dia),
      tareas: conTareas.get(dia) ?? [],
      quickAdd: { vence: dia },
    })),
    ...masAdelante.map(([dia, lista]) => ({
      clave: dia,
      titulo: `${nombreDiaSemana(dia)} ${fechaCorta(dia)}`,
      nota: `en ${diferenciaDias(hoy, dia)} días`,
      tareas: lista,
      quickAdd: { vence: dia },
    })),
  ];

  return (
    <Lista
      titulo="Calendario"
      subtitulo="Día por día"
      accion={selector}
      grupos={grupos}
      ocultarFecha
      onAbrir={onAbrir}
      onFoco={onFoco}
    />
  );
}

/* ── Mes ─────────────────────────────────────────────────────────────────── */

function Mes({ onAbrir, selector }: Props & { selector: React.ReactNode }) {
  const { datos, programar } = useDatos();
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => {
    const ahora = new Date();
    return { year: ahora.getFullYear(), month: ahora.getMonth() };
  });
  const [arrastrada, setArrastrada] = useState<Tarea | null>(null);
  const [agregandoEn, setAgregandoEn] = useState<ISODate | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const semanas = useMemo(() => grillaDelMes(mes.year, mes.month), [mes]);

  const porDia = useMemo(() => {
    const mapa = new Map<ISODate, Tarea[]>();
    for (const tarea of Object.values(datos.tareas)) {
      if (tarea.hecha || !tarea.vence) continue;
      mapa.set(tarea.vence, [...(mapa.get(tarea.vence) ?? []), tarea]);
    }
    for (const [dia, lista] of mapa) mapa.set(dia, ordenar(lista));
    return mapa;
  }, [datos.tareas]);

  function moverMes(delta: number) {
    setMes((prev) => {
      const fecha = new Date(prev.year, prev.month + delta, 1);
      return { year: fecha.getFullYear(), month: fecha.getMonth() };
    });
  }

  function alSoltar(evento: DragEndEvent) {
    setArrastrada(null);
    const destino = evento.over?.data.current as { iso?: ISODate } | undefined;
    if (destino?.iso) programar(String(evento.active.id), destino.iso);
  }

  return (
    <div className="flex h-full flex-col px-6 py-8 sm:px-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-titulo capitalize">
            {nombreMes(mes.year, mes.month)}
          </h1>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => moverMes(-1)}
              aria-label="Mes anterior"
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <ChevronDown width={15} height={15} className="rotate-90" />
            </button>
            <button
              onClick={() => {
                const ahora = new Date();
                setMes({ year: ahora.getFullYear(), month: ahora.getMonth() });
              }}
              className="rounded-lg px-2.5 py-1 text-[12.5px] text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              Hoy
            </button>
            <button
              onClick={() => moverMes(1)}
              aria-label="Mes siguiente"
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <ChevronDown width={15} height={15} className="-rotate-90" />
            </button>
          </div>
        </div>
        {selector}
      </header>

      <div className="grid grid-cols-7 pb-1.5">
        {DIAS.map((dia) => (
          <span
            key={dia}
            className="text-center text-[11px] font-medium tracking-wider text-ink-faint uppercase"
          >
            <span className="hidden sm:inline">{dia}</span>
            <span className="sm:hidden">{dia[0]}</span>
          </span>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) =>
          setArrastrada(datos.tareas[String(e.active.id)] ?? null)
        }
        onDragEnd={alSoltar}
        onDragCancel={() => setArrastrada(null)}
      >
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line">
          {semanas.map((semana) => (
            <div key={semana[0]} className="grid grid-cols-7 border-b border-line last:border-b-0">
              {semana.map((dia) => (
                <Celda
                  key={dia}
                  dia={dia}
                  delMes={mesDe(dia) === mes.month}
                  tareas={porDia.get(dia) ?? []}
                  agregando={agregandoEn === dia}
                  onAgregar={() => setAgregandoEn(dia)}
                  onCerrarAgregar={() => setAgregandoEn(null)}
                  onAbrir={onAbrir}
                />
              ))}
            </div>
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
          {arrastrada && (
            <div className="w-40 rotate-2">
              <Chip tarea={arrastrada} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <p className="pt-3 text-[11.5px] text-ink-faint">
        Arrastrá una tarea a otro día para reprogramarla.
      </p>
    </div>
  );
}

function Celda({
  dia,
  delMes,
  tareas,
  agregando,
  onAgregar,
  onCerrarAgregar,
  onAbrir,
}: {
  dia: ISODate;
  delMes: boolean;
  tareas: Tarea[];
  agregando: boolean;
  onAgregar: () => void;
  onCerrarAgregar: () => void;
  onAbrir: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `dia-${dia}`, data: { iso: dia } });
  const [verTodas, setVerTodas] = useState(false);

  const visibles = verTodas ? tareas : tareas.slice(0, 3);
  const ocultas = tareas.length - visibles.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/dia flex min-h-[116px] flex-col gap-1 border-r border-line p-1.5 transition-colors last:border-r-0",
        !delMes && "bg-white/[0.012]",
        isOver && "bg-brand/10",
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className={cn(
            "grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[12px] tabular-nums",
            esHoy(dia)
              ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] font-semibold text-white"
              : delMes
                ? "text-ink-soft"
                : "text-ink-faint",
          )}
        >
          {numeroDia(dia)}
        </span>
        <button
          onClick={onAgregar}
          title="Agregar tarea este día"
          className="grid h-5 w-5 place-items-center rounded-md text-ink-faint opacity-0 transition-opacity group-hover/dia:opacity-100 hover:bg-white/[0.06] hover:text-ink"
        >
          <Plus width={12} height={12} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {visibles.map((tarea) => (
            <ChipArrastrable key={tarea.id} tarea={tarea} onAbrir={onAbrir} />
          ))}
        </AnimatePresence>

        {ocultas > 0 && (
          <button
            onClick={() => setVerTodas(true)}
            className="px-1 text-left text-[11px] text-ink-faint transition-colors hover:text-ink-soft"
          >
            +{ocultas} más
          </button>
        )}

        {agregando && <QuickAddDia dia={dia} onListo={onCerrarAgregar} />}
      </div>
    </div>
  );
}

/** El campo de agregar, encogido para que entre en una celda. */
function QuickAddDia({ dia, onListo }: { dia: ISODate; onListo: () => void }) {
  return (
    <div className="-mx-1.5 text-[12px]">
      <QuickAdd vence={dia} autoFocus onListo={onListo} />
    </div>
  );
}

function ChipArrastrable({ tarea, onAbrir }: { tarea: Tarea; onAbrir: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: tarea.id,
  });

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      onClick={() => onAbrir(tarea.id)}
      className="cursor-grab touch-manipulation active:cursor-grabbing"
    >
      <Chip tarea={tarea} />
    </motion.div>
  );
}

function Chip({ tarea }: { tarea: Tarea }) {
  const { datos } = useDatos();
  const proyecto = datos.proyectos.find((p) => p.id === tarea.proyectoId);

  return (
    <div
      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] transition-colors hover:bg-white/[0.05]"
      style={{ background: proyecto ? undefined : undefined }}
      title={tarea.titulo}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background:
            tarea.prioridad === 4 ? "var(--ink-faint)" : PRIORIDAD_COLOR[tarea.prioridad],
        }}
      />
      <span className="min-w-0 flex-1 truncate text-ink-soft">{tarea.titulo || "Sin título"}</span>
    </div>
  );
}
