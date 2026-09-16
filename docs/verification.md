# Verificación de la primera versión

## Identidad y experiencia — 16 septiembre 2026

- Logo original adaptado a WebP 256 px, iconos PNG 192/512 px, Apple 180 px y navegador 48 px. Dimensiones verificadas con Sharp.
- Manifest con nombre Vesti, inicio `/`, modo standalone y rutas de iconos; metadata Apple configurada. La instalación física en iOS/Android queda por comprobar en el dispositivo del propietario.
- Playwright mediante navegador integrado: bienvenida a 390×844 sin desbordamiento horizontal; navegación al probador, combinación de ejemplo guardada y visible en Mis looks; revisión visual a 1440×1000.
- Compilación de producción y comprobación de tipos correctas. No se ejecutaron generaciones pagadas.
- URLs privadas firmadas por lote; subidas idénticas reutilizan un objeto por hash dentro de la carpeta del usuario. La prueba real de subida queda a cargo del propietario.

## Integración económica — 16 septiembre 2026

- 13 pruebas locales correctas, con proveedores simulados: modelo Haiku, una salida 1K por operación, ausencia de reintentos automáticos, rechazo de URLs arbitrarias, checkpoints firmados, caché sin nuevo pago, recuperación de ID previo y rechazo seguro de duplicados inciertos.
- SQL en transacción con rollback: la cuenta A no puede leer ni crear caché para B.
- La URL pública entregada por el propietario respondió HTTP 200 con el título Vesti; esto no certifica las variables de producción ni el flujo de registro.
- No se ejecutaron llamadas de generación pagadas. Las pruebas visuales con fotos reales quedan a cargo del propietario.

## Historial

15 septiembre 2026.

- `npm run build`: correcto con las variables públicas del nuevo proyecto Supabase.
- `npm run typecheck`: correcto.
- `npm test`: 4 pruebas correctas. Las sugerencias no inventan prendas, no duplican IDs, manejan armario vacío y no combinan vestido con pantalones.
- Supabase: RLS habilitado en wardrobes y studio_usage; bucket privado. Asesor de seguridad sin observaciones antes del refuerzo adicional de RLS en tabla privada.
- SQL transaccional con dos usuarios ficticios: el usuario A solo ve su documento y no el de B. Se hizo rollback de todos los datos de prueba.
- Cuota SQL: 20 permisos y un rechazo en 21 solicitudes. Sin sesión devuelve false.
- Navegador: bienvenida, nombre personalizado, navegación al probador, selección de cuatro prendas, guardado de look y aparición en Mis looks.
- Verificación visual a 390×844: navegación inferior, armario de dos columnas. Se corrigieron acceso al perfil móvil y espacio entre palabras al ocultar un salto de línea.

Pendiente: registro/correo con una cuenta real, subida de fotos reales, IA pagada, fidelidad de generación, despliegue público y concurrencia entre dispositivos. Los ensayos visuales usaron la vista previa, no se presentan como pruebas completas de backend/IA.
