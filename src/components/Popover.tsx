"use client";

import { ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

interface Props {
  anchor: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  align?: "left" | "right";
}

/**
 * Menú flotante montado en el <body>. Va por portal a propósito: adentro de una
 * columna con overflow oculto, un popover normal queda cortado a la mitad.
 */
export function Popover({ anchor, onClose, children, width = 224, align = "right" }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const left =
        align === "right"
          ? Math.min(rect.right - width, window.innerWidth - width - 8)
          : Math.max(8, rect.left);
      setPos({ top: rect.bottom + 8, left: Math.max(8, left) });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, width, align]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pos || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} />
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        style={{ top: pos.top, left: pos.left, width }}
        onPointerDown={(e) => e.stopPropagation()}
        className="panel fixed z-[91] rounded-2xl p-3"
      >
        {children}
      </motion.div>
    </>,
    document.body,
  );
}
