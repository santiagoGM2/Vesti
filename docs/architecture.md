# Vesti: producto y arquitectura

## Referencia pública: Alta Daily

Investigación realizada el 15 de septiembre de 2026 sobre https://www.altadaily.com/. Su página pública describe armario digital con fotografías de estudio; avatar/probador virtual; recomendaciones diarias y clima; calendario de estilo; planificación de viajes; wishlist y avisos de precio; comunidad. No se inspeccionó una cuenta privada ni se verificaron detalles internos o algoritmos de Alta. Vesti tiene identidad y componentes originales.

## Experiencia principal

1. Preguntar el nombre al crear una cuenta. No predefinir el nombre de la destinataria.
2. Confirmar correo, elegir estilo y autorizar procesamiento de fotos. Referencias de rostro y cuerpo privadas.
3. Subir imágenes de prendas o outfits. Detectar todas las piezas visibles y revisar nombres/categorías.
4. Generar cada foto de producto conservando color, textura y corte. Guardar solo las prendas aceptadas.
5. Elegir manualmente prendas o usar combinación sugerida. Pedir vista previa con referencias personales.
6. Guardar el look y asignarle una fecha.

## Flujo técnico implementado

Browser → Supabase Auth → JWT → Route Handler autenticado → validación de propietario y consentimiento → cuota SQL atómica → OpenAI → Storage privado → URL firmada → UI.

- Next.js App Router. Componente de interacción en cliente; procesamiento de IA en servidor.
- Supabase Postgres almacena el armario por user_id con RLS. La clave publishable no permite saltarse RLS. No se necesita service-role en la aplicación.
- Las fotos viven en carpetas UUID por propietario; nunca se aceptan URLs arbitrarias para descargar archivos desde la API.
- La API verifica JWT con getUser, lista de correos permitidos, esquema de entrada, propiedad de imágenes y autorización guardada.
- La cuota se reserva de forma atómica; no depende de memoria de una instancia serverless.
- No se crea un sistema de identificación facial: las fotos solo son referencias visuales suministradas por la usuaria.

## IA y coste

Separar comprensión de imágenes de edición. El adaptador inicial usa OpenAI para ambas tareas por sencillez operativa. El modelo de visión y de imagen son variables, no decisiones permanentes.

Opciones investigadas:
- OpenAI GPT Image 2: salida 1024×1536 media US$0,041; alta US$0,165; sumar texto y fotos de entrada. https://developers.openai.com/api/docs/guides/image-generation
- FASHN v1.6 en fal: US$0,075 por generación; orientado a una imagen de prenda y una persona, 864×1296. No asumir outfit multi-prenda en una sola llamada. https://fal.ai/models/fal-ai/fashn/tryon/v1.6
- Nano Banana 2 Edit en fal: US$0,08 por imagen 1K, entradas de múltiples referencias. https://fal.ai/models/fal-ai/nano-banana-2/edit

Precios consultados, sujetos a cambios. El coste total incluye intentos repetidos y fotografías de entrada. Empezar con presupuesto de ensayo de US$10 y medir consumo real; no afirmar cantidad garantizada de imágenes.

## Prueba de aceptación pendiente con imágenes reales

Preparar, con permiso de la usuaria, 10 conjuntos representativos: prenda lisa, estampados, texto, prendas oscuras, vestido, capas, zapatos y accesorios. Comparar los proveedores con exactamente las mismas referencias. Puntuar identidad del rostro, proporciones del cuerpo, fidelidad del color/corte/texto, correspondencia entre cada prenda y resultado, latencia y coste real. Rechazar resultados que cambien cuerpo o identidad. La elección definitiva requiere estas mediciones.

## Evolución prevista

Antes de publicar como producto final: probar correo y recuperación de contraseña, borrar datos/fotos desde el perfil, trabajos de IA persistentes con progreso e idempotencia, revisión visual de entradas, optimización de fotos desde móviles/HEIC, refresh de URLs firmadas, recuperación de borrados, reintentos y límites mensuales. Una nueva fase añade estilista basado en preferencias y ocasión, clima opt-in, viajes y wishlist.

Antes de escalar: tablas profiles/garments/outfits/outfit_items/jobs/assets, control de concurrencia y versiones, deduplicación de prendas entre fotos, limpieza automática de originales/huérfanos y observabilidad sin registrar fotos ni secretos. Preservar políticas RLS por usuario.
