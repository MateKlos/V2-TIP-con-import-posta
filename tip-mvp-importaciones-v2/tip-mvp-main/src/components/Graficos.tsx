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

type EventoImpositivo = Pick<Movimiento, "concepto" | "fecha" | "monto" | "moneda" | "impuestoEtiqueta">;
type EventoMarcado = EventoImpositivo & { etiqueta: string; indice: number };

/** Agrupa obligaciones de etiquetas distintas cuya distancia total no supera 12 días.
 * Si se repite la misma etiqueta (por ejemplo, otro IVA), empieza un grupo nuevo.
 */
function agruparImpuestos(hoy: string, impuestos: EventoImpositivo[], cantidadDias: number): EventoMarcado[][] {
  const eventos = impuestos.map((m) => ({ ...m, etiqueta: m.impuestoEtiqueta ?? "", indice: diasEntre(hoy, m.fecha) }))
    .filter((m) => m.etiqueta && m.indice >= 0 && m.indice < cantidadDias)
    .sort((a, b) => a.indice - b.indice);
  const grupos: EventoMarcado[][] = [];
  for (const evento of eventos) {
    const grupo = grupos[grupos.length - 1];
    const mismaEtiquetaEnGrupo = grupo?.some((anterior) => anterior.etiqueta === evento.etiqueta);
    const excedeVentana = !!grupo && evento.indice - grupo[0].indice > 12;
    if (!grupo || mismaEtiquetaEnGrupo || excedeVentana) grupos.push([evento]);
    else grupo.push(evento);
  }
  return grupos;
}

/** Cada grupo tiene su propia banda; las obligaciones separadas por más de 12 días no se conectan. */
function capaImpuestos(grupos: EventoMarcado[][]): Plugin<"line"> {
  return {
    id: "capa-impuestos",
    beforeDatasetsDraw(chart) {
      if (!grupos.length) return;
      const x = chart.scales.x;
      const { top, bottom } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(181, 126, 36, 0.075)";
      for (const grupo of grupos) {
        if (grupo.length < 2) continue;
        const desde = Math.max(chart.chartArea.left, x.getPixelForValue(grupo[0].indice - 0.5));
        const hasta = Math.min(chart.chartArea.right, x.getPixelForValue(grupo[grupo.length - 1].indice + 0.5));
        ctx.fillRect(desde, top, Math.max(0, hasta - desde), bottom - top);
      }
      ctx.strokeStyle = "rgba(169, 112, 24, 0.85)";
      ctx.fillStyle = "#916014";
      ctx.lineWidth = 1;
      for (const grupo of grupos) {
        grupo.forEach((evento, i) => {
          const px = x.getPixelForValue(evento.indice);
          ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = "600 10px system-ui, sans-serif"; ctx.textBaseline = "top";
          ctx.fillText(`${evento.etiqueta} · ${fechaCorta(evento.fecha)}`, Math.min(px + 4, chart.chartArea.right - 118), top + 5 + (i % 3) * 12);
        });
      }
      ctx.restore();
    },
  };
}

/** Saldo proyectado; la zona por debajo de cero se pinta de rojo. */
export function GraficoProyeccion({ hoy, saldos, impuestos = [] }: {
  hoy: string; saldos: number[]; impuestos?: EventoImpositivo[];
}) {
  const grupos = agruparImpuestos(hoy, impuestos, saldos.length);
  const eventosEnGrafico = grupos.flat();
  return (
    <div>
      <div className="relative h-64 sm:h-80" role="img" aria-label="Gráfico del saldo proyectado a 90 días con impuestos reconocidos marcados">
        <Line
          data={{
            labels: etiquetas(hoy, saldos.length),
            datasets: [{
              label: "Saldo proyectado", data: saldos, borderColor: VIOLETA,
              fill: { target: { value: 0 }, above: "rgba(84,73,221,.10)", below: "rgba(214,69,69,.25)" },
              tension: 0.2, pointRadius: 0, borderWidth: 2.5,
            }],
          }}
          options={opciones()}
          plugins={[capaImpuestos(grupos)]}
        />
      </div>
      {eventosEnGrafico.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Vencimientos impositivos reconocidos">
          {grupos.map((grupo, i) => (
            <div key={`grupo-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-[#B57E24]/[0.06] px-2 py-1">
              {grupo.map((m) => (
                <span key={`${m.fecha}-${m.etiqueta}-${m.concepto}-${m.monto}`} className="inline-flex items-center gap-1 text-[11px] text-apagado">
                  <span className="h-3 border-l border-dashed border-[#A97018]" aria-hidden="true" />
                  <span className="font-semibold text-[#916014]">{m.etiqueta}</span>
                  <span>{fechaCorta(m.fecha)}</span><span>· {fmtMonto(m.monto, m.moneda)}</span>
                </span>
              ))}
            </div>
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
