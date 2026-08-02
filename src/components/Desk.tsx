"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { StickyNote } from "./StickyNote";
import { Crosshair, ImageIcon, NoteIcon, Target, TextIcon, ZoomIn, ZoomOut } from "./Icons";
import { useStore } from "@/lib/store";
import { storeImage } from "@/lib/files";
import { Sticky } from "@/lib/types";
import { clamp, cn } from "@/lib/ui";

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
const SVG_OFFSET = 20000;

interface DeskProps {
  /** Elemento a centrar (viene de la búsqueda). */
  focusId?: string | null;
  onFocused?: () => void;
}

export function Desk({ focusId, onFocused }: DeskProps) {
  const { state, addSticky, addEdge, deleteEdge, setCamera } = useStore();
  const surface = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState(state.camera);
  const [panning, setPanning] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const panOrigin = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const stickies = state.stickies.filter((s) => s.surface === "desk");

  // La cámara vive local para que el pan sea a 60fps; al store va con calma.
  const commitCam = useCallback(
    (next: typeof cam) => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => setCamera(next), 400);
    },
    [setCamera],
  );

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = surface.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      return {
        x: (clientX - left - cam.x) / cam.scale,
        y: (clientY - top - cam.y) / cam.scale,
      };
    },
    [cam],
  );

  const centerOfView = useCallback(() => {
    const rect = surface.current?.getBoundingClientRect();
    return toWorld(
      (rect?.left ?? 0) + (rect?.width ?? 800) / 2,
      (rect?.top ?? 0) + (rect?.height ?? 600) / 2,
    );
  }, [toWorld]);

  /* ── Pan ──────────────────────────────────────────────────────────────── */
  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== 0 && e.button !== 1) return;
    if (connectingFrom) {
      setConnectingFrom(null);
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panOrigin.current = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y };
    setPanning(true);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!panning) return;
    const next = {
      ...cam,
      x: panOrigin.current.camX + (e.clientX - panOrigin.current.x),
      y: panOrigin.current.camY + (e.clientY - panOrigin.current.y),
    };
    setCam(next);
  }

  function onPointerUp() {
    if (!panning) return;
    setPanning(false);
    commitCam(cam);
  }

  /* ── Zoom ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = surface.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();

      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.0022);
        setCam((prev) => {
          const scale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          const ratio = scale / prev.scale;
          const next = {
            scale,
            x: px - (px - prev.x) * ratio,
            y: py - (py - prev.y) * ratio,
          };
          commitCam(next);
          return next;
        });
      } else {
        setCam((prev) => {
          const next = { ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY };
          commitCam(next);
          return next;
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [commitCam]);

  function zoomBy(factor: number) {
    setCam((prev) => {
      const rect = surface.current?.getBoundingClientRect();
      const px = (rect?.width ?? 800) / 2;
      const py = (rect?.height ?? 600) / 2;
      const scale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = scale / prev.scale;
      const next = { scale, x: px - (px - prev.x) * ratio, y: py - (py - prev.y) * ratio };
      commitCam(next);
      return next;
    });
  }

  /** Encuadra todo lo que hay pegado en el escritorio. */
  function fitAll() {
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return;
    if (stickies.length === 0) {
      const next = { x: 0, y: 0, scale: 1 };
      setCam(next);
      commitCam(next);
      return;
    }
    const minX = Math.min(...stickies.map((s) => s.x));
    const minY = Math.min(...stickies.map((s) => s.y));
    const maxX = Math.max(...stickies.map((s) => s.x + s.w));
    const maxY = Math.max(...stickies.map((s) => s.y + s.h));
    const pad = 80;
    const scale = clamp(
      Math.min(rect.width / (maxX - minX + pad * 2), rect.height / (maxY - minY + pad * 2)),
      MIN_SCALE,
      1.2,
    );
    const next = {
      scale,
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
    };
    setCam(next);
    commitCam(next);
  }

  /* ── Crear ────────────────────────────────────────────────────────────── */
  function spawn(kind: Sticky["kind"], at?: { x: number; y: number }, extra?: Partial<Sticky>) {
    const point = at ?? centerOfView();
    const size = kind === "note" ? 110 : kind === "text" ? 190 : 150;
    const id = addSticky({
      surface: "desk",
      kind,
      x: point.x - size,
      y: point.y - 60,
      ...extra,
    });
    if (kind !== "image") setFreshId(id);
    return id;
  }

  function onDoubleClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).dataset.deskBackground !== "true") return;
    spawn("note", toWorld(e.clientX, e.clientY));
  }

  async function addImagesAt(files: File[], at: { x: number; y: number }) {
    let offset = 0;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const stored = await storeImage(file);
      const ratio = stored.w && stored.h ? stored.h / stored.w : 0.7;
      const w = 320;
      addSticky({
        surface: "desk",
        kind: "image",
        x: at.x + offset,
        y: at.y + offset,
        w,
        h: Math.round(w * ratio) + 16,
        blobId: stored.blobId,
        text: stored.name,
        color: "slate",
      });
      offset += 26;
    }
  }

  // Pegar: capturas, texto suelto, links. Lo más rápido que hay.
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const images = items
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f));

      if (images.length) {
        e.preventDefault();
        await addImagesAt(images, centerOfView());
        return;
      }
      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (text) {
        e.preventDefault();
        const point = centerOfView();
        addSticky({
          surface: "desk",
          kind: "note",
          x: point.x - 110,
          y: point.y - 100,
          text,
        });
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOfView]);

  /* ── Conexiones ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!connectingFrom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConnectingFrom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [connectingFrom]);

  /* ── Centrar un elemento buscado ──────────────────────────────────────── */
  useEffect(() => {
    if (!focusId) return;
    const target = state.stickies.find((s) => s.id === focusId && s.surface === "desk");
    const rect = surface.current?.getBoundingClientRect();
    if (!target || !rect) return;
    const scale = clamp(cam.scale, 0.6, 1.4);
    const next = {
      scale,
      x: rect.width / 2 - (target.x + target.w / 2) * scale,
      y: rect.height / 2 - (target.y + target.h / 2) * scale,
    };
    setCam(next);
    commitCam(next);
    setHighlight(focusId);
    const timer = setTimeout(() => setHighlight(null), 1600);
    onFocused?.();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const byId = new Map(stickies.map((s) => [s.id, s]));
  const edges = state.edges.filter((e) => byId.has(e.from) && byId.has(e.to));

  return (
    <div className="relative h-full overflow-hidden">
      <div
        ref={surface}
        data-desk-background="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onDragOver={(e) => {
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropping(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length) addImagesAt(files, toWorld(e.clientX, e.clientY));
        }}
        className={cn(
          "grid-dots absolute inset-0 touch-none",
          panning ? "cursor-grabbing" : connectingFrom ? "cursor-crosshair" : "cursor-grab",
        )}
        style={{
          backgroundSize: `${28 * cam.scale}px ${28 * cam.scale}px`,
          backgroundPosition: `${cam.x}px ${cam.y}px`,
        }}
      >
        <div
          className="absolute top-0 left-0 h-0 w-0"
          style={{
            transform: `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Conexiones (mapas mentales) */}
          <svg
            className="absolute"
            style={{
              left: -SVG_OFFSET,
              top: -SVG_OFFSET,
              width: SVG_OFFSET * 2,
              height: SVG_OFFSET * 2,
              pointerEvents: "none",
            }}
          >
            <g transform={`translate(${SVG_OFFSET}, ${SVG_OFFSET})`}>
              {edges.map((edge) => {
                const a = byId.get(edge.from)!;
                const b = byId.get(edge.to)!;
                // Los extremos salen del borde, no del centro: si no, la línea
                // queda escondida debajo de los propios post-its.
                const { x: ax, y: ay } = borderPoint(a, b);
                const { x: bx, y: by } = borderPoint(b, a);
                const dx = Math.abs(bx - ax) * 0.4 + 20;
                const d = `M ${ax} ${ay} C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
                return (
                  <g key={edge.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke="var(--brand)"
                      strokeWidth={2.5}
                      strokeDasharray="8 7"
                      opacity={0.8}
                    />
                    <circle cx={ax} cy={ay} r={4.5} fill="var(--brand)" />
                    <circle cx={bx} cy={by} r={4.5} fill="var(--brand)" />
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onClick={() => deleteEdge(edge.id)}
                    >
                      <title>Click para desconectar</title>
                    </path>
                  </g>
                );
              })}
            </g>
          </svg>

          <AnimatePresence>
            {stickies.map((sticky) => (
              <StickyNote
                key={sticky.id}
                sticky={sticky}
                scale={cam.scale}
                connectable
                connectingFrom={connectingFrom}
                onStartConnect={setConnectingFrom}
                onConnectClick={(id) => {
                  if (connectingFrom && connectingFrom !== id) addEdge(connectingFrom, id);
                  setConnectingFrom(null);
                }}
                startEditing={freshId === sticky.id}
                onEdited={() => setFreshId(null)}
                highlighted={highlight === sticky.id}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Estado vacío */}
      {stickies.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <div className="text-center">
            <p className="font-hand text-3xl text-ink-faint">
              Doble click en cualquier lado
            </p>
            <p className="mt-2 text-[13px] text-ink-faint">
              o pegá una captura con Ctrl+V
            </p>
          </div>
        </motion.div>
      )}

      {connectingFrom && (
        <div className="glass pointer-events-none absolute top-4 left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] text-ink-soft shadow-lg">
          Elegí a qué conectarlo · <kbd className="font-sans">Esc</kbd> para cancelar
        </div>
      )}

      {dropping && (
        <div className="pointer-events-none absolute inset-4 z-30 rounded-3xl border-2 border-dashed border-brand/60 bg-brand/5" />
      )}

      {/* Dock */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 28 }}
        className="glass absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5 shadow-[var(--shadow-card)]"
      >
        <Tool label="Post-it" onClick={() => spawn("note")}>
          <NoteIcon width={16} height={16} />
        </Tool>
        <Tool label="Frase" onClick={() => spawn("text", undefined, { color: "violet" })}>
          <TextIcon width={16} height={16} />
        </Tool>
        <Tool label="Imagen" onClick={() => fileInput.current?.click()}>
          <ImageIcon width={16} height={16} />
        </Tool>
        <Tool label="Objetivo" onClick={() => spawn("goal", undefined, { color: "emerald" })}>
          <Target width={16} height={16} />
        </Tool>

        <span className="mx-1 h-5 w-px bg-line" />

        <IconOnly label="Alejar" onClick={() => zoomBy(1 / 1.25)}>
          <ZoomOut width={16} height={16} />
        </IconOnly>
        <button
          onClick={() => {
            const next = { ...cam, scale: 1 };
            setCam(next);
            commitCam(next);
          }}
          className="min-w-11 rounded-full px-1 text-[12px] font-medium text-ink-soft tabular-nums transition-colors hover:text-ink"
        >
          {Math.round(cam.scale * 100)}%
        </button>
        <IconOnly label="Acercar" onClick={() => zoomBy(1.25)}>
          <ZoomIn width={16} height={16} />
        </IconOnly>
        <IconOnly label="Encuadrar todo" onClick={fitAll}>
          <Crosshair width={16} height={16} />
        </IconOnly>
      </motion.div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const point = centerOfView();
          if (files.length) addImagesAt(files, { x: point.x - 160, y: point.y - 110 });
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Punto del borde de `from` en dirección a `to`. */
function borderPoint(from: Sticky, to: Sticky) {
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  const dx = to.x + to.w / 2 - cx;
  const dy = to.y + to.h / 2 - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const factor = Math.min(
    (from.w / 2 + 8) / (Math.abs(dx) || 1e-6),
    (from.h / 2 + 8) / (Math.abs(dy) || 1e-6),
  );
  return { x: cx + dx * factor, y: cy + dy * factor };
}

function Tool({
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
      title={label}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-all hover:bg-brand/10 hover:text-ink active:scale-95"
    >
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function IconOnly({
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
      title={label}
      className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-all hover:bg-brand/10 hover:text-ink active:scale-95"
    >
      {children}
    </button>
  );
}
