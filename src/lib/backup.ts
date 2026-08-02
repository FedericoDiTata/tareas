"use client";

import { AppState } from "./types";
import { STORE_BLOBS, idbGet, idbSet } from "./idb";
import { downloadBlob } from "./files";

interface Backup {
  app: "escritorio";
  version: 1;
  exportedAt: string;
  state: AppState;
  blobs: Record<string, string>;
}

/** Todos los ids de blob que el estado realmente usa. */
function usedBlobIds(state: AppState): string[] {
  const ids = new Set<string>();
  Object.values(state.cards).forEach((card) => {
    card.images.forEach((i) => ids.add(i.blobId));
    card.files.forEach((f) => ids.add(f.blobId));
  });
  state.stickies.forEach((s) => s.blobId && ids.add(s.blobId));
  return [...ids];
}

const toDataURL = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

async function fromDataURL(dataURL: string): Promise<Blob> {
  const res = await fetch(dataURL);
  return res.blob();
}

/** Exporta estado + imágenes + archivos en un único JSON: el backup real. */
export async function exportBackup(state: AppState): Promise<void> {
  const blobs: Record<string, string> = {};
  for (const id of usedBlobIds(state)) {
    const blob = await idbGet<Blob>(STORE_BLOBS, id);
    if (blob) blobs[id] = await toDataURL(blob);
  }

  const backup: Backup = {
    app: "escritorio",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
    blobs,
  };

  const json = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(json, `escritorio-${stamp}.json`);
}

export async function importBackup(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text()) as Partial<Backup>;
  if (!parsed?.state) throw new Error("El archivo no parece un backup de Escritorio.");

  for (const [id, dataURL] of Object.entries(parsed.blobs ?? {})) {
    try {
      await idbSet(STORE_BLOBS, id, await fromDataURL(dataURL));
    } catch {
      /* si una imagen falla, el resto igual entra */
    }
  }

  return parsed.state as AppState;
}
