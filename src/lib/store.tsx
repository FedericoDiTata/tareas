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
import { datosIniciales, datosVacios } from "./seed";
import {
  Archivo,
  Camara,
  ColorKey,
  Datos,
  ID,
  Imagen,
  Link,
  Paso,
  PostIt,
  Prioridad,
  Proyecto,
  Tarea,
  nuevaTarea,
  nuevoProyecto,
  uid,
} from "./types";

const CLAVE = "datos.v3";
const CLAVE_V2 = "estanteria.v2";
const CLAVE_V1 = "state.v1";
const LIMITE_HISTORIAL = 50;

interface Acciones {
  // Tareas
  agregar: (tarea: Partial<Tarea>) => ID;
  actualizar: (id: ID, patch: Partial<Tarea>) => void;
  completar: (id: ID) => void;
  reabrir: (id: ID) => void;
  borrar: (id: ID) => void;
  programar: (id: ID, vence: string | null) => void;
  moverAProyecto: (id: ID, proyectoId: ID | null) => void;
  setPrioridad: (id: ID, prioridad: Prioridad) => void;
  reordenar: (ids: ID[]) => void;
  sumarFoco: (id: ID, minutos: number) => void;

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

  // Proyectos
  crearProyecto: (nombre: string, color?: ColorKey) => ID;
  actualizarProyecto: (id: ID, patch: Partial<Proyecto>) => void;
  borrarProyecto: (id: ID) => void;

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
  reemplazar: (datos: Datos) => void;
  aplicarRemoto: (datos: Datos) => void;
  estaIntacta: () => boolean;
  vaciarTodo: () => void;
}

interface Valor extends Acciones {
  datos: Datos;
  listo: boolean;
}

const Contexto = createContext<Valor | null>(null);

/* ── Migraciones ─────────────────────────────────────────────────────────── */

/** Del sistema de foco (v2) a listas y proyectos. */
function desdeV2(viejo: Record<string, any>): Datos {
  const proyectos: Proyecto[] = [];
  const porNombre = new Map<string, ID>();

  const proyectoDe = (nombre?: string): ID | undefined => {
    if (!nombre?.trim()) return undefined;
    const clave = nombre.trim();
    if (!porNombre.has(clave)) {
      const proyecto = nuevoProyecto(clave, "blue", proyectos.length);
      proyectos.push(proyecto);
      porNombre.set(clave, proyecto.id);
    }
    return porNombre.get(clave);
  };

  const tareas: Record<ID, Tarea> = {};
  let posicion = 0;

  for (const cosa of Object.values(viejo.cosas ?? {}) as any[]) {
    tareas[cosa.id] = nuevaTarea({
      id: cosa.id,
      titulo: cosa.titulo ?? "",
      notas: cosa.notas ?? "",
      proyectoId: proyectoDe(cosa.etiquetas?.[0]),
      // Lo que era "clave de la semana" pasa a ser prioridad alta.
      prioridad: cosa.clave ? 1 : 4,
      vence: cosa.vence,
      pasos: cosa.pasos ?? [],
      links: cosa.links ?? [],
      imagenes: cosa.imagenes ?? [],
      archivos: cosa.archivos ?? [],
      hecha: cosa.estado === "hecha",
      terminadaEn: cosa.terminadaEn,
      creadaEn: cosa.creadaEn ?? Date.now(),
      tocadaEn: cosa.tocadaEn ?? Date.now(),
      minutosDeFoco: cosa.minutosDeFoco ?? 0,
      orden: posicion++,
    });
  }

  return {
    version: 3,
    tareas,
    proyectos,
    postits: viejo.postits ?? [],
    uniones: viejo.uniones ?? [],
    camara: viejo.camara ?? { x: 0, y: 0, scale: 1 },
    z: viejo.z ?? 1,
  };
}

