"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "./Logo";
import { SyncButton } from "./SyncButton";
import {
  CalendarIcon,
  DeskIcon,
  Dots,
  Download,
  Inbox,
  Keyboard,
  Moon,
  Plus,
  Search,
  Sun,
  Trash,
  Undo,
  Upload,
} from "./Icons";
import { useDatos } from "@/lib/store";
import { deHoy } from "@/lib/orden";
import { exportBackup, importBackup } from "@/lib/backup";
import { cn, useTheme } from "@/lib/ui";

export type Vista =
  | { tipo: "hoy" }
  | { tipo: "calendario" }
  | { tipo: "bandeja" }
  | { tipo: "proyecto"; id: string }
  | { tipo: "diario" };

interface Props {
  vista: Vista;
  onVista: (vista: Vista) => void;
  onBuscar: () => void;
  onAtajos: () => void;
}

export function Sidebar({ vista, onVista, onBuscar, onAtajos }: Props) {
  const { datos, crearProyecto, deshacer, sePuedeDeshacer, reemplazar, vaciarTodo } = useDatos();
  const { dark, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [nuevoProyecto, setNuevoProyecto] = useState(false);
  const [nombre, setNombre] = useState("");
  const inputImportar = useRef<HTMLInputElement>(null);

  const tareas = useMemo(() => Object.values(datos.tareas), [datos.tareas]);
  const cuentaHoy = deHoy(tareas).length;
  const cuentaBandeja = tareas.filter((t) => !t.hecha && !t.proyectoId).length;

  const cuentaDe = (proyectoId: string) =>
    tareas.filter((t) => !t.hecha && t.proyectoId === proyectoId).length;

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col border-r border-line bg-surface/40">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Logo className="h-6 w-6" />
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
          Escritorio
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          {sePuedeDeshacer && (
            <button
              onClick={deshacer}
              title="Deshacer  (Ctrl Z)"
              className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <Undo width={14} height={14} />
            </button>
          )}
          <button
            onClick={onBuscar}
            title="Buscar  (Ctrl K)"
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <Search width={14} height={14} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <Item
          activo={vista.tipo === "hoy"}
          onClick={() => onVista({ tipo: "hoy" })}
          icono={<CalendarIcon width={15} height={15} />}
          cuenta={cuentaHoy}
        >
          Hoy
        </Item>
        <Item
          activo={vista.tipo === "calendario"}
          onClick={() => onVista({ tipo: "calendario" })}
          icono={<CalendarIcon width={15} height={15} />}
        >
          Calendario
        </Item>
        <Item
          activo={vista.tipo === "bandeja"}
          onClick={() => onVista({ tipo: "bandeja" })}
          icono={<Inbox width={15} height={15} />}
          cuenta={cuentaBandeja}
        >
          Bandeja
        </Item>

        <div className="mt-5 mb-1 flex items-center px-3">
          <span className="text-[12px] font-semibold tracking-[0.1em] text-titulo uppercase">
            Proyectos
          </span>
          <button
            onClick={() => setNuevoProyecto(true)}
            title="Nuevo proyecto"
            className="ml-auto rounded-md p-1 text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <Plus width={13} height={13} />
          </button>
        </div>

        {datos.proyectos.map((proyecto) => (
          <Item
            key={proyecto.id}
            activo={vista.tipo === "proyecto" && vista.id === proyecto.id}
            onClick={() => onVista({ tipo: "proyecto", id: proyecto.id })}
            icono={
              <span className={`tone-${proyecto.color} grid h-[15px] w-[15px] place-items-center`}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "rgb(var(--tone))" }}
                />
              </span>
            }
            cuenta={cuentaDe(proyecto.id)}
          >
            {proyecto.nombre}
          </Item>
        ))}

        <AnimatePresence>
          {nuevoProyecto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden px-2 pt-1"
            >
              <input
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nombre.trim()) {
                    const id = crearProyecto(nombre.trim());
                    setNombre("");
                    setNuevoProyecto(false);
                    onVista({ tipo: "proyecto", id });
                  }
                  if (e.key === "Escape") {
                    setNombre("");
                    setNuevoProyecto(false);
                  }
                }}
                onBlur={() => {
                  if (nombre.trim()) {
                    crearProyecto(nombre.trim());
                    setNombre("");
                  }
                  setNuevoProyecto(false);
                }}
                placeholder="Nombre del proyecto"
                className="w-full rounded-lg border border-brand/40 bg-surface px-2.5 py-1.5 text-[13px] outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-4 h-px bg-line" />

        <Item
          activo={vista.tipo === "diario"}
          onClick={() => onVista({ tipo: "diario" })}
          icono={<DeskIcon width={15} height={15} />}
        >
          Diario
        </Item>
      </nav>

      <div className="flex items-center gap-0.5 border-t border-line px-3 py-2.5">
        <SyncButton />
        <button
          onClick={toggle}
          title={dark ? "Modo claro" : "Modo oscuro"}
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
        >
          {dark ? <Moon width={15} height={15} /> : <Sun width={15} height={15} />}
        </button>

        <div className="relative ml-auto">
          <button
            onClick={() => setMenu((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <Dots width={15} height={15} />
          </button>
          <AnimatePresence>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="panel absolute bottom-10 left-0 z-20 w-52 rounded-2xl p-1.5"
                >
                  <ItemMenu
                    icono={<Download width={14} height={14} />}
                    onClick={() => {
                      setMenu(false);
                      exportBackup(datos);
                    }}
                  >
                    Exportar copia
                  </ItemMenu>
                  <ItemMenu
                    icono={<Upload width={14} height={14} />}
                    onClick={() => inputImportar.current?.click()}
                  >
                    Importar copia
                  </ItemMenu>
                  <ItemMenu
                    icono={<Keyboard width={14} height={14} />}
                    onClick={() => {
                      setMenu(false);
                      onAtajos();
                    }}
                  >
                    Atajos
                  </ItemMenu>
                  <div className="my-1 h-px bg-line" />
                  <ItemMenu
                    icono={<Trash width={14} height={14} />}
                    peligro
                    onClick={() => {
                      if (!confirmar) {
                        setConfirmar(true);
                        setTimeout(() => setConfirmar(false), 3000);
                        return;
                      }
                      vaciarTodo();
                      setConfirmar(false);
                      setMenu(false);
                    }}
                  >
                    {confirmar ? "Sí, vaciar todo" : "Vaciar todo"}
                  </ItemMenu>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <input
        ref={inputImportar}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (!archivo) return;
          try {
            reemplazar(await importBackup(archivo));
            setMenu(false);
          } catch (error) {
            alert(error instanceof Error ? error.message : "No se pudo importar.");
          }
        }}
      />
    </aside>
  );
}

function Item({
  children,
  icono,
  cuenta,
  activo,
  onClick,
}: {
  children: React.ReactNode;
  icono: React.ReactNode;
  cuenta?: number;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-left text-[13.5px] transition-colors",
        activo ? "bg-white/[0.06] text-ink" : "text-ink-soft hover:bg-white/[0.03] hover:text-ink",
      )}
    >
      <span className={cn("shrink-0", activo ? "text-brand" : "text-ink-faint")}>{icono}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {cuenta !== undefined && cuenta > 0 && (
        <span className="shrink-0 text-[11.5px] text-ink-faint tabular-nums">{cuenta}</span>
      )}
    </button>
  );
}

function ItemMenu({
  children,
  icono,
  onClick,
  peligro,
}: {
  children: React.ReactNode;
  icono: React.ReactNode;
  onClick: () => void;
  peligro?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
        peligro
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-ink-soft hover:bg-white/[0.04] hover:text-ink",
      )}
    >
      {icono}
      {children}
    </button>
  );
}
