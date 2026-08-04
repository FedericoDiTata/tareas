"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Fila } from "./Fila";
import { ChevronDown } from "./Icons";
import { useEstanteria } from "@/lib/store";
import { Contexto, estaDormida, ranking } from "@/lib/foco";
import { hoyISO } from "@/lib/fechas";
import { Cosa } from "@/lib/types";
import { cn } from "@/lib/ui";

interface Props {
  onAbrir: (id: string) => void;
  onEmpezar: (id: string) => void;
  onRevisar: () => void;
}

/**
 * Todo lo que no es ahora ni esta semana. Existe, está guardado y no lo vas a
 * perder — pero vive detrás de un click, no adelante de los ojos.
 */
export function Resto({ onAbrir, onEmpezar, onRevisar }: Props) {
  const { estado } = useEstanteria();
  const hoy = hoyISO();
  const ctx: Contexto = useMemo(
    () => ({ hoy, pocaCabeza: estado.pocaCabezaEn === hoy }),
    [estado.pocaCabezaEn, hoy],
  );

  const cosas = useMemo(() => Object.values(estado.cosas), [estado.cosas]);

  const bandeja = cosas.filter((c) => c.estado === "activa" && c.enBandeja);
  const activas = cosas.filter((c) => c.estado === "activa" && !c.enBandeja && !c.clave);
  const enJuego = activas.filter((c) => !estaDormida(c, hoy));
  const dormidas = activas.filter((c) => estaDormida(c, hoy));
  const pausadas = cosas.filter((c) => c.estado === "pausa");
  const soltadas = cosas.filter((c) => c.estado === "descartada");

  const ordenadas = useMemo(() => ranking(enJuego, ctx).map((p) => p.cosa), [enJuego, ctx]);

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">El resto</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          Ordenado por lo que tiene más sentido ahora. No hace falta que hagas nada acá.
        </p>
      </header>

      {bandeja.length > 0 && (
        <Seccion titulo="Sin clasificar" cantidad={bandeja.length} abiertaPorDefecto>
          <div className="-mx-3">
            <AnimatePresence initial={false}>
              {bandeja.map((cosa) => (
                <Fila key={cosa.id} cosa={cosa} onAbrir={onAbrir} onEmpezar={onEmpezar} />
              ))}
            </AnimatePresence>
          </div>
          <button
            onClick={onRevisar}
            className="mt-2 ml-3 text-[12.5px] text-brand transition-opacity hover:opacity-80"
          >
            clasificarlas en un minuto
          </button>
        </Seccion>
      )}

      <Seccion titulo="Puede esperar" cantidad={ordenadas.length} abiertaPorDefecto>
        <div className="-mx-3">
          <AnimatePresence initial={false}>
            {ordenadas.map((cosa) => (
              <Fila key={cosa.id} cosa={cosa} onAbrir={onAbrir} onEmpezar={onEmpezar} />
            ))}
          </AnimatePresence>
        </div>
        {ordenadas.length === 0 && (
          <p className="px-3 py-4 text-[13px] text-ink-faint">Nada esperando. Está bien.</p>
        )}
      </Seccion>

      {dormidas.length > 0 && (
        <Seccion titulo="Las que venís salteando" cantidad={dormidas.length}>
          <p className="mb-2 px-3 text-[12.5px] leading-relaxed text-ink-faint">
            Dejé de ofrecértelas. Si alguna sigue viva, decímelo en la revisión.
          </p>
          <div className="-mx-3">
            {dormidas.map((cosa) => (
              <Fila key={cosa.id} cosa={cosa} onAbrir={onAbrir} />
            ))}
          </div>
        </Seccion>
      )}

      {pausadas.length > 0 && (
        <Seccion titulo="En pausa" cantidad={pausadas.length}>
          <div className="-mx-3">
            {pausadas.map((cosa) => (
              <Fila key={cosa.id} cosa={cosa} nota="descansando" onAbrir={onAbrir} />
            ))}
          </div>
        </Seccion>
      )}

      {soltadas.length > 0 && (
        <Seccion titulo="Soltadas" cantidad={soltadas.length}>
          <p className="mb-2 px-3 text-[12.5px] leading-relaxed text-ink-faint">
            Decidiste que no van. Siguen acá por si te arrepentís.
          </p>
          <div className="-mx-3">
            {soltadas.map((cosa) => (
              <Fila key={cosa.id} cosa={cosa} nota="soltada" onAbrir={onAbrir} soloLectura />
            ))}
          </div>
        </Seccion>
      )}
    </div>
  );
}

function Seccion({
  titulo,
  cantidad,
  children,
  abiertaPorDefecto,
}: {
  titulo: string;
  cantidad: number;
  children: React.ReactNode;
  abiertaPorDefecto?: boolean;
}) {
  const [abierta, setAbierta] = useState(Boolean(abiertaPorDefecto));

  return (
    <section className="mb-8">
      <button
        onClick={() => setAbierta((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase transition-colors hover:text-ink-soft"
      >
        <ChevronDown
          width={13}
          height={13}
          className={cn("transition-transform", !abierta && "-rotate-90")}
        />
        {titulo}
        <span className="font-normal tracking-normal normal-case opacity-60">({cantidad})</span>
      </button>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
