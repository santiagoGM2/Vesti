# Publicar la integración Claude + FASHN

URL del propietario: https://vesti-five.vercel.app/

## Logo en la pantalla de inicio

Después de desplegar este cambio: iPhone → Safari → Compartir → Añadir a pantalla de inicio. Android → Chrome → menú → Añadir a pantalla de inicio / Instalar. Si ya existe un acceso con el icono anterior, eliminar ese acceso y añadirlo de nuevo. Esto no borra la cuenta ni sus datos. La app requiere conexión; no se almacenan fotos privadas en una caché offline.

## Variables de Vercel

Abrir el proyecto Vesti en Vercel → Settings → Environment Variables. Copiar estos cinco valores desde `.env.local` a **Production**. No poner las claves en archivos del repositorio ni en variables `NEXT_PUBLIC_`.

| Variable | Valor |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL del proyecto Supabase; ya está en `.env.local` |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave pública de Supabase; ya está en `.env.local` |
| ANTHROPIC_API_KEY | Clave de Claude guardada localmente |
| FASHN_API_KEY | Clave de FASHN guardada localmente |
| VESTI_ALLOWED_EMAILS | Correo de pruebas, ya configurado localmente. Añadir posteriormente el de la destinataria, separado por coma |

No se requiere OpenAI ni seleccionar un modelo en Vercel. Los modelos económicos están fijados en el código. Una vez guardadas las variables, ir a Deployments → último despliegue de main → Redeploy. Si se añaden después de una compilación, las variables públicas requieren recompilar.

## Correo de confirmación

En Supabase → Authentication → URL Configuration:

- Site URL: `https://vesti-five.vercel.app`
- Redirect URLs: `https://vesti-five.vercel.app/**`
- Para desarrollo local opcional: `http://localhost:3000/**`

Mantener activada la confirmación de correo. No se creó ninguna cuenta ni se enviaron correos en nombre del propietario. Si el correo de confirmación no llega, revisar spam y los límites de Supabase Auth; una cuenta no autorizada para su servicio de correo de pruebas puede requerir configurar SMTP propio.

## Prueba mínima que realiza el propietario

1. Crear cuenta con el correo habilitado, confirmar e iniciar sesión.
2. Guardar perfil y autorización, después subir una foto de cuerpo donde se vea claramente el rostro. No cuesta IA.
3. Subir **una sola foto** de una camisa bien iluminada. Claude identifica sus datos (consumo pequeño variable, no una cantidad garantizada).
4. Revisar nombre/categoría. Elegir **Guardar original · gratis** si la foto ya muestra únicamente esa prenda. Evitar usar la foto de un outfit completo como referencia de una prenda sin limpiarla.
5. En Probador seleccionar solo esa camisa. La acción anuncia hasta **1 crédito de FASHN**.
6. Verificar rostro, color, corte y proporciones. Guardar el look. No generar muchas variantes hasta evaluar ese primer resultado.

La limpieza opcional cuesta 1 crédito según la tarifa fast/1K consultada. No generar automáticamente versiones mejores si la calidad no convence. Un resultado en caché se reutiliza; modificar las entradas puede generar una nueva operación con coste.

## Costes y privacidad

- Haiku 4.5: US$1/millón de tokens de entrada y US$5/millón de salida al consultar la documentación el 16 septiembre 2026. Entrada de imagen + prompt + salida determinan el coste. [Anthropic](https://www.anthropic.com/claude/haiku).
- FASHN fast/1K: 1 crédito por imagen en Try-On Max y Edit; cada prenda del conjunto implica una etapa. [Try-On Max](https://docs.fashn.ai/api-reference/tryon-max) y [Edit](https://docs.fashn.ai/api-reference/edit).
- Repetir una entrada idéntica reutiliza caché por cuenta. Rotar la clave invalida las claves de caché anteriores y puede generar de nuevo; revisar antes de volver a pulsar.
- Originales en Supabase privado; referencias de generación enviadas directamente al proveedor como base64. El servidor solicita salida base64, sin descargar URLs arbitrarias del resultado.
- Envíos inciertos quedan bloqueados hasta revisión para evitar doble gasto. FASHN conserva resultados base64 por un tiempo limitado; la recuperación de un checkpoint vencido requiere revisar el estado antes de permitir una nueva generación.
