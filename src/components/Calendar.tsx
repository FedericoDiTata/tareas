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
import { ChevronDown, ListIcon, Plus, Star } from "./Icons";
import { Card } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  DIAS,
  ISODate,
  diferenciaDias,
  esHoy,
  esPasado,
  grillaDelMes,
  hoyISO,
  largoEnDias,
  mesDe,
  nombreMes,
  numeroDia,
  sumarDias,
} from "@/lib/fechas";
import { cn } from "@/lib/ui";

interface Props {
  onOpenCard: (id: string) => void;
  onlyStarred: boolean;
}

type Segmento = {
  card: Card;
  col: number;
  span: number;
  lane: number;
  vieneDeAntes: boolean;
  sigueDespues: boolean;
};

/**
 * Acomoda las tarjetas de una semana en carriles. Una tarjeta de varios días es
 * una sola barra que cruza los días: por eso hay que buscarle un carril libre en
 * vez de apilarlas por día.
 */
function segmentosDeSemana(semana: ISODate[], cards: Card[]): Segmento[] {
  const inicio = semana[0];
  const fin = semana[6];

  const dentro = cards
    .filter((card) => {
      const desde = card.startsOn!;
      const hasta = card.endsOn ?? desde;
      return desde <= fin && hasta >= inicio;
    })
    .sort((a, b) => {
      if (a.startsOn! !== b.startsOn!) return a.startsOn! < b.startsOn! ? -1 : 1;
      return largoEnDias(b.startsOn!, b.endsOn) - largoEnDias(a.startsOn!, a.endsOn);
    });

  const carriles: Array<Set<number>> = [];

  return dentro.map((card) => {
    const desde = card.startsOn!;
    const hasta = card.endsOn ?? desde;
    const col = Math.max(0, diferenciaDias(inicio, desde));
    const colFin = Math.min(6, diferenciaDias(inicio, hasta));

    let lane = 0;
    while (true) {
      const ocupado = carriles[lane];
      if (!ocupado) {
        carriles[lane] = new Set();
        break;
      }
      let libre = true;
      for (let c = col; c <= colFin; c += 1) if (ocupado.has(c)) libre = false;
      if (libre) break;
      lane += 1;
    }
    for (let c = col; c <= colFin; c += 1) carriles[lane].add(c);

    return {
      card,
      col,
      span: colFin - col + 1,
      lane,
      vieneDeAntes: desde < inicio,
      sigueDespues: hasta > fin,
    };
  });
}

