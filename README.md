# Vesti

Un armario personal y un probador visual, pensado como regalo. Next.js + React + TypeScript + Supabase + OpenAI.

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
- API autenticada para detectar prendas, aislar cada prenda en una imagen y generar un outfit con referencias de rostro/cuerpo/prendas. Requiere clave OpenAI y correo en `VESTI_ALLOWED_EMAILS`.
- Revisión de nombre/categoría antes de limpiar y guardar, favoritos, búsqueda, combinaciones manuales, sugerencias por categorías, looks con fecha.
- Vista previa con ilustraciones originales. No genera imágenes ni simula respuestas de IA.

La generación real no se ha validado con fotografías personales ni una clave de pago. No confundir integración implementada con calidad visual certificada.

## Supabase

Proyecto: `vesti` (`exgypopxzbmvmgkrehpa`), organización `santiagoGM`, región `us-east-1`.
Esquema inicial aplicado: `supabase/schema.sql`. Incluye RLS por propietario, bucket privado `vesti-private` y cuota atómica de 20 solicitudes de IA por cuenta/día UTC. Las solicitudes fallidas después de reservar también consumen cuota, para prevenir reintentos costosos sin límite.

En Auth → URL Configuration configurar Site URL y redirecciones para el dominio definitivo. El correo de confirmación debe completarse antes del acceso. Usar SMTP propio antes de invitar a la destinataria si los límites del servicio de correo predeterminado son insuficientes.

## IA

1. Crear una clave de API de OpenAI y habilitar facturación en la cuenta.
2. Guardar `OPENAI_API_KEY` solo en el servidor/hosting.
3. Configurar `VESTI_ALLOWED_EMAILS` con el correo de la usuaria. Sin esta lista la API de imágenes deniega el acceso.
4. Modelos configurables: `OPENAI_VISION_MODEL` y `OPENAI_IMAGE_MODEL`.
5. Realizar la prueba de calidad descrita en `docs/architecture.md` antes del regalo.

La suscripción de ChatGPT no debe tratarse como credenciales de la API. Nunca pegar claves en el código ni subir `.env.local` a GitHub.

## Validación

```sh
npm test
npm run typecheck
npm run build
```

## Limitaciones pendientes

- No está publicado todavía; el hosting debe recibir las variables de entorno y el dominio debe configurarse en Supabase Auth.
- Recomendación actual por categorías; la ocasión etiqueta el look, no representa todavía un estilista semántico, clima ni personalización aprendida.
- No incluye comunidad, viajes, precios de tiendas ni wishlist; están fuera del primer núcleo privado.
- El estado de armario se guarda como documento JSON por usuario. Para edición simultánea entre dispositivos y crecimiento, migrar a entidades relacionales y control de versión.
- Las operaciones de IA se completan dentro de la solicitud HTTP (hasta 300 s), sin cola durable. Migrar a trabajos persistidos, idempotencia y reintentos controlados antes de cargas masivas.
- Las URLs de fotos vencen en una hora; recargar renueva su acceso. Las fotos originales/descartadas permanecen privadas en Storage; falta una política de limpieza de huérfanos y eliminación completa desde la interfaz.
- El proveedor puede cambiar colores, detalles o identidad. La visualización no mide talla ni ajuste físico.
