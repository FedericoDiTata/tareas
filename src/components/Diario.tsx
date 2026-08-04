"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { AutoGrow } from "./AutoGrow";
import { Desk } from "./Desk";
import { NoteIcon, Plus } from "./Icons";
import { useDatos } from "@/lib/store";
import {
  ISODate,
  cuando,
  diferenciaDias,
  fechaCorta,
  hoyISO,
  nombreDiaSemana,
  sumarDias,
} from "@/lib/fechas";
import { cn } from "@/lib/ui";

type Modo = "diario" | "pizarra";

interface Props {
  focusId?: string | null;
  onFocused?: () => void;
}

/**
 * El escritorio, en dos formas: el diario para escribir día a día y la pizarra
 * para las falopeadas — papelitos, frases sueltas, imágenes y flechas entre
 * cosas. Una es para pensar en renglones y la otra para pensar en el espacio.
 */
export function Diario({ focusId, onFocused }: Props) {
  const [modo, setModo] = useState<Modo>("diario");

  useEffect(() => {
    const guardado = localStorage.getItem("escritorio.diario");
    if (guardado === "diario" || guardado === "pizarra") setModo(guardado);
  }, []);

  // Si la búsqueda apunta a un papelito, hay que estar en la pizarra para verlo.
  useEffect(() => {
    if (focusId) setModo("pizarra");
  }, [focusId]);

  function cambiar(nuevo: Modo) {
    setModo(nuevo);
    localStorage.setItem("escritorio.diario", nuevo);
  }

  const selector = (
    <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5">
      {(
        [
          { id: "diario" as const, texto: "Diario" },
          { id: "pizarra" as const, texto: "Pizarra" },
        ]
      ).map((opcion) => (
        <button
          key={opcion.id}
          onClick={() => cambiar(opcion.id)}
          className={cn(
            "relative rounded-md px-3 py-1.5 text-[12.5px] transition-colors",
            modo === opcion.id ? "text-ink" : "text-ink-faint hover:text-ink-soft",
          )}
        >
          {modo === opcion.id && (
            <motion.span
              layoutId="modo-diario"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-md bg-white/[0.07]"
            />
          )}
          <span className="relative">{opcion.texto}</span>
        </button>
      ))}
    </div>
  );

  if (modo === "pizarra") {
    return (
      <div className="relative h-full">
        <div className="absolute top-4 right-6 z-30 sm:right-10">{selector}</div>
        <Desk focusId={focusId} onFocused={onFocused} />
      </div>
    );
  }

  return <Paginas selector={selector} onPizarra={() => cambiar("pizarra")} />;
}

/* ── El diario ───────────────────────────────────────────────────────────── */

function Paginas({
  selector,
  onPizarra,
}: {
  selector: React.ReactNode;
  onPizarra: () => void;
}) {
  const { datos, escribirDiario, agregarPostIt } = useDatos();
  const hoy = hoyISO();
  const [cuantos, setCuantos] = useState(14);

  /**
   * Siempre se muestran los últimos N días aunque estén vacíos: si sólo
   * aparecieran los días escritos, el diario se sentiría un archivo y no un
   * cuaderno abierto.
   */
  const dias = useMemo(() => {
    const seguidos = Array.from({ length: cuantos }, (_, i) => sumarDias(hoy, -i));
    const escritos = Object.values(datos.diario ?? {})
      .filter((entrada) => entrada.texto.trim() && !seguidos.includes(entrada.dia))
      .map((entrada) => entrada.dia);
    return [...new Set([...seguidos, ...escritos])].sort((a, b) => (a > b ? -1 : 1));
  }, [datos.diario, hoy, cuantos]);

  const escritas = Object.values(datos.diario ?? {}).filter((e) => e.texto.trim()).length;

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-6 py-8 sm:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink">Diario</h1>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            {escritas > 0
              ? `${escritas} ${escritas === 1 ? "día escrito" : "días escritos"}`
              : "Escribí lo que se te cante. No lo lee nadie."}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              agregarPostIt({
                tipo: "nota",
                x: 120 + Math.random() * 240,
                y: 120 + Math.random() * 200,
              });
              onPizarra();
            }}
            className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[12.5px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
          >
            <NoteIcon width={14} height={14} />
            Papelito
          </button>
          {selector}
        </div>
      </header>

      {dias.map((dia) => (
        <Pagina key={dia} dia={dia} onEscribir={escribirDiario} />
      ))}

      <button
        onClick={() => setCuantos((n) => n + 30)}
        className="mt-6 w-full rounded-xl border border-dashed border-line py-3 text-[12.5px] text-ink-faint transition-colors hover:border-brand/30 hover:text-ink-soft"
      >
        Ver más atrás
      </button>
    </div>
  );
}

function Pagina({
  dia,
  onEscribir,
}: {
  dia: ISODate;
  onEscribir: (dia: string, texto: string) => void;
}) {
  const { datos } = useDatos();
  const entrada = datos.diario?.[dia];
  const texto = entrada?.texto ?? "";
  const esHoy = dia === hoyISO();
  const distancia = diferenciaDias(dia, hoyISO());

  // Los días viejos y vacíos no ocupan lugar hasta que los tocás.
  const [abierta, setAbierta] = useState(esHoy || Boolean(texto.trim()));

  if (!abierta) {
    return (
      <button
        onClick={() => setAbierta(true)}
        className="group flex w-full items-baseline gap-3 border-b border-line/60 py-2.5 text-left"
      >
        <span className="text-[12.5px] text-ink-faint capitalize">
          {distancia === 1 ? "ayer" : `${nombreDiaSemana(dia)} ${fechaCorta(dia)}`}
        </span>
        <span className="text-[12px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
          escribir
        </span>
      </button>
    );
  }

  return (
    <section className={cn("border-b border-line/60 py-5", esHoy && "pt-0")}>
      <div className="mb-2 flex items-baseline gap-2.5">
        <h2
          className={cn(
            "font-display text-[15px] font-semibold tracking-tight capitalize",
            esHoy ? "text-ink" : "text-ink-soft",
          )}
        >
          {esHoy ? "Hoy" : distancia === 1 ? "Ayer" : nombreDiaSemana(dia)}
        </h2>
        <span className="text-[12px] text-ink-faint">{fechaCorta(dia)}</span>
      </div>

      <AutoGrow
        value={texto}
        onCommit={(valor) => onEscribir(dia, valor)}
        placeholder={
          esHoy ? "¿Cómo viene el día?" : "Nada escrito este día. Podés hacerlo ahora."
        }
        className="text-[15px] leading-[1.75] text-ink-soft"
        minHeight={esHoy ? 120 : 40}
      />
    </section>
  );
}
