# Escritorio

Un sistema de foco. No es un gestor de tareas: no administra proyectos, administra atención.

La app existe para contestar sola tres preguntas, para no tener que contestarlas vos cada mañana:

- ¿Qué debería estar haciendo ahora?
- ¿Qué es realmente importante esta semana?
- ¿Qué puede esperar?

## La idea

El problema no es guardar cosas, es elegir. Cuando hay diez frentes abiertos, lo que falla no es la
ejecución sino el criterio. Una app de tareas clásica empeora eso: te muestra las diez y te pide que
elijas justo cuando no podés.

Entonces el trabajo de esta app no es guardar. **Es producir el criterio.** Abrís y ya hay una
decisión tomada, con el motivo escrito abajo.

## Las tres capas

**Ahora** — una sola cosa, la que el motor eligió, con la razón por la que es esa. Tres respuestas
posibles: *Empezar*, *Ahora no*, *Listo*.

**Esta semana** — cinco como máximo. El techo es la función, no una limitación: una lista sin límite
es exactamente lo que paraliza. Para meter una sexta hay que sacar una.

**El resto** — todo lo demás, ordenado por el motor, escondido detrás de un click. Existe, está
guardado, no lo vas a perder. No lo ves de frente.

Más dos lugares de servicio: **Bandeja** (lo capturado sin clasificar) y **En pausa** (lo que la app
dejó descansar sola).

Entre capas no se arrastra nada. Las mueve el motor. Vos intervenís una vez por semana, un minuto.

## El motor

Cada cosa saca un puntaje y, sobre todo, un motivo en una línea: un ranking que no se puede explicar
genera desconfianza, y la desconfianza hace que abras la app y no le creas. Está entero en
[`src/lib/foco.ts`](src/lib/foco.ts).

| Señal | Peso |
| --- | --- |
| Vence hoy / mañana | +55 / +50 |
| Vence en 2-3 días | +30 |
| Ya venció | +40 (alto, pero no infinito y sin rojo) |
| Elegida para esta semana | +25 |
| Empezada y sin terminar | +15 |
| Es clave y hace +4 días que no la tocás | +12 |
| Le dijiste "ahora no" hoy | −30 |
| "Ahora no" en días anteriores | −3 cada uno |
| Día de poca cabeza: corta / larga | +20 / −15 |

Vos mandás sobre el motor cuando querés: *fijar* algo lo pone primero por hoy.

### El silencio automático

Una cosa que salteaste cuatro veces en días distintos y no tiene fecha te está diciendo algo. La app
deja de ofrecerla y pregunta una sola vez si sigue viva. Es la regla que evita que el sistema te
repita lo mismo hasta hacerte sentir en falta.

## Las reglas anti-culpa

Van en el código, no son decoración:

- Nada en rojo. Nada dice "atrasado": dice "era para el martes", en gris.
- Sin rachas, sin porcentajes, sin "3 de 12", sin contadores de pendientes.
- El día no cierra con lo que te faltó, cierra con lo que hiciste.
- *Soltala* es una decisión sana, no un fracaso.
- Nada se borra solo. Nunca.

## Las pantallas

**Ahora** · **Semana** · **Horizonte** · **Escritorio**, y nada más en la barra.

**Foco** — apretás *Empezar* y la pantalla se vacía hasta que queda una sola frase, con un
cronómetro que cuenta para arriba (una cuenta regresiva es presión; un cronómetro que sube es un
dato). Si la cosa no tiene pasos, te hace una única pregunta: *¿cuál es el primer paso concreto?*

**La revisión de un minuto** — el único momento de organización que existe. Aparece sola cuando hace
falta, muestra seis cosas como mucho, de a una, con botones grandes. Es salteable.

**Horizonte** — de sólo lectura. Adelante lo poco que tiene fecha, atrás lo que ya hiciste, en el día
en que lo terminaste. Lo hecho no muere: sale del flujo pero queda en el registro.

**Escritorio** — el canvas infinito de siempre. Doble click y escribís, Ctrl+V pega capturas, se
conectan elementos para armar mapas mentales. Es el lugar para vaciar la cabeza sin ordenar nada.

## Capturar

`Ctrl N` en cualquier momento. Escribís, Enter, y seguís. **Cero preguntas**: ni fecha, ni prioridad,
ni dónde va. Todo eso se decide después, de a poco, en la revisión.

## Atajos

| Tecla | Qué hace |
| --- | --- |
| `Ctrl N` | Anotar algo |
| `Ctrl K` | Buscar, incluso en lo terminado |
| `1` `2` `3` `4` | Ahora · Semana · Horizonte · Escritorio |
| `Ctrl Z` | Deshacer |
| `?` | Ver los atajos |

## Dónde viven los datos

En tu navegador (IndexedDB): por eso abre instantánea y funciona sin internet. Para tener lo mismo en
dos computadoras se conecta Supabase — diez minutos, explicados en [SUPABASE.md](SUPABASE.md). Sin
eso la app funciona igual, local.

En el menú `···` está **Exportar copia**: un `.json` con las imágenes y archivos adentro.

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

El dominio va en español (`Cosa`, `motivo`, `saltos`, `puntuar`) y la infraestructura en inglés
(`idb`, `files`, `sync`). Suena raro escrito, pero los nombres del dominio son los del producto: si
el motor habla de saltos, el código también.

- [`src/lib/foco.ts`](src/lib/foco.ts) — el motor. Si algo se siente mal priorizado, se toca acá.
- [`src/lib/types.ts`](src/lib/types.ts) — el modelo.
- [`src/lib/store.tsx`](src/lib/store.tsx) — estado, persistencia y la migración del tablero viejo.
- [`src/lib/fechas.ts`](src/lib/fechas.ts) — fechas como texto `"AAAA-MM-DD"`, nunca `Date`.

### Decisiones que no se ven en el código

- **La migración no pierde nada.** Las tarjetas del tablero viejo conservan todo; la estrella pasa a
  ser "esto me importa", el nombre de la columna sobrevive como etiqueta y el resto entra a la
  bandeja. El estado viejo queda intacto en su propia clave de IndexedDB, como red.
- **Las fechas son strings.** `new Date("2026-08-03")` se lee como UTC y en Argentina cae un día
  antes.
- **La cola de la revisión se arma una sola vez.** Si se recalculara con cada respuesta, las
  preguntas se moverían debajo del dedo.
- **El fondo no se mueve.** Un fondo animado es ruido, y acá el objetivo es que la pantalla esté
  callada.
