# Vesti

Un armario personal y un probador visual, pensado como regalo. Next.js + React + TypeScript + Supabase + Claude Haiku + FASHN.

## Desarrollo

```sh
npm ci
cp .env.example .env.local
npm run dev
```

En Windows, usar `Copy-Item .env.example .env.local`. Rellenar las variables sin publicarlas en Git. Abrir http://localhost:3000.

## Estado real

- Interfaz responsive en español: bienvenida que pregunta el nombre, Hoy, Mi armario, Probador, Mis looks y perfil.
- Registro/correo de confirmación/inicio de sesión con Supabase; armario privado persistido por cuenta.
- Fotos privadas de rostro/cuerpo, autorización explícita y carga de hasta 10 fotos por lote.
- API autenticada: Claude Haiku 4.5 detecta prendas; FASHN Edit las limpia; FASHN Try-On Max las coloca una a una sobre la foto de cuerpo completo. Requiere `ANTHROPIC_API_KEY`, `FASHN_API_KEY` y correo en `VESTI_ALLOWED_EMAILS`.
- Modo ahorro: imágenes de visión reducidas a 1024 px, salida de Claude limitada a 1800 tokens, FASHN fast/1K/una imagen, coste estimado antes de generar y opción de guardar la foto original sin gastar FASHN.
- Caché por usuario y contenido en `studio_cache`: evita envíos duplicados, conserva el identificador de FASHN y permite recuperar resultados. Los checkpoints se firman en el servidor.
- Revisión de nombre/categoría antes de limpiar y guardar, favoritos, búsqueda, combinaciones manuales, sugerencias por categorías, looks con fecha.
- Vista previa con ilustraciones originales. No genera imágenes ni simula respuestas de IA.

El propietario hará las pruebas pagadas con sus fotos. La implementación se ha probado con respuestas simuladas; no se consumieron créditos de Claude ni FASHN durante el desarrollo de esta integración.

## Supabase

Proyecto: `vesti` (`exgypopxzbmvmgkrehpa`), organización `santiagoGM`, región `us-east-1`.
Esquema inicial aplicado: `supabase/schema.sql`, más la migración `20260916172117_studio_request_cache.sql`. Incluye RLS por propietario, bucket privado `vesti-private` y cuota atómica de 20 llamadas nuevas de IA por cuenta/día UTC. Cada prenda generada reserva una llamada. Las llamadas fallidas después de reservar también consumen cuota. La cuota diaria no representa un presupuesto mensual ni impide gastar el saldo con uso continuado.

En Auth → URL Configuration configurar Site URL y redirecciones para el dominio definitivo. El correo de confirmación debe completarse antes del acceso. Usar SMTP propio antes de invitar a la destinataria si los límites del servicio de correo predeterminado son insuficientes.

## IA

1. Tener acceso API y saldo en Anthropic y FASHN directamente (no fal.ai).
2. Guardar `ANTHROPIC_API_KEY` y `FASHN_API_KEY` solo en el servidor/hosting.
3. Configurar `VESTI_ALLOWED_EMAILS` con el correo de la usuaria. Sin esta lista la API de imágenes deniega el acceso.
4. Modelos fijados para controlar costes: `claude-haiku-4-5-20251001`, FASHN `edit` y `tryon-max` en fast/1K. Sin escalado automático a modelos más caros ni reintentos de generación.
5. Realizar la prueba de calidad descrita en `docs/architecture.md` antes del regalo.

Nunca pegar claves en el código ni subir `.env.local` a GitHub. Las claves locales no se transfieren automáticamente a Vercel: ver [configuración de despliegue](docs/deployment.md).

## Validación

```sh
npm test
npm run typecheck
npm run build
```

## Limitaciones pendientes

- El propietario importó el proyecto en https://vesti-five.vercel.app/. El hosting debe recibir las cinco variables de `.env.example` y configurar su URL en Supabase Auth.
- Recomendación actual por categorías; la ocasión etiqueta el look, no representa todavía un estilista semántico, clima ni personalización aprendida.
- No incluye comunidad, viajes, precios de tiendas ni wishlist; están fuera del primer núcleo privado.
- El estado de armario se guarda como documento JSON por usuario. Para edición simultánea entre dispositivos y crecimiento, migrar a entidades relacionales y control de versión.
- Las operaciones de IA se completan dentro de la solicitud HTTP (hasta 300 s), con caché y checkpoints persistidos pero sin worker de fondo. Pulsar otra vez recupera un prediction ID guardado sin reenviar la generación. Si se pierde la conexión justo al enviar y antes de guardar el ID, el registro queda bloqueado de forma conservadora y requiere revisión administrativa.
- FASHN utiliza el rostro visible en la foto de cuerpo. La foto de rostro separada se almacena pero no se usa en este modo. Los conjuntos se generan por etapas: pueden acumular variaciones y cuestan hasta un crédito por prenda nueva. El coste exacto depende del plan y las tarifas vigentes de FASHN.
- Las URLs de fotos vencen en una hora; recargar renueva su acceso. Las fotos originales/descartadas permanecen privadas en Storage; falta una política de limpieza de huérfanos y eliminación completa desde la interfaz.
- El proveedor puede cambiar colores, detalles o identidad. La visualización no mide talla ni ajuste físico.
