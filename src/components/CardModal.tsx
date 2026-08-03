"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoGrow } from "./AutoGrow";
import { ColorPicker } from "./ColorPicker";
import {
  CalendarIcon,
  Check,
  Copy,
  Download,
  FileIcon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  NoteIcon,
  Palette,
  Plus,
  Star,
  TextIcon,
  Trash,
  X,
} from "./Icons";
import { hostOf, useStore } from "@/lib/store";
import { COLOR_KEYS, ChecklistItem, ColorKey } from "@/lib/types";
import {
  downloadBlob,
  formatBytes,
  getBlob,
  isImageFile,
  saveBlob,
  storeImage,
  useBlobURL,
} from "@/lib/files";
import { hoyISO, largoEnDias } from "@/lib/fechas";
import { cn, useDebounced, useEscape } from "@/lib/ui";

interface Props {
  cardId: string;
  onClose: () => void;
}

export function CardModal({ cardId, onClose }: Props) {
  const store = useStore();
  const card = store.state.cards[cardId];
  const [showPalette, setShowPalette] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [freshNote, setFreshNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  useEscape(true, () => (lightbox !== null ? setLightbox(null) : onClose()));

  const column = useMemo(
    () => store.state.columns.find((c) => c.cardIds.includes(cardId)),
    [store.state.columns, cardId],
  );

  useEffect(() => {
    if (!card) onClose();
  }, [card, onClose]);

  if (!card) return null;

  const has = (section: string) => open.has(section);
  const reveal = (section: string) => setOpen((prev) => new Set(prev).add(section));

  const showDescription = has("description") || Boolean(card.description);
  const showChecklist = has("checklist") || card.checklist.length > 0;
  const showLinks = has("links") || card.links.length > 0;
  const showImages = card.images.length > 0;
  const showFiles = card.files.length > 0;
  const showNotes = card.notes.length > 0;

  async function ingest(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    const images = files.filter(isImageFile);
    const rest = files.filter((f) => !isImageFile(f));

    if (images.length) {
      const stored = await Promise.all(images.map((f) => storeImage(f)));
      store.addImages(cardId, stored.map((s) => ({ blobId: s.blobId, name: s.name, w: s.w, h: s.h })));
    }
    for (const file of rest) {
      const blobId = await saveBlob(file);
      store.addFiles(cardId, [
        { blobId, name: file.name, size: file.size, type: file.type || "archivo" },
      ]);
    }
    setBusy(false);
  }

  const done = card.checklist.filter((c) => c.done).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.14 } }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              ingest(files);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            ingest(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            `tone-${card.color}`,
            "panel relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl",
          )}
        >
          {/* Franja de color */}
          <div className="h-1.5 w-full" style={{ background: "rgb(var(--tone))" }} />

          {/* Acciones */}
          <div className="flex items-center gap-1 px-4 pt-3 sm:px-6">
            <button
              onClick={() => store.toggleStar(card.id)}
              title="Marcar"
              className={cn(
                "rounded-xl p-2 transition-colors hover:bg-line",
                card.starred ? "text-[rgb(var(--tone))]" : "text-ink-faint",
              )}
            >
              <Star filled={card.starred} width={17} height={17} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowPalette((v) => !v)}
                title="Color"
                className="rounded-xl p-2 text-ink-faint transition-colors hover:bg-line hover:text-ink"
              >
                <Palette width={17} height={17} />
              </button>
              <AnimatePresence>
                {showPalette && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPalette(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      className="panel absolute top-11 left-0 z-20 rounded-2xl p-3"
                    >
                      <ColorPicker
                        value={card.color}
                        onChange={(color) => {
                          store.updateCard(card.id, { color });
                          setShowPalette(false);
                        }}
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {store.state.columns.length > 0 && (
              <select
                value={column?.id ?? ""}
                onChange={(e) => store.moveCard(card.id, e.target.value, 0)}
                className="ml-1 rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 text-[12.5px] text-ink-soft outline-none transition-colors hover:text-ink"
              >
                {store.state.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || "Sin nombre"}
                  </option>
                ))}
              </select>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => {
                  store.duplicateCard(card.id);
                  onClose();
                }}
                title="Duplicar"
                className="rounded-xl p-2 text-ink-faint transition-colors hover:bg-line hover:text-ink"
              >
                <Copy width={17} height={17} />
              </button>
              <button
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    setTimeout(() => setConfirmDelete(false), 3000);
                    return;
                  }
                  store.deleteCard(card.id);
                  onClose();
                }}
                title="Eliminar"
                className={cn(
                  "flex items-center gap-1.5 rounded-xl p-2 text-[12.5px] transition-colors",
                  confirmDelete
                    ? "bg-rose-500/15 text-rose-500"
                    : "text-ink-faint hover:bg-line hover:text-rose-500",
                )}
              >
                <Trash width={17} height={17} />
                {confirmDelete && "¿Seguro?"}
              </button>
              <button
                onClick={onClose}
                title="Cerrar"
                className="rounded-xl p-2 text-ink-faint transition-colors hover:bg-line hover:text-ink"
              >
                <X width={17} height={17} />
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-4 pt-2 pb-6 sm:px-6">
            <AutoGrow
              value={card.title}
              onCommit={(title) => store.updateCard(card.id, { title })}
              placeholder="Título…"
              autoFocus={!card.title}
              className="font-display text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]"
            />

            {showDescription && (
              <Section>
                <AutoGrow
                  value={card.description}
                  onCommit={(description) => store.updateCard(card.id, { description })}
                  placeholder="Escribí todo lo que quieras. Acá no hay límite."
                  className="text-[15px] leading-relaxed text-ink-soft"
                  minHeight={90}
                  autoFocus={has("description") && !card.description}
                />
              </Section>
            )}

            {card.startsOn && (
              <Section title="Cuándo" icon={<CalendarIcon width={14} height={14} />}>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={card.startsOn}
                    onChange={(e) =>
                      store.schedule(card.id, e.target.value || null, card.endsOn)
                    }
                    className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-brand/50"
                  />
                  <span className="text-ink-faint">→</span>
                  <input
                    type="date"
                    value={card.endsOn ?? card.startsOn}
                    min={card.startsOn}
                    onChange={(e) =>
                      store.schedule(card.id, card.startsOn!, e.target.value || null)
                    }
                    className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-brand/50"
                  />
                  <button
                    onClick={() => store.schedule(card.id, null)}
                    className="rounded-xl px-2.5 py-2 text-[12.5px] text-ink-faint transition-colors hover:bg-line hover:text-rose-500"
                  >
                    Quitar
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-ink-faint">
                  {card.endsOn && card.endsOn !== card.startsOn
                    ? `Ocupa ${largoEnDias(card.startsOn, card.endsOn)} días seguidos. No hace falta moverla cada mañana.`
                    : "Un solo día. Estirá la barra en el calendario si te lleva más."}
                </p>
              </Section>
            )}

            {showChecklist && (
              <Section
                title="Checklist"
                icon={<ListIcon width={14} height={14} />}
                right={
                  <span className="text-[11px] text-ink-faint tabular-nums">
                    {done}/{card.checklist.length}
                  </span>
                }
              >
                {card.checklist.length > 0 && (
                  <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-line">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "rgb(var(--tone))" }}
                      animate={{ width: `${(done / card.checklist.length) * 100}%` }}
                      transition={{ type: "spring", stiffness: 260, damping: 30 }}
                    />
                  </div>
                )}
                <div className="space-y-0.5">
                  {card.checklist.map((item) => (
                    <CheckRow key={item.id} cardId={card.id} item={item} />
                  ))}
                </div>
                <NewItemInput
                  placeholder="Agregar ítem…"
                  onSubmit={(text) => store.addCheck(card.id, text)}
                  autoFocus={has("checklist") && card.checklist.length === 0}
                />
              </Section>
            )}

            {showLinks && (
              <Section title="Links" icon={<LinkIcon width={14} height={14} />}>
                <div className="space-y-1.5">
                  {card.links.map((link) => (
                    <div key={link.id} className="group flex items-center gap-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] transition-colors hover:border-brand/40"
                      >
                        <LinkIcon width={14} height={14} className="shrink-0 text-ink-faint" />
                        <span className="truncate">{link.label}</span>
                        <span className="ml-auto shrink-0 truncate text-[11px] text-ink-faint">
                          {hostOf(link.url)}
                        </span>
                      </a>
                      <button
                        onClick={() => store.deleteLink(card.id, link.id)}
                        className="rounded-lg p-1.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
                      >
                        <X width={14} height={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <NewItemInput
                  placeholder="Pegá un link y Enter…"
                  onSubmit={(text) => store.addLink(card.id, text)}
                  autoFocus={has("links") && card.links.length === 0}
                />
              </Section>
            )}

            {showImages && (
              <Section title="Imágenes" icon={<ImageIcon width={14} height={14} />}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {card.images.map((image, index) => (
                    <Thumb
                      key={image.id}
                      blobId={image.blobId}
                      onOpen={() => setLightbox(index)}
                      onDelete={() => store.deleteImage(card.id, image.id)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {showFiles && (
              <Section title="Archivos" icon={<FileIcon width={14} height={14} />}>
                <div className="space-y-1.5">
                  {card.files.map((file) => (
                    <div
                      key={file.id}
                      className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2"
                    >
                      <FileIcon width={15} height={15} className="shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{file.name}</span>
                      <span className="shrink-0 text-[11px] text-ink-faint tabular-nums">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        onClick={async () => {
                          const blob = await getBlob(file.blobId);
                          if (blob) downloadBlob(blob, file.name);
                        }}
                        className="rounded-lg p-1.5 text-ink-faint transition-colors hover:text-ink"
                        title="Descargar"
                      >
                        <Download width={14} height={14} />
                      </button>
                      <button
                        onClick={() => store.deleteFile(card.id, file.id)}
                        className="rounded-lg p-1.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
                      >
                        <X width={14} height={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {showNotes && (
              <Section title="Notas" icon={<NoteIcon width={14} height={14} />}>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {card.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`tone-${note.color} paper group relative rounded-2xl p-3.5`}
                    >
                      <AutoGrow
                        value={note.text}
                        onCommit={(text) => store.updateNote(card.id, note.id, { text })}
                        placeholder="Nota suelta…"
                        className="font-hand text-[19px] leading-snug"
                        minHeight={60}
                        autoFocus={note.id === freshNote}
                        onBlur={() => setFreshNote(null)}
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() =>
                            store.updateNote(card.id, note.id, {
                              color: nextColor(note.color),
                            })
                          }
                          title="Cambiar color"
                          className="rounded-lg p-1 opacity-60 hover:opacity-100"
                        >
                          <Palette width={13} height={13} />
                        </button>
                        <button
                          onClick={() => store.deleteNote(card.id, note.id)}
                          className="rounded-lg p-1 opacity-60 hover:opacity-100"
                        >
                          <X width={13} height={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Agregar bloques */}
            <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
              {!showDescription && (
                <AddBlock icon={<TextIcon width={14} height={14} />} onClick={() => reveal("description")}>
                  Descripción
                </AddBlock>
              )}
              {!card.startsOn && (
                <AddBlock
                  icon={<CalendarIcon width={14} height={14} />}
                  onClick={() => store.schedule(card.id, hoyISO())}
                >
                  Fecha
                </AddBlock>
              )}
              {!showChecklist && (
                <AddBlock icon={<ListIcon width={14} height={14} />} onClick={() => reveal("checklist")}>
                  Checklist
                </AddBlock>
              )}
              {!showLinks && (
                <AddBlock icon={<LinkIcon width={14} height={14} />} onClick={() => reveal("links")}>
                  Link
                </AddBlock>
              )}
              <AddBlock
                icon={<ImageIcon width={14} height={14} />}
                onClick={() => imageInput.current?.click()}
              >
                Imagen
              </AddBlock>
              <AddBlock
                icon={<FileIcon width={14} height={14} />}
                onClick={() => fileInput.current?.click()}
              >
                Archivo
              </AddBlock>
              <AddBlock
                icon={<NoteIcon width={14} height={14} />}
                onClick={() => setFreshNote(store.addNote(card.id))}
              >
                Nota
              </AddBlock>
              {busy && <span className="ml-2 text-[12px] text-ink-faint">guardando…</span>}
            </div>

            <p className="mt-4 text-[11px] text-ink-faint">
              Creada el {new Date(card.createdAt).toLocaleDateString("es-AR")} · editada{" "}
              {relativeTime(card.updatedAt)}
            </p>
          </div>

          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              ingest(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              ingest(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {lightbox !== null && card.images[lightbox] && (
          <Lightbox
            blobId={card.images[lightbox].blobId}
            onClose={() => setLightbox(null)}
            onPrev={() =>
              setLightbox((i) => ((i ?? 0) - 1 + card.images.length) % card.images.length)
            }
            onNext={() => setLightbox((i) => ((i ?? 0) + 1) % card.images.length)}
            index={lightbox}
            total={card.images.length}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Piezas ───────────────────────────────────────────────────────────────── */

function Section({
  title,
  icon,
  right,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="mt-5"
    >
      {title && (
        <div className="mb-2 flex items-center gap-2 text-ink-faint">
          {icon}
          <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase">{title}</h3>
          <span className="ml-auto">{right}</span>
        </div>
      )}
      {children}
    </motion.section>
  );
}

function CheckRow({ cardId, item }: { cardId: string; item: ChecklistItem }) {
  const { updateCheck, deleteCheck } = useStore();
  const [text, setText] = useDebounced(item.text, (value) =>
    updateCheck(cardId, item.id, { text: value }),
  );

  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-line/50">
      <button
        onClick={() => updateCheck(cardId, item.id, { done: !item.done })}
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-2 transition-all",
          item.done ? "border-transparent text-white" : "border-line-strong text-transparent",
        )}
        style={{ background: item.done ? "rgb(var(--tone))" : "transparent" }}
      >
        <Check width={11} height={11} strokeWidth={3.2} />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !text) deleteCheck(cardId, item.id);
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[14px] outline-none",
          item.done && "text-ink-faint line-through",
        )}
      />
      <button
        onClick={() => deleteCheck(cardId, item.id)}
        className="rounded-lg p-1 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
      >
        <X width={13} height={13} />
      </button>
    </div>
  );
}

function NewItemInput({
  placeholder,
  onSubmit,
  autoFocus,
}: {
  placeholder: string;
  onSubmit: (text: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 focus-within:border-brand/50">
      <Plus width={14} height={14} className="shrink-0 text-ink-faint" />
      <input
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault();
            onSubmit(value.trim());
            setValue("");
          }
        }}
        className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}

function AddBlock({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink-soft transition-all hover:border-brand/40 hover:bg-brand/5 hover:text-ink active:scale-95"
    >
      {icon}
      {children}
    </button>
  );
}

function Thumb({
  blobId,
  onOpen,
  onDelete,
}: {
  blobId: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const url = useBlobURL(blobId);
  return (
    <div className="group relative aspect-4/3 overflow-hidden rounded-xl border border-line bg-surface-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onClick={onOpen}
          className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <button
        onClick={onDelete}
        className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
      >
        <X width={14} height={14} />
      </button>
    </div>
  );
}

function Lightbox({
  blobId,
  onClose,
  onPrev,
  onNext,
  index,
  total,
}: {
  blobId: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  index: number;
  total: number;
}) {
  const url = useBlobURL(blobId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-60 grid place-items-center bg-black/85 p-6 backdrop-blur-sm"
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <motion.img
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          src={url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
        />
      )}
      {total > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-[12px] text-white/80 tabular-nums backdrop-blur">
          {index + 1} / {total}
        </div>
      )}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        <X width={18} height={18} />
      </button>
    </motion.div>
  );
}

function nextColor(color: ColorKey): ColorKey {
  const i = COLOR_KEYS.indexOf(color);
  return COLOR_KEYS[(i + 1) % COLOR_KEYS.length];
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} día${days === 1 ? "" : "s"}`;
  return new Date(timestamp).toLocaleDateString("es-AR");
}
