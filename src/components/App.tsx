"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Board } from "./Board";
import { Desk } from "./Desk";
import { CardModal } from "./CardModal";
import { SearchPalette } from "./SearchPalette";
import { Shortcuts } from "./Shortcuts";
import { SyncConflict } from "./SyncButton";
import { TopBar, View } from "./TopBar";
import { Check, Sparkle } from "./Icons";
import { useStore } from "@/lib/store";
import { Hit } from "@/lib/search";
import { isTyping } from "@/lib/ui";

export function App() {
  const { state, ready, addCard, addColumn, addSticky, undo } = useStore();
  const [view, setView] = useState<View>("board");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [focusSticky, setFocusSticky] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("escritorio.view");
    if (saved === "desk" || saved === "board") setView(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("escritorio.view", view);
  }, [view]);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }, []);

  /** El corazón de la app: escribir algo y que desaparezca de la cabeza. */
  const capture = useCallback(
    (text: string) => {
      if (view === "desk") {
        const { x, y, scale } = state.camera;
        addSticky({
          surface: "desk",
          kind: "note",
          text,
          x: (window.innerWidth / 2 - x) / scale - 110,
          y: (window.innerHeight / 2 - y) / scale - 100,
        });
        flash("Pegado en el escritorio");
        return;
      }

      const first = state.columns[0];
      if (first) {
        addCard(first.id, text);
        flash(`Agregado a ${first.title || "la primera columna"}`);
        return;
      }
      const id = addColumn("Hoy");
      setTimeout(() => addCard(id, text), 0);
      flash("Agregado a Hoy");
    },
    [view, state.camera, state.columns, addCard, addColumn, addSticky, flash],
  );

  // Atajos globales
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (isTyping(e.target)) return;
        e.preventDefault();
        undo();
        return;
      }
      // Con algo abierto encima, las teclas sueltas no deberían mover el fondo.
      if (isTyping(e.target) || mod || openCard || searchOpen || shortcutsOpen) return;

      if (e.key === "n") {
        e.preventDefault();
        captureRef.current?.focus();
      }
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "1") setView("board");
      if (e.key === "2") setView("desk");
      if (e.key === "?") setShortcutsOpen(true);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, openCard, searchOpen, shortcutsOpen]);

  function pickHit(hit: Hit) {
    setSearchOpen(false);
    if (hit.kind === "card") {
      setView("board");
      setOpenCard(hit.id);
      return;
    }
    if (hit.kind === "sticky") {
      const surface = hit.surface ?? "board";
      setView(surface === "desk" ? "desk" : "board");
      if (surface === "desk") setFocusSticky(hit.id);
      return;
    }
    setView("board");
  }

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white">
            <Sparkle width={22} height={22} />
          </span>
          <span className="text-[13px] text-ink-faint">Abriendo tu escritorio…</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <TopBar
        view={view}
        onViewChange={setView}
        onSearch={() => setSearchOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onlyStarred={onlyStarred}
        onToggleStarred={() => setOnlyStarred((v) => !v)}
        onCapture={capture}
        captureRef={captureRef}
      />

      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {view === "board" ? (
              <Board onOpenCard={setOpenCard} onlyStarred={onlyStarred} />
            ) : (
              <Desk focusId={focusSticky} onFocused={() => setFocusSticky(null)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {openCard && <CardModal cardId={openCard} onClose={() => setOpenCard(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <SearchPalette onClose={() => setSearchOpen(false)} onPick={pickHit} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shortcutsOpen && <Shortcuts onClose={() => setShortcutsOpen(false)} />}
      </AnimatePresence>

      <SyncConflict />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass pointer-events-none fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full py-2 pr-4 pl-3 text-[13px] shadow-[var(--shadow-card)]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
              <Check width={12} height={12} strokeWidth={3} />
            </span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
