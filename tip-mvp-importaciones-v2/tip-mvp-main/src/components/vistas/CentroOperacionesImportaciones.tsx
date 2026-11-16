"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Estado = "Producción" | "Embarque" | "Aduana" | "Liberación" | "Entrega";
type Importacion = {
  id: string; proveedor: string; producto: string; origen: string; pais: string;
  bandera: string; estado: Estado; avance: number; fecha: string; monto: string;
};

const IMPORTACIONES: Importacion[] = [
  { id: "IMP-024", proveedor: "Shenzhen Tech Co.", producto: "Cámaras IP y sensores", origen: "Shenzhen, China", pais: "cn", bandera: "🇨🇳", estado: "Embarque", avance: 42, fecha: "Arribo estimado · 12 dic", monto: "USD 18.400" },
  { id: "IMP-023", proveedor: "Tecno Brasil Ltda.", producto: "Componentes de red", origen: "São Paulo, Brasil", pais: "br", bandera: "🇧🇷", estado: "Aduana", avance: 68, fecha: "Documentación · 19 nov", monto: "USD 8.250" },
  { id: "IMP-022", proveedor: "Iberia Security", producto: "Equipos de control", origen: "Valencia, España", pais: "es", bandera: "🇪🇸", estado: "Producción", avance: 18, fecha: "Listo para retiro · 28 dic", monto: "EUR 6.900" },
  { id: "IMP-021", proveedor: "West Coast Systems", producto: "Servidores y accesorios", origen: "Los Ángeles, EE. UU.", pais: "us", bandera: "🇺🇸", estado: "Entrega", avance: 100, fecha: "Entregado · 14 nov", monto: "USD 12.100" },
];

const ETAPAS: Estado[] = ["Producción", "Embarque", "Aduana", "Liberación", "Entrega"];
const EVENTOS = [
  { fecha: "18 NOV", hora: "09:30", titulo: "Vencimiento de anticipo", detalle: "Shenzhen Tech Co. · USD 5.520", tipo: "pago" },
  { fecha: "19 NOV", hora: "—", titulo: "Presentación de documentación", detalle: "Tecno Brasil Ltda. · Aduana", tipo: "hito" },
  { fecha: "25 NOV", hora: "—", titulo: "Saldo contra embarque", detalle: "Tecno Brasil Ltda. · USD 2.730", tipo: "pago" },
  { fecha: "12 DIC", hora: "—", titulo: "Arribo estimado a puerto", detalle: "Shenzhen Tech Co. · China", tipo: "hito" },
];

const MAPA_URL = "https://raw.githubusercontent.com/melenaos/Menelabs.VectorAtlas/main/dist/world.svg";

