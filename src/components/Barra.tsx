"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SearchBar } from "./SearchBar";
import { SyncButton } from "./SyncButton";
import { Dots, Download, Keyboard, Moon, Plus, Sun, Trash, Undo, Upload } from "./Icons";
import { useEstanteria } from "@/lib/store";
import { exportBackup, importBackup } from "@/lib/backup";
import { Resultado } from "@/lib/search";
import { cn, useTheme } from "@/lib/ui";

export type Vista = "ahora" | "semana" | "horizonte" | "escritorio" | "resto";

const VISTAS: Array<{ id: Vista; texto: string }> = [
  { id: "ahora", texto: "Ahora" },
  { id: "semana", texto: "Semana" },
  { id: "horizonte", texto: "Horizonte" },
  { id: "escritorio", texto: "Escritorio" },
];

interface Props {
  vista: Vista;
  onVista: (vista: Vista) => void;
  onCapturar: () => void;
  onAtajos: () => void;
  onElegir: (resultado: Resultado) => void;
  refBuscador: RefObject<HTMLInputElement | null>;
}

/** Una barra que trata de no llamar la atención. */
export function Barra({ vista, onVista, onCapturar, onAtajos, onElegir, refBuscador }: Props) {
  const { estado, deshacer, sePuedeDeshacer, reemplazar, vaciarTodo } = useEstanteria();
  const { dark, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const inputImportar = useRef<HTMLInputElement>(null);

  return (
    <header className="relative z-40 flex items-center gap-2 px-4 py-3 sm:px-6">
      <nav className="flex items-center gap-0.5">
        {VISTAS.map((item) => (
          <button
            key={item.id}
            onClick={() => onVista(item.id)}
            className={cn(
              "relative rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
              vista === item.id || (vista === "resto" && item.id === "semana")
                ? "text-ink"
                : "text-ink-faint hover:text-ink-soft",
            )}
          >
            {vista === item.id && (
              <motion.span
                layoutId="vista-activa"
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="absolute inset-x-2.5 -bottom-0.5 h-px bg-brand"
              />
            )}
            {item.texto}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <AnimatePresence initial={false}>
          {buscando && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-visible"
            >
              <SearchBar
                onElegir={onElegir}
                inputRef={refBuscador}
                onCerrar={() => setBuscando(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!buscando && (
          <BotonIcono
            etiqueta="Buscar  (Ctrl K)"
            onClick={() => {
              setBuscando(true);
              setTimeout(() => refBuscador.current?.focus(), 60);
            }}
          >
            <span className="text-[13px]">⌕</span>
          </BotonIcono>
        )}

        <BotonIcono etiqueta="Anotar algo  (Ctrl N)" onClick={onCapturar}>
          <Plus width={16} height={16} />
        </BotonIcono>

        {sePuedeDeshacer && (
          <BotonIcono etiqueta="Deshacer  (Ctrl Z)" onClick={deshacer}>
            <Undo width={16} height={16} />
          </BotonIcono>
        )}

        <SyncButton />

        <BotonIcono etiqueta={dark ? "Modo claro" : "Modo oscuro"} onClick={toggle}>
          {dark ? <Moon width={16} height={16} /> : <Sun width={16} height={16} />}
        </BotonIcono>

        <div className="relative">
          <BotonIcono etiqueta="Más" onClick={() => setMenu((v) => !v)}>
            <Dots width={16} height={16} />
          </BotonIcono>
          <AnimatePresence>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="panel absolute top-11 right-0 z-20 w-56 rounded-2xl p-1.5"
                >
                  <ItemMenu
                    icono={<Download width={15} height={15} />}
                    onClick={() => {
                      setMenu(false);
                      exportBackup(estado);
                    }}
                  >
                    Exportar copia
                  </ItemMenu>
                  <ItemMenu
                    icono={<Upload width={15} height={15} />}
                    onClick={() => inputImportar.current?.click()}
                  >
                    Importar copia
                  </ItemMenu>
                  <ItemMenu
                    icono={<Keyboard width={15} height={15} />}
                    onClick={() => {
                      setMenu(false);
                      onAtajos();
                    }}
                  >
                    Atajos
                  </ItemMenu>
                  <div className="my-1 h-px bg-line" />
                  <ItemMenu
                    icono={<Trash width={15} height={15} />}
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
    </header>
  );
}

function BotonIcono({
  children,
  etiqueta,
  onClick,
}: {
  children: React.ReactNode;
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.04] hover:text-ink"
    >
      {children}
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
