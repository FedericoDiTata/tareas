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
import { STORE_KV, idbGet, idbSet } from "./idb";
import { deleteBlob } from "./files";
import { estanteriaInicial, estanteriaVacia } from "./seed";
import { hoyISO } from "./fechas";
import {
  Archivo,
  Camara,
  ColorKey,
  Cosa,
  Estanteria,
  ID,
  Imagen,
  Link,
  Paso,
  PostIt,
  nuevaCosa,
  uid,
} from "./types";

const CLAVE_V2 = "estanteria.v2";
const CLAVE_VIEJA = "state.v1";
const LIMITE_HISTORIAL = 40;

interface Acciones {
  // Capturar y editar
  capturar: (titulo: string) => ID;
  actualizar: (id: ID, patch: Partial<Cosa>) => void;
  tocar: (id: ID) => void;

  // Estados
  terminar: (id: ID) => void;
  reabrir: (id: ID) => void;
  descartar: (id: ID) => void;
  pausar: (id: ID) => void;
  despertar: (id: ID) => void;
  borrarDeVerdad: (id: ID) => void;

  // Decisiones del día
  saltar: (id: ID) => void;
  fijar: (id: ID) => void;
  soltarFijada: () => void;
  empezar: (id: ID) => void;
  sumarFoco: (id: ID, minutos: number) => void;
  setPocaCabeza: (valor: boolean) => void;

  // Curaduría
  marcarClave: (id: ID, valor: boolean) => void;
  sacarDeBandeja: (id: ID) => void;
  cerrarRevision: () => void;

  // Bloques
  agregarPaso: (id: ID, texto: string) => void;
  editarPaso: (id: ID, pasoId: ID, patch: Partial<Paso>) => void;
  borrarPaso: (id: ID, pasoId: ID) => void;
  agregarLink: (id: ID, url: string) => void;
  borrarLink: (id: ID, linkId: ID) => void;
  agregarImagenes: (id: ID, imagenes: Omit<Imagen, "id">[]) => void;
  borrarImagen: (id: ID, imagenId: ID) => void;
  agregarArchivos: (id: ID, archivos: Omit<Archivo, "id">[]) => void;
  borrarArchivo: (id: ID, archivoId: ID) => void;

  // Escritorio
  agregarPostIt: (parcial: Partial<PostIt> & { tipo: PostIt["tipo"] }) => ID;
  actualizarPostIt: (id: ID, patch: Partial<PostIt>) => void;
  borrarPostIt: (id: ID) => void;
  alFrente: (id: ID) => void;
  unir: (desde: ID, hasta: ID) => void;
  desunir: (id: ID) => void;
  setCamara: (camara: Camara) => void;

  // Global
  deshacer: () => void;
  sePuedeDeshacer: boolean;
  reemplazar: (estado: Estanteria) => void;
  aplicarRemoto: (estado: Estanteria) => void;
  estaIntacta: () => boolean;
  vaciarTodo: () => void;
}

interface Valor extends Acciones {
  estado: Estanteria;
  listo: boolean;
}

const Contexto = createContext<Valor | null>(null);

/* ── Migración ───────────────────────────────────────────────────────────── */

