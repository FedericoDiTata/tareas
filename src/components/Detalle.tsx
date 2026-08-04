"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoGrow } from "./AutoGrow";
import {
  CalendarIcon,
  Check,
  Download,
  FileIcon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  Pause,
  Pin,
  Play,
  Plus,
  Star,
  Trash,
  X,
} from "./Icons";
import { useEstanteria } from "@/lib/store";
import { MAX_CLAVES, Paso } from "@/lib/types";
import { cuando, hoyISO } from "@/lib/fechas";
import {
  downloadBlob,
  formatBytes,
  getBlob,
  isImageFile,
  saveBlob,
  storeImage,
  useBlobURL,
} from "@/lib/files";
import { cn, useDebounced, useEscape } from "@/lib/ui";

interface Props {
  id: string;
  onCerrar: () => void;
  onEmpezar: (id: string) => void;
}

/** El detalle de una cosa. Todo lo que quieras escribir entra acá. */
export function Detalle({ id, onCerrar, onEmpezar }: Props) {
  const tienda = useEstanteria();
  const cosa = tienda.estado.cosas[id];
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const inputImagen = useRef<HTMLInputElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  useEscape(true, () => (lightbox !== null ? setLightbox(null) : onCerrar()));

  useEffect(() => {
    if (!cosa) onCerrar();
  }, [cosa, onCerrar]);

  if (!cosa) return null;

  const claves = Object.values(tienda.estado.cosas).filter(
    (otra) => otra.clave && otra.estado === "activa",
  ).length;
  const semanaLlena = claves >= MAX_CLAVES && !cosa.clave;

  const mostrar = (bloque: string) => abiertos.has(bloque);
  const abrir = (bloque: string) => setAbiertos((prev) => new Set(prev).add(bloque));

  async function recibir(archivos: File[]) {
    if (!archivos.length) return;
    const imagenes = archivos.filter(isImageFile);
    const otros = archivos.filter((archivo) => !isImageFile(archivo));

    if (imagenes.length) {
      const guardadas = await Promise.all(imagenes.map((archivo) => storeImage(archivo)));
      tienda.agregarImagenes(
        id,
        guardadas.map((g) => ({ blobId: g.blobId, nombre: g.name, w: g.w, h: g.h })),
      );
    }
    for (const archivo of otros) {
      const blobId = await saveBlob(archivo);
      tienda.agregarArchivos(id, [
        { blobId, nombre: archivo.name, peso: archivo.size, tipo: archivo.type || "archivo" },
      ]);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCerrar}
        className="fixed inset-0 z-70 bg-black/60 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-70 flex items-start justify-center overflow-y-auto p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.99, transition: { duration: 0.15 } }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          onPaste={(e) => {
            const archivos = Array.from(e.clipboardData.files);
            if (archivos.length) {
              e.preventDefault();
              recibir(archivos);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            recibir(Array.from(e.dataTransfer.files));
          }}
          className="panel my-auto w-full max-w-2xl overflow-hidden rounded-3xl"
        >
          {/* Acciones de estado */}
          <div className="flex flex-wrap items-center gap-1 px-4 pt-3 sm:px-6">
            <Accion
              activa={cosa.clave}
              deshabilitada={semanaLlena}
              titulo={
                semanaLlena ? "Tu semana ya tiene cinco" : cosa.clave ? "Sacar de la semana" : "Esta semana"
              }
              onClick={() => tienda.marcarClave(cosa.id, !cosa.clave)}
            >
              <Star filled={cosa.clave} width={15} height={15} />
              {cosa.clave ? "Esta semana" : "Sumar a la semana"}
            </Accion>

            <Accion
              activa={cosa.fijadaEn === hoyISO()}
              titulo="Fijar para hoy"
              onClick={() => tienda.fijar(cosa.id)}
            >
              <Pin width={15} height={15} />
              Fijar hoy
            </Accion>

            <Accion titulo="Empezar ahora" onClick={() => onEmpezar(cosa.id)}>
              <Play width={15} height={15} />
              Empezar
            </Accion>

            <div className="ml-auto flex items-center gap-1">
              {cosa.estado === "activa" ? (
                <button
                  onClick={() => tienda.pausar(cosa.id)}
                  title="Que descanse"
                  className="rounded-xl p-2 text-ink-faint transition-colors hover:bg-line hover:text-ink"
                >
                  <Pause width={16} height={16} />
                </button>
              ) : (
                <button
                  onClick={() => tienda.despertar(cosa.id)}
                  className="rounded-xl px-3 py-2 text-[12.5px] text-ink-faint transition-colors hover:bg-line hover:text-ink"
                >
                  Reactivar
                </button>
              )}
              <button
                onClick={() => {
                  if (!confirmarBorrado) {
                    setConfirmarBorrado(true);
                    setTimeout(() => setConfirmarBorrado(false), 3000);
                    return;
                  }
                  tienda.borrarDeVerdad(cosa.id);
                  onCerrar();
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl p-2 text-[12.5px] transition-colors",
                  confirmarBorrado
                    ? "bg-rose-500/15 text-rose-400"
                    : "text-ink-faint hover:bg-line hover:text-rose-400",
                )}
              >
                <Trash width={16} height={16} />
                {confirmarBorrado && "¿Borrar del todo?"}
              </button>
              <button
                onClick={onCerrar}
                className="rounded-xl p-2 text-ink-faint transition-colors hover:bg-line hover:text-ink"
              >
                <X width={16} height={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-170px)] overflow-y-auto px-4 pt-3 pb-6 sm:px-6">
            <AutoGrow
              value={cosa.titulo}
              onCommit={(titulo) => tienda.actualizar(cosa.id, { titulo })}
              placeholder="¿Qué es?"
              autoFocus={!cosa.titulo}
              className="font-display text-2xl leading-tight font-semibold tracking-tight sm:text-[26px]"
            />

            {/* Cuándo y tamaño */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px]">
              <label
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                  cosa.vence ? "border-line text-ink-soft" : "border-line text-ink-faint",
                )}
              >
                <CalendarIcon width={14} height={14} />
                <input
                  type="date"
                  value={cosa.vence ?? ""}
                  onChange={(e) =>
                    tienda.actualizar(cosa.id, { vence: e.target.value || undefined })
                  }
                  className="bg-transparent outline-none"
                />
                {cosa.vence && (
                  <button
                    onClick={() => tienda.actualizar(cosa.id, { vence: undefined })}
                    className="text-ink-faint transition-colors hover:text-rose-400"
                  >
                    <X width={12} height={12} />
                  </button>
                )}
              </label>

              <button
                onClick={() => tienda.actualizar(cosa.id, { corta: !cosa.corta })}
                className={cn(
                  "rounded-xl border px-3 py-2 transition-colors",
                  cosa.corta
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-line text-ink-faint hover:text-ink-soft",
                )}
              >
                {cosa.corta ? "es cortita" : "¿es cortita?"}
              </button>

              {cosa.etiquetas.map((etiqueta) => (
                <span
                  key={etiqueta}
                  className="rounded-xl border border-line px-3 py-2 text-ink-faint"
                >
                  {etiqueta}
                </span>
              ))}
            </div>

            {(mostrar("notas") || cosa.notas) && (
              <div className="mt-6">
                <AutoGrow
                  value={cosa.notas}
                  onCommit={(notas) => tienda.actualizar(cosa.id, { notas })}
                  placeholder="Todo lo que quieras escribir."
                  className="text-[15px] leading-relaxed text-ink-soft"
                  minHeight={80}
                  autoFocus={mostrar("notas") && !cosa.notas}
                />
              </div>
            )}

            {(mostrar("pasos") || cosa.pasos.length > 0) && (
              <Bloque titulo="Pasos" icono={<ListIcon width={14} height={14} />}>
                <div className="space-y-0.5">
                  {cosa.pasos.map((paso) => (
                    <FilaPaso key={paso.id} cosaId={cosa.id} paso={paso} />
                  ))}
                </div>
                <NuevoItem
                  placeholder="Agregar un paso…"
                  onEnviar={(texto) => tienda.agregarPaso(cosa.id, texto)}
                  autoFocus={mostrar("pasos") && cosa.pasos.length === 0}
                />
              </Bloque>
            )}

            {(mostrar("links") || cosa.links.length > 0) && (
              <Bloque titulo="Links" icono={<LinkIcon width={14} height={14} />}>
                <div className="space-y-1.5">
                  {cosa.links.map((link) => (
                    <div key={link.id} className="group flex items-center gap-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-[13px] transition-colors hover:border-brand/40"
                      >
                        <LinkIcon width={14} height={14} className="shrink-0 text-ink-faint" />
                        <span className="truncate">{link.titulo}</span>
                      </a>
                      <button
                        onClick={() => tienda.borrarLink(cosa.id, link.id)}
                        className="rounded-lg p-1.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                      >
                        <X width={13} height={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <NuevoItem
                  placeholder="Pegá un link y Enter…"
                  onEnviar={(texto) => tienda.agregarLink(cosa.id, texto)}
                  autoFocus={mostrar("links") && cosa.links.length === 0}
                />
              </Bloque>
            )}

            {cosa.imagenes.length > 0 && (
              <Bloque titulo="Imágenes" icono={<ImageIcon width={14} height={14} />}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {cosa.imagenes.map((imagen, indice) => (
                    <Miniatura
                      key={imagen.id}
                      blobId={imagen.blobId}
                      onAbrir={() => setLightbox(indice)}
                      onBorrar={() => tienda.borrarImagen(cosa.id, imagen.id)}
                    />
                  ))}
                </div>
              </Bloque>
            )}

            {cosa.archivos.length > 0 && (
              <Bloque titulo="Archivos" icono={<FileIcon width={14} height={14} />}>
                <div className="space-y-1.5">
                  {cosa.archivos.map((archivo) => (
                    <div
                      key={archivo.id}
                      className="group flex items-center gap-3 rounded-xl border border-line px-3 py-2"
                    >
                      <FileIcon width={15} height={15} className="shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{archivo.nombre}</span>
                      <span className="shrink-0 text-[11px] text-ink-faint tabular-nums">
                        {formatBytes(archivo.peso)}
                      </span>
                      <button
                        onClick={async () => {
                          const blob = await getBlob(archivo.blobId);
                          if (blob) downloadBlob(blob, archivo.nombre);
                        }}
                        className="rounded-lg p-1.5 text-ink-faint transition-colors hover:text-ink"
                      >
                        <Download width={14} height={14} />
                      </button>
                      <button
                        onClick={() => tienda.borrarArchivo(cosa.id, archivo.id)}
                        className="rounded-lg p-1.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                      >
                        <X width={13} height={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </Bloque>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
              {!mostrar("notas") && !cosa.notas && (
                <Sumar onClick={() => abrir("notas")}>Notas</Sumar>
              )}
              {!mostrar("pasos") && cosa.pasos.length === 0 && (
                <Sumar onClick={() => abrir("pasos")}>Pasos</Sumar>
              )}
              {!mostrar("links") && cosa.links.length === 0 && (
                <Sumar onClick={() => abrir("links")}>Link</Sumar>
              )}
              <Sumar onClick={() => inputImagen.current?.click()}>Imagen</Sumar>
              <Sumar onClick={() => inputArchivo.current?.click()}>Archivo</Sumar>
            </div>

            <p className="mt-4 text-[11px] text-ink-faint">
              {cosa.estado === "hecha" && cosa.terminadaEn
                ? `Terminada ${cuando(new Date(cosa.terminadaEn).toISOString().slice(0, 10))}.`
                : null}{" "}
              {cosa.minutosDeFoco > 0 && `${cosa.minutosDeFoco} min de foco. `}
              {new Set(cosa.saltos).size > 0 &&
                `La salteaste ${new Set(cosa.saltos).size} ${
                  new Set(cosa.saltos).size === 1 ? "vez" : "veces"
                }.`}
            </p>

            {cosa.estado === "hecha" && (
              <button
                onClick={() => tienda.reabrir(cosa.id)}
                className="mt-3 text-[12.5px] text-brand transition-opacity hover:opacity-80"
              >
                volver a abrirla
              </button>
            )}
          </div>

          <input
            ref={inputImagen}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              recibir(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <input
            ref={inputArchivo}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              recibir(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {lightbox !== null && cosa.imagenes[lightbox] && (
          <Lightbox
            blobId={cosa.imagenes[lightbox].blobId}
            onCerrar={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Piezas ───────────────────────────────────────────────────────────────── */

function Accion({
  children,
  onClick,
  activa,
  deshabilitada,
  titulo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  activa?: boolean;
  deshabilitada?: boolean;
  titulo?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitada}
      title={titulo}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12.5px] transition-colors",
        activa ? "bg-brand/12 text-brand" : "text-ink-faint hover:bg-line hover:text-ink",
        deshabilitada && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function Bloque({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-6"
    >
      <div className="mb-2 flex items-center gap-2 text-ink-faint">
        {icono}
        <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase">{titulo}</h3>
      </div>
      {children}
    </motion.section>
  );
}

function FilaPaso({ cosaId, paso }: { cosaId: string; paso: Paso }) {
  const { editarPaso, borrarPaso } = useEstanteria();
  const [texto, setTexto] = useDebounced(paso.texto, (valor) =>
    editarPaso(cosaId, paso.id, { texto: valor }),
  );

  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-1 py-1.5 transition-colors hover:bg-white/[0.02]">
      <button
        onClick={() => editarPaso(cosaId, paso.id, { hecho: !paso.hecho })}
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-colors",
          paso.hecho
            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
            : "border-line-strong text-transparent hover:border-ink-faint",
        )}
      >
        <Check width={11} height={11} strokeWidth={3} />
      </button>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !texto) borrarPaso(cosaId, paso.id);
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[14px] outline-none",
          paso.hecho && "text-ink-faint line-through",
        )}
      />
      <button
        onClick={() => borrarPaso(cosaId, paso.id)}
        className="rounded-lg p-1 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
      >
        <X width={13} height={13} />
      </button>
    </div>
  );
}

function NuevoItem({
  placeholder,
  onEnviar,
  autoFocus,
}: {
  placeholder: string;
  onEnviar: (texto: string) => void;
  autoFocus?: boolean;
}) {
  const [valor, setValor] = useState("");
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 focus-within:border-brand/40">
      <Plus width={14} height={14} className="shrink-0 text-ink-faint" />
      <input
        value={valor}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valor.trim()) {
            e.preventDefault();
            onEnviar(valor.trim());
            setValor("");
          }
        }}
        className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}

function Sumar({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink-faint transition-colors hover:border-brand/40 hover:text-ink"
    >
      {children}
    </button>
  );
}

function Miniatura({
  blobId,
  onAbrir,
  onBorrar,
}: {
  blobId: string;
  onAbrir: () => void;
  onBorrar: () => void;
}) {
  const url = useBlobURL(blobId);
  return (
    <div className="group relative aspect-4/3 overflow-hidden rounded-xl border border-line bg-surface-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onClick={onAbrir}
          className="h-full w-full cursor-zoom-in object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <button
        onClick={onBorrar}
        className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
      >
        <X width={14} height={14} />
      </button>
    </div>
  );
}

function Lightbox({ blobId, onCerrar }: { blobId: string; onCerrar: () => void }) {
  const url = useBlobURL(blobId);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCerrar}
      className="fixed inset-0 z-80 grid place-items-center bg-black/90 p-6 backdrop-blur-sm"
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <motion.img
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          src={url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-2xl object-contain"
        />
      )}
    </motion.div>
  );
}
