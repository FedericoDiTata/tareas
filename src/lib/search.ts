import { Cosa, Estanteria, ID } from "./types";

export interface Resultado {
  id: ID;
  tipo: "cosa" | "postit";
  titulo: string;
  contexto: string;
  fragmento?: string;
  puntos: number;
}

/** Sin acentos ni mayúsculas: "camion" tiene que encontrar "Camión". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fragmentoCerca(texto: string, aguja: string): string | undefined {
  const i = normalizar(texto).indexOf(aguja);
  if (i < 0) return undefined;
  const desde = Math.max(0, i - 30);
  const crudo = texto.slice(desde, desde + 110).replace(/\s+/g, " ").trim();
  return (desde > 0 ? "…" : "") + crudo + (desde + 110 < texto.length ? "…" : "");
}

function dondeVive(cosa: Cosa): string {
  if (cosa.estado === "hecha") return "Hecho";
  if (cosa.estado === "pausa") return "En pausa";
  if (cosa.estado === "descartada") return "Soltada";
  if (cosa.enBandeja) return "Bandeja";
  if (cosa.clave) return "Esta semana";
  return "El resto";
}

export function buscar(estado: Estanteria, consulta: string, limite = 24): Resultado[] {
  const q = normalizar(consulta.trim());
  if (!q) return [];

  const resultados: Resultado[] = [];

  for (const cosa of Object.values(estado.cosas)) {
    const titulo = normalizar(cosa.titulo);
    const cuerpo = [
      cosa.notas,
      ...cosa.pasos.map((paso) => paso.texto),
      ...cosa.links.map((link) => `${link.titulo} ${link.url}`),
      ...cosa.archivos.map((archivo) => archivo.nombre),
      ...cosa.etiquetas,
    ].join("\n");

    let puntos = 0;
    if (titulo.startsWith(q)) puntos = 100;
    else if (titulo.includes(q)) puntos = 85;
    else if (normalizar(cuerpo).includes(q)) puntos = 60;
    if (!puntos) continue;

    if (cosa.clave) puntos += 6;
    // Lo hecho pesa menos, pero sigue estando: nada desaparece del buscador.
    if (cosa.estado !== "activa") puntos -= 20;

    resultados.push({
      id: cosa.id,
      tipo: "cosa",
      titulo: cosa.titulo || "Sin título",
      contexto: dondeVive(cosa),
      fragmento: puntos <= 60 ? fragmentoCerca(cuerpo, q) : undefined,
      puntos,
    });
  }

  for (const postit of estado.postits) {
    const texto = normalizar(postit.texto);
    if (!texto.includes(q)) continue;
    resultados.push({
      id: postit.id,
      tipo: "postit",
      titulo: postit.texto.trim().split("\n")[0]?.slice(0, 80) || "Papelito",
      contexto: "Escritorio",
      fragmento: fragmentoCerca(postit.texto, q),
      puntos: texto.startsWith(q) ? 80 : 55,
    });
  }

  return resultados.sort((a, b) => b.puntos - a.puntos).slice(0, limite);
}
