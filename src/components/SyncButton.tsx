"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Cloud, Mail, Refresh, X } from "./Icons";
import { useSync } from "@/lib/sync";
import { cn } from "@/lib/ui";

const DOT: Record<string, string> = {
  off: "bg-ink-faint",
  "signed-out": "bg-ink-faint",
  syncing: "bg-amber-400",
  ok: "bg-emerald-500",
  error: "bg-rose-500",
};

export function SyncButton() {
  const sync = useSync();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [, tick] = useState(0);

  // Refresca el "hace X" sin depender de otros renders.
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Sincronización"
        aria-label="Sincronización"
        className="relative grid h-9 w-9 place-items-center rounded-xl text-ink-soft transition-all hover:bg-line/70 hover:text-ink active:scale-95"
      >
        <Cloud width={17} height={17} />
        <span
          className={cn(
            "absolute right-1.5 bottom-1.5 h-2 w-2 rounded-full ring-2 ring-[var(--surface)]",
            DOT[sync.status],
            sync.status === "syncing" && "animate-pulse",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="panel absolute top-11 right-0 z-20 w-72 rounded-2xl p-4"
            >
              {sync.status === "off" && (
                <div className="space-y-2">
                  <p className="font-display text-[14px] font-semibold">Sólo en esta compu</p>
                  <p className="text-[12.5px] leading-relaxed text-ink-soft">
                    Tus datos están guardados acá, en este navegador. Para tenerlos también en la
                    otra computadora falta conectar Supabase: son dos variables de entorno.
                  </p>
                  <p className="text-[12px] text-ink-faint">
                    Está todo explicado en el archivo <code>SUPABASE.md</code> del proyecto.
                  </p>
                </div>
              )}

              {sync.status === "signed-out" && !sync.sentTo && (
                <div className="space-y-3">
                  <div>
                    <p className="font-display text-[14px] font-semibold">Sincronizar</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                      Poné tu mail y te mandamos un link para entrar. Después el tablero se
                      actualiza solo en las dos computadoras.
                    </p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (email.trim()) sync.signIn(email.trim());
                    }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 focus-within:border-brand/50">
                      <Mail width={15} height={15} className="shrink-0 text-ink-faint" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@mail.com"
                        className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sync.busy}
                      className="w-full rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] py-2 text-[13px] font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                      {sync.busy ? "Enviando…" : "Mandarme el link"}
                    </button>
                  </form>
                  {sync.error && (
                    <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[12px] leading-relaxed text-rose-500">
                      No se pudo: {sync.error}. Revisá las claves de Supabase y que tengas internet.
                    </p>
                  )}
                </div>
              )}

              {sync.sentTo && sync.status === "signed-out" && (
                <div className="space-y-2 text-center">
                  <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                    <Mail width={18} height={18} />
                  </span>
                  <p className="font-display text-[14px] font-semibold">Revisá tu mail</p>
                  <p className="text-[12.5px] leading-relaxed text-ink-soft">
                    Le mandamos un link a <strong>{sync.sentTo}</strong>. Abrilo desde esta misma
                    computadora y volvés acá ya conectado.
                  </p>
                </div>
              )}

              {(sync.status === "ok" || sync.status === "syncing" || sync.status === "error") && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                        sync.status === "error"
                          ? "bg-rose-500/15 text-rose-500"
                          : "bg-emerald-500/15 text-emerald-500",
                      )}
                    >
                      {sync.status === "error" ? (
                        <X width={14} height={14} />
                      ) : (
                        <Check width={14} height={14} strokeWidth={3} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[14px] font-semibold">
                        {sync.status === "syncing"
                          ? "Sincronizando…"
                          : sync.status === "error"
                            ? "No se pudo sincronizar"
                            : "Todo sincronizado"}
                      </p>
                      <p className="truncate text-[12px] text-ink-faint">{sync.email}</p>
                    </div>
                  </div>

                  {sync.error && (
                    <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[12px] text-rose-500">
                      {sync.error}
                    </p>
                  )}

                  {sync.lastSync && sync.status !== "error" && (
                    <p className="text-[12px] text-ink-faint">
                      Última vez: {agoLabel(sync.lastSync)}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={sync.syncNow}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-[12.5px] text-ink-soft transition-colors hover:bg-line/60 hover:text-ink"
                    >
                      <Refresh width={14} height={14} />
                      Sincronizar
                    </button>
                    <button
                      onClick={() => {
                        sync.signOut();
                        setOpen(false);
                      }}
                      className="rounded-xl border border-line px-3 py-2 text-[12.5px] text-ink-soft transition-colors hover:bg-line/60 hover:text-ink"
                    >
                      Salir
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Diálogo de la primera conexión cuando hay tablero en los dos lados. */
export function SyncConflict() {
  const sync = useSync();
  if (!sync.conflict) return null;

  const remote = sync.conflict;
  const remoteCards = Object.keys(remote.tareas ?? {}).length;
  const remoteStickies = (remote.postits ?? []).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-70 bg-black/50 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-70 grid place-items-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="panel w-full max-w-md rounded-3xl p-6"
        >
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Hay dos tableros
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
            En la nube ya hay un tablero guardado ({remoteCards} tarea
            {remoteCards === 1 ? "" : "s"} y {remoteStickies} post-it
            {remoteStickies === 1 ? "" : "s"}) y en esta computadora también hay cosas. Elegí con
            cuál seguir: el otro se pierde.
          </p>
          <div className="mt-5 space-y-2">
            <button
              onClick={() => sync.resolveConflict("remote")}
              className="w-full rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-4 py-3 text-left text-white transition-transform active:scale-[0.99]"
            >
              <span className="block text-[14px] font-medium">Usar el de la nube</span>
              <span className="block text-[12px] opacity-80">
                Lo normal si esta es la segunda computadora
              </span>
            </button>
            <button
              onClick={() => sync.resolveConflict("local")}
              className="w-full rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:bg-line/60"
            >
              <span className="block text-[14px] font-medium">Subir el de esta computadora</span>
              <span className="block text-[12px] text-ink-faint">
                Reemplaza lo que hay en la nube
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function agoLabel(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "recién";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(timestamp).toLocaleDateString("es-AR");
}
