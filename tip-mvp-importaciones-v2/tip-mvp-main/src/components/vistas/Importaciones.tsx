"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useDatos } from "@/components/DatosProvider";
import { Cargando } from "@/components/Cargando";
import { nuevoId } from "@/lib/tesoreria/id";
import { sumarDias } from "@/lib/tesoreria/fechas";
import { fmtARS, fmtUSD } from "@/lib/tesoreria/formato";
import type { Movimiento } from "@/lib/tesoreria/tipos";

type PaisId = "cn" | "br" | "us" | "es";

const PAISES: {
  id: PaisId;
  nombre: string;
  bandera: string;
  region: string;
  sectores: string[];
  logistica: string;
  diasMin: number;
  diasMax: number;
  nota: string;
  posicion: string;
}[] = [
  {
    id: "us", nombre: "Estados Unidos", bandera: "🇺🇸", region: "América del Norte",
    sectores: ["Tecnología", "Redes y conectividad", "Equipamiento especializado"],
    logistica: "20–40 días", diasMin: 20, diasMax: 40,
    nota: "Considerá la modalidad de transporte, la consolidación de carga y los tiempos de despacho.",
    posicion: "Mercado de tecnología, conectividad y equipamiento especializado.",
  },
  {
    id: "br", nombre: "Brasil", bandera: "🇧🇷", region: "América del Sur",
    sectores: ["Electrónica", "Cables y componentes", "Equipamiento industrial"],
    logistica: "5–15 días", diasMin: 5, diasMax: 15,
    nota: "La cercanía regional puede acortar el tránsito; revisá el origen de la mercadería y la documentación.",
    posicion: "Alternativa regional para componentes, electrónica y equipamiento.",
  },
  {
    id: "es", nombre: "España", bandera: "🇪🇸", region: "Europa",
    sectores: ["Seguridad electrónica", "Telecomunicaciones", "Automatización"],
    logistica: "25–35 días", diasMin: 25, diasMax: 35,
    nota: "El tránsito depende del puerto de salida, los transbordos y la modalidad de transporte.",
    posicion: "Puerta de entrada a proveedores europeos de seguridad y automatización.",
  },
  {
    id: "cn", nombre: "China", bandera: "🇨🇳", region: "Asia",
    sectores: ["Cámaras y CCTV", "Alarmas y sensores", "Redes y electrónica"],
    logistica: "35–50 días", diasMin: 35, diasMax: 50,
    nota: "Planificá anticipos, saldo contra embarque y posibles demoras portuarias.",
    posicion: "Origen relevante para cámaras, alarmas, sensores y electrónica.",
  },
];

const MAPA_URL = "https://raw.githubusercontent.com/melenaos/Menelabs.VectorAtlas/main/dist/world.svg";
const fmtFecha = (iso: string) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };

function MapaMundi({
  paisId,
  onSeleccionar,
}: {
  paisId: PaisId;
  onSeleccionar: (id: PaisId) => void;
}) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState<PaisId | null>(null);
  const mapaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(MAPA_URL, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el mapa");
        return r.text();
      })
      .then((raw) => {
        // El recurso es un SVG estático de países, sin scripts ni contenido embebido.
        const limpio = raw
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
          .replace(/<svg\b/, '<svg class="mapa-vector" role="img" aria-label="Mapamundi político interactivo"');
        setSvg(limpio);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);

  function detectarPais(event: { target: EventTarget | null }, seleccionar: boolean) {
    const target = event.target as Element;
    const path = target.closest("path");
    const id = path?.id as PaisId | undefined;
    if (!path || !["cn", "br", "us", "es"].includes(id || "")) return;
    if (seleccionar) onSeleccionar(id!);
    else {
      setHovered(id!);
      // Reordena el país dentro del SVG para que quede visualmente por encima al pasar el puntero.
      path.parentElement?.appendChild(path);
    }
  }

  return (
    <div className="mapa-marco">
      <div
        ref={mapaRef}
        className="mapa-mundi"
        data-selected={paisId}
        data-hovered={hovered || ""}
        onPointerOver={(e) => detectarPais(e, false)}
        onPointerLeave={() => setHovered(null)}
        onClick={(e) => detectarPais(e, true)}
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      {!svg && !error && (
        <div className="mapa-cargando">
          <span className="mapa-pulso" />
          <span>Cargando mapamundi…</span>
        </div>
      )}
      {error && (
        <div className="mapa-cargando">
          <span className="text-sm font-semibold">No pudimos cargar el mapa en este momento.</span>
          <button type="button" className="btn btn-sec mt-2" onClick={() => window.location.reload()}>Volver a intentar</button>
        </div>
      )}
      <div className="mapa-leyenda">
        <span className="mapa-punto" />
        Mercados destacados
        <span className="ml-3 text-apagado">Pasá el cursor o seleccioná un país</span>
      </div>
      <div className="mapa-tooltip" aria-live="polite">
        {hovered ? `${PAISES.find((p) => p.id === hovered)?.nombre} · Seleccioná para ver su ficha` : " "}
      </div>
    </div>
  );
}

