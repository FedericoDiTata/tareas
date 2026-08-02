"use client";

import { useEffect, useState } from "react";
import { STORE_BLOBS, idbDel, idbGet, idbSet } from "./idb";
import { uid } from "./types";

/** Cache de object URLs: crear uno por render sería una fuga de memoria. */
const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export async function saveBlob(blob: Blob): Promise<string> {
  const id = uid();
  await idbSet(STORE_BLOBS, id, blob);
  return id;
}

export async function deleteBlob(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  pending.delete(id);
  try {
    await idbDel(STORE_BLOBS, id);
  } catch {
    /* si ya no está, no importa */
  }
}

export function blobURL(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;

  const p = idbGet<Blob>(STORE_BLOBS, id)
    .then((blob) => {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(id, url);
      return url;
    })
    .catch(() => null)
    .finally(() => pending.delete(id));

  pending.set(id, p);
  return p;
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  return idbGet<Blob>(STORE_BLOBS, id);
}

/** Hook para pintar una imagen guardada en IndexedDB. */
export function useBlobURL(id?: string): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? urlCache.get(id) ?? null : null));

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    const cached = urlCache.get(id);
    if (cached) {
      setUrl(cached);
      return;
    }
    let alive = true;
    blobURL(id).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return url;
}

export interface StoredImage {
  blobId: string;
  w: number;
  h: number;
  name: string;
}

/**
 * Comprime antes de guardar: una foto de celular pesa 4 MB y en pantalla nunca
 * se ve a más de ~1600px. Guardar el original sólo hace la app más lenta.
 */
export async function storeImage(file: File | Blob, maxDim = 1600): Promise<StoredImage> {
  const name = "name" in file && file.name ? file.name : "imagen";
  const bitmap = await createImageBitmap(file).catch(() => null);

  if (!bitmap) {
    const blobId = await saveBlob(file);
    return { blobId, w: 0, h: 0, name };
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  if (scale === 1 && file.size < 900_000) {
    bitmap.close();
    const blobId = await saveBlob(file);
    return { blobId, w, h, name };
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    const blobId = await saveBlob(file);
    return { blobId, w, h, name };
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  const blobId = await saveBlob(out ?? file);
  return { blobId, w, h, name };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isImageFile(file: File | Blob): boolean {
  return file.type.startsWith("image/");
}
