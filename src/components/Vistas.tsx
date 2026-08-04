"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Grupo, Lista } from "./Lista";
import { Popover } from "./Popover";
import { ColorPicker } from "./ColorPicker";
import { TableroProyecto } from "./TableroProyecto";
import { Hechas } from "./Hechas";
import { Dots, Play, Plus, Trash } from "./Icons";
import { useDatos } from "@/lib/store";
import { deHoy, ordenar } from "@/lib/orden";
import { hoyISO, nombreDiaSemana } from "@/lib/fechas";
import { cn } from "@/lib/ui";

interface VistaProps {
  onAbrir: (id: string) => void;
  onFoco: (id: string) => void;
  onSesion: (ids: string[]) => void;
}

/* ── Hoy ─────────────────────────────────────────────────────────────────── */

export function Hoy({ onAbrir, onFoco, onSesion }: VistaProps) {
  const { datos, programar } = useDatos();
  const hoy = hoyISO();

  const tareas = useMemo(() => Object.values(datos.tareas), [datos.tareas]);
  const delDia = useMemo(() => deHoy(tareas), [tareas]);

  const atrasadas = delDia.filter((tarea) => tarea.vence! < hoy);
  const deHoyMismo = delDia.filter((tarea) => tarea.vence === hoy);

  const grupos: Grupo[] = [];
  if (atrasadas.length > 0) {
    grupos.push({
      clave: "atrasadas",
      titulo: "De antes",
      nota: `${atrasadas.length}`,
      tareas: atrasadas,
      // Un click y el pasado queda limpio. Sin sermón.
      accion: (
        <button
          onClick={() => atrasadas.forEach((tarea) => programar(tarea.id, hoy))}
          className="text-[12px] text-ink-faint transition-colors hover:text-brand"
        >
          pasar todo a hoy
        </button>
      ),
    });
  }
  grupos.push({
    clave: "hoy",
    titulo: atrasadas.length > 0 ? "Hoy" : undefined,
    tareas: deHoyMismo,
    quickAdd: { vence: hoy },
  });

  const fecha = new Date();

  return (
    <Lista
      titulo="Hoy"
      subtitulo={`${nombreDiaSemana(hoy)} ${fecha.getDate()} · ${delDia.length} ${
        delDia.length === 1 ? "tarea" : "tareas"
      }`}
      accion={
        delDia.length > 0 ? (
          <button
            onClick={() => onSesion(delDia.map((tarea) => tarea.id))}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-4 py-2 text-[13px] font-medium text-white transition-transform active:scale-[0.98]"
          >
            <Play width={14} height={14} />
            Modo foco
          </button>
        ) : null
      }
      grupos={grupos}
      ocultarFecha
      vacio={{
        titulo: "Nada para hoy",
        detalle: "Podés agregar algo acá arriba, o mirar el Calendario para ver qué se viene.",
      }}
      onAbrir={onAbrir}
      onFoco={onFoco}
    />
  );
}

/* ── Bandeja ─────────────────────────────────────────────────────────────── */

export function Bandeja({ onAbrir, onFoco }: VistaProps) {
  const { datos } = useDatos();
  const [hechas, setHechas] = useState(false);
  const tareas = useMemo(
    () => ordenar(Object.values(datos.tareas).filter((t) => !t.hecha && !t.proyectoId)),
    [datos.tareas],
  );

  return (
    <Lista
      titulo="Bandeja"
      subtitulo="Lo que anotaste sin decidir dónde va"
      accion={
        <Solapas
          opciones={[
            { id: "abiertas", texto: "Abiertas" },
            { id: "hechas", texto: "Completadas" },
          ]}
          valor={hechas ? "hechas" : "abiertas"}
          onCambio={(id) => setHechas(id === "hechas")}
          layoutId="modo-bandeja"
        />
      }
      grupos={hechas ? [] : [{ clave: "bandeja", tareas }]}
      quickAdd={hechas ? null : {}}
      vacio={
        hechas
          ? undefined
          : {
              titulo: "Bandeja vacía",
              detalle:
                "Todo lo que anotás sin proyecto ni fecha aparece acá hasta que lo acomodes.",
            }
      }
      pie={hechas ? <Hechas onAbrir={onAbrir} /> : undefined}
      onAbrir={onAbrir}
      onFoco={onFoco}
    />
  );
}

