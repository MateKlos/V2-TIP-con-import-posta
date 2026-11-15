-- Amplía las etiquetas impositivas sin depender de volver a ejecutar 0002.
alter table public.movimientos
  drop constraint if exists movimientos_impuesto_etiqueta_check;

alter table public.movimientos
  add constraint movimientos_impuesto_etiqueta_check
  check (impuesto_etiqueta in ('IVA', 'Imp. Ganancias', 'Impuesto al Cheque', 'Ingresos Brutos'));

update public.movimientos
set impuesto_etiqueta = 'Ingresos Brutos'
where tipo = 'impuesto'
  and impuesto_etiqueta is null
  and (lower(concepto) like '%ingresos brutos%' or lower(concepto) like '%iibb%');