interface CosaVieja {
  id: string;
  title?: string;
  description?: string;
  color?: ColorKey;
  starred?: boolean;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  links?: Array<{ id: string; url: string; label: string }>;
  images?: Array<{ id: string; blobId: string; name: string; w: number; h: number }>;
  files?: Array<{ id: string; blobId: string; name: string; size: number; type: string }>;
  notes?: Array<{ id: string; text: string; color: ColorKey }>;
  startsOn?: string;
  endsOn?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Del tablero viejo al sistema de foco.
 *
 * Traducciones que importan: la estrella pasa a ser "esto me importa", el nombre
 * de la columna sobrevive como etiqueta (para no perder el contexto de dónde
 * estaba) y todo lo demás entra a la bandeja, que es de donde sale la primera
 * revisión de un minuto. No se pierde una sola letra.
 */
function migrarDesdeTablero(viejo: Record<string, unknown>): Estanteria {
  const columnas = (viejo.columns ?? []) as Array<{ title?: string; cardIds?: string[] }>;
  const tarjetas = (viejo.cards ?? {}) as Record<string, CosaVieja>;

  const etiquetaDe = new Map<string, string>();
  columnas.forEach((columna) => {
    (columna.cardIds ?? []).forEach((id) => {
      if (columna.title?.trim()) etiquetaDe.set(id, columna.title.trim());
    });
  });

  const orden = columnas.flatMap((columna) => columna.cardIds ?? []);
  const cosas: Record<string, Cosa> = {};

  for (const [id, vieja] of Object.entries(tarjetas)) {
    const etiqueta = etiquetaDe.get(id);
    // Las notas sueltas se pegan al final del texto: eran texto igual.
    const sueltas = (vieja.notes ?? [])
      .map((nota) => nota.text?.trim())
      .filter(Boolean)
      .join("\n\n");

    cosas[id] = nuevaCosa({
      id,
      titulo: vieja.title ?? "",
      notas: [vieja.description ?? "", sueltas].filter(Boolean).join("\n\n"),
      color: vieja.color ?? "slate",
      pasos: (vieja.checklist ?? []).map((item) => ({
        id: item.id,
        texto: item.text,
        hecho: item.done,
      })),
      links: (vieja.links ?? []).map((link) => ({
        id: link.id,
        url: link.url,
        titulo: link.label,
      })),
      imagenes: (vieja.images ?? []).map((img) => ({
        id: img.id,
        blobId: img.blobId,
        nombre: img.name,
        w: img.w,
        h: img.h,
      })),
      archivos: (vieja.files ?? []).map((file) => ({
        id: file.id,
        blobId: file.blobId,
        nombre: file.name,
        peso: file.size,
        tipo: file.type,
      })),
      etiquetas: etiqueta ? [etiqueta] : [],
      clave: Boolean(vieja.starred),
      enBandeja: !vieja.starred,
      vence: vieja.endsOn ?? vieja.startsOn,
      creadaEn: vieja.createdAt ?? Date.now(),
      tocadaEn: vieja.updatedAt ?? Date.now(),
    });
  }

  const postits = ((viejo.stickies ?? []) as Array<Record<string, unknown>>).map((s) => ({
    id: String(s.id ?? uid()),
    tipo: (s.kind === "note"
      ? "nota"
      : s.kind === "text"
        ? "texto"
        : s.kind === "image"
          ? "imagen"
          : "objetivo") as PostIt["tipo"],
    texto: String(s.text ?? ""),
    color: (s.color ?? "amber") as ColorKey,
    x: Number(s.x ?? 0),
    y: Number(s.y ?? 0),
    w: Number(s.w ?? 220),
    h: Number(s.h ?? 200),
    rot: Number(s.rot ?? 0),
    z: Number(s.z ?? 1),
    blobId: s.blobId as string | undefined,
    marcado: s.checked as boolean | undefined,
    creadoEn: Number(s.createdAt ?? Date.now()),
    actualizadoEn: Number(s.updatedAt ?? Date.now()),
  }));

  return {
    version: 2,
    cosas,
    orden: orden.filter((id) => cosas[id]),
    postits,
    uniones: ((viejo.edges ?? []) as Array<{ id: string; from: string; to: string }>).map((e) => ({
      id: e.id,
      desde: e.from,
      hasta: e.to,
    })),
    camara: (viejo.camera as Camara) ?? { x: 0, y: 0, scale: 1 },
    z: Number(viejo.z ?? 1),
  };
}

function normalizar(cruda: Partial<Estanteria> | null | undefined): Estanteria {
  const base = estanteriaVacia();
  if (!cruda) return base;

  const cosas = Object.fromEntries(
    Object.entries(cruda.cosas ?? {}).map(([id, cosa]) => [
      id,
      { ...nuevaCosa({ id }), ...cosa, pasos: cosa.pasos ?? [], saltos: cosa.saltos ?? [] },
    ]),
  );

  const orden = (cruda.orden ?? []).filter((id) => cosas[id]);
  const faltantes = Object.keys(cosas).filter((id) => !orden.includes(id));

  return {
    version: 2,
    cosas,
    orden: [...orden, ...faltantes],
    postits: cruda.postits ?? [],
    uniones: cruda.uniones ?? [],
    camara: cruda.camara ?? { x: 0, y: 0, scale: 1 },
    z: cruda.z ?? 1,
    ultimaRevision: cruda.ultimaRevision,
    pocaCabezaEn: cruda.pocaCabezaEn,
  };
}

/* ── Provider ────────────────────────────────────────────────────────────── */

export function EstanteriaProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estanteria>(estanteriaVacia);
  const [listo, setListo] = useState(false);
  const [historial, setHistorial] = useState<Estanteria[]>([]);
  const hidratado = useRef(false);
  const timerGuardado = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ref = useRef(estado);
  ref.current = estado;
  const intacta = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function hidratar(): Promise<Estanteria> {
      const nueva = await idbGet<Estanteria>(STORE_KV, CLAVE_V2);
      if (nueva) return normalizar(nueva);

      // El tablero viejo se queda intacto en su clave: si algo sale mal en la
      // migración, los datos originales siguen ahí.
      const vieja = await idbGet<Record<string, unknown>>(STORE_KV, CLAVE_VIEJA);
      if (vieja?.columns) return migrarDesdeTablero(vieja);

      const semilla = estanteriaInicial();
      intacta.current = JSON.stringify(semilla);
      return semilla;
    }

