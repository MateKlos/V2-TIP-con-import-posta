-- Clasificación explícita de impuestos y compatibilidad con movimientos anteriores.
alter table public.movimientos
  add column if not exists impuesto_etiqueta text
  check (impuesto_etiqueta in ('IVA', 'Imp. Ganancias', 'Impuesto al Cheque'));

-- Migrar conceptos antiguos conocidos una sola vez; los nuevos "Otros" quedan NULL.
update public.movimientos
set impuesto_etiqueta = case
  when lower(concepto) like 'iva%' or lower(concepto) = 'impuesto al valor agregado' then 'IVA'
  when lower(concepto) like 'ganancias%' or lower(concepto) like 'impuesto de ganancias%' then 'Imp. Ganancias'
  when lower(concepto) like 'impuesto al cheque%' or lower(concepto) like 'cheque%' or (lower(concepto) like 'débitos y créditos%' or lower(concepto) like 'debitos y creditos%') then 'Impuesto al Cheque'
  else null
end
where tipo = 'impuesto' and impuesto_etiqueta is null;

-- Mantener la RPC de importación compatible con la nueva columna.
create or replace function public.importar_movimientos(p_movimientos jsonb, p_reemplazar boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  select id into v_empresa from public.empresas where user_id = (select auth.uid());
  if v_empresa is null then
    raise exception 'El usuario no tiene empresa';
  end if;
  if jsonb_array_length(p_movimientos) > 2000 then
    raise exception 'Demasiados movimientos';
  end if;

  if p_reemplazar then
    delete from public.movimientos where empresa_id = v_empresa;
  end if;

  insert into public.movimientos (id, empresa_id, tipo, concepto, impuesto_etiqueta, monto, moneda, fecha, puntualidad)
  select
    (m ->> 'id')::uuid,
    v_empresa,
    m ->> 'tipo',
    m ->> 'concepto',
    nullif(m ->> 'impuesto_etiqueta', ''),
    (m ->> 'monto')::numeric,
    m ->> 'moneda',
    (m ->> 'fecha')::date,
    nullif(m ->> 'puntualidad', '')::smallint
  from jsonb_array_elements(p_movimientos) as m
  on conflict (id) do nothing;
end;
$$;

revoke execute on function public.importar_movimientos(jsonb, boolean) from public, anon;
grant execute on function public.importar_movimientos(jsonb, boolean) to authenticated;
