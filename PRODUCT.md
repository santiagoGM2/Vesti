# Vesti

## Register

product

## Users

Un armario personal para la pareja del propietario, accesible desde móvil y ordenador. El nombre se recoge al crear la cuenta; ninguna pantalla depende de un nombre fijo. Contexto confirmado en el encargo y en README.md.

## Product Purpose

Guardar prendas, descubrir combinaciones y visualizar conjuntos con las propias fotos. Las generaciones deben ser explícitas y económicas; los resultados se reutilizan. El propietario realizará las pruebas pagadas.

## Brand Personality

Personal, cálida y sencilla. Referencia funcional: Alta Daily. Identidad visual: logo V/percha aguamarina suministrado por el propietario.

## Anti-references

Evitar complejidad que impida el uso cotidiano, gastos automáticos e interfaces que confundan una ilustración con una generación real. No hay sitios adicionales rechazados por el propietario.

## Design Principles

- Pedir solo lo necesario en cada paso.
- Dar protagonismo a las prendas y a las acciones cotidianas.
- Mostrar el coste antes de generar y conservar el resultado.
- Personalizar a partir de los datos de la cuenta.

## Accessibility & Inclusion

Base de ingeniería: controles táctiles de 44 px, foco visible, formularios etiquetados, contraste de texto y preferencia de movimiento reducido. No se han comunicado necesidades específicas; no se presume ninguna condición personal.

## Rediseño guiado por capturas — 16 septiembre 2026

- Google/correo → nombre → ropa femenina/masculina/ambas → introducción avatar → rostro/cuerpo, con opción de omitir.
- Inicio: nombre, fecha local, clima solicitado por la persona, ideas por ocasión y estado vacío.
- Clóset: búsqueda, categorías ampliadas, favoritos, edición de nombre/marca/color/categoría, cola de hasta diez fotos, detección de hasta treinta piezas visibles por foto.
- Perfil: fotos privadas, consentimiento, cantidades, looks guardados con fecha y avatar si se generó.
- Clasificación y bounding boxes: Claude Haiku. Los recortes son aproximados, no máscaras perfectas; el usuario los revisa. Edit mejora una pieza por solicitud.
- Recomendaciones: ranking determinista de inventario propio por formalidad, abrigo, favoritos y preferencias. No requiere entrenar un modelo ni gastar IA al navegar.
- Probador: hasta seis piezas, pasos FASHN cacheados. Referencia facial opcional con Model Swap, cuatro créditos máximos adicionales, reutilizada entre looks; por defecto cuerpo original para ahorrar.
- No se prometen detección exhaustiva, marcas correctas o ajuste físico exacto; calidad por comprobar con las fotos del propietario.