export function Calendar({ onOpenCard, onlyStarred }: Props) {
  const { state, schedule, addCard } = useStore();
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => {
    const ahora = new Date();
    return { year: ahora.getFullYear(), month: ahora.getMonth() };
  });
  const [arrastrada, setArrastrada] = useState<Card | null>(null);
  const [estirando, setEstirando] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const cards = useMemo(() => {
    const todas = Object.values(state.cards);
    return onlyStarred ? todas.filter((card) => card.starred) : todas;
  }, [state.cards, onlyStarred]);

  const agendadas = useMemo(() => cards.filter((card) => card.startsOn), [cards]);

  // En el mismo orden que el tablero: si ordenara por fecha de edición, la lista
  // se reacomodaría sola cada vez que tocás una tarjeta.
  const sinFecha = useMemo(() => {
    const disponibles = new Set(cards.filter((card) => !card.startsOn).map((card) => card.id));
    return state.columns
      .flatMap((columna) => columna.cardIds)
      .filter((id) => disponibles.has(id))
      .map((id) => state.cards[id]);
  }, [cards, state.columns, state.cards]);

  const semanas = useMemo(() => grillaDelMes(mes.year, mes.month), [mes]);

  /**
   * El estirado se escucha en la ventana, no en la manija.
   *
   * La manija vive en el último tramo de la barra: apenas la tarjeta pasa a la
   * semana siguiente, ese tramo deja de ser el último y React la desmonta. Si el
   * arrastre dependiera de ella, se cortaba justo al cambiar de línea y encima
   * quedaba trabado (la capa de barras seguía sin eventos hasta refrescar).
   */
  useEffect(() => {
    if (!estirando) return;

    const mover = (e: PointerEvent) => {
      const celda = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
        "[data-dia]",
      ) as HTMLElement | null;
      const iso = celda?.dataset.dia;
      const card = state.cards[estirando];
      if (!iso || !card?.startsOn || iso < card.startsOn) return;
      if (iso !== (card.endsOn ?? card.startsOn)) schedule(card.id, card.startsOn, iso);
    };

    const soltar = () => setEstirando(null);

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    window.addEventListener("blur", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      window.removeEventListener("blur", soltar);
    };
  }, [estirando, state.cards, schedule]);

  function moverMes(delta: number) {
    setMes((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function irAHoy() {
    const ahora = new Date();
    setMes({ year: ahora.getFullYear(), month: ahora.getMonth() });
  }

  function onDragStart(event: DragStartEvent) {
    setArrastrada(state.cards[String(event.active.id)] ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    const card = arrastrada;
    setArrastrada(null);
    const destino = event.over?.data.current as
      | { tipo?: string; iso?: ISODate }
      | undefined;
    if (!card || !destino) return;

    if (destino.tipo === "dia" && destino.iso) {
      // Al mover se conserva cuántos días ocupa: mover no es reprogramar el largo.
      const dias = card.startsOn ? largoEnDias(card.startsOn, card.endsOn) : 1;
      schedule(card.id, destino.iso, dias > 1 ? sumarDias(destino.iso, dias - 1) : null);
      return;
    }
    if (destino.tipo === "sinFecha") schedule(card.id, null);
  }

  /** Crea la tarjeta directamente en ese día y la abre para ponerle título. */
  function crearEn(iso: ISODate) {
    const columna = state.columns[0];
    if (!columna) return;
    const id = addCard(columna.id, "");
    schedule(id, iso);
    onOpenCard(id);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setArrastrada(null)}
    >
      <div className="flex h-full flex-col gap-3 px-4 pt-3 pb-4 sm:px-6 lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Mes */}
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold tracking-tight capitalize sm:text-2xl">
              {nombreMes(mes.year, mes.month)}
            </h2>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => moverMes(-1)}
                aria-label="Mes anterior"
                className="grid h-8 w-8 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-line/70 hover:text-ink"
              >
                <ChevronDown width={16} height={16} className="rotate-90" />
              </button>
              <button
                onClick={irAHoy}
                className="rounded-xl px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-line/70 hover:text-ink"
              >
                Hoy
              </button>
              <button
                onClick={() => moverMes(1)}
                aria-label="Mes siguiente"
                className="grid h-8 w-8 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-line/70 hover:text-ink"
              >
                <ChevronDown width={16} height={16} className="-rotate-90" />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-px pb-1.5">
            {DIAS.map((dia) => (
              <span
                key={dia}
                className="text-center text-[11px] font-semibold tracking-wider text-ink-faint uppercase"
              >
                <span className="hidden sm:inline">{dia}</span>
                <span className="sm:hidden">{dia[0]}</span>
              </span>
            ))}
          </div>

          {/* Semanas */}
          {/* select-none: arrastrar barras no tiene que ir pintando los números */}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-surface/50 backdrop-blur-sm select-none">
            {semanas.map((semana) => {
              const segmentos = segmentosDeSemana(semana, agendadas);
              return (
                <div key={semana[0]} className="relative min-h-[104px] border-b border-line last:border-b-0">
                  <div className="absolute inset-0 grid grid-cols-7">
                    {semana.map((iso) => (
                      <Celda
                        key={iso}
                        iso={iso}
                        delMes={mesDe(iso) === mes.month}
                        onCrear={crearEn}
                      />
                    ))}
                  </div>

                  <div
                    className="relative grid grid-cols-7 gap-1 px-1 pt-8 pb-2"
                    style={{
                      gridAutoRows: "26px",
                      pointerEvents: estirando ? "none" : undefined,
                    }}
                  >
                    {segmentos.map((seg) => (
                      <Barra
                        key={seg.card.id}
                        seg={seg}
                        hoy={hoy}
                        onOpen={onOpenCard}
                        onEstirar={setEstirando}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <SinFecha cards={sinFecha} onOpen={onOpenCard} />
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
        {arrastrada && (
          <div className="w-52 rotate-2">
            <ChipMini card={arrastrada} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/* ── Día ──────────────────────────────────────────────────────────────────── */

function Celda({
  iso,
  delMes,
  onCrear,
}: {
  iso: ISODate;
  delMes: boolean;
  onCrear: (iso: ISODate) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `dia-${iso}`, data: { tipo: "dia", iso } });
  const hoy = esHoy(iso);

  return (
    <div
      ref={setNodeRef}
      data-dia={iso}
      className={cn(
        "group/dia relative border-r border-line last:border-r-0 transition-colors",
        !delMes && "bg-surface-2/40",
        isOver && "bg-brand/10",
      )}
    >
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span
          className={cn(
            "grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12px] font-semibold tabular-nums",
            hoy
              ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white"
              : delMes
                ? "text-ink-soft"
                : "text-ink-faint",
          )}
        >
          {numeroDia(iso)}
        </span>
        <button
          onClick={() => onCrear(iso)}
          title="Nueva tarjeta este día"
          className="grid h-5 w-5 place-items-center rounded-md text-ink-faint opacity-0 transition-opacity group-hover/dia:opacity-100 hover:bg-line hover:text-ink"
        >
          <Plus width={13} height={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Barra ────────────────────────────────────────────────────────────────── */

function Barra({
  seg,
  hoy,
  onOpen,
  onEstirar,
}: {
  seg: Segmento;
  hoy: ISODate;
  onOpen: (id: string) => void;
  onEstirar: (id: string | null) => void;
}) {
  const { schedule } = useStore();
  const { card, col, span, lane, vieneDeAntes, sigueDespues } = seg;
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: card.id,
    data: { tipo: "card" },
  });

  const hecha = card.checklist.length > 0 && card.checklist.every((item) => item.done);
  const vencida = esPasado(card.endsOn ?? card.startsOn!) && !hecha;

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      style={{
        gridColumn: `${col + 1} / span ${span}`,
        gridRow: lane + 1,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(`tone-${card.color}`, "group/barra relative min-w-0")}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={() => onOpen(card.id)}
        title={`${card.title || "Sin título"} · click para abrirla`}
        className={cn(
          "flex h-[26px] cursor-grab touch-manipulation items-center gap-1.5 border px-2 text-[12px] font-medium transition-shadow active:cursor-grabbing",
          "hover:shadow-[var(--shadow-card)]",
          vieneDeAntes ? "rounded-l-none border-l-0" : "rounded-l-lg",
          sigueDespues ? "rounded-r-none border-r-0" : "rounded-r-lg",
        )}
        style={{
          background: "rgb(var(--tone) / 0.18)",
          borderColor: "rgb(var(--tone) / 0.4)",
          color: "rgb(var(--tone))",
        }}
      >
        {vieneDeAntes && <span className="shrink-0 opacity-60">←</span>}
        {card.starred && <Star filled width={11} height={11} className="shrink-0" />}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            hecha && "line-through opacity-60",
            vencida && "italic",
          )}
        >
          {card.title || "Sin título"}
        </span>
        {card.checklist.length > 0 && (
          <span className="hidden shrink-0 items-center gap-0.5 text-[10px] opacity-70 sm:flex">
            <ListIcon width={10} height={10} />
            {card.checklist.filter((i) => i.done).length}/{card.checklist.length}
          </span>
        )}
        {sigueDespues && <span className="shrink-0 opacity-60">→</span>}
      </div>

      {/* Estirar hacia la derecha = dura más días */}
      {!sigueDespues && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            onEstirar(card.id);
          }}
          title="Estirar a más días"
          className="absolute inset-y-0 -right-0.5 w-2.5 cursor-ew-resize opacity-0 transition-opacity group-hover/barra:opacity-100"
        >
          <span
            className="absolute top-1/2 right-0.5 h-3.5 w-1 -translate-y-1/2 rounded-full"
            style={{ background: "rgb(var(--tone))" }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ── Sin fecha ────────────────────────────────────────────────────────────── */

function SinFecha({ cards, onOpen }: { cards: Card[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "sin-fecha", data: { tipo: "sinFecha" } });

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        "flex max-h-44 shrink-0 flex-col rounded-2xl border border-line bg-surface/50 p-3 backdrop-blur-sm transition-colors lg:max-h-none lg:w-64",
        isOver && "border-brand/50 bg-brand/5",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
          Sin fecha
        </h3>
        <span className="rounded-full bg-line px-1.5 py-0.5 text-[10px] text-ink-soft tabular-nums">
          {cards.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        <AnimatePresence initial={false}>
          {cards.map((card) => (
            <ChipArrastrable key={card.id} card={card} onOpen={onOpen} />
          ))}
        </AnimatePresence>

        {cards.length === 0 && (
          <p className="px-1 py-3 text-[12px] leading-relaxed text-ink-faint">
            Todo tiene día. Arrastrá una tarjeta acá para sacarla del calendario.
          </p>
        )}
      </div>
    </aside>
  );
}

function ChipArrastrable({ card, onOpen }: { card: Card; onOpen: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: card.id,
    data: { tipo: "card" },
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className="cursor-grab touch-manipulation active:cursor-grabbing"
    >
      <ChipMini card={card} />
    </motion.div>
  );
}

function ChipMini({ card }: { card: Card }) {
  return (
    <div
      className={cn(`tone-${card.color}`, "flex items-center gap-2 rounded-xl border px-2.5 py-2")}
      style={{
        background: "color-mix(in srgb, rgb(var(--tone) / 0.12), var(--surface))",
        borderColor: "rgb(var(--tone) / 0.3)",
      }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: "rgb(var(--tone))" }}
      />
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
        {card.title || "Sin título"}
      </span>
      {card.starred && (
        <Star filled width={11} height={11} style={{ color: "rgb(var(--tone))" }} />
      )}
    </div>
  );
}
