-- ==========================================================
-- Reserva temporal de mesas (30 minutos) mientras el cliente paga en Stripe.
-- Pegar UNA vez en el SQL Editor de Supabase (después de 1-crear-tabla.sql).
--  - La página llama a reservar_mesa() antes de mandar al cliente a Stripe.
--  - Si paga, el webhook la pasa a 'vendida' (no cambia nada en el webhook).
--  - Si no paga, a los 30 min la reserva vence y la mesa vuelve a verse libre.
-- ==========================================================

-- Fecha de vencimiento de la reserva (solo se usa con estado 'reservando')
alter table public.mesas add column if not exists expira_en timestamptz;

-- Lectura pública: las reservas vencidas ya no se ven (la mesa aparece libre)
drop policy if exists "lectura publica de mesas" on public.mesas;
create policy "lectura publica de mesas"
  on public.mesas for select
  using (estado <> 'reservando' or expira_en > now());

-- Aparta una mesa por 30 minutos. Devuelve true si se pudo, false si ya está ocupada.
-- Nunca pisa una mesa 'vendida' o 'bloqueada'.
create or replace function public.reservar_mesa(p_evento text, p_numero int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_evento !~ '^[a-z0-9-]{1,40}$' or p_numero < 1 or p_numero > 54 then
    return false;
  end if;

  -- libera la reserva vencida de esta mesa, si la hay
  delete from public.mesas
   where evento = p_evento and numero = p_numero
     and estado = 'reservando' and expira_en <= now();

  insert into public.mesas (evento, numero, estado, expira_en)
  values (p_evento, p_numero, 'reservando', now() + interval '30 minutes')
  on conflict (evento, numero) do nothing;

  return found;
end;
$$;

-- Solo se puede ejecutar la función (con la clave anon); la tabla sigue siendo de solo lectura.
revoke all on function public.reservar_mesa(text, int) from public;
grant execute on function public.reservar_mesa(text, int) to anon;

-- Para ver las reservas activas:
--   select evento, numero, expira_en from public.mesas
--   where estado = 'reservando' and expira_en > now() order by evento, numero;
