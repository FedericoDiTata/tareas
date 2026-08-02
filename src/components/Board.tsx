"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "motion/react";
import { Column } from "./Column";
import { CardFace } from "./CardChip";
import { StickyNote } from "./StickyNote";
import { NoteIcon, Plus, TextIcon } from "./Icons";
import { Card, Column as ColumnType } from "@/lib/types";
import { useStore } from "@/lib/store";

interface Props {
  onOpenCard: (id: string) => void;
  onlyStarred: boolean;
}

export function Board({ onOpenCard, onlyStarred }: Props) {
  const { state, moveCard, moveColumn, addColumn, addSticky } = useStore();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    // Mouse con umbral: un click sigue siendo un click.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // En touch hace falta mantener apretado, si no no se puede scrollear.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnOfCard = (cardId: string) =>
    state.columns.find((c) => c.cardIds.includes(cardId));

  const columnFromOver = (over: DragOverEvent["over"]): string | undefined => {
    if (!over) return undefined;
    const data = over.data.current as { type?: string; columnId?: string } | undefined;
    if (data?.type === "column") return String(over.id);
    if (data?.columnId) return data.columnId;
    if (data?.type === "card") return columnOfCard(String(over.id))?.id;
    return undefined;
  };

  function onDragStart(e: DragStartEvent) {
    const type = e.active.data.current?.type;
    if (type === "card") setActiveCard(state.cards[String(e.active.id)] ?? null);
    if (type === "column")
      setActiveColumn(state.columns.find((c) => c.id === String(e.active.id)) ?? null);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over || active.data.current?.type !== "card") return;

    const activeId = String(active.id);
    const from = columnOfCard(activeId);
    const toId = columnFromOver(over);
    if (!from || !toId || from.id === toId) return;

    const overData = over.data.current as { type?: string } | undefined;
    const target = state.columns.find((c) => c.id === toId);
    if (!target) return;

    const index =
      overData?.type === "card" ? target.cardIds.indexOf(String(over.id)) : target.cardIds.length;
    moveCard(activeId, toId, index < 0 ? target.cardIds.length : index);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveCard(null);
    setActiveColumn(null);
    if (!over) return;

    const type = active.data.current?.type;

    if (type === "column") {
      const targetId = columnFromOver(over);
      const from = state.columns.findIndex((c) => c.id === String(active.id));
      const to = state.columns.findIndex((c) => c.id === targetId);
      if (from >= 0 && to >= 0 && from !== to) moveColumn(from, to);
      return;
    }

    if (type === "card") {
      const activeId = String(active.id);
      const column = columnOfCard(activeId);
      if (!column) return;
      const overData = over.data.current as { type?: string } | undefined;
      if (overData?.type !== "card") return;
      const overColumn = columnOfCard(String(over.id));
      if (!overColumn || overColumn.id !== column.id) return;
      const fromIndex = column.cardIds.indexOf(activeId);
      const toIndex = column.cardIds.indexOf(String(over.id));
      if (fromIndex !== toIndex && toIndex >= 0) moveCard(activeId, column.id, toIndex);
    }
  }

  /** Deja el post-it cerca de lo que estás mirando, no en el origen del tablero. */
  function dropSpot() {
    const el = scroller.current;
    const x = (el?.scrollLeft ?? 0) + (el?.clientWidth ?? 800) / 2 - 110;
    const y = 90 + Math.random() * 120;
    return { x: x + (Math.random() * 80 - 40), y };
  }

  const boardStickies = state.stickies.filter((s) => s.surface === "board");

  return (
    <div className="group/board relative h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveCard(null);
          setActiveColumn(null);
        }}
      >
        <div ref={scroller} className="h-full overflow-x-auto overflow-y-hidden">
          <div className="relative flex h-full min-w-max items-start gap-4 px-4 pt-4 pb-28 sm:px-6">
            <SortableContext
              items={state.columns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {state.columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  onOpenCard={onOpenCard}
                  onlyStarred={onlyStarred}
                />
              ))}
            </SortableContext>

            <button
              onClick={() => addColumn()}
              className="z-10 flex h-12 w-[300px] shrink-0 items-center justify-center gap-2 rounded-3xl border border-dashed border-line text-[13px] text-ink-faint transition-all hover:border-brand/50 hover:bg-surface/40 hover:text-ink"
            >
              <Plus width={15} height={15} />
              Nueva columna
            </button>

            {/* Post-its: viven por encima del tablero, como en un escritorio real */}
            <div className="pointer-events-none absolute inset-0 z-20">
              <AnimatePresence>
                {boardStickies.map((sticky) => (
                  <StickyNote key={sticky.id} sticky={sticky} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
          {activeCard && (
            <div className="w-[276px] cursor-grabbing">
              <CardFace card={activeCard} overlay />
            </div>
          )}
          {activeColumn && (
            <div
              className={`tone-${activeColumn.color} w-[300px] rotate-2 rounded-3xl border border-line bg-surface/90 p-4 shadow-[var(--shadow-lift)] backdrop-blur-xl`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "rgb(var(--tone))" }}
                />
                <span className="font-display font-semibold">{activeColumn.title}</span>
                <span className="ml-auto text-[11px] text-ink-faint">
                  {activeColumn.cardIds.length}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dock del tablero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 28 }}
        className="glass pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5 shadow-[var(--shadow-card)]"
      >
        <DockButton
          label="Post-it"
          onClick={() => addSticky({ surface: "board", kind: "note", ...dropSpot() })}
        >
          <NoteIcon width={16} height={16} />
        </DockButton>
        <DockButton
          label="Frase"
          onClick={() =>
            addSticky({ surface: "board", kind: "text", color: "violet", ...dropSpot() })
          }
        >
          <TextIcon width={16} height={16} />
        </DockButton>
      </motion.div>
    </div>
  );
}

function DockButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-all hover:bg-brand/10 hover:text-ink active:scale-95"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
