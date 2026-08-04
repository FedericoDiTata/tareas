import { Datos, ID } from "./types";

export interface Resultado {
  id: ID;
  tipo: "tarea" | "postit" | "diario";
  titulo: string;
  contexto: string;
  puntos: number;
}

/** Sin acentos ni mayúsculas: "camion" tiene que encontrar "Camión". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buscar(datos: Datos, consulta: string, limite = 24): Resultado[] {
  const q = normalizar(consulta.trim());
  if (!q) return [];

  const nombreProyecto = new Map(datos.proyectos.map((p) => [p.id, p.nombre]));
  const resultados: Resultado[] = [];

  for (const tarea of Object.values(datos.tareas)) {
    const titulo = normalizar(tarea.titulo);
    const cuerpo = normalizar(
      [tarea.notas, ...tarea.pasos.map((paso) => paso.texto), ...tarea.links.map((l) => l.titulo)].join(
        "\n",
      ),
    );

    let puntos = 0;
    if (titulo.startsWith(q)) puntos = 100;
    else if (titulo.includes(q)) puntos = 85;
    else if (cuerpo.includes(q)) puntos = 60;
    if (!puntos) continue;
    if (tarea.hecha) puntos -= 30;

    resultados.push({
      id: tarea.id,
      tipo: "tarea",
      titulo: tarea.titulo || "Sin título",
      contexto: tarea.hecha
        ? "Completada"
        : tarea.proyectoId
          ? (nombreProyecto.get(tarea.proyectoId) ?? "Proyecto")
          : "Bandeja",
      puntos,
    });
  }

  for (const entrada of Object.values(datos.diario ?? {})) {
    if (!normalizar(entrada.texto).includes(q)) continue;
    resultados.push({
      id: entrada.dia,
      tipo: "diario",
      titulo: entrada.texto.trim().split(/\r?\n/)[0]?.slice(0, 70) || "Entrada del diario",
      contexto: "Diario",
      puntos: 58,
    });
  }

  for (const postit of datos.postits) {
    if (!normalizar(postit.texto).includes(q)) continue;
    resultados.push({
      id: postit.id,
      tipo: "postit",
      titulo: postit.texto.trim().split("\n")[0]?.slice(0, 70) || "Papelito",
      contexto: "Escritorio",
      puntos: 55,
    });
  }

  return resultados.sort((a, b) => b.puntos - a.puntos).slice(0, limite);
}
