// Lógica de vencimientos impositivos para el gráfico de flujo de caja.
// Módulo puro (sin React ni Chart.js) para poder testearlo con vitest.

import { diaDelMovimiento } from "./proyeccion";
import type { Movimiento, Moneda } from "./tipos";

/** Separación máxima (en días) entre vencimientos para considerarlos un período sensible. */
export const MAX_DIAS_BANDA = 12;

export interface ImpuestoProyeccion {
  /** Día de la proyección en que vence (0 = hoy). */
  dia: number;
  /** Fecha de vencimiento, aaaa-mm-dd. */
  fecha: string;
  /** Etiqueta del impuesto (ej. "IVA", "Ganancias"). */
  concepto: string;
  monto: number;
  moneda: Moneda;
}

export interface BandaImpuestos {
  /** Primer día del período sensible. */
  desde: number;
  /** Último día del período sensible. */
  hasta: number;
  impuestos: ImpuestoProyeccion[];
}

/** Impuestos que vencen dentro del horizonte, ordenados por fecha. Los vencidos caen el día 0. */
export function impuestosEnHorizonte(
  movimientos: Movimiento[],
  hoy: string,
  horizonte: number,
): ImpuestoProyeccion[] {
  return movimientos
    .filter((m) => m.tipo === "impuesto")
    .map((m) => ({
      dia: diaDelMovimiento(m, hoy),
      fecha: m.fecha,
      concepto: m.concepto,
      monto: m.monto,
      moneda: m.moneda,
    }))
    .filter((i) => i.dia >= 0 && i.dia <= horizonte)
    .sort((a, b) => a.dia - b.dia);
}

/**
 * Agrupa los impuestos en bandas de "períodos sensibles": corridas de 2 o más vencimientos
 * donde cada par consecutivo dista como máximo MAX_DIAS_BANDA días. Un impuesto aislado
 * no forma banda (igual recibe su línea punteada en el gráfico).
 */
export function bandasImpuestos(impuestos: ImpuestoProyeccion[]): BandaImpuestos[] {
  const bandas: BandaImpuestos[] = [];
  let actual: ImpuestoProyeccion[] = [];

  const cerrar = () => {
    if (actual.length >= 2) {
      bandas.push({ desde: actual[0].dia, hasta: actual[actual.length - 1].dia, impuestos: actual });
    }
    actual = [];
  };

  for (const imp of impuestos) {
    const anterior = actual[actual.length - 1];
    if (anterior && imp.dia - anterior.dia > MAX_DIAS_BANDA) cerrar();
    actual.push(imp);
  }
  cerrar();
  return bandas;
}
