"use client";

import { useMemo } from "react";
import { Fila } from "./Fila";
import { useEstanteria } from "@/lib/store";
import { Cosa } from "@/lib/types";
import { ISODate, cuando, diferenciaDias, fechaCorta, hoyISO, nombreDiaSemana, toISO } from "@/lib/fechas";

interface Props {
  onAbrir: (id: string) => void;
  onEmpezar: (id: string) => void;
}

/**
 * Mira para los dos lados: adelante lo poco que tiene fecha, atrás lo que ya
 * hiciste. Es de sólo lectura a propósito — planificar día por día es
 * exactamente el trabajo manual que este sistema saca del medio.
 *
 * Lo terminado no se borra nunca: queda acá, en el día en que lo terminaste.
 */
export function Horizonte({ onAbrir, onEmpezar }: Props) {
  const { estado } = useEstanteria();
  const hoy = hoyISO();

  const cosas = useMemo(() => Object.values(estado.cosas), [estado.cosas]);

  const proximas = useMemo(() => {
    const conFecha = cosas.filter(
      (cosa) => cosa.estado === "activa" && cosa.vence && diferenciaDias(hoy, cosa.vence) <= 21,
    );
    const grupos = new Map<ISODate, Cosa[]>();
    for (const cosa of conFecha) {
      const dia = cosa.vence!;
      grupos.set(dia, [...(grupos.get(dia) ?? []), cosa]);
    }
    return [...grupos.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [cosas, hoy]);

  const hechas = useMemo(() => {
    const terminadas = cosas.filter((cosa) => cosa.estado === "hecha" && cosa.terminadaEn);
    const grupos = new Map<ISODate, Cosa[]>();
    for (const cosa of terminadas) {
      const dia = toISO(new Date(cosa.terminadaEn!));
      grupos.set(dia, [...(grupos.get(dia) ?? []), cosa]);
    }
    return [...grupos.entries()].sort((a, b) => (a[0] > b[0] ? -1 : 1)).slice(0, 30);
  }, [cosas]);

  const total = hechas.reduce((suma, [, lista]) => suma + lista.length, 0);

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Horizonte</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          Lo que tiene fecha y lo que ya está hecho. Nada para administrar acá.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
          Lo que viene
        </h2>
        {proximas.length === 0 ? (
          <p className="text-[13.5px] leading-relaxed text-ink-faint">
            No hay nada con fecha. Es una buena noticia: casi nada tiene un día real, sólo lo
            creemos.
          </p>
        ) : (
          <div className="space-y-6">
            {proximas.map(([dia, lista]) => (
              <div key={dia}>
                <p className="mb-1 px-3 text-[12.5px] text-ink-soft first-letter:uppercase">
                  {cuando(dia)}
                  <span className="ml-2 text-ink-faint">
                    {diferenciaDias(hoy, dia) < 0 ? "quedó atrás" : fechaCorta(dia)}
                  </span>
                </p>
                <div className="-mx-3">
                  {lista.map((cosa) => (
                    <Fila
                      key={cosa.id}
                      cosa={cosa}
                      nota={cosa.clave ? "esta semana" : ""}
                      onAbrir={onAbrir}
                      onEmpezar={onEmpezar}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-baseline gap-2 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
          Lo que hiciste
          {total > 0 && (
            <span className="font-normal tracking-normal normal-case opacity-70">
              {total} en el último mes
            </span>
          )}
        </h2>

        {hechas.length === 0 ? (
          <p className="text-[13.5px] leading-relaxed text-ink-faint">
            Todavía nada. Cuando termines algo va a quedar acá, con su fecha.
          </p>
        ) : (
          <div className="space-y-6">
            {hechas.map(([dia, lista]) => (
              <div key={dia}>
                <p className="mb-1 px-3 text-[12.5px] text-ink-faint first-letter:uppercase">
                  {diferenciaDias(hoy, dia) === 0
                    ? "hoy"
                    : diferenciaDias(hoy, dia) === -1
                      ? "ayer"
                      : `${nombreDiaSemana(dia)} ${fechaCorta(dia)}`}
                </p>
                <div className="-mx-3">
                  {lista.map((cosa) => (
                    <Fila key={cosa.id} cosa={cosa} nota="" onAbrir={onAbrir} soloLectura />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
