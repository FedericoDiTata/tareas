"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ColorKey } from "./types";

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export const tone = (color: ColorKey) => `tone-${color}`;

/** Tema claro/oscuro, sincronizado con el <script> que corre antes del pintado. */
export function useTheme() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("escritorio.theme", next ? "dark" : "light");
      } catch {
        /* modo incógnito */
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}

/** Escribe fluido y guarda cada tanto: no hace falta un commit por tecla. */
export function useDebounced<T>(value: T, commit: (v: T) => void, delay = 300) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setLocal(value);
  }, [value]);

  const set = useCallback(
    (next: T) => {
      dirty.current = true;
      setLocal(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        dirty.current = false;
        commitRef.current(next);
      }, delay);
    },
    [delay],
  );

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current) {
      dirty.current = false;
      commitRef.current(local);
    }
  }, [local]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return [local, set, flush] as const;
}

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscape();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

/** true si el foco está en un input/textarea: ahí los atajos de una tecla molestan. */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const spring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };
export const softSpring = { type: "spring" as const, stiffness: 220, damping: 26 };
