"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Desk } from "./Desk";
import { Foco } from "./Foco";
import { Logo } from "./Logo";
import { PanelTarea } from "./PanelTarea";
import { SearchBar } from "./SearchBar";
import { Shortcuts } from "./Shortcuts";
import { Sidebar, Vista } from "./Sidebar";
import { SyncConflict } from "./SyncButton";
import { Bandeja, Completadas, Hoy, Proximos, VistaProyecto } from "./Vistas";
import { useDatos } from "@/lib/store";
import { deHoy } from "@/lib/orden";
import { Resultado } from "@/lib/search";
import { isTyping } from "@/lib/ui";

export function App() {
  const { datos, listo, deshacer } = useDatos();
  const [vista, setVista] = useState<Vista>({ tipo: "hoy" });
  const [abierta, setAbierta] = useState<string | null>(null);
  const [sesion, setSesion] = useState<string[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [atajos, setAtajos] = useState(false);
  const [postitBuscado, setPostitBuscado] = useState<string | null>(null);
  const refBuscador = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const guardada = localStorage.getItem("escritorio.vista");
    if (guardada) {
      try {
        setVista(JSON.parse(guardada));
      } catch {
        /* si quedó basura vieja, arranca en Hoy */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("escritorio.vista", JSON.stringify(vista));
  }, [vista]);

  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const ocupado = Boolean(sesion || atajos);

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscando(true);
        setTimeout(() => refBuscador.current?.focus(), 50);
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !isTyping(e.target)) {
        e.preventDefault();
        deshacer();
        return;
      }
      if (isTyping(e.target) || mod || ocupado) return;

      // F arranca foco con lo que estés viendo.
      if (e.key.toLowerCase() === "f") {
        const delDia = deHoy(Object.values(datos.tareas));
        if (delDia.length > 0) setSesion(delDia.map((t) => t.id));
      }
      if (e.key === "?") setAtajos(true);
    };

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [deshacer, datos.tareas, sesion, atajos]);

  function elegirResultado(resultado: Resultado) {
    setBuscando(false);
    if (resultado.tipo === "tarea") {
      setAbierta(resultado.id);
      return;
    }
    setVista({ tipo: "escritorio" });
    setPostitBuscado(resultado.id);
  }

  if (!listo) {
    return (
      <div className="grid h-dvh place-items-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Logo className="h-10 w-10 opacity-80" />
        </motion.div>
      </div>
    );
  }

  const props = {
    onAbrir: setAbierta,
    onFoco: (id: string) => setSesion([id]),
    onSesion: (ids: string[]) => setSesion(ids),
  };

  return (
    <div className="relative flex h-dvh overflow-hidden">
      <Sidebar
        vista={vista}
        onVista={setVista}
        onBuscar={() => {
          setBuscando(true);
          setTimeout(() => refBuscador.current?.focus(), 50);
        }}
        onAtajos={() => setAtajos(true)}
      />

      <main className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={vista.tipo === "proyecto" ? `p-${vista.id}` : vista.tipo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
          >
            {vista.tipo === "hoy" && <Hoy {...props} />}
            {vista.tipo === "proximos" && <Proximos {...props} />}
            {vista.tipo === "bandeja" && <Bandeja {...props} />}
            {vista.tipo === "completadas" && <Completadas {...props} />}
            {vista.tipo === "proyecto" && (
              <VistaProyecto
                {...props}
                proyectoId={vista.id}
                onBorrado={() => setVista({ tipo: "hoy" })}
              />
            )}
            {vista.tipo === "escritorio" && (
              <Desk focusId={postitBuscado} onFocused={() => setPostitBuscado(null)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {buscando && (
          <SearchBar
            onElegir={elegirResultado}
            onCerrar={() => setBuscando(false)}
            inputRef={refBuscador}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {abierta && (
          <PanelTarea
            id={abierta}
            onCerrar={() => setAbierta(null)}
            onFoco={(id) => {
              setAbierta(null);
              setSesion([id]);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sesion && <Foco ids={sesion} onSalir={() => setSesion(null)} />}
      </AnimatePresence>

      <AnimatePresence>{atajos && <Shortcuts onClose={() => setAtajos(false)} />}</AnimatePresence>

      <SyncConflict />
    </div>
  );
}
