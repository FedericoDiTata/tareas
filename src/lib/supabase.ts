"use client";

import { SupabaseClient, createClient } from "@supabase/supabase-js";

/**
 * Si no hay variables de entorno, la app funciona igual: local y nada más.
 * La sincronización es un extra que se enciende cuando hay proyecto Supabase.
 */
/**
 * El panel de Supabase muestra dos direcciones parecidas: el "Project URL"
 * (https://xxx.supabase.co) y el endpoint REST, que termina en /rest/v1/.
 * La librería arma sola /auth/v1, /rest/v1 y /storage/v1, así que si viene con
 * el path pegado le queda .../rest/v1/auth/v1/otp y la base contesta PGRST125.
 * Limpio la dirección para que funcione con cualquiera de las dos.
 */
function raiz(url: string): string {
  return url
    .trim()
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+\/*$/, "")
    .replace(/\/+$/, "");
}

const bruta = process.env.NEXT_PUBLIC_SUPABASE_URL;
const URL = bruta ? raiz(bruta) : undefined;

// Supabase renombró las claves: ahora la pública se llama "publishable"
// (sb_publishable_…) y la vieja "anon" sigue andando. Acepto cualquiera de las
// dos para no depender de en qué pestaña del panel la haya copiado.
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const syncConfigured = Boolean(URL && KEY);
export const TABLE = "spaces";
export const BUCKET = "escritorio";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Identifica a esta computadora para ignorar el eco de mis propios cambios. */
export function deviceId(): string {
  const KEY_NAME = "escritorio.device";
  try {
    const saved = localStorage.getItem(KEY_NAME);
    if (saved) return saved;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    localStorage.setItem(KEY_NAME, fresh);
    return fresh;
  } catch {
    return "anon";
  }
}