/** Del tablero original (v1): cada columna se vuelve un proyecto. */
function desdeV1(viejo: Record<string, any>): Datos {
  const proyectos: Proyecto[] = [];
  const proyectoDeTarjeta = new Map<string, ID>();

  (viejo.columns ?? []).forEach((columna: any, indice: number) => {
    const proyecto = nuevoProyecto(columna.title?.trim() || "Sin nombre", columna.color ?? "blue", indice);
    proyectos.push(proyecto);
    (columna.cardIds ?? []).forEach((id: string) => proyectoDeTarjeta.set(id, proyecto.id));
  });

  const tareas: Record<ID, Tarea> = {};
  let posicion = 0;

  for (const [id, vieja] of Object.entries((viejo.cards ?? {}) as Record<string, any>)) {
    const sueltas = (vieja.notes ?? [])
      .map((nota: any) => nota.text?.trim())
      .filter(Boolean)
      .join("\n\n");

    tareas[id] = nuevaTarea({
      id,
      titulo: vieja.title ?? "",
      notas: [vieja.description ?? "", sueltas].filter(Boolean).join("\n\n"),
      proyectoId: proyectoDeTarjeta.get(id),
      prioridad: vieja.starred ? 1 : 4,
      vence: vieja.endsOn ?? vieja.startsOn,
      pasos: (vieja.checklist ?? []).map((item: any) => ({
        id: item.id,
        texto: item.text,
        hecho: item.done,
      })),
      links: (vieja.links ?? []).map((link: any) => ({
        id: link.id,
        url: link.url,
        titulo: link.label,
      })),
      imagenes: (vieja.images ?? []).map((img: any) => ({
        id: img.id,
        blobId: img.blobId,
        nombre: img.name,
        w: img.w,
        h: img.h,
      })),
      archivos: (vieja.files ?? []).map((file: any) => ({
        id: file.id,
        blobId: file.blobId,
        nombre: file.name,
        peso: file.size,
        tipo: file.type,
      })),
      creadaEn: vieja.createdAt ?? Date.now(),
      tocadaEn: vieja.updatedAt ?? Date.now(),
      orden: posicion++,
    });
  }

  const postits = ((viejo.stickies ?? []) as any[]).map((s) => ({
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
    blobId: s.blobId,
    marcado: s.checked,
    creadoEn: Number(s.createdAt ?? Date.now()),
    actualizadoEn: Number(s.updatedAt ?? Date.now()),
  }));

  return {
    version: 3,
    tareas,
    proyectos,
    postits,
    uniones: (viejo.edges ?? []).map((e: any) => ({ id: e.id, desde: e.from, hasta: e.to })),
    camara: viejo.camera ?? { x: 0, y: 0, scale: 1 },
    z: Number(viejo.z ?? 1),
  };
}

function normalizar(crudos: Partial<Datos> | null | undefined): Datos {
  if (!crudos) return datosVacios();
  return {
    version: 3,
    tareas: Object.fromEntries(
      Object.entries(crudos.tareas ?? {}).map(([id, tarea]) => [
        id,
        { ...nuevaTarea({ id }), ...tarea, pasos: tarea.pasos ?? [] },
      ]),
    ),
    proyectos: crudos.proyectos ?? [],
    postits: crudos.postits ?? [],
    uniones: crudos.uniones ?? [],
    camara: crudos.camara ?? { x: 0, y: 0, scale: 1 },
    z: crudos.z ?? 1,
  };
}

/* ── Provider ────────────────────────────────────────────────────────────── */

