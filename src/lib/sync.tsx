"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { BUCKET, TABLE, deviceId, supabase, syncConfigured } from "./supabase";
import { useEstanteria } from "./store";
import { BlobRemote, getLocalBlob, localBlobIds, setBlobRemote } from "./files";
import { Estanteria } from "./types";

export type SyncStatus = "off" | "signed-out" | "syncing" | "ok" | "error";

interface SyncValue {
  configured: boolean;
  status: SyncStatus;
  /** Hay una operación de red en curso (para deshabilitar botones). */
  busy: boolean;
  email: string | null;
  lastSync: number | null;
  error: string | null;
  /** Mail al que se mandó el link, mientras esperamos que lo abra. */
  sentTo: string | null;
  /** Hay tablero en la nube y también acá, y no son el mismo. */
  conflict: Estanteria | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  resolveConflict: (keep: "remote" | "local") => void;
  syncNow: () => void;
}

const SyncContext = createContext<SyncValue | null>(null);

const PUSH_DELAY = 1200;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { estado: state, listo: ready, aplicarRemoto: applyRemote, estaIntacta: isPristine } = useEstanteria();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Estanteria | null>(null);

  const device = useMemo(() => (syncConfigured ? deviceId() : "local"), []);
  /** JSON que sabemos que está en el servidor: evita empujar ecos. */
  const pushed = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const userId = session?.user.id ?? null;

  /* ── Sesión ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) setSentTo(null);
      if (!next) pushed.current = null;
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /* ── Puente de imágenes y archivos ────────────────────────────────────── */
  useEffect(() => {
    const sb = supabase();
    if (!sb || !userId) {
      setBlobRemote(null);
      return;
    }
    const path = (id: string) => `${userId}/${id}`;
    const remote: BlobRemote = {
      upload: async (id, blob) => {
        await sb.storage.from(BUCKET).upload(path(id), blob, {
          upsert: true,
          contentType: blob.type || "application/octet-stream",
        });
      },
      download: async (id) => {
        const { data } = await sb.storage.from(BUCKET).download(path(id));
        return data ?? null;
      },
      remove: async (id) => {
        await sb.storage.from(BUCKET).remove([path(id)]);
      },
    };
    setBlobRemote(remote);
    return () => setBlobRemote(null);
  }, [userId]);

  /* ── Empujar y traer ──────────────────────────────────────────────────── */
  const push = useCallback(
    async (doc: Estanteria) => {
      const sb = supabase();
      if (!sb || !userId) return;
      const json = JSON.stringify(doc);
      setBusy(true);
      const { error: failed } = await sb.from(TABLE).upsert({
        user_id: userId,
        doc,
        device,
        updated_at: new Date().toISOString(),
      });
      setBusy(false);
      if (failed) {
        setError(failed.message);
        return;
      }
      pushed.current = json;
      setError(null);
      setLastSync(Date.now());
    },
    [userId, device],
  );

  const applyRow = useCallback(
    (doc: Estanteria) => {
      pushed.current = JSON.stringify(doc);
      applyRemote(doc);
      setError(null);
      setLastSync(Date.now());
    },
    [applyRemote],
  );

  const pull = useCallback(
    async (initial = false) => {
      const sb = supabase();
      if (!sb || !userId) return;
      setBusy(true);
      const { data, error: failed } = await sb
        .from(TABLE)
        .select("doc, device")
        .eq("user_id", userId)
        .maybeSingle();
      setBusy(false);

      if (failed) {
        setError(failed.message);
        return;
      }

      // Primera vez en la nube: sube lo que haya acá.
      if (!data?.doc) {
        await push(stateRef.current);
        return;
      }

      const remoteDoc = data.doc as Estanteria;
      const remoteJSON = JSON.stringify(remoteDoc);
      const localJSON = JSON.stringify(stateRef.current);

      if (remoteJSON === localJSON) {
        pushed.current = remoteJSON;
        setLastSync(Date.now());
        return;
      }

      // Si acá hay cambios que todavía no subieron, no los piso: se van a
      // subir en un segundo y ese va a ser el estado bueno.
      if (!initial && pushed.current !== null && localJSON !== pushed.current) return;

      // Al conectar por primera vez en una compu que ya tiene cosas propias,
      // no piso nada sin preguntar.
      if (initial && !isPristine()) {
        setConflict(remoteDoc);
        return;
      }
      applyRow(remoteDoc);
    },
    [userId, push, applyRow, isPristine],
  );

  /** Sube las imágenes que estén sólo en esta computadora. */
  const reconcileBlobs = useCallback(async () => {
    const sb = supabase();
    if (!sb || !userId) return;
    const { data } = await sb.storage.from(BUCKET).list(userId, { limit: 1000 });
    const already = new Set((data ?? []).map((file) => file.name));
    for (const id of await localBlobIds()) {
      if (already.has(id)) continue;
      const blob = await getLocalBlob(id);
      if (!blob) continue;
      await sb.storage
        .from(BUCKET)
        .upload(`${userId}/${id}`, blob, { upsert: true })
        .catch(() => {});
    }
  }, [userId]);

  // Primer sincronizado al abrir con sesión
  useEffect(() => {
    if (!userId || !ready) return;
    pull(true).then(() => reconcileBlobs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ready]);

  // Cada cambio local viaja solo, con un respiro para no escribir por tecla
  useEffect(() => {
    if (!userId || !ready || conflict) return;
    const json = JSON.stringify(state);
    if (json === pushed.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => push(state), PUSH_DELAY);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, userId, ready, conflict, push]);

  // Lo que escribe la otra computadora llega en el momento
  useEffect(() => {
    const sb = supabase();
    if (!sb || !userId) return;
    const channel = sb
      .channel(`escritorio-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { doc?: Estanteria; device?: string } | null;
          if (!row?.doc || row.device === device) return;
          applyRow(row.doc);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [userId, device, applyRow]);

  // Al volver a la pestaña, por si se perdió algún aviso
  useEffect(() => {
    if (!userId) return;
    const onFocus = () => {
      if (!conflict) pull();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId, conflict, pull]);

  /* ── Acciones ─────────────────────────────────────────────────────────── */
  const value: SyncValue = useMemo(
    () => ({
      configured: syncConfigured,
      status: !syncConfigured
        ? "off"
        : !session
          ? "signed-out"
          : busy
            ? "syncing"
            : error
              ? "error"
              : "ok",
      busy,
      email: session?.user.email ?? null,
      lastSync,
      error,
      sentTo,
      conflict,

      signIn: async (email) => {
        const sb = supabase();
        if (!sb) return;
        setError(null);
        setBusy(true);
        const { error: failed } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        setBusy(false);
        if (failed) {
          setError(failed.message);
          return;
        }
        setSentTo(email);
      },

      signOut: async () => {
        const sb = supabase();
        if (!sb) return;
        await sb.auth.signOut();
        pushed.current = null;
        setLastSync(null);
        setSentTo(null);
      },

      resolveConflict: (keep) => {
        const remoteDoc = conflict;
        setConflict(null);
        if (!remoteDoc) return;
        if (keep === "remote") applyRow(remoteDoc);
        else push(stateRef.current);
      },

      syncNow: () => {
        pull();
      },
    }),
    [session, busy, error, lastSync, sentTo, conflict, applyRow, push, pull],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync fuera de SyncProvider");
  return ctx;
}
