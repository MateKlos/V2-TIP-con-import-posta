"use client";

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
import { Line } from "react-chartjs-2";
import { diasEntre, fechaCorta, sumarDias } from "@/lib/tesoreria/fechas";
import { fmtARS, fmtMillones, fmtMonto } from "@/lib/tesoreria/formato";
import type { Movimiento } from "@/lib/tesoreria/tipos";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const VIOLETA = "#5449DD";
const APAGADO = "#7A7398";

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

type EventoImpositivo = Pick<Movimiento, "concepto" | "fecha" | "monto" | "moneda">;

/** Marca cada impuesto en su fecha y sombrea el intervalo entre vencimientos consecutivos. */
function capaImpuestos(hoy: string, impuestos: EventoImpositivo[], cantidadDias: number): Plugin<"line"> {
  const eventos = impuestos
    .map((m) => ({ ...m, indice: diasEntre(hoy, m.fecha) }))
    .filter((m) => m.indice >= 0 && m.indice < cantidadDias)
    .sort((a, b) => a.indice - b.indice);

  return {
    id: "capa-impuestos",
    beforeDatasetsDraw(chart) {
      if (!eventos.length) return;
      const x = chart.scales.x;
      const { top, bottom } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();

      // La banda conecta vencimientos impositivos consecutivos, no todo el mes.
      if (eventos.length > 1) {
        ctx.fillStyle = "rgba(181, 126, 36, 0.075)";
        for (let i = 0; i < eventos.length - 1; i++) {
          const desde = x.getPixelForValue(eventos[i].indice);
          const hasta = x.getPixelForValue(eventos[i + 1].indice);
          ctx.fillRect(desde, top, Math.max(0, hasta - desde), bottom - top);
        }
      }

      ctx.strokeStyle = "rgba(169, 112, 24, 0.85)";
      ctx.fillStyle = "#916014";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      eventos.forEach((evento, i) => {
        const px = x.getPixelForValue(evento.indice);
        ctx.beginPath();
        ctx.moveTo(px, top);
        ctx.lineTo(px, bottom);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.font = "600 10px system-ui, sans-serif";
        ctx.textBaseline = "top";
        const etiqueta = evento.concepto.length > 17 ? `${evento.concepto.slice(0, 15)}…` : evento.concepto;
        ctx.fillText(`${etiqueta} · ${fechaCorta(evento.fecha)}`, Math.min(px + 4, chart.chartArea.right - 110), top + 5 + (i % 3) * 12);
        ctx.setLineDash([4, 4]);
      });
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
  impuestos?: EventoImpositivo[];
}) {
  const eventosEnGrafico = impuestos.filter((m) => {
    const dia = diasEntre(hoy, m.fecha);
    return dia >= 0 && dia < saldos.length;
  });
  const pluginImpuestos = capaImpuestos(hoy, eventosEnGrafico, saldos.length);

  return (
    <div>
      <div className="relative h-64 sm:h-80" role="img" aria-label="Gráfico del saldo proyectado a 90 días con vencimientos impositivos marcados">
        <Line
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
          options={opciones()}
          plugins={[pluginImpuestos]}
        />
      </div>
      {eventosEnGrafico.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Vencimientos impositivos incluidos en el gráfico">
          {eventosEnGrafico.map((m) => (
            <span key={`${m.fecha}-${m.concepto}-${m.monto}`} className="inline-flex items-center gap-1.5 text-[11px] text-apagado">
              <span className="h-3 border-l border-dashed border-[#A97018]" aria-hidden="true" />
              <span className="font-semibold text-[#916014]">{m.concepto}</span>
              <span>{fechaCorta(m.fecha)}</span>
              <span>· {fmtMonto(m.monto, m.moneda)}</span>
            </span>
          ))}
        </div>
      )}
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
