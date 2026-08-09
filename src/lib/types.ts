/** Dominio en español; la infraestructura (idb, files, sync) queda en inglés. */

export type ID = string;

export type ColorKey =
  | "slate"
  | "blue"
  | "violet"
  | "pink"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose";

export const COLOR_KEYS: ColorKey[] = [
  "slate",
  "blue",
  "violet",
  "pink",
  "amber",
  "emerald",
  "cyan",
  "rose",
];

export const COLOR_LABEL: Record<ColorKey, string> = {
  slate: "Gris",
  blue: "Azul",
  violet: "Violeta",
  pink: "Rosa",
  amber: "Ámbar",
  emerald: "Verde",
  cyan: "Cian",
  rose: "Coral",
};

export interface Paso {
  id: ID;
  texto: string;
  hecho: boolean;
}

export interface Link {
  id: ID;
  url: string;
  titulo: string;
}

export interface Imagen {
  id: ID;
  blobId: string;
  nombre: string;
  w: number;
  h: number;
}

export interface Archivo {
  id: ID;
  blobId: string;
  nombre: string;
  peso: number;
  tipo: string;
}

export interface Tarea {
  id: ID;
  titulo: string;
  notas: string;
  /** Sin proyecto = vive en la Bandeja. */
  proyectoId?: ID;
  /** Columna dentro del proyecto. Sin sección = queda en el "Backlog". */
  seccionId?: ID;
  /** Color propio. Sin esto la tarjeta va neutra y en el calendario toma el del proyecto. */
  color?: ColorKey;
  /** El día en que va. Con `hasta`, el primero del tramo. */
  vence?: string;
  /** Último día del tramo, para lo que ocupa varios días. Sin esto, es un día solo. */
  hasta?: string;

  pasos: Paso[];
  links: Link[];
  imagenes: Imagen[];
  archivos: Archivo[];

  hecha: boolean;
  creadaEn: number;
  tocadaEn: number;
  terminadaEn?: number;
  minutosDeFoco: number;
  /** Posición dentro de su lista, para poder ordenarlas a mano. */
  orden: number;
}

export interface Proyecto {
  id: ID;
  nombre: string;
  color: ColorKey;
  orden: number;
}

/** Las columnas de un proyecto. */
export interface Seccion {
  id: ID;
  proyectoId: ID;
  nombre: string;
  orden: number;
  /**
   * Cuándo se dio por terminada. Una sección completada sale del tablero pero
   * no se borra: es el registro de un cuatrimestre, de un cliente, de una etapa.
   */
  completadaEn?: number;
}

/** Un papelito pegado a un día del diario. */
export interface PostIt {
  id: ID;
  dia: string;
  tipo: "nota" | "imagen";
  texto: string;
  color: ColorKey;
  blobId?: string;
  /** La inclinación, que es lo que lo hace parecer papel. */
  rot: number;
  creadoEn: number;
  actualizadoEn: number;
}

/**
 * Un bloque de tiempo en el calendario: una clase, la oficina, terapia, o un
 * rato que reservaste para una tarea.
 *
 * El calendario es opt-in: una tarea con fecha NO aparece acá. Aparece cuando
 * vos le reservás un horario, y por eso el evento puede apuntar a una tarea.
 */
export interface Evento {
  id: ID;
  titulo: string;
  nota?: string;
  color: ColorKey;
  /** "HH:MM" en 24 horas. */
  desde: string;
  hasta: string;
  /** Un día puntual (ISO)… */
  dia?: string;
  /** …o todas las semanas ese día: 0 domingo … 6 sábado. */
  diaSemana?: number;
  /** Días salteados de una repetición: la semana que no vas. */
  excepciones?: string[];
  /** Si nace de una tarea, para poder abrirla desde el calendario. */
  tareaId?: ID;
}

/** Una página del diario: un día, un texto. */
export interface EntradaDiario {
  dia: string;
  texto: string;
  actualizadaEn: number;
}

/** Un rato de foco sobre una tarea, dentro de una sesión. */
export interface TramoFoco {
  tareaId: ID;
  /** El título va copiado: si después borrás la tarea, el registro se sigue entendiendo. */
  titulo: string;
  proyectoId?: ID;
  segundos: number;
  completada: boolean;
}

/**
 * Una sesión de foco. Es un registro, no un dato editable: queda como quedó.
 * Se guarda en segundos porque una sesión de 40 segundos también pasó.
 */
export interface SesionFoco {
  id: ID;
  /** El día en que arrancó, en ISO. */
  dia: string;
  inicio: number;
  fin: number;
  segundos: number;
  tramos: TramoFoco[];
}

export interface Datos {
  version: 3;
  tareas: Record<ID, Tarea>;
  proyectos: Proyecto[];
  secciones: Seccion[];
  diario: Record<string, EntradaDiario>;
  postits: PostIt[];
  /** Campos agregados después de la v3: `normalizar` los completa si no están. */
  sesiones: SesionFoco[];
  eventos: Evento[];
}

export const uid = (): ID =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function nuevaTarea(partial: Partial<Tarea> = {}): Tarea {
  const ahora = Date.now();
  return {
    id: uid(),
    titulo: "",
    notas: "",
    pasos: [],
    links: [],
    imagenes: [],
    archivos: [],
    hecha: false,
    creadaEn: ahora,
    tocadaEn: ahora,
    minutosDeFoco: 0,
    orden: ahora,
    ...partial,
  };
}

export function nuevoProyecto(nombre: string, color: ColorKey = "blue", orden = Date.now()): Proyecto {
  return { id: uid(), nombre, color, orden };
}

export function nuevaSeccion(proyectoId: ID, nombre: string, orden: number): Seccion {
  return { id: uid(), proyectoId, nombre, orden };
}

export function nuevoEvento(partial: Partial<Evento> = {}): Evento {
  return {
    id: uid(),
    titulo: "",
    color: "violet",
    desde: "09:00",
    hasta: "10:00",
    ...partial,
  };
}

/** El primer paso sin hacer: por dónde arrancar cuando la tarea es grande. */
export function primerPaso(tarea: Tarea): Paso | undefined {
  return tarea.pasos.find((paso) => !paso.hecho);
}
