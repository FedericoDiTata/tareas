"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
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
export function Popover({
  anchor,
  onClose,
  children,
  width = 224,
  align = "right",
}: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!anchor) return;

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const left =
        align === "right"
          ? Math.min(rect.right - width, window.innerWidth - width - 8)
          : Math.max(8, rect.left);

      // Si no entra abajo, se abre para arriba: un botón pegado al pie de la
      // pantalla abría el panel afuera de la ventana.
      const alto = caja.current?.offsetHeight ?? 0;
      const abajo = rect.bottom + 8;
      const arriba = rect.top - alto - 8;
      const top =
        alto > 0 && abajo + alto > window.innerHeight - 8 && arriba > 8
          ? arriba
          : abajo;

      setPos({ top, left: Math.max(8, left) });
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

  // El primer render mide, el segundo ubica: hasta entonces se dibuja invisible
  // para no mostrar un salto.
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[90]"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        ref={caja}
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          width,
          visibility: pos ? "visible" : "hidden",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="panel fixed z-[91] rounded-2xl p-3"
      >
        {children}
      </motion.div>
    </>,
    document.body,
  );
}
