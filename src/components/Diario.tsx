"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoGrow } from "./AutoGrow";
import { Check, NoteIcon, Palette, Play, Upload, X } from "./Icons";
import { useDatos } from "@/lib/store";
import { COLOR_KEYS, ColorKey, PostIt } from "@/lib/types";
import { isImageFile, storeImage, useBlobURL } from "@/lib/files";
import { sesionesDelDia } from "@/lib/foco";
import {
  ISODate,
  diferenciaDias,
  duracion,
  fechaCorta,
  hora,
  hoyISO,
  nombreDiaSemana,
} from "@/lib/fechas";
import { cn } from "@/lib/ui";

interface Props {
  /** Papelito al que hay que ir (viene de la búsqueda). */
  focusId?: string | null;
  onFocused?: () => void;
}

/**
 * El diario: un día abajo del otro, con el de hoy arriba y el cursor listo.
 *
 * Los papelitos van pegados a un día, como un post-it sobre la página de un
 * cuaderno. No hay lienzo aparte: si estuviera en otra pantalla, escribir y
 * pegar serían dos actividades distintas, y son la misma.
 */
export function Diario({ focusId, onFocused }: Props) {
  const { datos, importarDiario } = useDatos();
  const hoy = hoyISO();
  const [cuantos, setCuantos] = useState(15);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const papelitosPorDia = useMemo(() => {
    const mapa = new Map<ISODate, PostIt[]>();
    for (const papelito of datos.postits) {
      mapa.set(papelito.dia, [...(mapa.get(papelito.dia) ?? []), papelito]);
    }
    return mapa;
  }, [datos.postits]);

  /** Sólo hoy y los días que tienen algo: los vacíos no ocupan lugar. */
  const conAlgo = useMemo(() => {
    const dias = new Set<ISODate>([hoy]);
    Object.values(datos.diario ?? {}).forEach((entrada) => {
      if (entrada.texto.trim()) dias.add(entrada.dia);
    });
    datos.postits.forEach((papelito) => dias.add(papelito.dia));
    // Un día en el que enfocaste es un día que pasó algo, aunque no lo hayas escrito.
    datos.sesiones.forEach((sesion) => dias.add(sesion.dia));
    return [...dias].filter((dia) => dia <= hoy).sort((a, b) => (a > b ? -1 : 1));
  }, [datos.diario, datos.postits, datos.sesiones, hoy]);

  const dias = conAlgo.slice(0, cuantos);

  async function importar(archivo: File) {
    const { parsearDiario } = await import("@/lib/importarDiario");
    const entradas = parsearDiario(await archivo.text());
    if (entradas.length === 0) {
      setAviso("No encontré ninguna fecha en ese archivo.");
      return;
    }
    const { agregadas, salteadas } = importarDiario(entradas);
    setAviso(
      `Se sumaron ${agregadas} ${agregadas === 1 ? "día" : "días"}` +
        (salteadas > 0 ? ` · ${salteadas} ya estaban escritos y quedaron como estaban` : ""),
    );
  }

  // El aviso deja lugar de nuevo al contador después de un rato.
  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(timer);
  }, [aviso]);

  // Al llegar desde el buscador, abrir ese día y marcarlo un momento.
  useEffect(() => {
    if (!focusId) return;
    const papelito = datos.postits.find((p) => p.id === focusId);
    if (!papelito) return;
    setResaltado(papelito.id);
    const timer = setTimeout(() => setResaltado(null), 1800);
    document
      .querySelector(`[data-dia-diario="${papelito.dia}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    onFocused?.();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const escritos = Object.values(datos.diario ?? {}).filter((e) => e.texto.trim()).length;

  return (
    <div className="mx-auto h-full w-full max-w-4xl overflow-y-auto px-8 py-8 sm:px-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-titulo">Diario</h1>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            {aviso ??
              (escritos > 0
                ? `${escritos} ${escritos === 1 ? "día escrito" : "días escritos"}`
                : "Escribí lo que se te cante. No lo lee nadie.")}
          </p>
        </div>
        <button
          onClick={() => inputArchivo.current?.click()}
          title="Sumar entradas desde un archivo de texto"
          className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[12.5px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
        >
          <Upload width={14} height={14} />
          Importar
        </button>
      </header>

      {dias.map((dia) => (
        <Pagina
          key={dia}
          dia={dia}
          papelitos={papelitosPorDia.get(dia) ?? []}
          resaltado={resaltado}
        />
      ))}

      {conAlgo.length > dias.length && (
        <button
          onClick={() => setCuantos((n) => n + 30)}
          className="mt-8 w-full rounded-xl border border-dashed border-line py-3 text-[12.5px] text-ink-faint transition-colors hover:border-brand/30 hover:text-ink-soft"
        >
          Ver más atrás ({conAlgo.length - dias.length})
        </button>
      )}

      <input
        ref={inputArchivo}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (archivo) importar(archivo);
        }}
      />
    </div>
  );
}

/* ── Un día ──────────────────────────────────────────────────────────────── */

function Pagina({
  dia,
  papelitos,
  resaltado,
}: {
  dia: ISODate;
  papelitos: PostIt[];
  resaltado: string | null;
}) {
  const { datos, escribirDiario, agregarPostIt } = useDatos();
  const entrada = datos.diario?.[dia];
  const texto = entrada?.texto ?? "";
  const esHoy = dia === hoyISO();
  const distancia = diferenciaDias(dia, hoyISO());
  const [nuevo, setNuevo] = useState<string | null>(null);

  async function pegar(archivos: File[]) {
    for (const archivo of archivos) {
      if (!isImageFile(archivo)) continue;
      const guardada = await storeImage(archivo);
      agregarPostIt({ dia, tipo: "imagen", blobId: guardada.blobId, texto: guardada.name });
    }
  }

  return (
    <section
      data-dia-diario={dia}
      className={cn("border-b border-line/50 py-6", esHoy && "pt-0")}
      onPaste={(e) => {
        const archivos = Array.from(e.clipboardData.files);
        if (archivos.length) {
          e.preventDefault();
          pegar(archivos);
        }
      }}
    >
      <div className="mb-3 flex items-baseline gap-3">
        <h2
          className={cn(
            "font-display font-semibold tracking-tight text-titulo capitalize",
            esHoy ? "text-[22px]" : "text-[19px]",
          )}
        >
          {esHoy ? "Hoy" : distancia === 1 ? "Ayer" : nombreDiaSemana(dia)}
        </h2>
        <span className="text-[12.5px] text-ink-faint">{fechaCorta(dia)}</span>

        <button
          onClick={() => setNuevo(agregarPostIt({ dia }))}
          title="Pegar un papelito en este día"
          className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
        >
          <NoteIcon width={13} height={13} />
          Papelito
        </button>
      </div>

      <AutoGrow
        value={texto}
        onCommit={(valor) => escribirDiario(dia, valor)}
        placeholder={esHoy ? "¿Cómo viene el día?" : "Nada escrito este día."}
        className="text-[16px] leading-[1.8] text-ink-soft"
        minHeight={esHoy ? 220 : 60}
      />

      <CintaDeFoco dia={dia} />

      {papelitos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          <AnimatePresence initial={false}>
            {papelitos.map((papelito) => (
              <Papelito
                key={papelito.id}
                papelito={papelito}
                editando={nuevo === papelito.id}
                onEditado={() => setNuevo(null)}
                resaltado={resaltado === papelito.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

/* ── Lo que enfocaste ese día ────────────────────────────────────────────── */

/**
 * El registro de las sesiones de foco del día.
 *
 * Va acá y no en una pantalla de estadísticas porque no es una métrica para
 * perseguir: es parte de lo que pasó ese día, como todo lo demás del diario.
 */
function CintaDeFoco({ dia }: { dia: ISODate }) {
  const { datos } = useDatos();
  const sesiones = useMemo(() => sesionesDelDia(datos.sesiones, dia), [datos.sesiones, dia]);
  if (sesiones.length === 0) return null;

  const total = sesiones.reduce((suma, sesion) => suma + sesion.segundos, 0);
  const terminadas = sesiones.reduce(
    (suma, sesion) => suma + sesion.tramos.filter((t) => t.completada).length,
    0,
  );

  return (
    <div className="mt-5 rounded-2xl border border-line bg-white/[0.02] px-4 py-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Play width={11} height={11} className="text-ink-faint" />
        <span className="text-[11px] font-semibold tracking-[0.14em] text-titulo uppercase">
          Foco
        </span>
        <span className="text-[12.5px] text-ink-soft">
          {duracion(total)} en {sesiones.length}{" "}
          {sesiones.length === 1 ? "sesión" : "sesiones"}
          {terminadas > 0 && ` · ${terminadas} ${terminadas === 1 ? "tarea" : "tareas"}`}
        </span>
      </div>

      <div className="space-y-2.5">
        {sesiones.map((sesion) => (
          <div key={sesion.id} className="flex gap-3">
            <span className="w-11 shrink-0 pt-px text-[11.5px] text-ink-faint tabular-nums">
              {hora(sesion.inicio)}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              {sesion.tramos.map((tramo, i) => (
                <div key={`${sesion.id}-${i}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid h-[13px] w-[13px] shrink-0 place-items-center rounded-full",
                        tramo.completada
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "border border-line-strong text-transparent",
                      )}
                    >
                      <Check width={8} height={8} strokeWidth={4} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">
                      {tramo.titulo}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-ink-faint tabular-nums">
                      {duracion(tramo.segundos)}
                    </span>
                  </div>

                  {/* Qué avanzó en ese rato, que es lo que uno quiere leer después. */}
                  {tramo.pasos && tramo.pasos.length > 0 && (
                    <ul className="mt-1 ml-[21px] space-y-0.5">
                      {tramo.pasos.map((paso, j) => (
                        <li
                          key={`${sesion.id}-${i}-${j}`}
                          className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-faint"
                        >
                          <span className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-ink-faint" />
                          {paso}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Un papelito ─────────────────────────────────────────────────────────── */

function Papelito({
  papelito,
  editando,
  onEditado,
  resaltado,
}: {
  papelito: PostIt;
  editando: boolean;
  onEditado: () => void;
  resaltado: boolean;
}) {
  const { actualizarPostIt, borrarPostIt } = useDatos();
  const [escribiendo, setEscribiendo] = useState(editando);
  const [paleta, setPaleta] = useState(false);
  const url = useBlobURL(papelito.tipo === "imagen" ? papelito.blobId : undefined);

  useEffect(() => {
    if (editando) setEscribiendo(true);
  }, [editando]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.14 } }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{ rotate: `${papelito.rot}deg` }}
      className={cn(
        `tone-${papelito.color}`,
        "group relative w-[190px] transition-transform hover:-translate-y-0.5",
        resaltado && "ring-2 ring-brand",
      )}
    >
      {papelito.tipo === "imagen" ? (
        <div className="paper overflow-hidden rounded-[10px] p-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full rounded-md object-cover" />
          ) : (
            <div className="grid h-24 place-items-center text-[11px] opacity-60">cargando…</div>
          )}
        </div>
      ) : (
        <div className="paper paper-fold min-h-[130px] rounded-[10px] p-3.5">
          {escribiendo ? (
            <AutoGrow
              value={papelito.texto}
              onCommit={(texto) => actualizarPostIt(papelito.id, { texto })}
              onBlur={() => {
                setEscribiendo(false);
                onEditado();
              }}
              autoFocus
              placeholder="Escribí…"
              className="font-hand text-[19px] leading-[1.3]"
              minHeight={100}
            />
          ) : (
            <div
              onClick={() => setEscribiendo(true)}
              className="min-h-[100px] cursor-text font-hand text-[19px] leading-[1.3] break-words whitespace-pre-wrap"
            >
              {papelito.texto || <span className="opacity-40">Escribí…</span>}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {!escribiendo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2.5 right-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {paleta ? (
              <div className="glass flex items-center gap-0.5 rounded-full p-1 shadow-lg">
                {COLOR_KEYS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      actualizarPostIt(papelito.id, { color });
                      setPaleta(false);
                    }}
                    className={`tone-${color} h-4 w-4 rounded-full transition-transform hover:scale-125`}
                    style={{ background: "rgb(var(--tone))" }}
                  />
                ))}
              </div>
            ) : (
              <div className="glass flex items-center gap-0.5 rounded-full p-1 shadow-lg">
                <button
                  onClick={() => setPaleta(true)}
                  title="Color"
                  className="grid h-6 w-6 place-items-center rounded-full text-ink-soft hover:text-ink"
                >
                  <Palette width={13} height={13} />
                </button>
                <button
                  onClick={() => borrarPostIt(papelito.id)}
                  title="Sacar"
                  className="grid h-6 w-6 place-items-center rounded-full text-ink-soft hover:text-rose-400"
                >
                  <X width={13} height={13} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

