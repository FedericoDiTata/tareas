"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoGrow } from "./AutoGrow";
import { NoteIcon, Palette, X } from "./Icons";
import { useDatos } from "@/lib/store";
import { COLOR_KEYS, ColorKey, PostIt } from "@/lib/types";
import { isImageFile, storeImage, useBlobURL } from "@/lib/files";
import {
  ISODate,
  diferenciaDias,
  fechaCorta,
  hoyISO,
  nombreDiaSemana,
  sumarDias,
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
  const { datos } = useDatos();
  const hoy = hoyISO();
  const [cuantos, setCuantos] = useState(14);
  const [resaltado, setResaltado] = useState<string | null>(null);

  const papelitosPorDia = useMemo(() => {
    const mapa = new Map<ISODate, PostIt[]>();
    for (const papelito of datos.postits) {
      mapa.set(papelito.dia, [...(mapa.get(papelito.dia) ?? []), papelito]);
    }
    return mapa;
  }, [datos.postits]);

  /**
   * Se muestran los últimos días aunque estén vacíos: si sólo aparecieran los
   * días escritos, esto sería un archivo y no un cuaderno abierto.
   */
  const dias = useMemo(() => {
    const seguidos = Array.from({ length: cuantos }, (_, i) => sumarDias(hoy, -i));
    const conAlgo = [
      ...Object.values(datos.diario ?? {})
        .filter((entrada) => entrada.texto.trim())
        .map((entrada) => entrada.dia),
      ...datos.postits.map((papelito) => papelito.dia),
    ];
    return [...new Set([...seguidos, ...conAlgo])].sort((a, b) => (a > b ? -1 : 1));
  }, [datos.diario, datos.postits, hoy, cuantos]);

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
      <header className="mb-8">
        <h1 className="font-display text-[24px] font-semibold tracking-tight text-ink">Diario</h1>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          {escritos > 0
            ? `${escritos} ${escritos === 1 ? "día escrito" : "días escritos"}`
            : "Escribí lo que se te cante. No lo lee nadie."}
        </p>
      </header>

      {dias.map((dia) => (
        <Pagina
          key={dia}
          dia={dia}
          papelitos={papelitosPorDia.get(dia) ?? []}
          resaltado={resaltado}
        />
      ))}

      <button
        onClick={() => setCuantos((n) => n + 30)}
        className="mt-8 w-full rounded-xl border border-dashed border-line py-3 text-[12.5px] text-ink-faint transition-colors hover:border-brand/30 hover:text-ink-soft"
      >
        Ver más atrás
      </button>
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

  const [abierta, setAbierta] = useState(
    esHoy || Boolean(texto.trim()) || papelitos.length > 0,
  );

  async function pegar(archivos: File[]) {
    for (const archivo of archivos) {
      if (!isImageFile(archivo)) continue;
      const guardada = await storeImage(archivo);
      agregarPostIt({ dia, tipo: "imagen", blobId: guardada.blobId, texto: guardada.name });
    }
  }

  if (!abierta) {
    return (
      <button
        onClick={() => setAbierta(true)}
        className="group flex w-full items-baseline gap-3 border-b border-line/50 py-3 text-left"
      >
        <span className="text-[13px] text-ink-faint capitalize">
          {distancia === 1 ? "ayer" : `${nombreDiaSemana(dia)} ${fechaCorta(dia)}`}
        </span>
        <span className="text-[12px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
          escribir
        </span>
      </button>
    );
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
            "font-display font-semibold tracking-tight capitalize",
            esHoy ? "text-[18px] text-ink" : "text-[16px] text-ink-soft",
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

