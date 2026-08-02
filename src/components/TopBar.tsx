"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BoardIcon,
  DeskIcon,
  Dots,
  Download,
  Keyboard,
  Moon,
  Search,
  Sparkle,
  Star,
  Sun,
  Trash,
  Undo,
  Upload,
} from "./Icons";
import { useStore } from "@/lib/store";
import { exportBackup, importBackup } from "@/lib/backup";
import { cn, useTheme } from "@/lib/ui";

export type View = "board" | "desk";

interface Props {
  view: View;
  onViewChange: (view: View) => void;
  onSearch: () => void;
  onShortcuts: () => void;
  onlyStarred: boolean;
  onToggleStarred: () => void;
  onCapture: (text: string) => void;
  captureRef: RefObject<HTMLInputElement | null>;
}

export function TopBar({
  view,
  onViewChange,
  onSearch,
  onShortcuts,
  onlyStarred,
  onToggleStarred,
  onCapture,
  captureRef,
}: Props) {
  const { state, undo, canUndo, replaceState, resetAll } = useStore();
  const { dark, toggle } = useTheme();
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onCapture(text);
    setDraft("");
  }

  return (
    <header className="relative z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-2.5 py-2 shadow-[var(--shadow-card)] sm:gap-3 sm:px-3.5">
        {/* Marca */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white shadow-lg shadow-brand/25">
            <Sparkle width={17} height={17} />
          </span>
          <span className="hidden font-display text-[15px] font-semibold tracking-tight sm:block">
            Escritorio
          </span>
        </div>

        {/* Captura rápida */}
        <div className="order-last flex min-w-0 flex-1 basis-full items-center gap-2 rounded-xl border border-line bg-surface-2/70 px-3 py-2 transition-colors focus-within:border-brand/50 sm:order-none sm:basis-auto">
          <input
            ref={captureRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setDraft("");
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="¿Qué tenés en la cabeza?"
            className="w-full min-w-0 bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
          />
          <AnimatePresence>
            {draft && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={submit}
                className="shrink-0 rounded-lg bg-brand px-2 py-1 text-[11px] font-medium text-white"
              >
                Enter
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Vistas */}
        <div className="ml-auto flex items-center gap-0.5 rounded-xl bg-surface-2/70 p-1">
          {(
            [
              { id: "board" as const, label: "Tablero", icon: <BoardIcon width={15} height={15} /> },
              { id: "desk" as const, label: "Escritorio", icon: <DeskIcon width={15} height={15} /> },
            ]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                view === item.id ? "text-white" : "text-ink-soft hover:text-ink",
              )}
            >
              {view === item.id && (
                <motion.span
                  layoutId="view-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] shadow-md shadow-brand/25"
                />
              )}
              <span className="relative">{item.icon}</span>
              <span className="relative hidden md:inline">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-0.5">
          <IconButton label="Buscar  (Ctrl K)" onClick={onSearch}>
            <Search width={17} height={17} />
          </IconButton>

          <IconButton
            label={onlyStarred ? "Ver todo" : "Ver sólo lo marcado"}
            onClick={onToggleStarred}
            active={onlyStarred}
          >
            <Star filled={onlyStarred} width={17} height={17} />
          </IconButton>

          {canUndo && (
            <IconButton label="Deshacer  (Ctrl Z)" onClick={undo}>
              <Undo width={17} height={17} />
            </IconButton>
          )}

          <IconButton label={dark ? "Modo claro" : "Modo oscuro"} onClick={toggle}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={dark ? "moon" : "sun"}
                initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                transition={{ duration: 0.18 }}
                className="block"
              >
                {dark ? <Moon width={17} height={17} /> : <Sun width={17} height={17} />}
              </motion.span>
            </AnimatePresence>
          </IconButton>

          <div className="relative">
            <IconButton label="Más" onClick={() => setMenu((v) => !v)}>
              <Dots width={17} height={17} />
            </IconButton>
            <AnimatePresence>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="panel absolute top-11 right-0 z-20 w-60 rounded-2xl p-1.5"
                  >
                    <MenuItem
                      icon={<Download width={15} height={15} />}
                      onClick={() => {
                        setMenu(false);
                        exportBackup(state);
                      }}
                    >
                      Exportar copia
                    </MenuItem>
                    <MenuItem
                      icon={<Upload width={15} height={15} />}
                      onClick={() => importInput.current?.click()}
                    >
                      Importar copia
                    </MenuItem>
                    <MenuItem
                      icon={<Keyboard width={15} height={15} />}
                      onClick={() => {
                        setMenu(false);
                        onShortcuts();
                      }}
                    >
                      Atajos de teclado
                    </MenuItem>
                    <div className="my-1 h-px bg-line" />
                    <MenuItem
                      icon={<Trash width={15} height={15} />}
                      danger
                      onClick={() => {
                        if (!confirmReset) {
                          setConfirmReset(true);
                          setTimeout(() => setConfirmReset(false), 3000);
                          return;
                        }
                        resetAll();
                        setConfirmReset(false);
                        setMenu(false);
                      }}
                    >
                      {confirmReset ? "Sí, vaciar todo" : "Vaciar todo"}
                    </MenuItem>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <input
        ref={importInput}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            replaceState(await importBackup(file));
            setMenu(false);
          } catch (error) {
            alert(error instanceof Error ? error.message : "No se pudo importar.");
          }
        }}
      />
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl transition-all active:scale-95",
        active
          ? "bg-brand/15 text-brand"
          : "text-ink-soft hover:bg-line/70 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
        danger ? "text-rose-500 hover:bg-rose-500/10" : "text-ink-soft hover:bg-line/70 hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
