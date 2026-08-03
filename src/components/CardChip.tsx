"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useBlobURL } from "@/lib/files";
import { cn } from "@/lib/ui";
import { CalendarIcon, FileIcon, LinkIcon, ListIcon, NoteIcon, Star } from "./Icons";
import { esHoy, esPasado, rango } from "@/lib/fechas";

/** Lo que se ve. Se reusa tal cual en el DragOverlay. */
export const CardFace = memo(function CardFace({
  card,
  overlay,
  dimmed,
  onToggleStar,
}: {
  card: Card;
  overlay?: boolean;
  dimmed?: boolean;
  onToggleStar?: () => void;
}) {
  const cover = useBlobURL(card.images[0]?.blobId);
  const done = card.checklist.filter((c) => c.done).length;
  const total = card.checklist.length;

  return (
    <div
      className={cn(
        `tone-${card.color}`,
        "group relative overflow-hidden rounded-2xl border bg-surface p-3 text-left transition-[box-shadow,transform,opacity] duration-200",
        !overlay && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        overlay && "rotate-[2.5deg] shadow-[var(--shadow-lift)]",
        dimmed && "opacity-30 saturate-50",
      )}
      style={{
        borderColor: "rgb(var(--tone) / 0.28)",
        background: "color-mix(in srgb, rgb(var(--tone) / 0.07), var(--surface))",
        boxShadow: card.starred ? "0 0 0 2px rgb(var(--tone) / 0.45)" : undefined,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full"
        style={{ background: "rgb(var(--tone) / 0.9)" }}
      />

      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          draggable={false}
          className="drag-none mb-2.5 h-28 w-full rounded-xl object-cover"
        />
      )}

      <div className="flex items-start gap-2 pl-2">
        <p
          className={cn(
            "min-w-0 flex-1 font-display text-[15px] leading-snug font-medium break-words text-ink",
            !card.title && "text-ink-faint italic",
          )}
        >
          {card.title || "Sin título"}
        </p>
        {onToggleStar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title={card.starred ? "Quitar marca" : "Marcar"}
            className={cn(
              "-mt-0.5 shrink-0 rounded-lg p-1 transition-opacity",
              card.starred ? "opacity-100" : "opacity-0 group-hover:opacity-50 hover:opacity-100!",
            )}
            style={{ color: card.starred ? "rgb(var(--tone))" : undefined }}
          >
            <Star filled={card.starred} width={15} height={15} />
          </button>
        )}
      </div>

      {card.description && (
        <p className="mt-1.5 line-clamp-2 pl-2 text-[12.5px] leading-relaxed text-ink-soft">
          {card.description}
        </p>
      )}

      {total > 0 && (
        <div className="mt-2.5 pl-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${(done / total) * 100}%`, background: "rgb(var(--tone))" }}
            />
          </div>
        </div>
      )}

      {card.startsOn && (
        <div className="mt-2 pl-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
              esHoy(card.startsOn)
                ? "bg-brand/15 text-brand"
                : esPasado(card.endsOn ?? card.startsOn)
                  ? "bg-rose-500/12 text-rose-500"
                  : "bg-line text-ink-soft",
            )}
          >
            <CalendarIcon width={11} height={11} />
            {rango(card.startsOn, card.endsOn)}
          </span>
        </div>
      )}

      {(total > 0 || card.links.length > 0 || card.files.length > 0 || card.notes.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2.5 pl-2 text-[11px] text-ink-faint">
          {total > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListIcon width={12} height={12} />
              {done}/{total}
            </span>
          )}
          {card.links.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <LinkIcon width={12} height={12} />
              {card.links.length}
            </span>
          )}
          {card.files.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <FileIcon width={12} height={12} />
              {card.files.length}
            </span>
          )}
          {card.notes.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <NoteIcon width={12} height={12} />
              {card.notes.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

interface Props {
  card: Card;
  columnId: string;
  onOpen: (id: string) => void;
  dimmed?: boolean;
}

export function CardChip({ card, columnId, onOpen, dimmed }: Props) {
  const { toggleStar } = useStore();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", columnId },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className="cursor-grab touch-manipulation active:cursor-grabbing"
    >
      <CardFace card={card} dimmed={dimmed} onToggleStar={() => toggleStar(card.id)} />
    </div>
  );
}
