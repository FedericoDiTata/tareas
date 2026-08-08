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

**Las vistas son cuatro y ninguna esconde nada:**

| | |
| --- | --- |
| **Hoy** | Lo de hoy y lo que quedó de antes. Un botón pasa todo lo atrasado a hoy. |
| **Tramos** | Una tarea puede ocupar varios días: en el panel, abajo de *Cuándo*, está *Hasta*. |
| **Calendario** | En **agenda** (día por día, con su campo para agregar) o en **mes** (la grilla entera, arrastrando tareas de un día a otro). |
| **Bandeja** | Lo que anotaste sin proyecto ni fecha, más lo que completaste desde ahí. |
| **Proyectos** | Los que crees vos, en **tablero** por secciones o en **completadas**. |

**Un proyecto es un tablero.** Las secciones son columnas y las tareas se arrastran de una a otra;
cada columna tiene su campo para agregar y se reordenan arrastrándolas de la agarradera del
encabezado. No hay vista de lista: dos formas de mirar lo mismo era una decisión más para tomar
cada vez que entrabas.

**Una sección se puede completar.** Un cuatrimestre que terminó, un cliente al que dejaste de
darle servicios: la sección sale del tablero pero no se borra, y todo lo que hiciste ahí sigue en
Completadas. Si quedaban tareas abiertas te pregunta qué hacer con ellas —darlas por terminadas o
mandarlas al Backlog— porque no pueden quedar en una columna que ya no se ve. Desde Completadas se
vuelve a abrir cuando haga falta.

Lo que todavía no está en ninguna sección cae en el **Backlog**, la primera columna, con su
cartelito "sin sección". No es un limbo silencioso: si algo está ahí se ve que está ahí, y se
arrastra a la columna que corresponda.

**Lo completado vive adentro de su proyecto**, en la segunda solapa. Cada tarea terminada muestra el
día y la hora, en qué sección estaba y cuánto foco le pusiste; cada día, cuánto foco se fue a ese
proyecto. Arriba hay un filtro por sección —incluidas las completadas, marcadas con un tilde— que
es como se lee de verdad: *qué hice con este cliente*, *qué hice en esta materia*. No hay una vista
global de completadas: "qué hice acá" es una pregunta sobre el proyecto, no sobre la app. Lo de la
Bandeja se ve en la Bandeja, con el mismo formato.

**Lo que lleva varios días no es una fecha, es un tramo.** En el panel de la tarea, abajo de
*Cuándo*, aparece *Hasta*: con eso la tarea ocupa todos los días del tramo. En el calendario se ve
en cada uno de ellos —el primer día con su punto de prioridad, los siguientes más apagados y con
una marca al costado— porque si sólo apareciera el primero, el resto de la semana parecería libre.
Arrastrarla en el calendario corre el tramo entero sin cambiar cuánto dura, y no cuenta como
atrasada hasta que pasa el último día.

## El Diario

La sexta pantalla no es de tareas. Es un cuaderno para escribir el día a día: arriba está **Hoy**
con el cursor listo, y abajo los días anteriores, cada uno a un click. Se guarda solo mientras
escribís.

Sólo se ven **hoy y los días que tienen algo escrito**. Los días vacíos no aparecen: un cuaderno no
tiene páginas en blanco entre medio.

Cada día acepta **papelitos**: el botón de la esquina te pega uno en ese día, con su color y su
inclinación. Pegando una imagen con Ctrl+V queda como papelito también. Los papelitos viven en el
día, como un post-it sobre la página de un cuaderno — no hay un lienzo aparte, porque escribir y
pegar son la misma actividad y separarlas en dos pantallas las convertía en dos.

**Importar** trae un diario viejo desde un `.txt` o `.md`. Parte el archivo por encabezados de fecha
—`Jueves 01/01`, `01/01`, `1/1/2026`, `12-08-26`— y arma un día con todo lo que hay debajo de cada
uno. Si el archivo no aclara el año, lo toma de un título tipo `Diario 2026` o del año actual. Nunca
pisa un día que ya tenga texto escrito en la app.

## El modo foco

Es lo que hace distinta a esta app. Desde *Hoy* (o desde un proyecto) apretás **Modo foco** y la
pantalla se vacía: queda una tarea, sus pasos y un cronómetro.

Lo importante no es el cronómetro sino el **encadenado**: cuando terminás una, te ofrece la
siguiente sin volver a la lista. Volver a la lista es donde se corta el envión y arranca de nuevo la
duda de por dónde seguir.

Tres detalles pensados para eso:

- Si la tarea no tiene pasos, antes de arrancar te hace **una sola pregunta**: *¿cuál es el primer
  paso concreto?* No arrancás "el proyecto", arrancás "abrir el archivo y escribir el título".
- El cronómetro cuenta **para arriba**. Una cuenta regresiva es presión; un cronómetro que sube es
  un dato. Los minutos quedan sumados en la tarea. El anillo alrededor del número marca el minuto
  en curso: da la sensación de reloj andando sin poner un límite. Se puede pausar con `Espacio`.
- Abajo queda la **barra de la sesión**: un tramo por tarea, para saber cuánto falta sin tener que
  volver a la lista. Al final la sesión te muestra qué sacaste adelante.

### Dónde queda anotado

Cada sesión queda registrada, y se puede leer desde dos lados:

- En el **Diario**, en el día que fue: a qué hora arrancaste, cuánto duró y qué tocaste, con un
  tilde en lo que terminaste. Un día con foco aparece en el diario aunque no hayas escrito nada.
- En **cada proyecto → Completadas**: cuánto foco se le puso a cada tarea y cuánto al proyecto ese
  día.

No hay pantalla de estadísticas ni rachas: el registro es parte de lo que pasó ese día, no una
métrica para perseguir.

## Atajos

| Tecla | Qué hace |
| --- | --- |
| `Enter` | Guarda la tarea y te deja escribir la siguiente |
| `F` | Arranca el modo foco con lo de hoy |
| `Enter` (en foco) | Terminé esta tarea, dame la siguiente |
| `→` (en foco) | Saltar a la siguiente sin completarla |
| `Espacio` (en foco) | Pausar o seguir el cronómetro |
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
- **Las sesiones de foco se guardan tarea por tarea, mientras pasan.** Si cerrás la pestaña a la
  mitad, lo que ya hiciste quedó anotado igual. Se guardan en segundos (una sesión de 40 segundos
  también pasó) y con el título copiado adentro, así el registro sigue entendiéndose aunque después
  borres la tarea. Un registro no se deshace: `Ctrl Z` no lo toca.
- **Borrar un proyecto no borra sus tareas**: vuelven a la Bandeja. Borrar una sección tampoco: las
  tareas vuelven al Backlog.
- **Completar una sección no es borrarla.** Es lo que hace que el registro sirva: el cuatrimestre
  pasado sigue estando. Y lo que quedaba abierto adentro no puede volverse invisible, así que la
  app obliga a decidir: se termina o vuelve al Backlog. Si una tarea igual queda apuntando a una
  sección completada —porque la reabriste desde Completadas—, el tablero la muestra en el Backlog.
- **Las migraciones no pierden nada.** Del tablero original (columnas → proyectos) y del sistema de
  foco (etiquetas → proyectos, clave → prioridad 1). Las versiones viejas quedan intactas en sus
  propias claves de IndexedDB.