    hidratar()
      .then((valor) => {
        if (vivo) setEstado(valor);
      })
      .catch(() => {
        if (vivo) setEstado(estanteriaInicial());
      })
      .finally(() => {
        if (!vivo) return;
        hidratado.current = true;
        setListo(true);
      });

    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!hidratado.current) return;
    if (timerGuardado.current) clearTimeout(timerGuardado.current);
    timerGuardado.current = setTimeout(() => {
      idbSet(STORE_KV, CLAVE_V2, estado).catch(() => {});
    }, 350);
    return () => {
      if (timerGuardado.current) clearTimeout(timerGuardado.current);
    };
  }, [estado]);

  useEffect(() => {
    const guardar = () => {
      if (hidratado.current) idbSet(STORE_KV, CLAVE_V2, estado).catch(() => {});
    };
    window.addEventListener("pagehide", guardar);
    return () => window.removeEventListener("pagehide", guardar);
  }, [estado]);

  const foto = useCallback(() => {
    setHistorial((h) => [...h.slice(-(LIMITE_HISTORIAL - 1)), ref.current]);
  }, []);

  const parchear = useCallback((id: ID, fn: (cosa: Cosa) => Cosa) => {
    setEstado((s) => {
      const cosa = s.cosas[id];
      if (!cosa) return s;
      return { ...s, cosas: { ...s.cosas, [id]: fn(cosa) } };
    });
  }, []);

  /** Igual que parchear, pero además cuenta como "la tocaste". */
  const parchearTocando = useCallback(
    (id: ID, fn: (cosa: Cosa) => Cosa) =>
      parchear(id, (cosa) => ({ ...fn(cosa), tocadaEn: Date.now() })),
    [parchear],
  );

  const acciones: Acciones = useMemo(
    () => ({
      capturar: (titulo) => {
        const cosa = nuevaCosa({ titulo: titulo.trim() });
        setEstado((s) => ({
          ...s,
          cosas: { ...s.cosas, [cosa.id]: cosa },
          orden: [cosa.id, ...s.orden],
        }));
        return cosa.id;
      },

      actualizar: (id, patch) => parchearTocando(id, (cosa) => ({ ...cosa, ...patch })),

      tocar: (id) => parchear(id, (cosa) => ({ ...cosa, tocadaEn: Date.now() })),

      terminar: (id) => {
        foto();
        parchear(id, (cosa) => ({
          ...cosa,
          estado: "hecha",
          enBandeja: false,
          clave: false,
          terminadaEn: Date.now(),
          tocadaEn: Date.now(),
        }));
      },

      reabrir: (id) =>
        parchear(id, (cosa) => ({
          ...cosa,
          estado: "activa",
          terminadaEn: undefined,
          saltos: [],
          tocadaEn: Date.now(),
        })),

      descartar: (id) => {
        foto();
        parchear(id, (cosa) => ({ ...cosa, estado: "descartada", clave: false, enBandeja: false }));
      },

      pausar: (id) =>
        parchear(id, (cosa) => ({ ...cosa, estado: "pausa", clave: false, enBandeja: false })),

      despertar: (id) =>
        parchear(id, (cosa) => ({
          ...cosa,
          estado: "activa",
          saltos: [],
          tocadaEn: Date.now(),
        })),

      borrarDeVerdad: (id) => {
        foto();
        const cosa = ref.current.cosas[id];
        cosa?.imagenes.forEach((img) => deleteBlob(img.blobId));
        cosa?.archivos.forEach((archivo) => deleteBlob(archivo.blobId));
        setEstado((s) => {
          const cosas = { ...s.cosas };
          delete cosas[id];
          return { ...s, cosas, orden: s.orden.filter((otro) => otro !== id) };
        });
      },

      // Decir "ahora no" no cuesta nada y es información, no una falta.
      saltar: (id) =>
        parchear(id, (cosa) => ({ ...cosa, saltos: [...cosa.saltos, hoyISO()] })),

      fijar: (id) =>
        setEstado((s) => ({
          ...s,
          cosas: Object.fromEntries(
            Object.entries(s.cosas).map(([otroId, cosa]) => [
              otroId,
              otroId === id
                ? { ...cosa, fijadaEn: hoyISO(), saltos: cosa.saltos.filter((d) => d !== hoyISO()) }
                : cosa.fijadaEn === hoyISO()
                  ? { ...cosa, fijadaEn: undefined }
                  : cosa,
            ]),
          ),
        })),

      soltarFijada: () =>
        setEstado((s) => ({
          ...s,
          cosas: Object.fromEntries(
            Object.entries(s.cosas).map(([id, cosa]) => [
              id,
              cosa.fijadaEn ? { ...cosa, fijadaEn: undefined } : cosa,
            ]),
          ),
        })),

      empezar: (id) =>
        parchear(id, (cosa) => ({
          ...cosa,
          empezadaEn: cosa.empezadaEn ?? Date.now(),
          tocadaEn: Date.now(),
          enBandeja: false,
        })),

      sumarFoco: (id, minutos) =>
        parchear(id, (cosa) => ({
          ...cosa,
          minutosDeFoco: cosa.minutosDeFoco + minutos,
          tocadaEn: Date.now(),
        })),

      setPocaCabeza: (valor) =>
        setEstado((s) => ({ ...s, pocaCabezaEn: valor ? hoyISO() : undefined })),

      marcarClave: (id, valor) =>
        parchear(id, (cosa) => ({ ...cosa, clave: valor, enBandeja: false })),

      sacarDeBandeja: (id) => parchear(id, (cosa) => ({ ...cosa, enBandeja: false })),

      cerrarRevision: () => setEstado((s) => ({ ...s, ultimaRevision: hoyISO() })),

      agregarPaso: (id, texto) =>
        parchearTocando(id, (cosa) => ({
          ...cosa,
          pasos: [...cosa.pasos, { id: uid(), texto, hecho: false }],
        })),

      editarPaso: (id, pasoId, patch) =>
        parchearTocando(id, (cosa) => ({
          ...cosa,
          pasos: cosa.pasos.map((paso) => (paso.id === pasoId ? { ...paso, ...patch } : paso)),
        })),

      borrarPaso: (id, pasoId) =>
        parchearTocando(id, (cosa) => ({
          ...cosa,
          pasos: cosa.pasos.filter((paso) => paso.id !== pasoId),
        })),

      agregarLink: (id, url) => {
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const link: Link = { id: uid(), url: href, titulo: dominio(href) };
        parchearTocando(id, (cosa) => ({ ...cosa, links: [...cosa.links, link] }));
      },

      borrarLink: (id, linkId) =>
        parchearTocando(id, (cosa) => ({
          ...cosa,
          links: cosa.links.filter((link) => link.id !== linkId),
        })),

      agregarImagenes: (id, imagenes) =>
        parchearTocando(id, (cosa) => ({
          ...cosa,
          imagenes: [...cosa.imagenes, ...imagenes.map((img) => ({ ...img, id: uid() }))],
        })),

      borrarImagen: (id, imagenId) => {
        const img = ref.current.cosas[id]?.imagenes.find((i) => i.id === imagenId);
        if (img) deleteBlob(img.blobId);
        parchearTocando(id, (cosa) => ({
          ...cosa,
          imagenes: cosa.imagenes.filter((i) => i.id !== imagenId),
        }));
      },

      agregarArchivos: (id, archivos) =>
        parchearTocando(id, (cosa) => ({
          ...cosa,
          archivos: [...cosa.archivos, ...archivos.map((a) => ({ ...a, id: uid() }))],
        })),

      borrarArchivo: (id, archivoId) => {
        const archivo = ref.current.cosas[id]?.archivos.find((a) => a.id === archivoId);
        if (archivo) deleteBlob(archivo.blobId);
        parchearTocando(id, (cosa) => ({
          ...cosa,
          archivos: cosa.archivos.filter((a) => a.id !== archivoId),
        }));
      },

      agregarPostIt: (parcial) => {
        const id = uid();
        const ahora = Date.now();
        setEstado((s) => {
          const z = s.z + 1;
          const medida = medidaPorDefecto(parcial.tipo);
          return {
            ...s,
            z,
            postits: [
              ...s.postits,
              {
                id,
                tipo: parcial.tipo,
                texto: parcial.texto ?? "",
                color: parcial.color ?? "amber",
                x: parcial.x ?? 0,
                y: parcial.y ?? 0,
                w: parcial.w ?? medida.w,
                h: parcial.h ?? medida.h,
                rot: parcial.rot ?? Math.round((Math.random() * 5 - 2.5) * 10) / 10,
                z,
                blobId: parcial.blobId,
                marcado: parcial.marcado ?? (parcial.tipo === "objetivo" ? false : undefined),
                creadoEn: ahora,
                actualizadoEn: ahora,
              },
            ],
          };
        });
        return id;
      },

      actualizarPostIt: (id, patch) =>
        setEstado((s) => ({
          ...s,
          postits: s.postits.map((p) =>
            p.id === id ? { ...p, ...patch, actualizadoEn: Date.now() } : p,
          ),
        })),

      borrarPostIt: (id) => {
        foto();
        const postit = ref.current.postits.find((p) => p.id === id);
        if (postit?.blobId) deleteBlob(postit.blobId);
        setEstado((s) => ({
          ...s,
          postits: s.postits.filter((p) => p.id !== id),
          uniones: s.uniones.filter((u) => u.desde !== id && u.hasta !== id),
        }));
      },

      alFrente: (id) =>
        setEstado((s) => {
          const z = s.z + 1;
          return { ...s, z, postits: s.postits.map((p) => (p.id === id ? { ...p, z } : p)) };
        }),

      unir: (desde, hasta) =>
        setEstado((s) => {
          if (desde === hasta) return s;
          const existe = s.uniones.some(
            (u) =>
              (u.desde === desde && u.hasta === hasta) || (u.desde === hasta && u.hasta === desde),
          );
          return existe ? s : { ...s, uniones: [...s.uniones, { id: uid(), desde, hasta }] };
        }),

      desunir: (id) => setEstado((s) => ({ ...s, uniones: s.uniones.filter((u) => u.id !== id) })),

      setCamara: (camara) => setEstado((s) => ({ ...s, camara })),

      deshacer: () =>
        setHistorial((h) => {
          const previo = h[h.length - 1];
          if (previo) setEstado(previo);
          return h.slice(0, -1);
        }),

      sePuedeDeshacer: historial.length > 0,

      reemplazar: (nuevo) => {
        foto();
        intacta.current = null;
        setEstado(normalizar(nuevo));
      },

      aplicarRemoto: (nuevo) => {
        intacta.current = null;
        setEstado(normalizar(nuevo));
      },

      estaIntacta: () =>
        intacta.current !== null && JSON.stringify(ref.current) === intacta.current,

      vaciarTodo: () => {
        foto();
        intacta.current = null;
        setEstado(estanteriaVacia());
      },
    }),
    [parchear, parchearTocando, foto, historial.length],
  );

  const valor: Valor = useMemo(
    () => ({ ...acciones, estado, listo }),
    [acciones, estado, listo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstanteria(): Valor {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useEstanteria fuera del provider");
  return ctx;
}

function medidaPorDefecto(tipo: PostIt["tipo"]): { w: number; h: number } {
  switch (tipo) {
    case "nota":
      return { w: 220, h: 200 };
    case "texto":
      return { w: 380, h: 120 };
    case "imagen":
      return { w: 300, h: 220 };
    case "objetivo":
      return { w: 300, h: 84 };
  }
}

export function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
