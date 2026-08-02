# Sincronizar entre computadoras

Sin esto, la app funciona igual pero los datos quedan en cada navegador. Con esto, el mismo tablero
aparece en las dos computadoras y se actualiza solo.

Es gratis y son 10 minutos. Hay que hacerlo **una sola vez**.

---

## 1. Crear el proyecto

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (podés entrar con GitHub).
2. **New project**. Ponele el nombre que quieras (`escritorio`), elegí una contraseña para la base
   (guardala, aunque no la vas a necesitar) y la región **South America (São Paulo)**.
3. Esperá unos dos minutos a que termine de crearse.

## 2. Crear la tabla y el lugar de las imágenes

En el menú de la izquierda entrá a **SQL Editor** → **New query**, pegá esto tal cual y apretá **Run**:

```sql
-- El tablero completo, una fila por persona
create table if not exists public.spaces (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  doc        jsonb not null,
  device     text,
  updated_at timestamptz not null default now()
);

alter table public.spaces enable row level security;

-- Cada uno ve y escribe solamente lo suyo
drop policy if exists "espacio propio" on public.spaces;
create policy "espacio propio" on public.spaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Para que los cambios lleguen a la otra compu en el momento
alter publication supabase_realtime add table public.spaces;

-- Las imágenes y archivos
insert into storage.buckets (id, name, public)
values ('escritorio', 'escritorio', false)
on conflict (id) do nothing;

drop policy if exists "archivos propios" on storage.objects;
create policy "archivos propios" on storage.objects
  for all
  using (bucket_id = 'escritorio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'escritorio' and (storage.foldername(name))[1] = auth.uid()::text);
```

Si dice `success`, listo.

## 3. Decirle a Supabase desde dónde vas a entrar

**Authentication** → **URL Configuration**:

- **Site URL**: la dirección de tu app en Vercel, por ejemplo `https://tareas-fede.vercel.app`
- **Redirect URLs**: agregá también `http://localhost:3000` (para cuando la abras en tu compu)

Sin esto, el link que llega por mail no te deja entrar.

## 4. Copiar los dos datos

Son dos cosas y están en **pantallas distintas** del panel:

**La dirección del proyecto** — **Project Settings** (el engranaje) → **Data API** → **Project URL**.
Es algo como `https://abcdefgh.supabase.co`. No es una clave ni aparece en la pantalla de API Keys.

> Atajo: esa dirección también sale de la barra del navegador. Si estás en
> `supabase.com/dashboard/project/abcdefgh`, tu URL es `https://abcdefgh.supabase.co`.

**La clave pública** — **Project Settings** → **API Keys**, pestaña **Publishable and secret API
keys** → **Publishable key**, la que empieza con `sb_publishable_...`.

> También sirve la clave vieja: pestaña **Legacy anon, service_role API keys** → **anon public**, un
> texto largo que empieza con `eyJ...`. Cualquiera de las dos funciona.

⚠️ **Nunca uses la `service_role` ni la `secret`.** Esas se saltean todas las reglas de seguridad, y
como esta app corre en el navegador, cualquiera que entre podría verla y leer o borrar todo. La
publishable es pública a propósito: no sirve para nada sin estar logueado con tu mail.

## 5. Ponerlas en Vercel

En tu proyecto de Vercel → **Settings** → **Environment Variables**, agregá las dos:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | el Project URL del paso 4 (`https://...supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la clave `sb_publishable_...` |

Si preferís usar la clave vieja `anon public`, el nombre de la variable es
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Con una de las dos alcanza.

Después **Deployments** → en el último, `···` → **Redeploy**. Las variables sólo entran en un
deploy nuevo.

Para usarlas también en tu computadora, creá un archivo `.env.local` en la carpeta del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## 6. Entrar

Abrí la app: arriba a la derecha, al lado del sol/luna, hay un ícono de nube con un puntito.

1. Click en la nube → poné tu mail → **Mandarme el link**.
2. Te llega un mail de Supabase. Abrí el link **desde esa misma computadora**.
3. El puntito de la nube se pone verde. Ya está.
4. Repetí lo mismo en la otra computadora, con **el mismo mail**.

La primera vez que conectes la segunda computadora te va a preguntar cuál tablero conservar
(el de la nube o el que tengas ahí). Elegí **el de la nube**.

---

## Cómo funciona

- Todo se sigue guardando primero en tu navegador, así que la app abre instantánea y funciona sin
  internet. La nube es una copia que se actualiza sola, unos segundos después de cada cambio.
- Si tenés las dos computadoras abiertas al mismo tiempo, los cambios de una aparecen en la otra en
  el momento.
- Gana siempre el último cambio. Si editaste en una computadora mientras la otra estaba sin internet,
  cuando esa vuelva puede pisar lo que hiciste. Es difícil que pase usándolas de a una, pero es la
  regla: **último que escribe, manda**.
- El botón de la nube te deja sincronizar a mano y salir de la sesión. Salir **no** borra nada de tu
  computadora.
- Exportar copia sigue estando en el menú `···`, y es la única forma de tener un respaldo que no
  dependa de nada más.
