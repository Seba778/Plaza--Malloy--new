# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Sitio estático de **Plaza Malloy Arena** (Ferris, TX) para vender mesas VIP de eventos. HTML plano con CSS y JS inline, sin build, sin dependencias, sin tests ni linter. Desplegado en **Vercel** (auto-deploy al hacer `git push` a `main`; `vercel.json` activa `cleanUrls`). Todo el contenido y comentarios están en español.

Desarrollo local: abrir el `.html` directamente en el navegador (o cualquier servidor estático). Los commits suelen ser cambios de flyers/contenido.

## Arquitectura

**Páginas de evento** — cada evento activo es un `.html` autocontenido con la misma estructura (navbar, flyer, galería, modal de reserva, `<script>` al final):
- `index.html` — página principal; evento destacado (`SLUG = "gran-baile"`), tarjeta de `los-pescadores`, y sección "Próximamente en la Arena" (`.cross-grid`) con flyers de eventos futuros.
- `los-pescadores.html` — página propia del evento `SLUG = "pescadores"`.
- `el-fantasma.html`, `la-zenda-nortena.html`, `la-energia-nortena.html` — eventos pasados, ahora solo redirigen a `/` vía meta refresh.

Las páginas de evento duplican el mismo JS; un cambio de lógica en una normalmente debe replicarse en las demás.

**Bloque de configuración por evento** (en el `<script>` de cada página, sección "CONFIGURACIÓN DE ESTE EVENTO"):
- `PRECIOS` — gold/silver en USD.
- `PAGO` — Payment Links de Stripe distintos por evento y categoría.
- `BLOQUEADAS` — mesas bloqueadas manualmente (array de números).
- `SLUG` — identificador del evento; debe coincidir con `evento` en Supabase y con una clave de `NOMBRES` en el webhook.
- `SUPABASE_URL` / `SUPABASE_ANON` — clave anon pública (solo lectura por RLS).
- `NUMS` — mesas gold 1–14, silver 15–54.

**Flujo de reserva:**
1. El modal llama `cargarOcupadasDB()` → REST de Supabase `mesas?evento=eq.<SLUG>` → mesas ocupadas en gris.
2. `confirmar()` redirige al Payment Link de Stripe con `client_reference_id = "<SLUG>-Mesa-<n>"`.
3. Stripe envía `checkout.session.completed` a la Edge Function `supabase/functions/webhook-stripe/index.ts` (Deno), que parsea la referencia con `/^(.+)-Mesa-(\d+)$/`, hace upsert en `mesas` (`estado: "vendida"`), avisa al dueño por Web3Forms y al cliente por Resend.

**Agregar un evento nuevo** implica: nueva página (o sección) con su `SLUG` y links de Stripe propios, flyer en `assets/`, y añadir el slug a `NOMBRES` en el webhook (redeploy manual en Supabase — la carpeta `supabase/` es solo referencia, no se despliega con Vercel).

**Supabase:** esquema en `supabase/1-crear-tabla.sql` (tabla `mesas`, `unique(evento, numero)`, RLS solo lectura pública). Secretos de la función: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `WEB3FORMS_KEY`, `RESEND_API_KEY`, `RESEND_FROM`. "Verify JWT" debe estar apagado. Guía de configuración paso a paso en `GUIA-SUPABASE.md` (parcialmente desactualizada: menciona 4 páginas/eventos antiguos).

**Assets:** `assets/` contiene flyers (`<evento>-flyer.jpg`), mapas de mesas (`*-mapa.jpg`, `mapa-mesas.jpg`), fotos de la arena (`arena-1..8.jpg`), `logo.png` y `preview.mp4`.
