/**
 * El dominio va en español y la infraestructura (idb, files, sync) en inglés.
 * Suena raro escrito, pero acá los nombres son los del producto: si el motor
 * habla de "saltos" y "motivo", el código también.
 */

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
  slate: "Neutro",
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

/**
 * Los cuatro estados posibles. Ninguno significa "fracaso":
 * - activa: está en juego
 * - pausa: la app la dejó descansar, o vos la mandaste a dormir
 * - hecha: terminada, queda en el registro con su fecha
 * - descartada: la soltaste. No se borra, deja de existir para el motor
 */
export type Estado = "activa" | "pausa" | "hecha" | "descartada";

export interface Cosa {
  id: ID;
  titulo: string;
  notas: string;
  color: ColorKey;

  /** Los pasos concretos. El primero sin hacer es "por dónde empezar". */
  pasos: Paso[];
  links: Link[];
  imagenes: Imagen[];
  archivos: Archivo[];
  etiquetas: string[];

  estado: Estado;
  /** Todavía sin clasificar: capturada y nada más. */
  enBandeja: boolean;
  /** Elegida para esta semana. Son cinco como mucho. */
  clave: boolean;
  /** Se hace en menos de quince minutos. Sirve para los días de poca cabeza. */
  corta: boolean;

  /** Fecha real de vencimiento. La mayoría de las cosas no tiene. */
  vence?: string;

  creadaEn: number;
  /** Última vez que le hiciste algo de verdad (no mirarla). */
  tocadaEn: number;
  terminadaEn?: number;
  /** Primera vez que apretaste Empezar. */
  empezadaEn?: number;
  minutosDeFoco: number;

  /** Días en los que dijiste "ahora no". Es la señal más honesta que hay. */
  saltos: string[];
  /** Fijada a mano para hoy: manda sobre el motor. */
  fijadaEn?: string;
}

export interface PostIt {
  id: ID;
  tipo: "nota" | "texto" | "imagen" | "objetivo";
  texto: string;
  color: ColorKey;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
  blobId?: string;
  marcado?: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

export interface Union {
  id: ID;
  desde: ID;
  hasta: ID;
}

export interface Camara {
  x: number;
  y: number;
  scale: number;
}

export interface Estanteria {
  version: 2;
  cosas: Record<ID, Cosa>;
  /** Orden estable para las listas. El motor ordena aparte, por puntaje. */
  orden: ID[];
  postits: PostIt[];
  uniones: Union[];
  camara: Camara;
  z: number;
  /** Cuándo fue la última revisión de un minuto. */
  ultimaRevision?: string;
  /** Día en que dijiste "hoy tengo poca cabeza". */
  pocaCabezaEn?: string;
}

export const uid = (): ID =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function nuevaCosa(partial: Partial<Cosa> = {}): Cosa {
  const ahora = Date.now();
  return {
    id: uid(),
    titulo: "",
    notas: "",
    color: "slate",
    pasos: [],
    links: [],
    imagenes: [],
    archivos: [],
    etiquetas: [],
    estado: "activa",
    enBandeja: true,
    clave: false,
    corta: false,
    creadaEn: ahora,
    tocadaEn: ahora,
    minutosDeFoco: 0,
    saltos: [],
    ...partial,
  };
}

/** El primer paso sin hacer: la respuesta a "¿y por dónde arranco?". */
export function primerPaso(cosa: Cosa): Paso | undefined {
  return cosa.pasos.find((paso) => !paso.hecho);
}

export function estaVacia(cosa: Cosa): boolean {
  return (
    !cosa.titulo.trim() &&
    !cosa.notas.trim() &&
    cosa.pasos.length === 0 &&
    cosa.links.length === 0 &&
    cosa.imagenes.length === 0 &&
    cosa.archivos.length === 0
  );
}

export const MAX_CLAVES = 5;
