-- ==========================================================
-- Tabla de mesas ocupadas de Plaza Malloy Arena
-- Cada fila = una mesa NO disponible (vendida o bloqueada) de un evento.
-- ==========================================================
create table if not exists public.mesas (
  id          bigint generated always as identity primary key,
  evento      text not null,                 -- 'tamaulipas' | 'fantasma' | 'rienda' | 'zenda'
  numero      int  not null,                 -- 1 a 54
  estado      text not null default 'vendida', -- 'vendida' (pago) | 'bloqueada' (manual)
  email       text,                          -- correo del cliente (si vino del pago)
  created_at  timestamptz default now(),
  unique (evento, numero)                     -- no se repite la misma mesa por evento
);

-- Seguridad: activa RLS
alter table public.mesas enable row level security;

-- Lectura pública: las páginas pueden VER las mesas ocupadas (con la clave anon)
drop policy if exists "lectura publica de mesas" on public.mesas;
create policy "lectura publica de mesas"
  on public.mesas for select
  using (true);

-- No se permite escribir desde el cliente (solo el webhook, que usa la service key).
