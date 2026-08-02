# Escritorio

Un lugar para vaciar la cabeza. Abrís, escribís, y eso deja de dar vueltas.

No es un gestor de tareas. Es un escritorio: un tablero con las columnas que vos quieras, post-its que
se pegan donde se te cante y un canvas infinito para ideas que no entran en ninguna lista.

## La idea

Tres reglas guiaron cada decisión:

1. **Menos de 5 segundos entre abrir y escribir.** La barra de captura está siempre arriba: escribís,
   Enter, listo. No hay que elegir proyecto, ni etiqueta, ni prioridad.
2. **Menos funciones, mejor.** Todo lo que una tarjeta puede tener (descripción, checklist, links,
   imágenes, archivos, notas) aparece sólo cuando lo pedís. Una tarjeta puede ser nada más que un título.
3. **Que se sienta físico.** Los post-its están torcidos, tienen sombra y doblez, se agarran y se
   mueven. No hay diálogos de confirmación por todos lados.

## Las dos vistas

**Tablero** — Columnas que creás, renombrás, pintás y arrastrás. Las tarjetas se mueven entre columnas
con el mouse. Los post-its también viven acá, flotando por encima, como papelitos sobre el escritorio.

**Escritorio** — Un canvas infinito. Doble click en cualquier lado y ya estás escribiendo. Pegás
capturas con Ctrl+V, arrastrás imágenes desde el explorador, ponés frases grandes, objetivos con
checkbox y conectás elementos entre sí para armar un mapa mental.

## Atajos

| Tecla | Qué hace |
| --- | --- |
| `N` | Saltar a la barra de captura |
| `Ctrl K` o `/` | Buscar en todo (tarjetas, notas, checklists, links, post-its) |
| `1` / `2` | Tablero / Escritorio |
| `Ctrl Z` | Deshacer lo último que borraste |
| `?` | Ver todos los atajos |
| `Esc` | Cerrar lo que esté abierto |

En el escritorio: doble click crea un post-it, arrastrar el fondo mueve la vista, `Ctrl + rueda` hace zoom.

## Dónde viven los datos

Todo queda en **tu navegador** (IndexedDB): el tablero, los post-its, las imágenes y los archivos.
No hay servidor, no hay cuenta, no hay nadie mirando. La contra es que los datos son de esa
computadora y ese navegador.

Para mover todo a otra máquina (o tener un respaldo), en el menú `···` está **Exportar copia**: baja un
único `.json` que incluye las imágenes y los archivos adentro. **Importar copia** lo restaura entero.

Si en algún momento querés que se sincronice entre dispositivos, el único archivo que hay que tocar es
[`src/lib/store.tsx`](src/lib/store.tsx): ahí está toda la persistencia.

## Correrlo

```bash
npm install
npm run dev     # http://localhost:3000
```

Para producción:

```bash
npm run build
npm start
```

Es una app 100% estática, así que se sube a Vercel sin configurar nada (importar el repo y listo).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind v4** para los estilos, con un sistema de tokens en [`globals.css`](src/app/globals.css)
  (claro/oscuro y 8 colores de acento definidos una sola vez)
- **Motion** para las animaciones
- **dnd-kit** para el drag & drop del tablero
- **IndexedDB** a mano ([`src/lib/idb.ts`](src/lib/idb.ts)), sin dependencias

### Cómo está organizado

```
src/
  app/         layout, página y sistema de diseño
  components/  TopBar, Board, Column, CardChip, CardModal, Desk, StickyNote, SearchPalette
  lib/         types, store (estado + persistencia), idb, files (blobs), search, backup
```

Un par de decisiones que no se ven leyendo el código:

- **El arrastre de post-its no usa dnd-kit.** Es pointer events + `transform` directo, para que se
  mueva exactamente con el dedo. dnd-kit se usa sólo donde hay listas ordenadas (el tablero).
- **La cámara del canvas vive en estado local** y baja al store con retraso: si guardara cada frame,
  el pan iría a los tirones.
- **Las imágenes se comprimen antes de guardarse** (máx. 1600px, webp). Una foto de celular de 4 MB no
  se ve mejor y hace la app más lenta.
- **Los textos se guardan con debounce**, no en cada tecla.
