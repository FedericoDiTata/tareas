"use client";

import { Datos } from "./types";
import { STORE_BLOBS, idbGet, idbSet } from "./idb";
import { downloadBlob } from "./files";

interface Backup {
  app: "escritorio";
  version: 3;
  exportedAt: string;
  state: Datos;
  blobs: Record<string, string>;
}

/** Todos los ids de blob que el estado realmente usa. */
function usedBlobIds(state: Datos): string[] {
  const ids = new Set<string>();
  Object.values(state.tareas).forEach((tarea) => {
    tarea.imagenes.forEach((imagen) => ids.add(imagen.blobId));
    tarea.archivos.forEach((archivo) => ids.add(archivo.blobId));
  });
  state.postits.forEach((postit) => postit.blobId && ids.add(postit.blobId));
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
export async function exportBackup(state: Datos): Promise<void> {
  const blobs: Record<string, string> = {};
  for (const id of usedBlobIds(state)) {
    const blob = await idbGet<Blob>(STORE_BLOBS, id);
    if (blob) blobs[id] = await toDataURL(blob);
  }

  const backup: Backup = {
    app: "escritorio",
    version: 3,
    exportedAt: new Date().toISOString(),
    state,
    blobs,
  };

  const json = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(json, `escritorio-${stamp}.json`);
}

export async function importBackup(file: File): Promise<Datos> {
  const parsed = JSON.parse(await file.text()) as Partial<Backup>;
  if (!parsed?.state) throw new Error("El archivo no parece un backup de Escritorio.");

  for (const [id, dataURL] of Object.entries(parsed.blobs ?? {})) {
    try {
      await idbSet(STORE_BLOBS, id, await fromDataURL(dataURL));
    } catch {
      /* si una imagen falla, el resto igual entra */
    }
  }

  return parsed.state as Datos;
}