function MapaOperaciones({ seleccionado, onSelect }: { seleccionado: string; onSelect: (id: string) => void }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(MAPA_URL, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("mapa"); return r.text(); })
      .then((raw) => setSvg(raw
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
        .replace(/<svg\b/, '<svg role="img" aria-label="Mapamundi de países de origen"')
      ))
      .catch(() => setSvg(""));
    return () => controller.abort();
  }, []);
  return (
    <div className="relative min-h-[255px] overflow-hidden rounded-2xl border border-[#e7e9f2] bg-[#f7f9ff] p-3">
      {svg ? <div className="mapa-operaciones" dangerouslySetInnerHTML={{ __html: svg }} /> : (
        <div className="flex min-h-[230px] items-center justify-center text-sm text-slate-400">Cargando mapa mundial…</div>
      )}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {[
          { id: "cn", label: "China", flag: "🇨🇳" }, { id: "br", label: "Brasil", flag: "🇧🇷" },
          { id: "es", label: "España", flag: "🇪🇸" }, { id: "us", label: "EE. UU.", flag: "🇺🇸" },
        ].map((p) => <button key={p.id} onClick={() => onSelect(p.id)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${seleccionado === p.id ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white/95 text-slate-600"}`}>{p.flag} {p.label}</button>)}
      </div>
      <div className="absolute right-3 top-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-slate-500 shadow-sm">4 países de origen</div>
    </div>
  );
}

function EstadoPill({ estado }: { estado: Estado }) {
  const estilos: Record<Estado, string> = {
    Producción: "bg-slate-100 text-slate-600",
    Embarque: "bg-blue-50 text-blue-700",
    Aduana: "bg-amber-50 text-amber-700",
    Liberación: "bg-violet-50 text-violet-700",
    Entrega: "bg-emerald-50 text-emerald-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${estilos[estado]}`}>{estado}</span>;
}

export function CentroOperacionesImportaciones() {
  const [filtro, setFiltro] = useState("Todas");
  const [pais, setPais] = useState("");
  const filtradas = IMPORTACIONES.filter((i) => (filtro === "Todas" || i.estado === filtro) && (!pais || i.pais === pais));
  const activas = IMPORTACIONES.filter((i) => i.estado !== "Entrega").length;
  return (
    <div className="min-h-[calc(100dvh-100px)] overflow-hidden rounded-[22px] border border-slate-200 bg-[#f5f7fc] text-slate-800 shadow-[0_18px_60px_rgba(39,47,91,.10)]">
      <div className="grid min-h-[760px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="flex flex-col bg-[#2824a8] px-4 py-5 text-white">
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-black text-[#443bd0]">T</div>
            <div><p className="text-lg font-bold leading-none">TIP</p><p className="mt-1 text-[10px] text-indigo-200">OPERACIONES</p></div>
          </div>
          <p className="px-3 text-[9px] font-bold uppercase tracking-[.18em] text-indigo-300">Workspace</p>
          <nav className="mt-3 space-y-1 text-[13px]">
            <a className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5 font-semibold" href="#resumen"><span>▦</span> Centro de operaciones</a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-indigo-100 hover:bg-white/10" href="#importaciones"><span>▤</span> Importaciones</a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-indigo-100 hover:bg-white/10" href="#cronograma"><span>◷</span> Cronograma</a>
          </nav>
          <p className="mt-8 px-3 text-[9px] font-bold uppercase tracking-[.18em] text-indigo-300">Gestión TIP</p>
          <nav className="mt-3 space-y-1 text-[13px]">
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-indigo-100 hover:bg-white/10" href="/panel"><span>◫</span> Tesorería</Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-indigo-100 hover:bg-white/10" href="/datos"><span>▧</span> Datos y movimientos</Link>
          </nav>
          <div className="mt-auto rounded-2xl border border-white/15 bg-white/10 p-3">
            <p className="text-xs font-semibold">Vista de demostración</p>
            <p className="mt-1 text-[10px] leading-relaxed text-indigo-100">Los embarques y montos son ilustrativos. Todavía no representan seguimiento logístico en tiempo real.</p>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-7">
          <header id="resumen" className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-indigo-600">Comercio exterior / Workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Centro de operaciones</h1><p className="mt-1 text-sm text-slate-500">Toda tu operación de importaciones, en un solo lugar.</p></div>
            <div className="flex items-center gap-2"><span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">● Actualizado hoy</span><Link href="/panel" className="rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700">Volver a TIP</Link></div>
          </header>

          <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "Importaciones activas", valor: String(activas).padStart(2,"0"), nota: "En curso", icono: "▤" },
              { label: "En tránsito", valor: "01", nota: "Transporte internacional", icono: "⇢" },
              { label: "Pendientes de aduana", valor: "01", nota: "Requieren seguimiento", icono: "⌑" },
              { label: "Compromisos próximos", valor: "02", nota: "En los próximos 10 días", icono: "$" },
            ].map((k) => <article key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(35,46,80,.03)]"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-slate-500">{k.label}</span><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">{k.icono}</span></div><p className="mt-2 text-2xl font-bold text-slate-900">{k.valor}</p><p className="mt-1 text-[10px] text-slate-400">{k.nota}</p></article>)}
          </section>

          <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(270px,.8fr)]">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(35,46,80,.03)]">
              <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Mapa de operaciones</h2><p className="mt-0.5 text-[11px] text-slate-500">Países de origen y rutas de abastecimiento</p></div><span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] text-slate-500">Mundo</span></div>
              <MapaOperaciones seleccionado={pais} onSelect={setPais} />
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(35,46,80,.03)]">
              <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Flujo logístico</h2><p className="mt-0.5 text-[11px] text-slate-500">Estado de las operaciones</p></div><span className="text-[10px] font-semibold text-indigo-600">Ver detalle ↗</span></div>
              <div className="space-y-4">
                {ETAPAS.map((e, idx) => {
                  const n = IMPORTACIONES.filter((i) => i.estado === e).length;
                  return <div key={e}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-slate-600">{e}</span><span className="font-bold text-slate-800">{String(n).padStart(2,"0")}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(n / IMPORTACIONES.length * 100, 4)}%`, opacity: 1 - idx * .1 }} /></div></div>;
                })}
              </div>
              <div className="mt-5 rounded-xl bg-indigo-50 p-3"><p className="text-[11px] font-semibold text-indigo-800">Seguimiento centralizado</p><p className="mt-1 text-[10px] leading-relaxed text-indigo-700">Visualizá cada etapa desde la orden al proveedor hasta la entrega.</p></div>
            </article>
          </section>

          <section id="importaciones" className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(35,46,80,.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
              <div><h2 className="text-sm font-bold text-slate-900">Importaciones en seguimiento</h2><p className="mt-0.5 text-[11px] text-slate-500">Contenedores, proveedores y estado de cada operación</p></div>
              <div className="flex flex-wrap gap-1.5">{["Todas", ...ETAPAS].map((e) => <button key={e} onClick={() => setFiltro(e)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${filtro === e ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{e}</button>)}</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filtradas.filter((i) => !pais || i.pais === pais).map((i) => <article key={i.id} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(100px,.8fr)_minmax(120px,.8fr)_minmax(120px,.8fr)] sm:items-center">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">{i.bandera}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{i.proveedor}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{i.producto} · {i.id}</p><p className="mt-0.5 text-[10px] text-slate-400">{i.origen}</p></div></div>
                <div><EstadoPill estado={i.estado} /><p className="mt-1.5 text-[10px] text-slate-400">{i.fecha}</p></div>
                <div><div className="mb-1 flex justify-between text-[10px]"><span className="text-slate-400">Progreso</span><b className="text-slate-600">{i.avance}%</b></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${i.avance}%` }} /></div></div>
                <div className="text-left sm:text-right"><p className="text-xs font-bold text-slate-800">{i.monto}</p><p className="mt-1 text-[10px] text-slate-400">Valor declarado</p></div>
              </article>)}
              {filtradas.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-400">No hay operaciones para este filtro.</p>}
            </div>
          </section>

          <section id="cronograma" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(35,46,80,.03)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-slate-900">Próximos hitos y compromisos</h2><p className="mt-0.5 text-[11px] text-slate-500">Línea de tiempo de pagos y eventos logísticos</p></div><span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700">Noviembre – diciembre</span></div>
            <div className="grid gap-3 md:grid-cols-4">
              {EVENTOS.map((ev, idx) => <article key={ev.titulo} className="relative rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold tracking-wide text-indigo-700">{ev.fecha}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${ev.tipo === "pago" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{ev.tipo === "pago" ? "PAGO" : "HITO"}</span></div><p className="text-xs font-bold text-slate-800">{ev.titulo}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{ev.detalle}</p>{idx < EVENTOS.length - 1 && <div className="absolute -right-3 top-5 z-10 hidden h-px w-3 bg-indigo-200 md:block" />}</article>)}
            </div>
          </section>
          <p className="mt-4 text-center text-[10px] text-slate-400">Prototipo visual · Información de ejemplo, no corresponde a embarques reales.</p>
        </main>
      </div>
      <style jsx global>{`
        .mapa-operaciones svg { display:block; width:100%; height:auto; max-height:280px; }
        .mapa-operaciones svg path { fill:#e1e6f1; stroke:#fff; stroke-width:1; vector-effect:non-scaling-stroke; }
        .mapa-operaciones svg path#cn,.mapa-operaciones svg path#br,.mapa-operaciones svg path#us,.mapa-operaciones svg path#es { fill:#6258e8; stroke:#fff; stroke-width:1.8; }
        .mapa-operaciones svg path#cn { filter:drop-shadow(0 2px 2px rgba(67,56,202,.28)); }
      `}</style>
    </div>
  );
}
