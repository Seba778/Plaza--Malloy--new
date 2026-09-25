# Plaza Malloy Arena, versión editable + Supabase

Esta versión tiene los HTML **livianos** (se editan fácil en GitHub y VS Code) y las
imágenes en la carpeta `assets`. Además está lista para **Supabase**, que hace que:

- La mesa pagada se marque **vendida** sola en las 4 páginas.
- A TI te llegue un correo **solo del pago confirmado**.
- Al CLIENTE le llegue su **confirmación de reserva** con su número de mesa.

Puedes usarla en 2 momentos:
- **Ya mismo:** subes todo y funciona con bloqueo MANUAL (editando `BLOQUEADAS`).
- **Cuando quieras:** conectas Supabase (Partes 1 a 5) y pasa a automático.

---

## Bloqueo manual (sin Supabase todavía)

En cada evento, en su archivo `.html`, busca `var BLOQUEADAS` y pon los números:

```js
var BLOQUEADAS = [1, 2, 15, 40];
```

Archivos: `index.html` (Tamaulipas), `el-fantasma.html`, `rienda-real.html`,
`la-zenda-nortena.html`. Guardas, subes a GitHub, y Vercel se actualiza solo.

---

## PARTE 1 · Crear el proyecto y la tabla en Supabase

1. Entra a https://supabase.com, crea cuenta y un **New project** (guarda la
   contraseña de la base de datos).
2. Menú **SQL Editor** → **New query**.
3. Copia TODO el contenido de `supabase/1-crear-tabla.sql`, pégalo y pulsa **Run**.

## PARTE 2 · Copiar tus 2 claves

En **Project Settings → API** copia:
- **Project URL** (ej. `https://xxxx.supabase.co`)
- **anon public** (clave larga; segura para la página, solo permite leer)

## PARTE 3 · Conectar las 4 páginas

En cada `.html` busca `SUPABASE_URL` y pega tus claves (las mismas en los 4):

```js
var SUPABASE_URL  = "https://xxxx.supabase.co";
var SUPABASE_ANON = "tu-clave-anon-public";
```

Sube los 4 a GitHub. Desde ya, las páginas muestran en gris lo que haya en la tabla.

## PARTE 4 · La función que escucha a Stripe (webhook)

1. Supabase → **Edge Functions** → crea una función llamada **`webhook-stripe`**.
2. Pega el contenido de `supabase/functions/webhook-stripe/index.ts`.
3. **Apaga "Verify JWT"** para esa función (Stripe no manda JWT). Despliega.
4. Copia su URL: `https://xxxx.supabase.co/functions/v1/webhook-stripe`
5. En **Edge Functions → Secrets** agrega:
   - `STRIPE_SECRET_KEY` = tu clave secreta de Stripe (`sk_live_...`).
   - `WEB3FORMS_KEY` = clave de https://web3forms.com (para el aviso a TI).
   - `STRIPE_WEBHOOK_SECRET` = la pones en la Parte 5.
   - (Opcional, para el correo al cliente) `RESEND_API_KEY` y `RESEND_FROM`
     (ver la sección "Confirmación al cliente" abajo).

   No agregues SUPABASE_URL ni la service key: Supabase se las da sola a la función.

## PARTE 5 · Conectar Stripe con la función

1. Stripe → **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL** = la URL de tu función (Parte 4).
3. **Select events** → **`checkout.session.completed`**.
4. **Add endpoint**. Copia el **Signing secret** (`whsec_...`).
5. Ponlo en Supabase como el secreto **`STRIPE_WEBHOOK_SECRET`** y vuelve a desplegar.

Prueba una compra: la mesa debe quedar vendida (gris) y deben salir los correos.

---

## Confirmación al cliente (mensaje al que compra)

Tienes 2 caminos:

### Opción A, la más simple (recibo automático de Stripe)

En Stripe → **Settings → Customer emails** activa **"Successful payments"**. Con eso,
Stripe le envía al cliente un recibo de su pago automáticamente. No requiere código.

### Opción B, correo con su número de mesa (recomendado)

La función ya lo hace usando **Resend** (gratis). Solo agrega estos 2 secretos en la
función (Parte 4):

1. Crea cuenta en https://resend.com y saca tu **API Key**. Ponla como
   `RESEND_API_KEY`.
2. `RESEND_FROM` = el remitente. Para pruebas puedes usar
   `Plaza Malloy Arena <onboarding@resend.dev>`. Para producción, verifica tu dominio
   en Resend y usa algo como `reservas@plazamalloyarena.com`.

Así el cliente recibe un correo con su evento, su **número de mesa** y la dirección
del recinto.

---

## Bloquear mesas a mano una vez conectado Supabase (un clic, sin código)

Supabase → **Table Editor** → tabla **mesas** → **Insert row**: pones `evento`
(`tamaulipas`, `fantasma`, `rienda` o `zenda`), `numero` y `estado` = `bloqueada`.
Para liberar, borras la fila.

---

## Subir todo a GitHub (con la carpeta assets)

La web de GitHub no sube carpetas. Usa **GitHub Desktop** o **VS Code + git**:

```bash
git add .
git commit -m "version editable + supabase"
git push
```

Eso sube los HTML y la carpeta `assets` completa. Vercel redespliega solo.
(La carpeta `supabase` es solo para tu referencia; no afecta a la web.)
