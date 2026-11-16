import { describe, expect, it } from "vitest";
import { bandasImpuestos, impuestosEnHorizonte, MAX_DIAS_BANDA, type ImpuestoProyeccion } from "../impuestos";
import type { Movimiento } from "../tipos";

const mov = (tipo: Movimiento["tipo"], concepto: string, fecha: string): Movimiento => ({
  id: concepto + fecha,
  tipo,
  concepto,
  monto: 1000,
  moneda: "ARS",
  fecha,
  puntualidad: null,
});

const imp = (dia: number, concepto = "Imp"): ImpuestoProyeccion => ({
  dia,
  fecha: "2026-12-01",
  concepto,
  monto: 1000,
  moneda: "ARS",
});

describe("impuestosEnHorizonte", () => {
  const hoy = "2026-11-16";

  it("solo toma movimientos de tipo impuesto y los ordena por fecha", () => {
    const ms = [
      mov("impuesto", "Ganancias", "2026-12-02"),
      mov("pago", "Proveedor", "2026-11-20"),
      mov("impuesto", "IVA", "2026-11-28"),
    ];
    const res = impuestosEnHorizonte(ms, hoy, 90);
    expect(res.map((i) => i.concepto)).toEqual(["IVA", "Ganancias"]);
    expect(res.map((i) => i.dia)).toEqual([12, 16]);
  });

  it("descarta impuestos fuera del horizonte", () => {
    const ms = [mov("impuesto", "IVA", "2026-11-28"), mov("impuesto", "IIBB", "2027-03-01")];
    const res = impuestosEnHorizonte(ms, hoy, 90);
    expect(res).toHaveLength(1);
  });

  it("los vencidos caen el día 0", () => {
    const res = impuestosEnHorizonte([mov("impuesto", "IVA", "2026-11-10")], hoy, 90);
    expect(res[0].dia).toBe(0);
  });
});

describe("bandasImpuestos", () => {
  it("no forma banda con un solo impuesto", () => {
    expect(bandasImpuestos([imp(5, "IVA")])).toEqual([]);
  });

  it("forma banda con dos impuestos a hasta 12 días de distancia", () => {
    const bandas = bandasImpuestos([imp(12, "IVA"), imp(16, "Ganancias")]);
    expect(bandas).toHaveLength(1);
    expect(bandas[0]).toMatchObject({ desde: 12, hasta: 16 });
    expect(bandas[0].impuestos.map((i) => i.concepto)).toEqual(["IVA", "Ganancias"]);
  });

  it(`no forma banda si la separación supera ${MAX_DIAS_BANDA} días`, () => {
    expect(bandasImpuestos([imp(0, "IVA"), imp(13, "Ganancias")])).toEqual([]);
  });

  it("encadena una corrida de 3 impuestos con separaciones de hasta 12 días", () => {
    const bandas = bandasImpuestos([imp(0, "IVA"), imp(10, "Ganancias"), imp(20, "IIBB")]);
    expect(bandas).toHaveLength(1);
    expect(bandas[0].desde).toBe(0);
    expect(bandas[0].hasta).toBe(20);
    expect(bandas[0].impuestos).toHaveLength(3);
  });

  it("cierra la banda cuando la separación se corta: IVA y Ganancias juntos, IIBB aislado", () => {
    const bandas = bandasImpuestos([imp(0, "IVA"), imp(10, "Ganancias"), imp(25, "IIBB")]);
    expect(bandas).toHaveLength(1);
    expect(bandas[0]).toMatchObject({ desde: 0, hasta: 10 });
    expect(bandas[0].impuestos.map((i) => i.concepto)).toEqual(["IVA", "Ganancias"]);
  });
});
