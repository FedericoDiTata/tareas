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
import { datosIniciales, datosVacios, horarioFijo } from "./seed";
import { diferenciaDias, sumarDias, toISO } from "./fechas";
import {
  Archivo,
  ColorKey,
  Datos,
  Evento,
  ID,
  Imagen,
  Link,
  Paso,
  PostIt,
  Proyecto,
  Seccion,
  SesionFoco,
  Tarea,
  nuevaSeccion,
  nuevaTarea,
  nuevoEvento,
  nuevoProyecto,
  uid,
} from "./types";

const CLAVE = "datos.v3";
const CLAVE_V2 = "estanteria.v2";
const CLAVE_V1 = "state.v1";
const LIMITE_HISTORIAL = 50;
/** El registro de foco no crece para siempre: las últimas 300 alcanzan. */
const LIMITE_SESIONES = 300;

interface Acciones {
  // Tareas
  agregar: (tarea: Partial<Tarea>) => ID;
  actualizar: (id: ID, patch: Partial<Tarea>) => void;
  completar: (id: ID) => void;
  reabrir: (id: ID) => void;
  borrar: (id: ID) => void;
  programar: (id: ID, vence: string | null) => void;
  /** Estira la tarea hasta ese día (o la vuelve de un día solo con null). */
  estirar: (id: ID, hasta: string | null) => void;
  /** Corre el tramo entero a un día nuevo, manteniendo cuánto dura. */
  correr: (id: ID, vence: string) => void;
  moverAProyecto: (id: ID, proyectoId: ID | null) => void;
  /** El color de la tarjeta. `null` la deja neutra otra vez. */
  pintar: (id: ID, color: ColorKey | null) => void;
  reordenar: (ids: ID[]) => void;
  sumarFoco: (id: ID, minutos: number) => void;
  /** Deja anotado el reloj a medias, o lo borra con null. No cuenta como tocar la tarea. */
  guardarPausa: (id: ID, segundos: number | null) => void;

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

  // Proyectos y secciones
  crearProyecto: (nombre: string, color?: ColorKey) => ID;
  actualizarProyecto: (id: ID, patch: Partial<Proyecto>) => void;
  borrarProyecto: (id: ID) => void;
  crearSeccion: (proyectoId: ID, nombre: string) => ID;
  actualizarSeccion: (id: ID, patch: Partial<Seccion>) => void;
  borrarSeccion: (id: ID) => void;
  /** Da por terminada una sección. Lo que queda abierto se completa o vuelve al Backlog. */
  completarSeccion: (id: ID, pendientes: "completar" | "backlog") => void;
  reabrirSeccion: (id: ID) => void;
  reordenarSecciones: (ids: ID[]) => void;
  moverASeccion: (id: ID, seccionId: ID | null, orden?: number) => void;

  // Diario
  escribirDiario: (dia: string, texto: string) => void;
  /** Suma entradas de un archivo sin pisar lo que ya escribiste. */
  importarDiario: (
    entradas: Array<{ dia: string; texto: string }>,
  ) => { agregadas: number; salteadas: number };
  agregarPostIt: (parcial: Partial<PostIt> & { dia: string }) => ID;
  actualizarPostIt: (id: ID, patch: Partial<PostIt>) => void;
  borrarPostIt: (id: ID) => void;

  // Calendario
  crearEvento: (parcial?: Partial<Evento>) => ID;
  actualizarEvento: (id: ID, patch: Partial<Evento>) => void;
  borrarEvento: (id: ID) => void;
  /** Saltea una sola fecha de un evento que se repite. */
  saltearEvento: (id: ID, dia: string) => void;
  cargarHorarioFijo: () => void;

  // Foco
  /** Guarda o pisa una sesión por id. Es un registro: no entra en el deshacer. */
  guardarSesion: (sesion: SesionFoco) => void;
  /** Corrige si en ese rato la tarea quedó terminada o no. */
  marcarTramo: (sesionId: ID, indice: number, completada: boolean) => void;

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
    secciones: [],
    diario: {},
    postits: (viejo.postits ?? []).map(aPapelito),
    sesiones: [],
    eventos: [],
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

  const postits = ((viejo.stickies ?? []) as any[]).map((s) =>
    aPapelito({
      id: s.id,
      tipo: s.kind === "image" ? "imagen" : "nota",
      texto: s.text,
      color: s.color,
      blobId: s.blobId,
      rot: s.rot,
      creadoEn: s.createdAt,
      actualizadoEn: s.updatedAt,
    }),
  );

  return {
    version: 3,
    tareas,
    proyectos,
    secciones: [],
    diario: {},
    postits,
    sesiones: [],
    eventos: [],
  };
}