function GuiaImportacion() {
  const pasos = [
    {
      n: "01", titulo: "Definí el producto y su posición arancelaria",
      texto: "Reuní ficha técnica, composición, uso, marca y modelo. La clasificación NCM/SIM determina tributos, intervenciones y requisitos; validala con un despachante.",
      resultado: "Resultado: posición arancelaria a verificar.",
    },
    {
      n: "02", titulo: "Revisá requisitos y habilitaciones",
      texto: "Comprobá que la empresa pueda operar y consultá si el producto requiere autorizaciones, certificaciones o intervención de organismos técnicos.",
      resultado: "Resultado: checklist de permisos y documentación.",
    },
    {
      n: "03", titulo: "Compará proveedores y condiciones comerciales",
      texto: "Pedí una proforma con descripción, cantidades, moneda, Incoterm, forma de pago, plazo de producción y vigencia. Verificá referencias del proveedor.",
      resultado: "Resultado: costo y condiciones acordadas.",
    },
    {
      n: "04", titulo: "Calculá el costo total y planificá la caja",
      texto: "Sumá mercadería, flete, seguro, gastos bancarios, tributos, honorarios y gastos locales. Armá un calendario de anticipos, saldo y vencimientos.",
      resultado: "Resultado: costo puesto en destino y flujo de pagos.",
    },
    {
      n: "05", titulo: "Coordiná transporte y documentación",
      texto: "Definí transporte, seguro y operador logístico. Prepará factura comercial, packing list, documento de transporte y certificado de origen cuando corresponda.",
      resultado: "Resultado: embarque documentado y trazable.",
    },
    {
      n: "06", titulo: "Gestioná el pago y el despacho aduanero",
      texto: "Verificá las reglas cambiarias vigentes con tu banco y el despachante. Registrá la destinación, atendé controles y coordiná el pago de tributos y liberación.",
      resultado: "Resultado: mercadería nacionalizada y disponible.",
    },
    {
      n: "07", titulo: "Cerrá la operación y actualizá tus costos",
      texto: "Conciliá pagos, gastos reales, diferencias de cambio y costos logísticos. Compará el costo final con el presupuesto para mejorar la próxima compra.",
      resultado: "Resultado: costo real y aprendizaje para la próxima importación.",
    },
  ];

  return (
    <section id="guia-importacion" className="scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-violeta">Del proveedor a tu depósito</p>
          <h2 className="titulo text-xl">Guía paso a paso para importar</h2>
          <p className="mt-1 max-w-3xl text-sm text-apagado">Una hoja de ruta general para ordenar una importación comercial en Argentina. Los requisitos concretos cambian según el producto, la operación y la normativa vigente.</p>
        </div>
        <a className="btn btn-sec" href="https://www.vuce.gob.ar/" target="_blank" rel="noreferrer">Consultar VUCE <span aria-hidden="true">↗</span></a>
      </div>
      <div className="guia-grid">
        {pasos.map((paso) => (
          <article className="guia-paso" key={paso.n}>
            <span className="guia-numero">{paso.n}</span>
            <div>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
              <span className="guia-resultado">{paso.resultado}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="alerta alerta-info mt-4">
        <p className="font-semibold">Antes de avanzar</p>
        <p className="mt-1 text-[13px]">Esta guía es orientativa y no reemplaza el asesoramiento de un despachante de aduana, contador o entidad bancaria. No tomes aranceles, autorizaciones ni plazos de pago como universales: verificá cada operación por posición arancelaria y normativa actual.</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
          <a className="text-violeta underline" href="https://www.vuce.gob.ar/" target="_blank" rel="noreferrer">VUCE · Central de información ↗</a>
          <a className="text-violeta underline" href="https://www.arca.gob.ar/registroAduanero/" target="_blank" rel="noreferrer">ARCA · Registros aduaneros ↗</a>
          <a className="text-violeta underline" href="https://www.argentina.gob.ar/vuce/preguntas-frecuentes" target="_blank" rel="noreferrer">Preguntas frecuentes oficiales ↗</a>
        </div>
      </div>
    </section>
  );
}

function PreguntasFrecuentes() {
  const preguntas = [
    {
      q: "¿El arancel de importación depende del país de origen?",
      a: "No solamente. El tratamiento arancelario depende principalmente de la posición arancelaria, el origen de la mercadería, los acuerdos comerciales aplicables y las medidas vigentes. Consultá la posición en VUCE y validala antes de cerrar la compra.",
    },
    {
      q: "¿Qué es la posición arancelaria NCM/SIM?",
      a: "Es el código que identifica la mercadería en el nomenclador. Se utiliza para determinar tributos, requisitos, prohibiciones e intervenciones. La clasificación debe describir correctamente el producto y conviene confirmarla con un despachante.",
    },
    {
      q: "¿Cuánto tarda una importación desde cada país?",
      a: "Los rangos del mapa son referencias ilustrativas de tránsito, no plazos garantizados puerta a puerta. Cambian por vía aérea, marítima o terrestre, puerto, transbordos, temporada, consolidación, despacho y disponibilidad logística.",
    },
    {
      q: "¿Qué documentación suele pedir el proveedor?",
      a: "Según la operación, suele haber factura proforma y comercial, lista de empaque (packing list), documento de transporte y, cuando corresponde, certificado de origen y documentación técnica o certificaciones.",
    },
    {
      q: "¿Qué plazo tengo para pagar al proveedor en dólares?",
      a: "No existe un único plazo válido para todos los casos. El acceso al mercado de cambios depende de la normativa BCRA vigente, el tipo de bien, la fecha y condiciones de la operación y la documentación. Confirmalo con tu banco antes de comprometer fechas.",
    },
    {
      q: "¿Qué costos debería incluir en mi presupuesto?",
      a: "Además del precio de compra, contemplá flete, seguro, tributos, gastos portuarios o aeroportuarios, despachante, almacenaje, transporte local, costos bancarios y posibles demoras. El detalle depende del Incoterm y de la mercadería.",
    },
    {
      q: "¿VUCE es obligatoria para todas las importaciones?",
      a: "La VUCE centraliza información y trámites de comercio exterior, pero su portal indica que no es la única vía: algunas operatorias también se gestionan por SIM o TAD. Revisá el trámite aplicable a tu producto.",
    },
    {
      q: "¿Cómo me ayuda TIP en este proceso?",
      a: "TIP permite registrar el compromiso estimado de pago en USD y llevarlo a la proyección de caja. Así podés visualizar cómo impacta la fecha de pago en la liquidez prevista. En esta versión no determina automáticamente aranceles ni plazos cambiarios.",
    },
  ];

  return (
    <section className="tarjeta" aria-labelledby="faq-titulo">
      <div className="mb-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-violeta">Dudas habituales</p>
        <h2 id="faq-titulo" className="titulo text-xl">Preguntas frecuentes</h2>
      </div>
      <div className="divide-y divide-linea">
        {preguntas.map((p, i) => (
          <details className="faq-item" key={p.q} open={i === 0}>
            <summary>{p.q}<span className="faq-chevron" aria-hidden="true">⌄</span></summary>
            <p>{p.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-apagado">Información orientativa. Para requisitos específicos, consultá las fuentes oficiales y a los profesionales intervinientes.</p>
    </section>
  );
}

export function VistaImportaciones() {
  const { datos, hoy, guardarMovimiento } = useDatos();
  const [paisId, setPaisId] = useState<PaisId>("cn");
  const [proveedor, setProveedor] = useState("");
  const [producto, setProducto] = useState("");
  const [monto, setMonto] = useState("");
  const [ncm, setNcm] = useState("");
  const [dias, setDias] = useState("45");
  const [fechaPago, setFechaPago] = useState(sumarDias(hoy, 30));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const pais = PAISES.find((p) => p.id === paisId)!;
  const diasNum = Math.max(1, Number(dias) || pais.diasMin);
  const llegada = sumarDias(hoy, diasNum);
  const montoNum = Number(monto);
  const montoValido = Number.isFinite(montoNum) && montoNum > 0;
  const estimacion = useMemo(() => montoValido && datos ? montoNum * datos.empresa.tipoCambio : null, [montoValido, montoNum, datos]);

  if (!datos) return <Cargando />;

  async function agregarPago(ev: FormEvent) {
    ev.preventDefault();
    setMensaje(null);
    if (!proveedor.trim() || !producto.trim() || !montoValido || !fechaPago) {
      setMensaje({ ok: false, texto: "Completá proveedor, producto, monto y fecha estimada de pago." });
      return;
    }
    const movimiento: Movimiento = {
      id: nuevoId(), tipo: "pago",
      concepto: `Importación ${pais.nombre} · ${proveedor.trim()} · ${producto.trim()}${ncm.trim() ? ` · NCM ${ncm.trim()}` : ""}`,
      monto: montoNum, moneda: "USD", fecha: fechaPago, puntualidad: null,
    };
    setGuardando(true);
    const resultado = await guardarMovimiento(movimiento);
    setGuardando(false);
    if (!resultado.ok) { setMensaje({ ok: false, texto: resultado.error }); return; }
    setMensaje({ ok: true, texto: `Pago por ${fmtUSD(montoNum)} agregado a la proyección para el ${fmtFecha(fechaPago)}.` });
    setProveedor(""); setProducto(""); setMonto("");
  }

  function seleccionarPais(id: PaisId) {
    setPaisId(id);
    const p = PAISES.find((x) => x.id === id)!;
    setDias(String(Math.round((p.diasMin + p.diasMax) / 2)));
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-violeta">Comercio exterior · TIP</p>
          <h1 className="titulo text-2xl">Conocimiento de mercados</h1>
          <p className="mt-1 max-w-3xl text-apagado">Explorá los principales orígenes de tus importaciones, conocé sus particularidades y anticipá cómo los compromisos con proveedores impactan en tu tesorería.</p>
        </div>
        <span className="tag">4 mercados de referencia</span>
      </header>

      <div className="intro-importaciones">
        <div className="intro-icono">✦</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Planificá tu próxima importación con más contexto.</p>
          <p className="mt-0.5 text-sm text-apagado">Seleccioná un país en el mapamundi para explorar sectores, logística y puntos de atención; después registrá el compromiso de pago para verlo en tu proyección.</p>
        </div>
        <a href="#guia-importacion" className="btn btn-sec whitespace-nowrap">Ver guía para importar <span aria-hidden="true">↓</span></a>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.8fr)]">
        <div className="tarjeta min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="subtitulo mb-0">Mapa mundi · mercados de origen</h2>
              <p className="text-xs text-apagado">Seleccioná uno de los países destacados para consultar su ficha.</p>
            </div>
            <span className="tag">Vista mundial</span>
          </div>
          <MapaMundi paisId={paisId} onSeleccionar={seleccionarPais} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAISES.map((p) => (
              <button key={p.id} type="button" onClick={() => seleccionarPais(p.id)} aria-pressed={paisId === p.id}
                className={`rounded-xl border p-2.5 text-left transition ${paisId === p.id ? "border-violeta bg-lavanda shadow-sm" : "border-linea bg-white hover:bg-lavanda/50"}`}>
                <span className="block text-lg">{p.bandera}</span>
                <span className="block text-xs font-semibold">{p.nombre}</span>
                <span className="text-[11px] text-apagado">{p.logistica} estimados</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-apagado">Mapa vectorial basado en Natural Earth · VectorAtlas (CC BY 4.0), Menelabs. <a className="underline" href="https://github.com/melenaos/Menelabs.VectorAtlas" target="_blank" rel="noreferrer">Ver fuente y licencia</a>.</p>
        </div>

        <div className="flex flex-col gap-4">
          <article className="tarjeta">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lavanda text-3xl">{pais.bandera}</div>
              <div className="min-w-0">
                <h2 className="titulo text-xl">{pais.nombre}</h2>
                <p className="text-xs text-apagado">{pais.region} · Mercado de referencia</p>
              </div>
            </div>
            <p className="mt-3 text-sm">{pais.posicion}</p>
            <h3 className="mt-4 text-xs font-semibold text-violeta-oscuro">Sectores de referencia</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">{pais.sectores.map((s) => <li className="tag" key={s}>{s}</li>)}</ul>
            <div className="mt-4 rounded-xl bg-lavanda/70 p-3">
              <p className="text-xs font-semibold text-violeta-oscuro">Atención logística</p>
              <p className="mt-1 text-[13px]">{pais.nota}</p>
            </div>
            <div className="mt-4 space-y-2 border-t border-linea pt-3 text-xs">
              <div className="flex justify-between gap-3"><span className="text-apagado">Tránsito estimado</span><b>{pais.logistica}</b></div>
              <div className="flex justify-between gap-3"><span className="text-apagado">Arancel</span><b className="text-right">Según NCM y origen</b></div>
              <div className="flex justify-between gap-3"><span className="text-apagado">Pago al exterior</span><b className="text-right">Según norma BCRA vigente</b></div>
            </div>
          </article>

          <article className="tarjeta">
            <h2 className="subtitulo">Simular una importación</h2>
            <p className="mb-3 text-xs text-apagado">Cargá el compromiso estimado. TIP lo incorpora como pago en USD en tu proyección de caja.</p>
            <form onSubmit={agregarPago} className="flex flex-col gap-3">
              <label className="etiqueta">Proveedor<input className="campo" value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Ej. Shenzhen Tech" /></label>
              <label className="etiqueta">Producto / mercadería<input className="campo" value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ej. Cámaras IP" /></label>
              <label className="etiqueta">Valor a pagar (USD)<input className="campo" type="number" min="0.01" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Ej. 12500" /></label>
              <label className="etiqueta">Posición arancelaria NCM (opcional)<input className="campo" value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="Si la conocés" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="etiqueta">Días logísticos<input className="campo" type="number" min="1" max="180" value={dias} onChange={(e) => setDias(e.target.value)} /></label>
                <label className="etiqueta">Fecha estimada de pago<input className="campo" type="date" min={hoy} value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} /></label>
              </div>
              <div className="rounded-xl border border-linea bg-[#faf9ff] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-apagado">Llegada estimada</p><p className="font-semibold">{fmtFecha(llegada)}</p></div>
                  <div><p className="text-xs text-apagado">Equivalente al TC actual</p><p className="font-semibold">{estimacion === null ? "—" : fmtARS(estimacion)}</p></div>
                </div>
                <p className="mt-2 text-[11px] text-apagado">La llegada es orientativa y se calcula desde hoy. El equivalente en pesos usa el tipo de cambio cargado en Datos; no incluye tributos, flete ni gastos locales.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn" type="submit" disabled={guardando}>{guardando ? "Agregando…" : "Agregar pago a mi proyección"}</button>
                {mensaje && <span role="status" className={mensaje.ok ? "text-verde text-xs" : "text-rojo text-xs"}>{mensaje.texto}</span>}
              </div>
            </form>
          </article>
        </div>
      </div>

      <GuiaImportacion />
      <PreguntasFrecuentes />
    </section>
  );
}
