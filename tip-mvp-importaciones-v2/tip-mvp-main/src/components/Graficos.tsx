"use client";

import { useRef } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import type { KeyboardEvent } from "react";
import { Line } from "react-chartjs-2";
import { fechaCorta, sumarDias } from "@/lib/tesoreria/fechas";
import { fmtARS, fmtMillones, fmtMonto } from "@/lib/tesoreria/formato";
import { bandasImpuestos, type ImpuestoProyeccion } from "@/lib/tesoreria/impuestos";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const VIOLETA = "#5449DD";
const APAGADO = "#7A7398";
const AMBAR = "#D97706";

const etiquetas = (hoy: string, n: number) => Array.from({ length: n }, (_, t) => fechaCorta(sumarDias(hoy, t)));

function opciones(filtrarTooltip?: (i: number) => boolean): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: filtrarTooltip ? (i) => filtrarTooltip(i.datasetIndex) : undefined,
        callbacks: { label: (c) => `${c.dataset.label}: ${fmtARS(c.parsed.y ?? 0)}` },
      },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8, color: APAGADO, maxRotation: 0 }, grid: { display: false } },
      y: { ticks: { color: APAGADO, callback: (v) => fmtMillones(Number(v)), maxTicksLimit: 6 }, grid: { color: "#ECE8F6" } },
    },
  };
}

/**
 * Los períodos sensibles se dibujan sobre el área de la proyección:
 * - sombreado continuo entre el primer y el último vencimiento del grupo;
 * - líneas punteadas solo en los extremos;
 * - etiqueta permanente con el rango de fechas;
 * - al seleccionar un vencimiento intermedio, una guía hasta la curva, sin crear otro punto.
 */
function crearPluginVencimientos(
  hoy: string,
  impuestos: ImpuestoProyeccion[],
  saldos: number[],
): Plugin<"line"> {
  const bandas = bandasImpuestos(impuestos);

  return {
    id: "vencimientos",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const { x } = scales;
      ctx.save();

      bandas.forEach((banda, indice) => {
        const x1 = x.getPixelForValue(banda.desde);
        const x2 = x.getPixelForValue(banda.hasta);
        const izquierda = Math.min(x1, x2);
        const ancho = Math.abs(x2 - x1);

        // El sombreado queda integrado al área de la proyección, detrás de la curva.
        ctx.fillStyle = "rgba(217, 119, 6, 0.12)";
        ctx.fillRect(izquierda, chartArea.top, ancho, chartArea.bottom - chartArea.top);

        // Etiqueta permanente del período, dentro del área sombreada.
        const primero = banda.impuestos[0];
        const ultimo = banda.impuestos[banda.impuestos.length - 1];
        const etiqueta = `Impuestos · ${fechaCorta(primero.fecha)} al ${fechaCorta(ultimo.fecha)}`;
        ctx.font = "600 10px sans-serif";
        const anchoTexto = ctx.measureText(etiqueta).width;
        const cajaAncho = anchoTexto + 12;
        const cajaX = Math.max(chartArea.left + 2, Math.min(izquierda + 3, chartArea.right - cajaAncho - 2));
        const cajaY = chartArea.top + 5 + indice * 21;
        ctx.fillStyle = "rgba(255, 250, 240, 0.94)";
        ctx.fillRect(cajaX, cajaY, cajaAncho, 17);
        ctx.fillStyle = "#9A5700";
        ctx.textBaseline = "middle";
        ctx.fillText(etiqueta, cajaX + 6, cajaY + 8.5);
      });

      // Los extremos de cada período llevan las líneas punteadas.
      // Los impuestos aislados conservan su propia línea.
      const diasMarcados = new Set<number>();
      for (const banda of bandas) {
        diasMarcados.add(banda.desde);
        diasMarcados.add(banda.hasta);
      }
      for (const imp of impuestos) {
        const perteneceABanda = bandas.some((b) => b.impuestos.includes(imp));
        if (!perteneceABanda) diasMarcados.add(imp.dia);
      }

      ctx.strokeStyle = AMBAR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (const dia of diasMarcados) {
        const px = x.getPixelForValue(dia);
        ctx.beginPath();
        ctx.moveTo(px, chartArea.top);
        ctx.lineTo(px, chartArea.bottom);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    },

    // En un vencimiento intermedio, la guía aparece solo al pasar el cursor
    // o al seleccionarlo con el teclado. No se dibuja un punto adicional.
    afterDatasetsDraw(chart) {
      const activo = chart.getActiveElements()[0]?.index;
      if (activo === undefined) return;
      const banda = bandas.find((b) => activo >= b.desde && activo <= b.hasta);
      if (!banda || activo === banda.desde || activo === banda.hasta) return;

      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const px = scales.x.getPixelForValue(activo);
      const valor = saldos[activo];
      if (valor === undefined) return;
      const py = scales.y.getPixelForValue(valor);

      ctx.save();
      ctx.strokeStyle = AMBAR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, Math.max(chartArea.top, Math.min(py, chartArea.bottom)));
      ctx.stroke();
      ctx.restore();
    },
  };
}

