"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ahora } from "./Ahora";
import { Barra, Vista } from "./Barra";
import { Captura } from "./Captura";
import { Desk } from "./Desk";
import { Detalle } from "./Detalle";
import { Foco } from "./Foco";
import { Horizonte } from "./Horizonte";
import { Logo } from "./Logo";
import { Resto } from "./Resto";
import { Revision } from "./Revision";
import { Semana } from "./Semana";
import { Shortcuts } from "./Shortcuts";
import { SyncConflict } from "./SyncButton";
import { useEstanteria } from "@/lib/store";
import { Resultado } from "@/lib/search";
import { isTyping } from "@/lib/ui";

export function App() {
  const { listo, empezar, deshacer } = useEstanteria();
  const [vista, setVista] = useState<Vista>("ahora");
  const [detalle, setDetalle] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [atajos, setAtajos] = useState(false);
  const [postitBuscado, setPostitBuscado] = useState<string | null>(null);
  const refBuscador = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const guardada = localStorage.getItem("escritorio.vista");
    if (guardada && ["ahora", "semana", "horizonte", "escritorio", "resto"].includes(guardada)) {
      setVista(guardada as Vista);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("escritorio.vista", vista);
  }, [vista]);

  function empezarFoco(id: string) {
    empezar(id);
    setDetalle(null);
    setFoco(id);
  }

  // Atajos: pocos y sin modificadores raros.
  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const ocupado = Boolean(detalle || foco || capturando || revisando || atajos);

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        refBuscador.current?.focus();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCapturando(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !isTyping(e.target)) {
        e.preventDefault();
        deshacer();
        return;
      }
      if (isTyping(e.target) || mod || ocupado) return;

      if (e.key === "1") setVista("ahora");
      if (e.key === "2") setVista("semana");
      if (e.key === "3") setVista("horizonte");
      if (e.key === "4") setVista("escritorio");
      if (e.key === "?") setAtajos(true);
    };

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [deshacer, detalle, foco, capturando, revisando, atajos]);

  function elegirResultado(resultado: Resultado) {
    if (resultado.tipo === "cosa") {
      setDetalle(resultado.id);
      return;
    }
    setVista("escritorio");
    setPostitBuscado(resultado.id);
  }

  if (!listo) {
    return (
      <div className="grid h-dvh place-items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Logo className="h-11 w-11 opacity-80" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <Barra
        vista={vista}
        onVista={setVista}
        onCapturar={() => setCapturando(true)}
        onAtajos={() => setAtajos(true)}
        onElegir={elegirResultado}
        refBuscador={refBuscador}
      />

      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={vista}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {vista === "ahora" && (
              <Ahora
                onAbrir={setDetalle}
                onEmpezar={empezarFoco}
                onRevisar={() => setRevisando(true)}
                onCapturar={() => setCapturando(true)}
              />
            )}
            {vista === "semana" && (
              <Semana
                onAbrir={setDetalle}
                onEmpezar={empezarFoco}
                onRevisar={() => setRevisando(true)}
                onVerResto={() => setVista("resto")}
              />
            )}
            {vista === "resto" && (
              <Resto
                onAbrir={setDetalle}
                onEmpezar={empezarFoco}
                onRevisar={() => setRevisando(true)}
              />
            )}
            {vista === "horizonte" && (
              <Horizonte onAbrir={setDetalle} onEmpezar={empezarFoco} />
            )}
            {vista === "escritorio" && (
              <Desk focusId={postitBuscado} onFocused={() => setPostitBuscado(null)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {detalle && (
          <Detalle id={detalle} onCerrar={() => setDetalle(null)} onEmpezar={empezarFoco} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {foco && <Foco id={foco} onSalir={() => setFoco(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {capturando && <Captura onCerrar={() => setCapturando(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {revisando && <Revision onCerrar={() => setRevisando(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {atajos && <Shortcuts onClose={() => setAtajos(false)} />}
      </AnimatePresence>

      <SyncConflict />
    </div>
  );
}
