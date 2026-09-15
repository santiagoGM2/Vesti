# Verificación de la primera versión

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
