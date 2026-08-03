"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Board } from "./Board";
import { Calendar } from "./Calendar";
import { Desk } from "./Desk";
import { CardModal } from "./CardModal";
import { Shortcuts } from "./Shortcuts";
import { SyncConflict } from "./SyncButton";
import { Logo } from "./Logo";
import { TopBar, View } from "./TopBar";
import { useStore } from "@/lib/store";
import { Hit } from "@/lib/search";
import { isTyping } from "@/lib/ui";

export function App() {
  const { ready, undo } = useStore();
  const [view, setView] = useState<View>("board");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [focusSticky, setFocusSticky] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("escritorio.view");
    if (saved === "desk" || saved === "board" || saved === "calendar") setView(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("escritorio.view", view);
  }, [view]);

  // Atajos globales
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (isTyping(e.target)) return;
        e.preventDefault();
        undo();
        return;
      }
      // Con algo abierto encima, las teclas sueltas no deberían mover el fondo.
      if (isTyping(e.target) || mod || openCard || shortcutsOpen) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "1") setView("board");
      if (e.key === "2") setView("calendar");
      if (e.key === "3") setView("desk");
      if (e.key === "?") setShortcutsOpen(true);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, openCard, shortcutsOpen]);

  function pickHit(hit: Hit) {
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
          <Logo className="h-12 w-12 drop-shadow-lg" />
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
        onShortcuts={() => setShortcutsOpen(true)}
        onlyStarred={onlyStarred}
        onToggleStarred={() => setOnlyStarred((v) => !v)}
        onPickHit={pickHit}
        searchRef={searchRef}
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
            ) : view === "calendar" ? (
              <Calendar onOpenCard={setOpenCard} onlyStarred={onlyStarred} />
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
        {shortcutsOpen && <Shortcuts onClose={() => setShortcutsOpen(false)} />}
      </AnimatePresence>

      <SyncConflict />
    </div>
  );
}
