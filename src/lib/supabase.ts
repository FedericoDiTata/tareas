"use client";

import { SupabaseClient, createClient } from "@supabase/supabase-js";

/**
 * Si no hay variables de entorno, la app funciona igual: local y nada más.
 * La sincronización es un extra que se enciende cuando hay proyecto Supabase.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
