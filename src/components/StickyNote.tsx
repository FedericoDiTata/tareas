"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoGrow } from "./AutoGrow";
import { Check, Connect, Corner, Trash, X } from "./Icons";
import { COLOR_KEYS, ColorKey, PostIt } from "@/lib/types";
import { useDatos } from "@/lib/store";
import { useBlobURL } from "@/lib/files";
import { cn } from "@/lib/ui";

interface Props {
  sticky: PostIt;
  /** Zoom del lienzo: el arrastre tiene que moverse igual que el puntero. */
  scale?: number;
  connectable?: boolean;
  connectingFrom?: string | null;
  onConnectClick?: (id: string) => void;
  onStartConnect?: (id: string) => void;
  /** Recién creado: abrir directo en modo edición. */
  startEditing?: boolean;
  onEdited?: () => void;
  /** Resaltado momentáneo al llegar desde la búsqueda. */
  highlighted?: boolean;
}

export function StickyNote({
  sticky,
  scale = 1,
  connectable = false,
  connectingFrom = null,
  onConnectClick,
  onStartConnect,
  startEditing,
  onEdited,
  highlighted,
}: Props) {
  const { actualizarPostIt: updateSticky, borrarPostIt: deleteSticky, alFrente: bringToFront } = useDatos();
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [resize, setResize] = useState<{ dw: number; dh: number } | null>(null);
  const [editing, setEditing] = useState(Boolean(startEditing));
  const [hover, setHover] = useState(false);
  const [palette, setPalette] = useState(false);
  const origin = useRef({ x: 0, y: 0 });
  const imageURL = useBlobURL(sticky.tipo === "imagen" ? sticky.blobId : undefined);

  useEffect(() => {
    if (startEditing) setEditing(true);
  }, [startEditing]);

  const endEdit = (value: boolean) => {
    setEditing(value);
    if (!value) onEdited?.();
  };

  const isConnecting = connectingFrom !== null;
  const isConnectSource = connectingFrom === sticky.id;

  const x = sticky.x + (drag?.dx ?? 0);
  const y = sticky.y + (drag?.dy ?? 0);
  const w = Math.max(120, sticky.w + (resize?.dw ?? 0));
  const h = Math.max(70, sticky.h + (resize?.dh ?? 0));

  function onPointerDown(e: ReactPointerEvent) {
    if (editing || e.button !== 0) return;
    e.stopPropagation();
    if (isConnecting) {
      onConnectClick?.(sticky.id);
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
    bringToFront(sticky.id);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    setDrag({
      dx: (e.clientX - origin.current.x) / scale,
      dy: (e.clientY - origin.current.y) / scale,
    });
  }

  function onPointerUp() {
    if (!drag) return;
    const moved = Math.abs(drag.dx) > 2 || Math.abs(drag.dy) > 2;
    if (moved) updateSticky(sticky.id, { x: sticky.x + drag.dx, y: sticky.y + drag.dy });
    else if (sticky.tipo !== "imagen") setEditing(true);
    setDrag(null);
  }

  function onResizeDown(e: ReactPointerEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX, y: e.clientY };
    setResize({ dw: 0, dh: 0 });
  }

  function onResizeMove(e: ReactPointerEvent) {
    if (!resize) return;
    setResize({
      dw: (e.clientX - origin.current.x) / scale,
      dh: (e.clientY - origin.current.y) / scale,
    });
  }

  function onResizeUp() {
    if (!resize) return;
    updateSticky(sticky.id, {
      w: Math.max(120, sticky.w + resize.dw),
      h: Math.max(70, sticky.h + resize.dh),
    });
    setResize(null);
  }

  const lifted = drag !== null && (Math.abs(drag.dx) > 2 || Math.abs(drag.dy) > 2);

  return (
    // El transform lo maneja el CSS (arrastre instantáneo); Motion sólo el fade
    // de entrada y salida. Si Motion animara scale acá, pisaría el translate.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
      transition={{ duration: 0.22 }}
      className={cn(
        `tone-${sticky.color}`,
        "group pointer-events-auto absolute touch-none select-none",
        isConnecting && !isConnectSource && "cursor-crosshair",
      )}
      style={{
        left: 0,
        top: 0,
        width: w,
        height: sticky.tipo === "objetivo" ? "auto" : h,
        zIndex: lifted ? 9999 : sticky.z,
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${lifted ? 0 : sticky.rot}deg) scale(${lifted ? 1.04 : 1})`,
        transition: lifted ? "none" : "transform 220ms cubic-bezier(0.22,1,0.36,1)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPalette(false);
      }}
    >
      {/* Barra flotante de acciones */}
      <AnimatePresence>
        {(hover || palette) && !editing && !isConnecting && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ duration: 0.14 }}
            className="glass absolute -top-11 left-0 z-10 flex items-center gap-0.5 rounded-full p-1 shadow-lg"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {palette ? (
              <>
                {COLOR_KEYS.map((c) => (
                  <button
                    key={c}
                    className={`tone-${c} h-5 w-5 rounded-full transition-transform hover:scale-125`}
                    style={{ background: "rgb(var(--tone))" }}
                    onClick={() => {
                      updateSticky(sticky.id, { color: c });
                      setPalette(false);
                    }}
                  />
                ))}
                <button
                  className="ml-0.5 grid h-6 w-6 place-items-center rounded-full text-ink-faint hover:text-ink"
                  onClick={() => setPalette(false)}
                >
                  <X width={13} height={13} />
                </button>
              </>
            ) : (
              <>
                <button
                  title="Color"
                  className="h-6 w-6 rounded-full border border-line transition-transform hover:scale-110"
                  style={{ background: "rgb(var(--tone))" }}
                  onClick={() => setPalette(true)}
                />
                {connectable && (
                  <button
                    title="Conectar con otro elemento"
                    className="grid h-6 w-6 place-items-center rounded-full text-ink-soft transition-colors hover:bg-line hover:text-ink"
                    onClick={() => onStartConnect?.(sticky.id)}
                  >
                    <Connect width={14} height={14} />
                  </button>
                )}
                <button
                  title="Eliminar"
                  className="grid h-6 w-6 place-items-center rounded-full text-ink-soft transition-colors hover:bg-rose-500/15 hover:text-rose-500"
                  onClick={() => deleteSticky(sticky.id)}
                >
                  <Trash width={14} height={14} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "h-full w-full",
          editing ? "cursor-text" : lifted ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          boxShadow: lifted ? "var(--shadow-lift)" : undefined,
          borderRadius: sticky.tipo === "texto" ? 12 : 10,
        }}
      >
        {sticky.tipo === "nota" && (
          <div className="paper paper-fold relative h-full w-full overflow-hidden rounded-[10px] p-3.5">
            <NoteText sticky={sticky} editing={editing} setEditing={endEdit} />
          </div>
        )}

        {sticky.tipo === "texto" && (
          <div className="flex h-full w-full items-center">
            <NoteText
              sticky={sticky}
              editing={editing}
              setEditing={endEdit}
              className="font-display text-3xl leading-[1.15] font-semibold tracking-tight"
              style={{ color: "rgb(var(--tone))" }}
              placeholder="Escribí una frase…"
            />
          </div>
        )}

        {sticky.tipo === "objetivo" && (
          <div
            className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm"
            style={{
              background: "rgb(var(--tone) / 0.1)",
              borderColor: "rgb(var(--tone) / 0.35)",
            }}
          >
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => updateSticky(sticky.id, { marcado: !sticky.marcado })}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors"
              style={{
                borderColor: "rgb(var(--tone))",
                background: sticky.marcado ? "rgb(var(--tone))" : "transparent",
                color: sticky.marcado ? "white" : "transparent",
              }}
            >
              <Check width={13} height={13} strokeWidth={3} />
            </button>
            <NoteText
              sticky={sticky}
              editing={editing}
              setEditing={endEdit}
              className={cn(
                "font-display text-[15px] font-medium",
                sticky.marcado && "line-through opacity-50",
              )}
              placeholder="Un objetivo…"
            />
          </div>
        )}

        {sticky.tipo === "imagen" && (
          <div className="paper relative h-full w-full overflow-hidden rounded-[10px] p-2">
            {imageURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageURL}
                alt={sticky.texto || "imagen"}
                draggable={false}
                className="drag-none h-full w-full rounded-md object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center rounded-md bg-black/5 text-xs text-ink-faint">
                cargando…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manija de resize */}
      {hover && !editing && sticky.tipo !== "objetivo" && (
        <div
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
          className="absolute -right-1 -bottom-1 cursor-nwse-resize p-1 text-ink-faint opacity-60 hover:opacity-100"
        >
          <Corner width={13} height={13} />
        </div>
      )}

      {highlighted && (
        <motion.div
          className="pointer-events-none absolute -inset-2 rounded-2xl border-2 border-brand"
          animate={{ opacity: [0, 1, 0.35, 1, 0] }}
          transition={{ duration: 1.6, times: [0, 0.15, 0.5, 0.75, 1] }}
        />
      )}

      {isConnectSource && (
        <div className="pointer-events-none absolute -inset-1.5 rounded-xl border-2 border-dashed border-brand" />
      )}
    </motion.div>
  );
}

function NoteText({
  sticky,
  editing,
  setEditing,
  className,
  style,
  placeholder = "Escribí…",
}: {
  sticky: PostIt;
  editing: boolean;
  setEditing: (v: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const { actualizarPostIt: updateSticky } = useDatos();
  const handwritten = sticky.tipo === "nota";
  const cls = cn(
    className ?? "font-hand text-[21px] leading-[1.25]",
    "w-full break-words whitespace-pre-wrap outline-none",
  );

  if (editing) {
    return (
      <AutoGrow
        value={sticky.texto}
        onCommit={(text) => updateSticky(sticky.id, { texto: text })}
        onBlur={() => setEditing(false)}
        autoFocus
        placeholder={placeholder}
        className={cls}
        style={style}
      />
    );
  }

  return (
    <div
      className={cn(cls, handwritten && "font-hand")}
      style={style}
      onDoubleClick={() => setEditing(true)}
    >
      {sticky.texto || <span className="opacity-40">{placeholder}</span>}
    </div>
  );
}
