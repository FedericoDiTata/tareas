# Escritorio

Un gestor de tareas concreto —listas, proyectos, prioridades y fechas— con un modo foco encima.

La estructura es la de Todoist porque funciona: cada tarea tiene un lugar donde vive y todo está a
la vista. Lo que se agrega es lo que a Todoist le falta: un **modo foco encadenado** para cuando lo
que necesitás no es planificar sino arrancar.

## Cómo se usa

**Escribís la tarea entera en un renglón.** El campo *Agregar tarea* entiende lo que ponés:

```
Llamar al contador mañana p1 #Trabajo
```

Sale con fecha, prioridad y proyecto puestos. Mientras escribís, lo reconocido aparece como chips
abajo. Entiende: `hoy`, `mañana`, `pasado mañana`, `el viernes`, `en 3 días`, `en 2 semanas`,
`12/8`, `el 20`, `p1`–`p4` y `#Proyecto` (lo crea si no existe).

**Las vistas son cinco y ninguna esconde nada:**

| | |
| --- | --- |
| **Hoy** | Lo de hoy y lo que quedó de antes. Un botón pasa todo lo atrasado a hoy. |
| **Calendario** | En **agenda** (día por día, con su campo para agregar) o en **mes** (la grilla entera, arrastrando tareas de un día a otro). |
| **Bandeja** | Lo que anotaste sin proyecto ni fecha. |
| **Proyectos** | Los que crees vos, en **lista** o en **tablero** por secciones. |
| **Completadas** | Lo terminado, por día. Nada desaparece. |

**Los proyectos tienen secciones.** En la vista lista son encabezados; en la vista tablero son
columnas, y las tareas se arrastran de una a otra. Las dos vistas muestran las mismas secciones, y
cada proyecto se acuerda de cómo lo mirás.

## El Diario

La sexta pantalla no es de tareas. Es un cuaderno para escribir el día a día: arriba está **Hoy**
con el cursor listo, y abajo los días anteriores, cada uno a un click. Se guarda solo mientras
escribís.

Cada día acepta **papelitos**: el botón de la esquina te pega uno en ese día, con su color y su
inclinación. Pegando una imagen con Ctrl+V queda como papelito también. Los papelitos viven en el
día, como un post-it sobre la página de un cuaderno — no hay un lienzo aparte, porque escribir y
pegar son la misma actividad y separarlas en dos pantallas las convertía en dos.

## El modo foco

Es lo que hace distinta a esta app. Desde *Hoy* (o desde un proyecto) apretás **Modo foco** y la
pantalla se vacía: queda una tarea, sus pasos y un cronómetro.

Lo importante no es el cronómetro sino el **encadenado**: cuando terminás una, te ofrece la
siguiente sin volver a la lista. Volver a la lista es donde se corta el envión y arranca de nuevo la
duda de por dónde seguir.

Dos detalles pensados para eso:

- Si la tarea no tiene pasos, antes de arrancar te hace **una sola pregunta**: *¿cuál es el primer
  paso concreto?* No arrancás "el proyecto", arrancás "abrir el archivo y escribir el título".
- El cronómetro cuenta **para arriba**. Una cuenta regresiva es presión; un cronómetro que sube es
  un dato. Los minutos quedan sumados en la tarea.

## Atajos

| Tecla | Qué hace |
| --- | --- |
| `Enter` | Guarda la tarea y te deja escribir la siguiente |
| `F` | Arranca el modo foco con lo de hoy |
| `Ctrl K` | Buscar en todo, incluso lo completado |
| `Ctrl Z` | Deshacer |
| `?` | Ver los atajos |

## Dónde viven los datos

En tu navegador (IndexedDB): por eso abre instantánea y funciona sin internet. Para tener lo mismo
en dos computadoras se conecta Supabase — diez minutos, explicados en [SUPABASE.md](SUPABASE.md).
Sin eso funciona igual, local.

En el menú `···` del sidebar está **Exportar copia**: un `.json` con las imágenes y archivos adentro.

## Correrlo

```bash
npm install
npm run dev
```

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind v4**, con los tokens en [`globals.css`](src/app/globals.css)
- **Motion** para las animaciones
- **IndexedDB** a mano ([`src/lib/idb.ts`](src/lib/idb.ts)), sin dependencias
- **Supabase** opcional para sincronizar ([`src/lib/sync.tsx`](src/lib/sync.tsx))

### Cómo está organizado

El dominio va en español (`Tarea`, `Proyecto`, `prioridad`) y la infraestructura en inglés (`idb`,
`files`, `sync`).

- [`src/lib/parseo.ts`](src/lib/parseo.ts) — el lenguaje natural del campo de agregar.
- [`src/lib/orden.ts`](src/lib/orden.ts) — cómo se ordena una lista: primero lo atrasado, después
  por prioridad, después por fecha, al final el orden manual. Sin puntajes escondidos.
- [`src/lib/store.tsx`](src/lib/store.tsx) — estado, persistencia y las migraciones.
- [`src/lib/fechas.ts`](src/lib/fechas.ts) — fechas como texto `"AAAA-MM-DD"`, nunca `Date`.

### Decisiones que no se ven en el código

- **Nada se esconde solo.** Una versión anterior de esta app ocultaba tareas y decidía por vos con
  un motor de puntajes. Se sentía todo en el aire: nunca sabías qué había. Ahora cada tarea tiene
  un lugar visible y el orden se explica solo mirando la fila.
- **Las fechas son strings.** `new Date("2026-08-03")` se lee como UTC y en Argentina cae un día
  antes.
- **Lo atrasado no se muestra en rojo**, se muestra en ámbar y con un botón para pasarlo a hoy de
  una. No hay contadores de culpa en ningún lado.
- **La cola del modo foco se congela al empezar.** Si se recalculara, completar una tarea correría
  la lista y saltaría dos posiciones de golpe.
- **Borrar un proyecto no borra sus tareas**: vuelven a la Bandeja. Borrar una sección tampoco: las
  tareas quedan sin agrupar.
- **Las migraciones no pierden nada.** Del tablero original (columnas → proyectos) y del sistema de
  foco (etiquetas → proyectos, clave → prioridad 1). Las versiones viejas quedan intactas en sus
  propias claves de IndexedDB.
