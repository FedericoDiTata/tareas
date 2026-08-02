"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardChip } from "./CardChip";
import { ColorPicker } from "./ColorPicker";
import { Dots, Grip, Plus, Trash } from "./Icons";
import { Column as ColumnType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/ui";

interface Props {
  column: ColumnType;
  onOpenCard: (id: string) => void;
  onlyStarred: boolean;
}

export function Column({ column, onOpenCard, onlyStarred }: Props) {
  const { state, addCard, renameColumn, setColumnColor, deleteColumn } = useStore();
  const [composerAt, setComposerAt] = useState<"top" | "bottom" | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const sortable = useSortable({ id: column.id, data: { type: "column" } });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `col-drop-${column.id}`,
    data: { type: "column-body", columnId: column.id },
  });

  const cards = column.cardIds.map((id) => state.cards[id]).filter(Boolean);
  const visible = onlyStarred ? cards.filter((c) => c.starred) : cards;

  useEffect(() => {
    if (composerAt) composerRef.current?.focus();
  }, [composerAt]);

  function submitDraft() {
    const title = draft.trim();
    if (title) addCard(column.id, title, composerAt === "top");
    setDraft("");
    // Queda abierto: descargar la cabeza son varias tarjetas seguidas.
    composerRef.current?.focus();
  }

  const composer = (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
      <textarea
        ref={composerRef}
        rows={2}
        value={draft}
        placeholder="Escribí y Enter…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitDraft();
          }
          if (e.key === "Escape") {
            setDraft("");
            setComposerAt(null);
          }
        }}
        onBlur={() => {
          if (draft.trim()) submitDraft();
          setComposerAt(null);
        }}
        className="w-full rounded-2xl border border-brand/40 bg-surface p-3 text-[15px] leading-snug outline-none placeholder:text-ink-faint"
      />
    </motion.div>
  );

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(
        `tone-${column.color}`,
        "relative z-10 flex h-full w-[300px] shrink-0 flex-col",
        sortable.isDragging && "opacity-40",
      )}
    >
      <div className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface/55 backdrop-blur-xl">
        {/* Cabecera */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <button
            {...sortable.attributes}
            {...sortable.listeners}
            title="Arrastrar columna"
            className="cursor-grab touch-manipulation rounded-lg p-1 text-ink-faint opacity-40 transition-opacity group-hover/board:opacity-100 hover:text-ink active:cursor-grabbing"
          >
            <Grip width={14} height={14} />
          </button>

          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: "rgb(var(--tone))" }}
          />

          <input
            value={column.title}
            onChange={(e) => renameColumn(column.id, e.target.value)}
            placeholder="Columna"
            className="min-w-0 flex-1 bg-transparent font-display text-[15px] font-semibold tracking-tight outline-none placeholder:text-ink-faint"
          />

          <span className="rounded-full bg-line px-2 py-0.5 text-[11px] font-medium text-ink-soft tabular-nums">
            {visible.length}
          </span>

          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              className="rounded-lg p-1 text-ink-faint transition-colors hover:bg-line hover:text-ink"
            >
              <Dots width={16} height={16} />
            </button>
            <AnimatePresence>
              {menu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="panel absolute top-9 right-0 z-30 w-56 rounded-2xl p-3"
                  >
                    <p className="mb-2 text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                      Color
                    </p>
                    <ColorPicker
                      value={column.color}
                      onChange={(c) => setColumnColor(column.id, c)}
                      size="sm"
                    />
                    <div className="my-3 h-px bg-line" />
                    <button
                      onClick={() => {
                        setMenu(false);
                        deleteColumn(column.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-rose-500 transition-colors hover:bg-rose-500/10"
                    >
                      <Trash width={15} height={15} />
                      Eliminar columna
                      {column.cardIds.length > 0 && (
                        <span className="ml-auto text-[11px] opacity-70">
                          y {column.cardIds.length}
                        </span>
                      )}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setComposerAt("top")}
            title="Nueva tarjeta"
            className="rounded-lg p-1 text-ink-faint transition-colors hover:bg-line hover:text-ink"
          >
            <Plus width={16} height={16} />
          </button>
        </div>

        {/* Lista */}
        <div
          ref={setDropRef}
          className={cn(
            "flex max-h-[calc(100vh-260px)] min-h-[64px] flex-col gap-2.5 overflow-x-hidden overflow-y-auto px-3 pb-3 transition-colors",
            isOver && "bg-brand/5",
          )}
        >
          <AnimatePresence initial={false}>
            {composerAt === "top" && composer}
          </AnimatePresence>

          <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
            {visible.map((card) => (
              <CardChip
                key={card.id}
                card={card}
                columnId={column.id}
                onOpen={onOpenCard}
              />
            ))}
          </SortableContext>

          {visible.length === 0 && composerAt === null && (
            <button
              onClick={() => setComposerAt("top")}
              className="rounded-2xl border border-dashed border-line py-6 text-[13px] text-ink-faint transition-colors hover:border-brand/50 hover:text-ink-soft"
            >
              {onlyStarred ? "Nada marcado acá" : "Soltá algo acá"}
            </button>
          )}

          <AnimatePresence initial={false}>
            {composerAt === "bottom" && composer}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setComposerAt("bottom")}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-ink-faint transition-colors hover:bg-line/60 hover:text-ink"
        >
          <Plus width={14} height={14} />
          Agregar tarjeta
        </button>
      </div>
    </div>
  );
}
