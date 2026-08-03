"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BoardIcon, DeskIcon, NoteIcon, Search, X } from "./Icons";
import { Hit, search } from "@/lib/search";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/ui";

interface Props {
  onPick: (hit: Hit) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Buscador siempre a la vista: encontrar es más frecuente que crear. */
export function SearchBar({ onPick, inputRef }: Props) {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => (query.trim() ? search(state, query) : []), [state, query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(hit: Hit) {
    onPick(hit);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === "Enter" && hits[cursor]) {
      e.preventDefault();
      choose(hits[cursor]);
    }
    if (e.key === "Escape") {
      if (query) {
        setQuery("");
        setOpen(false);
      } else {
        inputRef.current?.blur();
      }
    }
  }

  const showList = open && query.trim().length > 0;

  return (
    <div
      ref={box}
      className="relative order-last flex min-w-0 flex-1 basis-full sm:order-none sm:basis-auto"
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border bg-surface-2/70 px-3 py-2 transition-colors",
          showList ? "border-brand/50" : "border-line focus-within:border-brand/50",
        )}
      >
        <Search width={15} height={15} className="shrink-0 text-ink-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar en todo…"
          className="w-full min-w-0 bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-lg p-0.5 text-ink-faint transition-colors hover:text-ink"
          >
            <X width={14} height={14} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint md:block">
            Ctrl K
          </kbd>
        )}
      </div>

      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.14 }}
            className="panel absolute top-[calc(100%+8px)] left-0 z-50 max-h-[60vh] w-full overflow-y-auto rounded-2xl p-2"
          >
            {hits.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-faint">
                Nada con “{query}”.
              </p>
            )}

            {hits.map((hit, index) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => choose(hit)}
                className={cn(
                  `tone-${hit.color}`,
                  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                  index === cursor ? "bg-brand/10" : "hover:bg-line/60",
                )}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                  style={{ background: "rgb(var(--tone) / 0.16)", color: "rgb(var(--tone))" }}
                >
                  {hit.kind === "sticky" && hit.surface === "desk" ? (
                    <DeskIcon width={14} height={14} />
                  ) : hit.kind === "sticky" ? (
                    <NoteIcon width={14} height={14} />
                  ) : (
                    <BoardIcon width={14} height={14} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{hit.title}</span>
                  <span className="block truncate text-[11.5px] text-ink-faint">
                    {hit.snippet ?? hit.context}
                  </span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