/* ── El selector de vista, compartido ────────────────────────────────────── */

function Solapas<T extends string>({
  opciones,
  valor,
  onCambio,
  layoutId,
}: {
  opciones: { id: T; texto: string }[];
  valor: T;
  onCambio: (id: T) => void;
  layoutId: string;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5">
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          onClick={() => onCambio(opcion.id)}
          className={cn(
            "relative rounded-md px-3 py-1.5 text-[12.5px] transition-colors",
            valor === opcion.id ? "text-ink" : "text-ink-faint hover:text-ink-soft",
          )}
        >
          {valor === opcion.id && (
            <motion.span
              layoutId={layoutId}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-md bg-white/[0.07]"
            />
          )}
          <span className="relative">{opcion.texto}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Un proyecto ─────────────────────────────────────────────────────────── */

type ModoProyecto = "lista" | "tablero" | "hechas";

export function VistaProyecto({
  proyectoId,
  onAbrir,
  onFoco,
  onSesion,
  onBorrado,
}: VistaProps & { proyectoId: string; onBorrado: () => void }) {
  const { datos, actualizarProyecto, borrarProyecto, crearSeccion } = useDatos();
  const [menu, setMenu] = useState(false);
  const [ancla, setAncla] = useState<HTMLElement | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [modo, setModo] = useState<ModoProyecto>("lista");
  const [nuevaSeccion, setNuevaSeccion] = useState(false);
  const [nombreSeccion, setNombreSeccion] = useState("");

  // Cada proyecto recuerda cómo lo mirás.
  useEffect(() => {
    const guardado = localStorage.getItem(`escritorio.proyecto.${proyectoId}`);
    // Completadas no se recuerda: es para consultar, no para vivir ahí.
    setModo(guardado === "tablero" ? "tablero" : "lista");
  }, [proyectoId]);

  function cambiarModo(nuevo: ModoProyecto) {
    setModo(nuevo);
    if (nuevo !== "hechas") localStorage.setItem(`escritorio.proyecto.${proyectoId}`, nuevo);
  }

  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);

  const secciones = useMemo(
    () =>
      datos.secciones.filter((s) => s.proyectoId === proyectoId).sort((a, b) => a.orden - b.orden),
    [datos.secciones, proyectoId],
  );

  const tareas = useMemo(
    () => Object.values(datos.tareas).filter((t) => !t.hecha && t.proyectoId === proyectoId),
    [datos.tareas, proyectoId],
  );

  if (!proyecto) return null;

  const selector = (
    <Solapas
      opciones={[
        { id: "lista" as const, texto: "Lista" },
        { id: "tablero" as const, texto: "Tablero" },
        { id: "hechas" as const, texto: "Completadas" },
      ]}
      valor={modo}
      onCambio={cambiarModo}
      layoutId={`modo-proyecto-${proyectoId}`}
    />
  );

  const acciones = (
    <div className="flex items-center gap-1.5">
      {selector}
      {modo !== "hechas" && tareas.length > 0 && (
        <button
          onClick={() => onSesion(ordenar(tareas).map((t) => t.id))}
          className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
        >
          <Play width={13} height={13} />
          Foco
        </button>
      )}
      <button
        ref={setAncla}
        onClick={() => setMenu((v) => !v)}
        className="rounded-xl p-2 text-ink-faint transition-colors hover:bg-white/[0.04] hover:text-ink"
      >
        <Dots width={16} height={16} />
      </button>
      {menu && (
        <Popover anchor={ancla} onClose={() => setMenu(false)} width={230}>
          <input
            value={proyecto.nombre}
            onChange={(e) => actualizarProyecto(proyecto.id, { nombre: e.target.value })}
            className="mb-3 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-brand/40"
          />
          <ColorPicker
            value={proyecto.color}
            onChange={(color) => actualizarProyecto(proyecto.id, { color })}
            size="sm"
          />
          <div className="my-3 h-px bg-line" />
          <button
            onClick={() => {
              if (!confirmar) {
                setConfirmar(true);
                return;
              }
              borrarProyecto(proyecto.id);
              setMenu(false);
              onBorrado();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-rose-400 transition-colors hover:bg-rose-500/10"
          >
            <Trash width={14} height={14} />
            {confirmar ? "Sí, borrar el proyecto" : "Borrar proyecto"}
          </button>
          {confirmar && (
            <p className="px-2 pt-1.5 text-[11.5px] text-ink-faint">
              Las tareas no se borran: vuelven a la Bandeja.
            </p>
          )}
        </Popover>
      )}
    </div>
  );

  if (modo === "tablero") {
    return (
      <div className="flex h-full flex-col pt-8">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3 px-6 sm:px-10">
          <div>
            <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-titulo">
              {proyecto.nombre}
            </h1>
            <p className="mt-1.5 text-[13px] text-ink-faint">
              {tareas.length} {tareas.length === 1 ? "tarea" : "tareas"} · {secciones.length}{" "}
              {secciones.length === 1 ? "sección" : "secciones"}
            </p>
          </div>
          {acciones}
        </header>
        <div className="min-h-0 flex-1">
          <TableroProyecto proyectoId={proyectoId} onAbrir={onAbrir} onFoco={onFoco} />
        </div>
      </div>
    );
  }

  if (modo === "hechas") {
    return (
      <Lista
        titulo={proyecto.nombre}
        accion={acciones}
        grupos={[]}
        quickAdd={null}
        pie={<Hechas proyectoId={proyectoId} onAbrir={onAbrir} />}
        onAbrir={onAbrir}
        onFoco={onFoco}
      />
    );
  }

  const sueltas = ordenar(tareas.filter((t) => !t.seccionId));

  const grupos: Grupo[] = [
    {
      clave: "sin-seccion",
      // Sin secciones el proyecto es una lista y no hace falta encabezado; en
      // cuanto hay una sección, lo suelto tiene que verse como lo que es.
      titulo: secciones.length > 0 ? "Backlog" : undefined,
      suelto: secciones.length > 0,
      nota: secciones.length > 0 ? `${sueltas.length}` : undefined,
      tareas: sueltas,
      quickAdd: { proyectoId },
    },
    ...secciones.map((seccion) => ({
      clave: seccion.id,
      titulo: seccion.nombre,
      nota: `${tareas.filter((t) => t.seccionId === seccion.id).length}`,
      tareas: ordenar(tareas.filter((t) => t.seccionId === seccion.id)),
      quickAdd: { proyectoId, seccionId: seccion.id },
    })),
  ];

  return (
    <Lista
      titulo={proyecto.nombre}
      subtitulo={`${tareas.length} ${tareas.length === 1 ? "tarea" : "tareas"}`}
      accion={acciones}
      grupos={grupos}
      vacio={{
        titulo: "Proyecto vacío",
        detalle: "Agregá la primera tarea acá arriba.",
      }}
      pie={
        nuevaSeccion ? (
          <input
            autoFocus
            value={nombreSeccion}
            onChange={(e) => setNombreSeccion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nombreSeccion.trim()) {
                crearSeccion(proyectoId, nombreSeccion.trim());
                setNombreSeccion("");
                setNuevaSeccion(false);
              }
              if (e.key === "Escape") {
                setNombreSeccion("");
                setNuevaSeccion(false);
              }
            }}
            onBlur={() => {
              if (nombreSeccion.trim()) crearSeccion(proyectoId, nombreSeccion.trim());
              setNombreSeccion("");
              setNuevaSeccion(false);
            }}
            placeholder="Nombre de la sección"
            className="w-full rounded-xl border border-brand/40 bg-surface px-3 py-2 text-[13.5px] outline-none"
          />
        ) : (
          <button
            onClick={() => setNuevaSeccion(true)}
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] text-ink-faint transition-colors hover:text-ink"
          >
            <Plus width={13} height={13} />
            Agregar sección
          </button>
        )
      }
      onAbrir={onAbrir}
      onFoco={onFoco}
    />
  );
}
