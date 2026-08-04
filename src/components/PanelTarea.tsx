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
  Play,
  Plus,
  Trash,
  X,
} from "./Icons";
import { useDatos } from "@/lib/store";
import { PRIORIDADES, PRIORIDAD_COLOR, PRIORIDAD_LABEL, Paso, Prioridad } from "@/lib/types";
import { cuando } from "@/lib/fechas";
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
  onFoco: (id: string) => void;
}

/** El detalle vive pegado a la derecha, sin tapar la lista. */
export function PanelTarea({ id, onCerrar, onFoco }: Props) {
  const tienda = useDatos();
  const tarea = tienda.datos.tareas[id];
  const [confirmar, setConfirmar] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const inputImagen = useRef<HTMLInputElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  useEscape(true, () => (lightbox !== null ? setLightbox(null) : onCerrar()));

  useEffect(() => {
    if (!tarea) onCerrar();
  }, [tarea, onCerrar]);

  if (!tarea) return null;

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
        transition={{ duration: 0.18 }}
        onClick={onCerrar}
        className="fixed inset-0 z-60 bg-black/40 lg:bg-transparent"
      />

      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 30, opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
        className="fixed top-0 right-0 z-60 flex h-full w-full max-w-[440px] flex-col border-l border-line bg-surface shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center gap-1 border-b border-line px-4 py-2.5">
          <button
            onClick={() => onFoco(tarea.id)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-brand"
          >
            <Play width={14} height={14} />
            Foco
          </button>
          <button
            onClick={() => {
              tienda.completar(tarea.id);
              onCerrar();
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-emerald-400"
          >
            <Check width={14} height={14} />
            Completar
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => {
                if (!confirmar) {
                  setConfirmar(true);
                  setTimeout(() => setConfirmar(false), 3000);
                  return;
                }
                tienda.borrar(tarea.id);
                onCerrar();
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg p-2 text-[12px] transition-colors",
                confirmar
                  ? "bg-rose-500/15 text-rose-400"
                  : "text-ink-faint hover:bg-white/[0.05] hover:text-rose-400",
              )}
            >
              <Trash width={15} height={15} />
              {confirmar && "¿Seguro?"}
            </button>
            <button
              onClick={onCerrar}
              className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <X width={15} height={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AutoGrow
            value={tarea.titulo}
            onCommit={(titulo) => tienda.actualizar(tarea.id, { titulo })}
            placeholder="¿Qué hay que hacer?"
            autoFocus={!tarea.titulo}
            className="font-display text-[19px] leading-snug font-semibold tracking-tight"
          />

          {/* Los tres campos que definen una tarea, siempre visibles */}
          <div className="mt-4 space-y-2 text-[13px]">
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-ink-faint">Cuándo</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tarea.vence ?? ""}
                  onChange={(e) => tienda.programar(tarea.id, e.target.value || null)}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 outline-none focus:border-brand/40"
                />
                {tarea.vence && (
                  <button
                    onClick={() => tienda.programar(tarea.id, null)}
                    className="text-ink-faint transition-colors hover:text-rose-400"
                  >
                    <X width={13} height={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-ink-faint">Prioridad</span>
              <div className="flex items-center gap-1.5">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p}
                    onClick={() => tienda.setPrioridad(tarea.id, p)}
                    title={PRIORIDAD_LABEL[p]}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg border transition-colors",
                      tarea.prioridad === p ? "border-line-strong" : "border-transparent",
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        background: p === 4 ? "transparent" : PRIORIDAD_COLOR[p],
                        border: p === 4 ? "1.5px solid var(--ink-faint)" : undefined,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-ink-faint">Proyecto</span>
              <select
                value={tarea.proyectoId ?? ""}
                onChange={(e) => tienda.moverAProyecto(tarea.id, e.target.value || null)}
                className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 outline-none focus:border-brand/40"
              >
                <option value="">Bandeja</option>
                {tienda.datos.proyectos.map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <AutoGrow
              value={tarea.notas}
              onCommit={(notas) => tienda.actualizar(tarea.id, { notas })}
              placeholder="Notas, links, lo que quieras escribir."
              className="text-[14px] leading-relaxed text-ink-soft"
              minHeight={60}
            />
          </div>

          <Seccion titulo="Pasos" icono={<ListIcon width={13} height={13} />}>
            <div className="space-y-0.5">
              {tarea.pasos.map((paso) => (
                <FilaPaso key={paso.id} tareaId={tarea.id} paso={paso} />
              ))}
            </div>
            <NuevoItem
              placeholder="Agregar un paso…"
              onEnviar={(texto) => tienda.agregarPaso(tarea.id, texto)}
            />
          </Seccion>

          {tarea.links.length > 0 && (
            <Seccion titulo="Links" icono={<LinkIcon width={13} height={13} />}>
              <div className="space-y-1.5">
                {tarea.links.map((link) => (
                  <div key={link.id} className="group flex items-center gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] transition-colors hover:border-brand/40"
                    >
                      <LinkIcon width={13} height={13} className="shrink-0 text-ink-faint" />
                      <span className="truncate">{link.titulo}</span>
                    </a>
                    <button
                      onClick={() => tienda.borrarLink(tarea.id, link.id)}
                      className="rounded-lg p-1 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                    >
                      <X width={12} height={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {tarea.imagenes.length > 0 && (
            <Seccion titulo="Imágenes" icono={<ImageIcon width={13} height={13} />}>
              <div className="grid grid-cols-3 gap-2">
                {tarea.imagenes.map((imagen, indice) => (
                  <Miniatura
                    key={imagen.id}
                    blobId={imagen.blobId}
                    onAbrir={() => setLightbox(indice)}
                    onBorrar={() => tienda.borrarImagen(tarea.id, imagen.id)}
                  />
                ))}
              </div>
            </Seccion>
          )}

          {tarea.archivos.length > 0 && (
            <Seccion titulo="Archivos" icono={<FileIcon width={13} height={13} />}>
              <div className="space-y-1.5">
                {tarea.archivos.map((archivo) => (
                  <div
                    key={archivo.id}
                    className="group flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5"
                  >
                    <FileIcon width={13} height={13} className="shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{archivo.nombre}</span>
                    <span className="shrink-0 text-[11px] text-ink-faint">
                      {formatBytes(archivo.peso)}
                    </span>
                    <button
                      onClick={async () => {
                        const blob = await getBlob(archivo.blobId);
                        if (blob) downloadBlob(blob, archivo.nombre);
                      }}
                      className="rounded-lg p-1 text-ink-faint transition-colors hover:text-ink"
                    >
                      <Download width={13} height={13} />
                    </button>
                    <button
                      onClick={() => tienda.borrarArchivo(tarea.id, archivo.id)}
                      className="rounded-lg p-1 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                    >
                      <X width={12} height={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
            <Sumar onClick={() => inputImagen.current?.click()}>Imagen</Sumar>
            <Sumar onClick={() => inputArchivo.current?.click()}>Archivo</Sumar>
            <NuevoLink onEnviar={(url) => tienda.agregarLink(tarea.id, url)} />
          </div>

          <p className="mt-4 text-[11px] text-ink-faint">
            {tarea.minutosDeFoco > 0 && `${tarea.minutosDeFoco} min de foco · `}
            {tarea.hecha && tarea.terminadaEn
              ? `completada ${cuando(new Date(tarea.terminadaEn).toISOString().slice(0, 10))}`
              : `creada ${cuando(new Date(tarea.creadaEn).toISOString().slice(0, 10))}`}
          </p>
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
      </motion.aside>

      <AnimatePresence>
        {lightbox !== null && tarea.imagenes[lightbox] && (
          <Lightbox blobId={tarea.imagenes[lightbox].blobId} onCerrar={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

function Seccion({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-2 text-ink-faint">
        {icono}
        <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase">{titulo}</h3>
      </div>
      {children}
    </section>
  );
}

function FilaPaso({ tareaId, paso }: { tareaId: string; paso: Paso }) {
  const { editarPaso, borrarPaso } = useDatos();
  const [texto, setTexto] = useDebounced(paso.texto, (valor) =>
    editarPaso(tareaId, paso.id, { texto: valor }),
  );

  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-white/[0.02]">
      <button
        onClick={() => editarPaso(tareaId, paso.id, { hecho: !paso.hecho })}
        className={cn(
          "grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors",
          paso.hecho
            ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-400"
            : "border-line-strong text-transparent hover:border-ink-faint",
        )}
      >
        <Check width={10} height={10} strokeWidth={3.5} />
      </button>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !texto) borrarPaso(tareaId, paso.id);
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[13.5px] outline-none",
          paso.hecho && "text-ink-faint line-through",
        )}
      />
      <button
        onClick={() => borrarPaso(tareaId, paso.id)}
        className="rounded-lg p-1 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
      >
        <X width={12} height={12} />
      </button>
    </div>
  );
}

function NuevoItem({
  placeholder,
  onEnviar,
}: {
  placeholder: string;
  onEnviar: (texto: string) => void;
}) {
  const [valor, setValor] = useState("");
  return (
    <div className="mt-1 flex items-center gap-2.5 px-1 py-1">
      <Plus width={14} height={14} className="shrink-0 text-ink-faint" />
      <input
        value={valor}
        placeholder={placeholder}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valor.trim()) {
            e.preventDefault();
            onEnviar(valor.trim());
            setValor("");
          }
        }}
        className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}

function NuevoLink({ onEnviar }: { onEnviar: (url: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState("");

  if (!abierto) return <Sumar onClick={() => setAbierto(true)}>Link</Sumar>;

  return (
    <input
      autoFocus
      value={valor}
      placeholder="Pegá el link y Enter"
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => setAbierto(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && valor.trim()) {
          onEnviar(valor.trim());
          setValor("");
          setAbierto(false);
        }
        if (e.key === "Escape") setAbierto(false);
      }}
      className="flex-1 rounded-full border border-brand/40 bg-surface-2 px-3 py-1.5 text-[12.5px] outline-none"
    />
  );
}

function Sumar({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-faint transition-colors hover:border-brand/40 hover:text-ink"
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
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onClick={onAbrir}
          className="h-full w-full cursor-zoom-in object-cover"
        />
      )}
      <button
        onClick={onBorrar}
        className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X width={12} height={12} />
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
      className="fixed inset-0 z-80 grid place-items-center bg-black/90 p-6"
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
      )}
    </motion.div>
  );
}