/** Los papelitos del canvas viejo se pegan al día en que se crearon. */
function aPapelito(crudo: any): PostIt {
  const creado = Number(crudo?.creadoEn ?? crudo?.createdAt ?? Date.now());
  return {
    id: String(crudo?.id ?? uid()),
    dia: crudo?.dia ?? toISO(new Date(creado)),
    tipo: crudo?.tipo === "imagen" ? "imagen" : "nota",
    texto: String(crudo?.texto ?? ""),
    color: (crudo?.color ?? "amber") as ColorKey,
    blobId: crudo?.blobId,
    rot: Number(crudo?.rot ?? 0),
    creadoEn: creado,
    actualizadoEn: Number(crudo?.actualizadoEn ?? creado),
  };
}

function normalizar(crudos: Partial<Datos> | null | undefined): Datos {
  if (!crudos) return datosVacios();
  return {
    version: 3,
    tareas: Object.fromEntries(
      Object.entries(crudos.tareas ?? {}).map(([id, tarea]) => {
        // `prioridad` existió hasta agosto de 2026: se limpia al cargar para que
        // no quede arrastrándose en el JSON para siempre.
        const { prioridad, ...resto } = tarea as Tarea & { prioridad?: unknown };
        void prioridad;
        return [id, { ...nuevaTarea({ id }), ...resto, pasos: resto.pasos ?? [] }];
      }),
    ),
    proyectos: crudos.proyectos ?? [],
    secciones: crudos.secciones ?? [],
    diario: crudos.diario ?? {},
    postits: (crudos.postits ?? []).map(aPapelito),
    sesiones: crudos.sesiones ?? [],
    eventos: crudos.eventos ?? [],
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
        parchear(id, (tarea) => ({
          ...tarea,
          vence: vence ?? undefined,
          // Sin fecha no hay tramo, y un tramo que termina antes de empezar no existe.
          hasta: !vence || (tarea.hasta && tarea.hasta < vence) ? undefined : tarea.hasta,
        })),

      estirar: (id, hasta) =>
        parchear(id, (tarea) => ({
          ...tarea,
          hasta: hasta && tarea.vence && hasta > tarea.vence ? hasta : undefined,
        })),

      correr: (id, vence) =>
        parchear(id, (tarea) => {
          if (!tarea.vence || !tarea.hasta) return { ...tarea, vence };
          const dias = diferenciaDias(tarea.vence, tarea.hasta);
          return { ...tarea, vence, hasta: sumarDias(vence, dias) };
        }),

      pintar: (id, color) => parchear(id, (tarea) => ({ ...tarea, color: color ?? undefined })),

      moverAProyecto: (id, proyectoId) =>
        parchear(id, (tarea) => ({
          ...tarea,
          proyectoId: proyectoId ?? undefined,
          // Cambiar de proyecto invalida la sección: era de otro tablero.
          seccionId: undefined,
        })),

      moverASeccion: (id, seccionId, orden) =>
        parchear(id, (tarea) => ({
          ...tarea,
          seccionId: seccionId ?? undefined,
          orden: orden ?? tarea.orden,
        })),

      reordenar: (ids) =>
        setDatos((d) => {
          const tareas = { ...d.tareas };
          ids.forEach((id, indice) => {
            if (tareas[id]) tareas[id] = { ...tareas[id], orden: indice };
          });
          return { ...d, tareas };
        }),

      guardarPausa: (id, segundos) =>
        setDatos((d) => {
          const tarea = d.tareas[id];
          if (!tarea) return d;
          return {
            ...d,
            tareas: {
              ...d.tareas,
              [id]: {
                ...tarea,
                pausa: segundos && segundos > 0
                  ? { segundos, actualizadoEn: Date.now() }
                  : undefined,
              },
            },
          };
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

      crearSeccion: (proyectoId, nombre) => {
        const propias = ref.current.secciones.filter((s) => s.proyectoId === proyectoId);
        const seccion = nuevaSeccion(proyectoId, nombre, propias.length);
        setDatos((d) => ({ ...d, secciones: [...d.secciones, seccion] }));
        return seccion.id;
      },

      actualizarSeccion: (id, patch) =>
        setDatos((d) => ({
          ...d,
          secciones: d.secciones.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),

      /**
       * Completar una sección la saca del tablero pero la deja entera: es el
       * registro de un cuatrimestre que terminó, de un cliente que se fue.
       * Lo que quedaba abierto no puede quedar invisible, así que o se da por
       * terminado también o vuelve al Backlog. Lo elige quien la completa.
       */
      completarSeccion: (id, pendientes) => {
        foto();
        const ahora = Date.now();
        setDatos((d) => ({
          ...d,
          secciones: d.secciones.map((s) => (s.id === id ? { ...s, completadaEn: ahora } : s)),
          tareas: Object.fromEntries(
            Object.entries(d.tareas).map(([tid, tarea]) => {
              if (tarea.seccionId !== id || tarea.hecha) return [tid, tarea];
              return [
                tid,
                pendientes === "completar"
                  ? { ...tarea, hecha: true, terminadaEn: ahora, tocadaEn: ahora }
                  : { ...tarea, seccionId: undefined, tocadaEn: ahora },
              ];
            }),
          ),
        }));
      },

      reabrirSeccion: (id) => {
        foto();
        setDatos((d) => ({
          ...d,
          secciones: d.secciones.map((s) =>
            s.id === id ? { ...s, completadaEn: undefined } : s,
          ),
        }));
      },

      reordenarSecciones: (ids) =>
        setDatos((d) => ({
          ...d,
          secciones: d.secciones.map((s) => {
            const posicion = ids.indexOf(s.id);
            return posicion < 0 ? s : { ...s, orden: posicion };
          }),
        })),

      // Borrar una sección no borra tareas: vuelven al Backlog.
      borrarSeccion: (id) => {
        foto();
        setDatos((d) => ({
          ...d,
          secciones: d.secciones.filter((s) => s.id !== id),
          tareas: Object.fromEntries(
            Object.entries(d.tareas).map(([tid, tarea]) => [
              tid,
              tarea.seccionId === id ? { ...tarea, seccionId: undefined } : tarea,
            ]),
          ),
        }));
      },

      // Borrar un proyecto no borra tareas: vuelven a la Bandeja.
      borrarProyecto: (id) => {
        foto();
        setDatos((d) => ({
          ...d,
          proyectos: d.proyectos.filter((p) => p.id !== id),
          secciones: d.secciones.filter((s) => s.proyectoId !== id),
          tareas: Object.fromEntries(
            Object.entries(d.tareas).map(([tid, tarea]) => [
              tid,
              tarea.proyectoId === id
                ? { ...tarea, proyectoId: undefined, seccionId: undefined }
                : tarea,
            ]),
          ),
        }));
      },

      escribirDiario: (dia, texto) =>
        setDatos((d) => ({
          ...d,
          diario: { ...d.diario, [dia]: { dia, texto, actualizadaEn: Date.now() } },
        })),

      importarDiario: (entradas) => {
        foto();
        const diario = { ...(ref.current.diario ?? {}) };
        let agregadas = 0;
        let salteadas = 0;

        for (const entrada of entradas) {
          if (!entrada.texto.trim()) continue;
          // Lo que ya escribiste en la app manda sobre lo que trae el archivo.
          if (diario[entrada.dia]?.texto.trim()) {
            salteadas += 1;
            continue;
          }
          diario[entrada.dia] = {
            dia: entrada.dia,
            texto: entrada.texto,
            actualizadaEn: Date.now(),
          };
          agregadas += 1;
        }

        setDatos((d) => ({ ...d, diario }));
        return { agregadas, salteadas };
      },

      agregarPostIt: (parcial) => {
        const id = uid();
        const ahora = Date.now();
        setDatos((d) => ({
          ...d,
          postits: [
            ...d.postits,
            {
              id,
              dia: parcial.dia,
              tipo: parcial.tipo ?? "nota",
              texto: parcial.texto ?? "",
              color: parcial.color ?? "amber",
              blobId: parcial.blobId,
              rot: parcial.rot ?? Math.round((Math.random() * 5 - 2.5) * 10) / 10,
              creadoEn: ahora,
              actualizadoEn: ahora,
            },
          ],
        }));
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
        setDatos((d) => ({ ...d, postits: d.postits.filter((p) => p.id !== id) }));
      },

      crearEvento: (parcial) => {
        const evento = nuevoEvento(parcial);
        foto();
        setDatos((d) => ({ ...d, eventos: [...d.eventos, evento] }));
        return evento.id;
      },

      actualizarEvento: (id, patch) =>
        setDatos((d) => ({
          ...d,
          eventos: d.eventos.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      borrarEvento: (id) => {
        foto();
        setDatos((d) => ({ ...d, eventos: d.eventos.filter((e) => e.id !== id) }));
      },

      saltearEvento: (id, dia) => {
        foto();
        setDatos((d) => ({
          ...d,
          eventos: d.eventos.map((e) =>
            e.id === id ? { ...e, excepciones: [...(e.excepciones ?? []), dia] } : e,
          ),
        }));
      },

      cargarHorarioFijo: () => {
        foto();
        setDatos((d) => ({ ...d, eventos: [...d.eventos, ...horarioFijo()] }));
      },

      // La sesión se va guardando mientras pasa (una vez por tarea), así que si
      // cerrás la pestaña a la mitad igual queda anotado lo que hiciste.
      // No pasa por `foto()`: un registro no se deshace.
      guardarSesion: (sesion) =>
        setDatos((d) => {
          const resto = d.sesiones.filter((s) => s.id !== sesion.id);
          return { ...d, sesiones: [...resto, sesion].slice(-LIMITE_SESIONES) };
        }),

      marcarTramo: (sesionId, indice, completada) =>
        setDatos((d) => ({
          ...d,
          sesiones: d.sesiones.map((sesion) =>
            sesion.id !== sesionId
              ? sesion
              : {
                  ...sesion,
                  tramos: sesion.tramos.map((tramo, i) =>
                    i === indice ? { ...tramo, completada } : tramo,
                  ),
                },
          ),
        })),

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

export function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
