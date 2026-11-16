import { redirect } from "next/navigation";
import { cerrarSesion } from "@/app/acciones";
import { connection } from "next/server";
import { DatosProvider } from "@/components/DatosProvider";
import { Encabezado } from "@/components/Encabezado";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { leerDatos, usuarioActual } from "@/lib/supabase/datos";
import { hoyISO } from "@/lib/tesoreria/fechas";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  await connection(); // "hoy" tiene que ser el día del pedido, no el del build
  const hoy = hoyISO();
  let derecha = supabaseConfigurado ? null : <span className="tag" title="Sin Supabase: los datos se guardan en este navegador">Modo local</span>;
  let inicial = null;

  if (supabaseConfigurado) {
    const usuario = await usuarioActual();
    if (!usuario) redirect("/ingresar");
    inicial = await leerDatos();
    if (!inicial) redirect("/empresa");
    derecha = null;
  }

  return (
    <DatosProvider hoy={hoy} modo={supabaseConfigurado ? "supabase" : "local"} inicial={inicial}>
      <Encabezado derecha={
        <form action={cerrarSesion}>
          <button
            className="rounded-xl bg-violeta px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violeta-oscuro"
            type="submit"
          >
            Cerrar sesión
          </button>
        </form>
      } />
      <main className="mx-auto max-w-[1180px] px-4 pb-10 sm:px-5">
        {children}
        <p className="mt-7 text-center text-xs text-apagado">TIP · MVP · Desarrollo de Nuevos Negocios 2026</p>
      </main>
    </DatosProvider>
  );
}
