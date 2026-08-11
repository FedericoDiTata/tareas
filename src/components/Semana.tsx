"use client";

import { ReactNode, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { EditorEvento } from "./EditorEvento";
import { ChevronDown, Plus } from "./Icons";
import { useDatos } from "@/lib/store";
import { Evento, nuevoEvento } from "@/lib/types";
import {
  aHora,
  aMinutos,
  duracionEnMinutos,
  eventosDe,
  rangoDeHoras,
  repartir,
} from "@/lib/eventos";
import {
  DIAS,
  ISODate,
  esHoy,
  fechaCorta,
  fromISO,
  hoyISO,
  inicioSemana,
  mesDe,
  nombreMes,
  numeroDia,
  sumarDias,
  toISO,
} from "@/lib/fechas";
import { cn } from "@/lib/ui";

/** Alto de una hora, en píxeles. Todo lo demás se calcula desde acá. */
const ALTO_HORA = 60;

interface Props {
  selector: ReactNode;
  onAbrir: (id: string) => void;
}

/**
 * La semana con horarios, tipo Google Calendar.
 *
 * Acá sólo vive lo que vos pusiste: las clases, la oficina, y los ratos que
 * reservaste para una tarea. Una tarea con fecha no aparece sola — tener fecha
 * es una cosa y haberse comprometido a un horario es otra.
 */
export function Semana({ selector, onAbrir }: Props) {
  const { datos, crearEvento, cargarHorarioFijo } = useDatos();
  const hoy = hoyISO();
  const [lunes, setLunes] = useState<ISODate>(() => toISO(inicioSemana(new Date())));
  const [editando, setEditando] = useState<{ id: string; dia: ISODate } | null>(null);
  /** Un bloque que todavía no existe: vive acá hasta que lo confirmás. */
  const [borrador, setBorrador] = useState<Evento | null>(null);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)),
    [lunes],
  );

  const porDia = useMemo(
    () => dias.map((dia) => ({ dia, eventos: eventosDe(datos.eventos, dia) })),
    [dias, datos.eventos],
  );

  const { desde, hasta } = useMemo(
    () => rangoDeHoras(porDia.flatMap((d) => d.eventos)),
    [porDia],
  );

  // Dónde estás parado: el mes de la semana y el tramo de días.
  const primero = dias[0];
  const ultimo = dias[6];
  const enEstaSemana = dias.includes(hoy);
  const mesDeLaSemana = nombreMes(fromISO(primero).getFullYear(), mesDe(primero));

  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);
  const altoTotal = (hasta - desde) * ALTO_HORA;
  const enEdicion = editando ? datos.eventos.find((e) => e.id === editando.id) : undefined;

  /** Un click en el hueco propone un bloque de una hora en ese horario. */
  function crearEn(dia: ISODate, y: number) {
    const minutos = desde * 60 + Math.round((y / ALTO_HORA) * 60 * 2) / 2;
    const redondeado = Math.floor(minutos / 30) * 30;
    setBorrador(
      nuevoEvento({
        dia,
        desde: aHora(redondeado),
        hasta: aHora(Math.min(24 * 60, redondeado + 60)),
      }),
    );
  }

  return (
    <div className="flex h-full flex-col px-6 py-8 sm:px-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-titulo capitalize">
            {mesDeLaSemana}
          </h1>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setLunes((l) => sumarDias(l, -7))}
              aria-label="Semana anterior"
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <ChevronDown width={15} height={15} className="rotate-90" />
            </button>
            {/* "Hoy" sólo cuando estás lejos: si ya estás en esta semana, no
                lleva a ningún lado y sólo hace ruido. */}
            <button
              onClick={() => setLunes(toISO(inicioSemana(new Date())))}
              disabled={enEstaSemana}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[12.5px] transition-colors",
                enEstaSemana
                  ? "cursor-default text-ink-faint/40"
                  : "text-ink-faint hover:bg-white/[0.05] hover:text-ink",
              )}
            >
              Hoy
            </button>
            <button
              onClick={() => setLunes((l) => sumarDias(l, 7))}
              aria-label="Semana siguiente"
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <ChevronDown width={15} height={15} className="-rotate-90" />
            </button>
          </div>
          <span className="text-[12.5px] text-ink-faint">
            {enEstaSemana ? "Esta semana" : `${fechaCorta(primero)} → ${fechaCorta(ultimo)}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setBorrador(nuevoEvento({ dia: hoy, desde: "09:00", hasta: "10:00" }))}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[13px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
          >
            <Plus width={13} height={13} />
            Bloque
          </button>
          {selector}
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-line pb-1.5">
        <span />
        {dias.map((dia, i) => (
          <div key={dia} className="flex items-baseline justify-center gap-1.5">
            <span className="text-[11px] font-medium tracking-wider text-ink-faint uppercase">
              {DIAS[i]}
            </span>
            <span
              className={cn(
                "grid h-[21px] min-w-[21px] place-items-center rounded-full px-1 text-[12px] tabular-nums",
                esHoy(dia)
                  ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] font-semibold text-white"
                  : "text-ink-soft",
              )}
            >
              {numeroDia(dia)}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-2.5">
        <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))]">
          {/* Las horas */}
          <div className="relative" style={{ height: altoTotal }}>
            {horas.map((hora, i) => (
              <span
                key={hora}
                className="absolute right-2 -translate-y-1/2 text-[10.5px] text-ink-faint tabular-nums"
                style={{ top: i * ALTO_HORA }}
              >
                {`${hora}`.padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {porDia.map(({ dia, eventos }) => (
            <ColumnaDia
              key={dia}
              dia={dia}
              eventos={eventos}
              horas={horas}
              desdeHora={desde}
              alto={altoTotal}
              onCrear={(y) => crearEn(dia, y)}
              onEditar={(id) => setEditando({ id, dia })}
            />
          ))}
        </div>
      </div>

      {datos.eventos.length === 0 ? (
        <div className="pt-4 text-center">
          <p className="text-[13px] text-ink-faint">
            El calendario está vacío. Podés cargar tu semana fija de una y después editarla.
          </p>
          <button
            onClick={cargarHorarioFijo}
            className="mt-3 rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-4 py-2 text-[13px] font-medium text-white transition-transform active:scale-[0.98]"
          >
            Cargar mi horario fijo
          </button>
        </div>
      ) : (
        <p className="pt-3 text-[11.5px] text-ink-faint">
          Clickeá un hueco para reservar un rato. Los bloques de una tarea se agregan desde la
          tarea.
        </p>
      )}

      <AnimatePresence>
        {enEdicion && (
          <EditorEvento
            evento={enEdicion}
            dia={editando?.dia}
            onCerrar={() => setEditando(null)}
            onAbrirTarea={onAbrir}
          />
        )}
        {borrador && (
          <EditorEvento
            evento={borrador}
            dia={borrador.dia}
            nuevo
            onCrear={(evento) => crearEvento(evento)}
            onCerrar={() => setBorrador(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ColumnaDia({
  dia,
  eventos,
  horas,
  desdeHora,
  alto,
  onCrear,
  onEditar,
}: {
  dia: ISODate;
  eventos: Evento[];
  horas: number[];
  desdeHora: number;
  alto: number;
  onCrear: (y: number) => void;
  onEditar: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const colocados = useMemo(() => repartir(eventos), [eventos]);

  return (
    <div
      ref={ref}
      onClick={(e) => {
        if (e.target !== ref.current) return;
        const caja = ref.current!.getBoundingClientRect();
        onCrear(e.clientY - caja.top);
      }}
      className={cn(
        "relative border-r border-line last:border-r-0",
        esHoy(dia) && "bg-brand/[0.04]",
      )}
      style={{ height: alto }}
    >
      {horas.map((hora, i) => (
        <div
          key={hora}
          className="pointer-events-none absolute inset-x-0 border-t border-line/60"
          style={{ top: i * ALTO_HORA }}
        />
      ))}

      {colocados.map(({ evento, izquierda, ancho }) => {
        const arriba = ((aMinutos(evento.desde) - desdeHora * 60) / 60) * ALTO_HORA;
        const altura = Math.max(18, (duracionEnMinutos(evento) / 60) * ALTO_HORA);
        return (
          <button
            key={evento.id}
            onClick={() => onEditar(evento.id)}
            className={`tone-${evento.color} absolute overflow-hidden rounded-md px-1.5 py-1 text-left transition-transform hover:z-10 hover:scale-[1.01]`}
            style={{
              top: arriba,
              height: altura,
              left: `calc(${izquierda * 100}% + 2px)`,
              width: `calc(${ancho * 100}% - 4px)`,
              background: "color-mix(in srgb, rgb(var(--tone)) 22%, var(--surface))",
              borderLeft: "2.5px solid rgb(var(--tone))",
            }}
          >
            <span className="block truncate text-[11.5px] leading-tight font-medium text-ink">
              {evento.titulo || "Sin título"}
            </span>
            {altura > 32 && (
              <span className="block truncate text-[10.5px] text-ink-soft tabular-nums">
                {evento.desde}–{evento.hasta}
              </span>
            )}
            {altura > 50 && evento.nota && (
              <span className="mt-0.5 line-clamp-3 block text-[10.5px] leading-snug text-ink-faint">
                {evento.nota}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
