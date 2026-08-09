"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Semana } from "./Semana";
import { EditorEvento } from "./EditorEvento";
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
  largoEnDias,
  mesDe,
  nombreDiaSemana,
  nombreMes,
  numeroDia,
  rango,
  sumarDias,
} from "@/lib/fechas";
import { Evento, Tarea } from "@/lib/types";
import {
  Franja as FranjaTramo,
  eventosDe,
  franjasDeSemana,
} from "@/lib/eventos";
import { cn } from "@/lib/ui";

/** Alto de una franja de tramo y del renglón del número del día. */
const ALTO_FRANJA = 20;
const ALTO_CABECERA = 30;

type Modo = "agenda" | "semana" | "mes";

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
    if (guardado === "agenda" || guardado === "semana" || guardado === "mes") setModo(guardado);
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
          { id: "semana" as const, texto: "Semana" },
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

  if (modo === "agenda") return <Agenda {...props} selector={selector} />;
  if (modo === "semana") return <Semana selector={selector} onAbrir={props.onAbrir} />;
  return <Mes {...props} selector={selector} />;
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
  const { datos, correr } = useDatos();
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => {
    const ahora = new Date();
    return { year: ahora.getFullYear(), month: ahora.getMonth() };
  });
  const [arrastrada, setArrastrada] = useState<Tarea | null>(null);
  const [agregandoEn, setAgregandoEn] = useState<ISODate | null>(null);
  const [editando, setEditando] = useState<{ id: string; dia: ISODate } | null>(null);
  /** Qué día del tramo agarraste, para que al soltarlo no salte al primero. */
  const agarre = useRef(0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const semanas = useMemo(() => grillaDelMes(mes.year, mes.month), [mes]);
  const enEdicion = editando ? datos.eventos.find((e) => e.id === editando.id) : undefined;

  const tareas = useMemo(() => Object.values(datos.tareas), [datos.tareas]);

  // Lo de un día solo va adentro de su celda; lo que dura varios se dibuja como
  // una franja que cruza la semana.
  const porDia = useMemo(() => {
    const mapa = new Map<ISODate, Tarea[]>();
    for (const tarea of tareas) {
      if (tarea.hecha || !tarea.vence || tarea.hasta) continue;
      mapa.set(tarea.vence, [...(mapa.get(tarea.vence) ?? []), tarea]);
    }
    for (const [dia, lista] of mapa) mapa.set(dia, ordenar(lista));
    return mapa;
  }, [tareas]);

  function moverMes(delta: number) {
    setMes((prev) => {
      const fecha = new Date(prev.year, prev.month + delta, 1);
      return { year: fecha.getFullYear(), month: fecha.getMonth() };
    });
  }

  function alSoltar(evento: DragEndEvent) {
    setArrastrada(null);
    const destino = evento.over?.data.current as { iso?: ISODate } | undefined;
    // Se corre el tramo entero, y desde el día que agarraste: si tomás una
    // franja por el miércoles y la soltás en el viernes, se corre dos días.
    if (destino?.iso) correr(String(evento.active.id), sumarDias(destino.iso, -agarre.current));
  }

  function alEmpezar(e: DragStartEvent) {
    setArrastrada(datos.tareas[String(e.active.id)] ?? null);
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
        onDragStart={alEmpezar}
        onDragEnd={alSoltar}
        onDragCancel={() => setArrastrada(null)}
      >
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line">
          {semanas.map((semana) => {
            const franjas = franjasDeSemana(semana, tareas);
            const carriles = franjas.reduce((max, f) => Math.max(max, f.carril + 1), 0);
            return (
              <div
                key={semana[0]}
                className="relative grid grid-cols-7 border-b border-line last:border-b-0"
              >
                {semana.map((dia) => (
                  <Celda
                    key={dia}
                    dia={dia}
                    delMes={mesDe(dia) === mes.month}
                    tareas={porDia.get(dia) ?? []}
                    eventos={eventosDe(datos.eventos, dia)}
                    espacioFranjas={carriles * ALTO_FRANJA}
                    agregando={agregandoEn === dia}
                    onAgregar={() => setAgregandoEn(dia)}
                    onCerrarAgregar={() => setAgregandoEn(null)}
                    onAbrir={onAbrir}
                    onEditarEvento={(id) => setEditando({ id, dia })}
                  />
                ))}

                {/* Las franjas van encima de las celdas: una barra por tramo. */}
                <div
                  className="pointer-events-none absolute inset-x-0"
                  style={{ top: ALTO_CABECERA }}
                >
                  {franjas.map((franja) => (
                    <Franja
                      key={franja.tarea.id}
                      franja={franja}
                      onAgarre={(dias) => (agarre.current = dias)}
                      onAbrir={onAbrir}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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
        Arrastrá una tarea a otro día para reprogramarla. Los bloques con horario se ven en Semana.
      </p>

      <AnimatePresence>
        {enEdicion && (
          <EditorEvento
            evento={enEdicion}
            dia={editando?.dia}
            onCerrar={() => setEditando(null)}
            onAbrirTarea={onAbrir}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Celda({
  dia,
  delMes,
  tareas,
  eventos,
  espacioFranjas,
  agregando,
  onAgregar,
  onCerrarAgregar,
  onAbrir,
  onEditarEvento,
}: {
  dia: ISODate;
  delMes: boolean;
  tareas: Tarea[];
  eventos: Evento[];
  espacioFranjas: number;
  agregando: boolean;
  onAgregar: () => void;
  onCerrarAgregar: () => void;
  onAbrir: (id: string) => void;
  onEditarEvento: (id: string) => void;
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

      {/* El hueco que dejan las franjas de arriba. */}
      <div style={{ height: espacioFranjas }} />

      <div className="flex flex-col gap-1">
        {eventos.map((evento) => (
          <button
            key={evento.id}
            onClick={() => onEditarEvento(evento.id)}
            className={`tone-${evento.color} flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] transition-colors hover:bg-white/[0.05]`}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "rgb(var(--tone))" }}
            />
            <span className="shrink-0 text-ink-faint tabular-nums">{evento.desde}</span>
            <span className="min-w-0 flex-1 truncate text-ink-soft">{evento.titulo}</span>
          </button>
        ))}

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

/** El color de la tarea en el calendario es el de su proyecto. */
function useTono(tarea: Tarea) {
  const { datos } = useDatos();
  const proyecto = datos.proyectos.find((p) => p.id === tarea.proyectoId);
  return proyecto ? `tone-${proyecto.color}` : "";
}

function Chip({ tarea }: { tarea: Tarea }) {
  const tono = useTono(tarea);
  return (
    <div
      className={cn(
        tono,
        "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] transition-colors hover:bg-white/[0.05]",
      )}
      title={tarea.titulo}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: tono ? "rgb(var(--tone))" : "var(--ink-faint)" }}
      />
      <span className="min-w-0 flex-1 truncate text-ink-soft">{tarea.titulo || "Sin título"}</span>
    </div>
  );
}

/**
 * Una tarea de varios días, como barra que cruza la semana.
 *
 * Se arrastra desde cualquier punto y se corre entera: el día por el que la
 * agarraste se guarda en `data.agarre` para que no salte al primero.
 */
function Franja({
  franja,
  onAgarre,
  onAbrir,
}: {
  franja: FranjaTramo;
  onAgarre: (dias: number) => void;
  onAbrir: (id: string) => void;
}) {
  const { tarea, columna, ancho, vieneDeAntes, sigueDespues, carril } = franja;
  const tono = useTono(tarea);
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: tarea.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        // Por qué día la agarraste: si tomás el miércoles de una franja que
        // arranca el lunes y la soltás en el viernes, se corre dos días.
        const caja = e.currentTarget.getBoundingClientRect();
        const dia = Math.floor(((e.clientX - caja.left) / caja.width) * ancho);
        const yaPasados = diferenciaDias(tarea.vence!, franja.desde);
        onAgarre(yaPasados + Math.max(0, Math.min(ancho - 1, dia)));
        listeners?.onPointerDown?.(e as never);
      }}
      onClick={() => onAbrir(tarea.id)}
      title={`${tarea.titulo} · ${rango(tarea.vence!, tarea.hasta)}`}
      className={cn(
        tono,
        "pointer-events-auto absolute flex cursor-grab items-center gap-1.5 px-2 text-[11.5px] active:cursor-grabbing",
        vieneDeAntes ? "rounded-l-none" : "rounded-l-md",
        sigueDespues ? "rounded-r-none" : "rounded-r-md",
      )}
      style={{
        left: `calc(${(columna / 7) * 100}% + 3px)`,
        width: `calc(${(ancho / 7) * 100}% - 6px)`,
        top: carril * ALTO_FRANJA,
        height: ALTO_FRANJA - 3,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
        background: tono
          ? "color-mix(in srgb, rgb(var(--tone)) 24%, transparent)"
          : "color-mix(in srgb, var(--ink-faint) 22%, transparent)",
        borderLeft: vieneDeAntes
          ? undefined
          : `2.5px solid ${tono ? "rgb(var(--tone))" : "var(--ink-faint)"}`,
      }}
    >
      {vieneDeAntes && <span className="shrink-0 text-ink-faint">←</span>}
      <span className="min-w-0 flex-1 truncate text-ink">{tarea.titulo || "Sin título"}</span>
      {sigueDespues && <span className="shrink-0 text-ink-faint">→</span>}
    </div>
  );
}
