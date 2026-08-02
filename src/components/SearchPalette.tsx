"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { BoardIcon, DeskIcon, NoteIcon, Search as SearchIcon } from "./Icons";
import { Hit, search } from "@/lib/search";
import { useStore } from "@/lib/store";
import { cn, useEscape } from "@/lib/ui";

interface Props {
  onClose: () => void;
  onPick: (hit: Hit) => void;
}

export function SearchPalette({ onClose, onPick }: Props) {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEscape(true, onClose);

  const hits = useMemo(() => search(state, query), [state, query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

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
      onPick(hits[cursor]);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-70 bg-black/40 backdrop-blur-sm"
      />
      <div className="pointer-events-none fixed inset-0 z-70 flex items-start justify-center p-4 pt-[12vh]">
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="panel pointer-events-auto w-full max-w-xl overflow-hidden rounded-3xl"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <SearchIcon width={18} height={18} className="shrink-0 text-ink-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar en todo…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
            />
            <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint sm:block">
              esc
            </kbd>
          </div>

          <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
            {query && hits.length === 0 && (
              <p className="px-3 py-8 text-center text-[13px] text-ink-faint">
                Nada con “{query}”.
              </p>
            )}

            {!query && (
              <p className="px-3 py-8 text-center text-[13px] text-ink-faint">
                Escribí para buscar tarjetas, post-its, notas y links.
              </p>
            )}

            {hits.map((hit, index) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                data-index={index}
                onMouseEnter={() => setCursor(index)}
                onClick={() => onPick(hit)}
                className={cn(
                  `tone-${hit.color}`,
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                  index === cursor ? "bg-brand/10" : "hover:bg-line/60",
                )}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                  style={{ background: "rgb(var(--tone) / 0.16)", color: "rgb(var(--tone))" }}
                >
                  {hit.kind === "card" ? (
                    <BoardIcon width={15} height={15} />
                  ) : hit.kind === "sticky" ? (
                    hit.surface === "desk" ? (
                      <DeskIcon width={15} height={15} />
                    ) : (
                      <NoteIcon width={15} height={15} />
                    )
                  ) : (
                    <BoardIcon width={15} height={15} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{hit.title}</span>
                  <span className="block truncate text-[11.5px] text-ink-faint">
                    {hit.snippet ?? hit.context}
                  </span>
                </span>
                {index === cursor && (
                  <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint sm:block">
                    ↵
                  </kbd>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
