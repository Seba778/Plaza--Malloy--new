// ==========================================================
// Webhook de Stripe para Plaza Malloy Arena
//  - Marca la mesa como VENDIDA en Supabase
//  - Te avisa a TI (dueño) por correo, solo del pago confirmado
//  - Le manda al CLIENTE su confirmación de reserva
// Supabase Edge Function (Deno).
// ==========================================================
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const WH_SECRET     = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const WEB3FORMS_KEY = Deno.env.get("WEB3FORMS_KEY");   // aviso para TI (opcional)
const RESEND_KEY    = Deno.env.get("RESEND_API_KEY");  // correo para el CLIENTE (opcional)
const RESEND_FROM   = Deno.env.get("RESEND_FROM") || "Plaza Malloy Arena <onboarding@resend.dev>";

const NOMBRES: Record<string,string> = {
  tamaulipas: "Los Dos de Tamaulipas",
  fantasma:   "El Fantasma",
  rienda:     "Rienda Real y Pócima Norteña",
  zenda:      "La Zenda Norteña",
};
const DIRECCION = "Plaza Malloy Arena, 2141 Malloy Bridge Rd, Ferris, TX 75125";

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, WH_SECRET);
  } catch (err) {
    return new Response("Firma invalida: " + err.message, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const ref: string = session.client_reference_id || "";   // ej: tamaulipas-Mesa-23
    const email: string | null = session.customer_details?.email ?? null;
    const nombre: string = session.customer_details?.name ?? "";

    const m = ref.match(/^([a-zA-Z]+)-Mesa-(\d+)$/);
    if (m) {
      const evento = m[1].toLowerCase();
      const numero = parseInt(m[2], 10);
      const eventoNombre = NOMBRES[evento] || evento;

      // 1) marca la mesa como vendida
      await supabase.from("mesas").upsert(
        { evento, numero, estado: "vendida", email },
        { onConflict: "evento,numero" }
      );

      // 2) aviso para TI (dueño)
      if (WEB3FORMS_KEY) {
        await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `PAGO CONFIRMADO: ${eventoNombre} - Mesa ${numero}`,
            from_name: "Plaza Malloy Arena",
            Evento: eventoNombre, Mesa: numero, Cliente: nombre, Correo_cliente: email, Referencia: ref,
          }),
        }).catch(() => {});
      }

      // 3) confirmacion para el CLIENTE
      if (RESEND_KEY && email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: email,
            subject: `Reserva confirmada - ${eventoNombre} - Mesa ${numero}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0c0a08;color:#fff;border:1px solid #C2A052;border-radius:16px;padding:28px">
                <h1 style="color:#E0C07A;margin:0 0 8px">Reserva confirmada</h1>
                <p style="color:#d6d3d1">Gracias por tu compra${nombre ? ", " + nombre : ""}. Tu reserva quedo confirmada.</p>
                <div style="background:#000;border:1px solid #655131;border-radius:12px;padding:16px;margin:16px 0">
                  <p style="margin:4px 0"><b style="color:#E0C07A">Evento:</b> ${eventoNombre}</p>
                  <p style="margin:4px 0"><b style="color:#E0C07A">Mesa:</b> #${numero}</p>
                  <p style="margin:4px 0"><b style="color:#E0C07A">Lugar:</b> ${DIRECCION}</p>
                </div>
                <p style="color:#a8a29e;font-size:13px">Presenta este correo al llegar. Te esperamos.</p>
              </div>`,
          }),
        }).catch(() => {});
      }
    }
  }

  return new Response("ok", { status: 200 });
});
