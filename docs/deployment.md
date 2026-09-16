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

## Estado actual y nuevo recorrido — 16 septiembre 2026

Las variables de Production, Site URL y redirect público ya se configuraron. La consulta a /auth/v1/settings confirma correo y Google activos y registro permitido.

### Google configurado

Cliente web `Vesti Web` creado en el proyecto Google Cloud `automatic-vent-508819-c6`. Credenciales guardadas directamente en Supabase, sin incluir el secreto en archivos ni en el repositorio. Se mantienen las comprobaciones de nonce y el requisito de correo. Audiencia externa en modo prueba, con el correo del propietario autorizado. Antes de entregar el regalo, añadir el correo de Stephany a los usuarios de prueba de Google y a `VESTI_ALLOWED_EMAILS` en Vercel.

El botón público se verificó hasta la pantalla oficial de inicio de sesión de Google. El propietario debe completar el acceso con su cuenta para comprobar el retorno y la sesión persistente. Referencia de configuración:

1. Crear cliente OAuth de tipo web en Google Auth Platform.
2. Origen autorizado: https://vesti-five.vercel.app
3. Redirect autorizado: https://exgypopxzbmvmgkrehpa.supabase.co/auth/v1/callback
4. Copiar Client ID y Client Secret directamente en Supabase → Authentication → Sign In / Providers → Google; habilitar y guardar. No añadir el secreto al frontend ni al repositorio.
5. Configurar audiencia de Google y, en modo prueba, autorizar los correos que van a entrar. Comprobar acceso en un navegador privado.

Documentación: https://supabase.com/docs/guides/auth/social-login/auth-google

### Prueba económica actual

Crear cuenta por correo y confirmar → elegir nombre y ropa → subir rostro/cuerpo → autorizar IA. Añadir una foto y revisar cada recorte. Agregar conserva el recorte sin coste FASHN; Mejorar solicita una imagen de estudio por 1 crédito. Desde Clóset o Inicio, componer un look y generar inicialmente una sola prenda. La referencia facial está desactivada por defecto: activarla prepara una base por hasta 4 créditos y luego la reutiliza. No implica entrenamiento biométrico.

Model Swap: https://docs.fashn.ai/api-reference/model-swap. Fast/1K cuesta 1 crédito más 3 por referencia facial. Las tarifas son las consultadas al implementar; comprobar cambios del proveedor si se actualiza el modelo.

El clima solo solicita geolocalización al pulsar Ver clima local, redondea coordenadas a dos decimales y conserva la respuesta una hora en sessionStorage. Open-Meteo gratuito para este uso personal no comercial; revisar licencia y servicio si se comercializa.