/** Saldo proyectado; la zona por debajo de cero se pinta de rojo. */
export function GraficoProyeccion({
  hoy,
  saldos,
  impuestos = [],
}: {
  hoy: string;
  saldos: number[];
  impuestos?: ImpuestoProyeccion[];
}) {
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const bandas = bandasImpuestos(impuestos);
  const base = opciones();

  const seleccionarDia = (dia: number) => {
    const chart = chartRef.current;
    if (!chart || dia < 0 || dia >= saldos.length) return;
    const activos = [{ datasetIndex: 0, index: dia }];
    chart.setActiveElements(activos);
    const punto = chart.getDatasetMeta(0).data[dia];
    if (punto) {
      const posicion = punto.getProps(["x", "y"], true);
      chart.tooltip?.setActiveElements(activos, { x: posicion.x, y: posicion.y });
    }
    chart.update();
  };

  const manejarTeclado = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!impuestos.length) return;
    const chart = chartRef.current;
    if (!chart) return;

    if (event.key === "Escape") {
      chart.setActiveElements([]);
      chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
      chart.update();
      return;
    }

    const actual = chart.getActiveElements()[0]?.index;
    let siguiente: number | null = null;
    if (event.key === "ArrowRight") siguiente = Math.min(saldos.length - 1, (actual ?? -1) + 1);
    if (event.key === "ArrowLeft") siguiente = Math.max(0, (actual ?? saldos.length) - 1);
    if (event.key === "Home") siguiente = 0;
    if (event.key === "End") siguiente = saldos.length - 1;

    if (siguiente !== null) {
      event.preventDefault();
      seleccionarDia(siguiente);
    }
  };

  // El tooltip muestra todos los vencimientos del período al recorrer cualquier día de la banda.
  const opcionesFinales: ChartOptions<"line"> = {
    ...base,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins?.tooltip,
        callbacks: {
          ...(base.plugins?.tooltip?.callbacks ?? {}),
          afterBody: (items) => {
            const dia = items[0]?.dataIndex;
            if (dia === undefined) return [];
            const banda = bandas.find((b) => dia >= b.desde && dia <= b.hasta);
            const lista = banda ? banda.impuestos : impuestos.filter((i) => i.dia === dia);
            if (lista.length === 0) return [];
            const lineas = lista.map((i) => `${i.concepto} · ${fechaCorta(i.fecha)} · ${fmtMonto(i.monto, i.moneda)}`);
            return banda ? ["Período de caja sensible:", ...lineas] : lineas;
          },
        },
      },
    },
  };

  return (
    <div
      className="relative h-64 sm:h-80"
      role="group"
      aria-label="Gráfico del saldo proyectado a 90 días. Usá las flechas izquierda y derecha para recorrer los días y Escape para quitar la selección."
      tabIndex={0}
      onKeyDown={manejarTeclado}
    >
      <Line
        ref={chartRef}
        data={{
          labels: etiquetas(hoy, saldos.length),
          datasets: [
            {
              label: "Saldo proyectado",
              data: saldos,
              borderColor: VIOLETA,
              fill: { target: { value: 0 }, above: "rgba(84,73,221,.10)", below: "rgba(214,69,69,.25)" },
              tension: 0.2,
              pointRadius: 0,
              borderWidth: 2.5,
            },
          ],
        }}
        options={opcionesFinales}
        plugins={impuestos.length > 0 ? [crearPluginVencimientos(hoy, impuestos, saldos)] : []}
      />
    </div>
  );
}

/** Escenario contra la base, con la banda p10–p90 de la simulación. */
export function GraficoEscenario({
  hoy,
  base,
  escenario,
  p10,
  p90,
}: {
  hoy: string;
  base: number[];
  escenario: number[];
  p10: number[];
  p90: number[];
}) {
  return (
    <div className="relative h-64 sm:h-80" role="img" aria-label="Gráfico del escenario contra la proyección base">
      <Line
        data={{
          labels: etiquetas(hoy, base.length),
          datasets: [
            { label: "Simulaciones (90%)", data: p90, borderWidth: 0, pointRadius: 0, backgroundColor: "rgba(84,73,221,.13)", fill: "+1" },
            { label: "Simulaciones (10%)", data: p10, borderWidth: 0, pointRadius: 0 },
            { label: "Base", data: base, borderColor: "#A79EF0", borderDash: [5, 4], pointRadius: 0, borderWidth: 2 },
            {
              label: "Escenario",
              data: escenario,
              borderColor: "#3B2FC9",
              pointRadius: 0,
              borderWidth: 2.5,
              fill: { target: { value: 0 }, above: "rgba(0,0,0,0)", below: "rgba(214,69,69,.22)" },
            },
          ],
        }}
        options={opciones((i) => i > 1)}
      />
    </div>
  );
}