export function DatosProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(datosVacios);
  const [listo, setListo] = useState(false);
  const [historial, setHistorial] = useState<Datos[]>([]);
  const hidratado = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ref = useRef(datos);
  ref.current = datos;
  const intactos = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function cargar(): Promise<Datos> {
      const actuales = await idbGet<Datos>(STORE_KV, CLAVE);
      if (actuales) return normalizar(actuales);

      // Las versiones viejas quedan intactas en su clave, por las dudas.
      const v2 = await idbGet<Record<string, any>>(STORE_KV, CLAVE_V2);
      if (v2?.cosas) return desdeV2(v2);

      const v1 = await idbGet<Record<string, any>>(STORE_KV, CLAVE_V1);
      if (v1?.columns) return desdeV1(v1);

      const semilla = datosIniciales();
      intactos.current = JSON.stringify(semilla);
      return semilla;
    }

    cargar()
      .then((valor) => {
        if (vivo) setDatos(valor);
      })
      .catch(() => {
        if (vivo) setDatos(datosIniciales());
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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      idbSet(STORE_KV, CLAVE, datos).catch(() => {});
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [datos]);

  useEffect(() => {
    const guardar = () => {
      if (hidratado.current) idbSet(STORE_KV, CLAVE, datos).catch(() => {});
    };
    window.addEventListener("pagehide", guardar);
    return () => window.removeEventListener("pagehide", guardar);
  }, [datos]);

  const foto = useCallback(() => {
    setHistorial((h) => [...h.slice(-(LIMITE_HISTORIAL - 1)), ref.current]);
  }, []);

  const parchear = useCallback((id: ID, fn: (tarea: Tarea) => Tarea) => {
    setDatos((d) => {
      const tarea = d.tareas[id];
      if (!tarea) return d;
      return { ...d, tareas: { ...d.tareas, [id]: { ...fn(tarea), tocadaEn: Date.now() } } };
    });
  }, []);

  const acciones: Acciones = useMemo(
    () => ({
      agregar: (parcial) => {
        const tarea = nuevaTarea(parcial);
        setDatos((d) => ({ ...d, tareas: { ...d.tareas, [tarea.id]: tarea } }));
        return tarea.id;
      },

      actualizar: (id, patch) => parchear(id, (tarea) => ({ ...tarea, ...patch })),

      completar: (id) => {
        foto();
        parchear(id, (tarea) => ({ ...tarea, hecha: true, terminadaEn: Date.now() }));
      },

      reabrir: (id) =>
        parchear(id, (tarea) => ({ ...tarea, hecha: false, terminadaEn: undefined })),

      borrar: (id) => {
        foto();
        const tarea = ref.current.tareas[id];
        tarea?.imagenes.forEach((imagen) => deleteBlob(imagen.blobId));
        tarea?.archivos.forEach((archivo) => deleteBlob(archivo.blobId));
        setDatos((d) => {
          const tareas = { ...d.tareas };
          delete tareas[id];
          return { ...d, tareas };
        });
      },

      programar: (id, vence) =>
        parchear(id, (tarea) => ({ ...tarea, vence: vence ?? undefined })),

      moverAProyecto: (id, proyectoId) =>
        parchear(id, (tarea) => ({ ...tarea, proyectoId: proyectoId ?? undefined })),

      setPrioridad: (id, prioridad) => parchear(id, (tarea) => ({ ...tarea, prioridad })),

      reordenar: (ids) =>
        setDatos((d) => {
          const tareas = { ...d.tareas };
          ids.forEach((id, indice) => {
            if (tareas[id]) tareas[id] = { ...tareas[id], orden: indice };
          });
          return { ...d, tareas };
        }),

      sumarFoco: (id, minutos) =>
        parchear(id, (tarea) => ({ ...tarea, minutosDeFoco: tarea.minutosDeFoco + minutos })),

      agregarPaso: (id, texto) =>
        parchear(id, (tarea) => ({
          ...tarea,
          pasos: [...tarea.pasos, { id: uid(), texto, hecho: false }],
        })),

      editarPaso: (id, pasoId, patch) =>
        parchear(id, (tarea) => ({
          ...tarea,
          pasos: tarea.pasos.map((paso) => (paso.id === pasoId ? { ...paso, ...patch } : paso)),
        })),

      borrarPaso: (id, pasoId) =>
        parchear(id, (tarea) => ({
          ...tarea,
          pasos: tarea.pasos.filter((paso) => paso.id !== pasoId),
        })),

      agregarLink: (id, url) => {
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const link: Link = { id: uid(), url: href, titulo: dominio(href) };
        parchear(id, (tarea) => ({ ...tarea, links: [...tarea.links, link] }));
      },

      borrarLink: (id, linkId) =>
        parchear(id, (tarea) => ({
          ...tarea,
          links: tarea.links.filter((link) => link.id !== linkId),
        })),

      agregarImagenes: (id, imagenes) =>
        parchear(id, (tarea) => ({
          ...tarea,
          imagenes: [...tarea.imagenes, ...imagenes.map((img) => ({ ...img, id: uid() }))],
        })),

      borrarImagen: (id, imagenId) => {
        const imagen = ref.current.tareas[id]?.imagenes.find((i) => i.id === imagenId);
        if (imagen) deleteBlob(imagen.blobId);
        parchear(id, (tarea) => ({
          ...tarea,
          imagenes: tarea.imagenes.filter((i) => i.id !== imagenId),
        }));
      },

      agregarArchivos: (id, archivos) =>
        parchear(id, (tarea) => ({
          ...tarea,
          archivos: [...tarea.archivos, ...archivos.map((a) => ({ ...a, id: uid() }))],
        })),

      borrarArchivo: (id, archivoId) => {
        const archivo = ref.current.tareas[id]?.archivos.find((a) => a.id === archivoId);
        if (archivo) deleteBlob(archivo.blobId);
        parchear(id, (tarea) => ({
          ...tarea,
          archivos: tarea.archivos.filter((a) => a.id !== archivoId),
        }));
      },

      crearProyecto: (nombre, color = "blue") => {
        const proyecto = nuevoProyecto(nombre, color, ref.current.proyectos.length);
        setDatos((d) => ({ ...d, proyectos: [...d.proyectos, proyecto] }));
        return proyecto.id;
      },

      actualizarProyecto: (id, patch) =>
        setDatos((d) => ({
          ...d,
          proyectos: d.proyectos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      // Borrar un proyecto no borra tareas: vuelven a la Bandeja.
      borrarProyecto: (id) => {
        foto();
        setDatos((d) => ({
          ...d,
          proyectos: d.proyectos.filter((p) => p.id !== id),
          tareas: Object.fromEntries(
            Object.entries(d.tareas).map(([tid, tarea]) => [
              tid,
              tarea.proyectoId === id ? { ...tarea, proyectoId: undefined } : tarea,
            ]),
          ),
        }));
      },

      agregarPostIt: (parcial) => {
        const id = uid();
        const ahora = Date.now();
        setDatos((d) => {
          const z = d.z + 1;
          const medida = medidaPorDefecto(parcial.tipo);
          return {
            ...d,
            z,
            postits: [
              ...d.postits,
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
        setDatos((d) => ({
          ...d,
          postits: d.postits.map((p) =>
            p.id === id ? { ...p, ...patch, actualizadoEn: Date.now() } : p,
          ),
        })),

      borrarPostIt: (id) => {
        foto();
        const postit = ref.current.postits.find((p) => p.id === id);
        if (postit?.blobId) deleteBlob(postit.blobId);
        setDatos((d) => ({
          ...d,
          postits: d.postits.filter((p) => p.id !== id),
          uniones: d.uniones.filter((u) => u.desde !== id && u.hasta !== id),
        }));
      },

      alFrente: (id) =>
        setDatos((d) => {
          const z = d.z + 1;
          return { ...d, z, postits: d.postits.map((p) => (p.id === id ? { ...p, z } : p)) };
        }),

      unir: (desde, hasta) =>
        setDatos((d) => {
          if (desde === hasta) return d;
          const existe = d.uniones.some(
            (u) =>
              (u.desde === desde && u.hasta === hasta) || (u.desde === hasta && u.hasta === desde),
          );
          return existe ? d : { ...d, uniones: [...d.uniones, { id: uid(), desde, hasta }] };
        }),

      desunir: (id) => setDatos((d) => ({ ...d, uniones: d.uniones.filter((u) => u.id !== id) })),

      setCamara: (camara) => setDatos((d) => ({ ...d, camara })),

      deshacer: () =>
        setHistorial((h) => {
          const previo = h[h.length - 1];
          if (previo) setDatos(previo);
          return h.slice(0, -1);
        }),

      sePuedeDeshacer: historial.length > 0,

      reemplazar: (nuevos) => {
        foto();
        intactos.current = null;
        setDatos(normalizar(nuevos));
      },

      aplicarRemoto: (nuevos) => {
        intactos.current = null;
        setDatos(normalizar(nuevos));
      },

      estaIntacta: () =>
        intactos.current !== null && JSON.stringify(ref.current) === intactos.current,

      vaciarTodo: () => {
        foto();
        intactos.current = null;
        setDatos(datosVacios());
      },
    }),
    [parchear, foto, historial.length],
  );

  const valor: Valor = useMemo(() => ({ ...acciones, datos, listo }), [acciones, datos, listo]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatos(): Valor {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useDatos fuera del provider");
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
