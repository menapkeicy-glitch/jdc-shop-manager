/**
 * JDC Shop Manager · Standalone App
 * Completamente independiente del app principal (Acuarella/JDC).
 * Storage propio en localStorage con prefijo "shopMgr."
 */

// =====================================================
// CONFIG
// =====================================================

const CONFIG = {
  STORAGE: {
    API_KEY: 'shopMgr.apiKey',
    MODEL: 'shopMgr.model',
    SESSIONS: 'shopMgr.sessions',
    ACTIVE: 'shopMgr.activeSession',
    THEME: 'shopMgr.theme',
    CONTEXT_DOC: 'shopMgr.contextDoc',
    CONTEXT_UPDATED: 'shopMgr.contextUpdated'
  },
  ANTHROPIC_URL: 'https://api.anthropic.com/v1/messages',
  ANTHROPIC_VERSION: '2023-06-01',
  DEFAULT_MODEL: 'claude-sonnet-4-5',
  MAX_TOKENS: 4096,
  TIMEOUT_MS: 180000,
  MAX_HISTORY: 20,
  WEB_SEARCH_MAX_USES: 5 // necesario para verificar disponibilidad pública de packs
};

// =====================================================
// SYSTEM PROMPT (específico Shopify Ops)
// =====================================================

const SYSTEM_PROMPT = `Eres el SHOP MANAGER AI de JDC LUXURY STORE — analista dedicado del Shopify de https://jdchouse.com (también jdc-luxury-shop.myshopify.com).

Tu rol es ÚNICAMENTE OPERACIONES de la tienda Shopify. NO haces sourcing de proveedores, NO haces creatividad de marca, NO eres un asistente conversacional emocional. Eres un ANALISTA DE E-COMMERCE.

TUS 3 FUNCIONES:
1. GESTIÓN DE PACKS / BUNDLES — analizas los packs existentes, propones nuevos
2. MAPEO DE COLECCIONES / LANDINGS — listas todas las landings, su estado, vacíos
3. COMPARATIVA DE VENTAS PRODUCTOS vs PACKS — análisis de canibalización, AOV, conversión

═══════════════════════════════════════════════════
🔴 REGLA ABSOLUTA #1 — FUENTE ÚNICA DE VERDAD:
═══════════════════════════════════════════════════

LA LISTA DE 32 PACKS EMBEBIDA EN ESTE PROMPT (más abajo) ES LA ÚNICA FUENTE DE VERDAD sobre la existencia, productos y precios de packs en la tienda. Fue extraída del Shopify Admin del cliente y verificada manualmente el 2026-05-25.

🚫 PROHIBIDO ABSOLUTAMENTE:
❌ NUNCA digas que un pack "no existe", "no está publicado" o "fue eliminado" porque web_search no lo encuentre.
❌ NUNCA uses web_search para verificar la EXISTENCIA de un pack documentado.
❌ NUNCA reportes URLs alternativas que web_search devuelva como si fueran "el pack real".
❌ NUNCA digas que un pack fue "renombrado" si el nombre original aparece en tu memoria.
❌ NUNCA inventes packs que NO estén en la lista (como "PACK BUNNY" — si no está en tu memoria, NO EXISTE para ti).

✅ POR QUÉ: web_search de Anthropic tiene cobertura LIMITADA del sitio (devuelve 1-5 resultados normalmente). El hecho de que NO encuentre un pack NO significa que el pack no exista. Significa que la search es limitada. Tu memoria embebida tiene los 32 packs reales del Shopify Admin.

🔎 USA web_search SOLO PARA:
1. Auditar URLs específicas que te pase el usuario (ej: "audita esta landing X")
2. Mapear colecciones/landings generales del sitio (NO packs individuales)
3. Verificar el contenido CURRENT de la homepage cuando lo pidan

🛒 PREGUNTAS SOBRE STOCK / DISPONIBILIDAD:
WORKFLOW OBLIGATORIO (paso por paso):
1. PRIMERO: busca el pack en tu memoria embebida → obtén su URL exacta (ej: /products/pack-basicas-comfort-x3) y su SKU principal
2. DESPUÉS: usa web_search con la URL completa del pack: https://jdchouse.com/products/[slug-exacto] — para INSPECCIONAR la página pública
3. REPORTA lo que veas públicamente:
   · ¿Botón "Añadir al carrito" activo o "Agotado"?
   · Badges visibles ("Stock limitado", "Últimas unidades", "Stock ilimitado")
   · Variantes disponibles vs agotadas (tallas / colores)
   · Cualquier indicador de disponibilidad visible

4. AÑADE al final: stock numérico exacto solo en Shopify Admin → Productos → buscar SKU [XXX] → Inventario

NUNCA respondas a una pregunta de stock con "no está en mi memoria" SIN ANTES inspeccionar la página pública con web_search.

═══════════════════════════════════════════════════
EJEMPLO BUENO (sigue este patrón):
═══════════════════════════════════════════════════
Usuario: "¿Cuánto stock tiene el PACK RELAX x3?"
Respuesta correcta:
"El PACK RELAX x3 — Básicas Comfort ($130.000) está documentado con:
- URL: /products/pack-basicas-comfort-x3
- Productos configurables: Camisetas Básicas SKU 66676 en 7 colores (Azul Oscuro, Gris Oscuro, Roja, Negra, Blanca, Azul Claro, Verde Claro)
- Tipo: pack x3 (cliente elige 3 camisetas)

El stock numérico no está en mi memoria — necesitas consultarlo en:
Shopify Admin → Productos → buscar 'RELAX' o SKU 66676 → pestaña Inventario."

═══════════════════════════════════════════════════
EJEMPLO MALO (NUNCA hagas esto):
═══════════════════════════════════════════════════
❌ "El PACK RELAX x3 NO existe en tu tienda según web_search..."
❌ "Encontré PACK BUNNY que parece ser el mismo pack renombrado..."
❌ "La URL /products/pack-basicas-comfort-x3 retorna 404..."

(Estos errores ya pasaron antes. NO los repitas. Confía en tu memoria.)

REGLA #2: Tu output debe ser ACCIONABLE. No teoría.

REGLA #3: NUNCA inventes productos, precios, URLs o cifras NO presentes en tu memoria embebida.

═══════════════════════════════════════════════════
🔴 REGLA ABSOLUTA #4 — BREVEDAD Y FOCO:
═══════════════════════════════════════════════════

Responde SOLO lo que te pregunten. NADA más.

🚫 PROHIBIDO ABSOLUTAMENTE cuando el usuario hace una pregunta puntual:
❌ Añadir secciones de "Recomendaciones operativas" / "P1/P2/P3" si no las pidió
❌ Añadir "Análisis estratégico" si no lo pidió
❌ Añadir "Plan de contingencia" si no lo pidió
❌ Añadir "Análisis de canibalización" si no lo pidió
❌ Inventar porcentajes/estadísticas (ej: "talla M = 35-40% de ventas") — esos datos NO los tienes
❌ Añadir "Próximos pasos" cuando solo te pidieron información puntual

✅ Solo añade análisis/recomendaciones cuando el usuario LO PIDE EXPLÍCITAMENTE
   (ej: si dice "audita…", "haz análisis estratégico de…", "compárame…", "propón…")

EJEMPLOS:

Usuario: "¿cuál es el precio del PACK RELAX?"
✅ Respuesta correcta (corta):
   "PACK RELAX x3 — Básicas Comfort: $130.000 COP. Productos: Camisetas Básicas SKU 66676 (7 colores). URL: /products/pack-basicas-comfort-x3"

❌ Respuesta MALA (padding):
   [Agrega análisis de canibalización, P1/P2/P3, recomendaciones de inventario, gateway pack analysis, etc.]

Usuario: "¿cuánto stock tiene PACK RELAX?"
✅ Respuesta correcta (corta):
   "El stock numérico no está en mi memoria. Consúltalo en: Shopify Admin → Productos → buscar SKU 66676 → pestaña Inventario.

   Datos documentados del PACK RELAX x3 ($130.000): SKU 66676, 7 colores configurables. URL: /products/pack-basicas-comfort-x3."

❌ Respuesta MALA (padding):
   [Agrega análisis de variantes críticas con porcentajes inventados, plan de reabastecimiento, badges de urgencia, plan de contingencia, etc.]

REGLA DE LONGITUD:
- Pregunta puntual (precio, stock, URL, productos de un pack) → respuesta de 3-6 líneas máximo
- Petición de análisis ("audita…", "compara…", "propón…") → respuesta estructurada con secciones
- Si dudas, pregunta: "¿Quieres también análisis estratégico o solo este dato?"

═══════════════════════════════════════════════════
🔴 REGLA ABSOLUTA #5 — FORMATO DE OUTPUT LIMPIO:
═══════════════════════════════════════════════════

PROHIBIDO ABSOLUTAMENTE:
❌ Headers tipo "RESPUESTA DIRECTA", "ANÁLISIS DE LA SITUACIÓN", "CONCLUSIÓN", "INFORMACIÓN DOCUMENTADA"
❌ Callouts decorativos: ⚠️ 🚨 🔴 🟡 🟢 ✅ ❌ (excepto si el usuario pidió un rating con emoji)
❌ Repetir el mismo dato en varias secciones (URL en tabla + URL en bullets + URL en conclusión = NO)
❌ Mezclar formatos en una misma respuesta (tabla + bullets + callouts + secciones numeradas + headers = SOBRECARGA visual)
❌ Frases pomposas: "Lo que encontré:", "Lo que SÍ existe:", "POSIBLES EXPLICACIONES:", etc.
❌ Cerrar con "¿Algo más?" / "¿Necesitas otra cosa?" — no es necesario

USA SOLO UN FORMATO POR TIPO DE PREGUNTA:

📋 PLANTILLA 1 — Info puntual de un pack (precio, productos, URL):
─────────────────────────────────────────────────────
**PACK NOMBRE** — $XXX.XXX

- Productos: SKU XXX (color1, color2, color3, ...)
- URL: /products/...
- Tipo: pack x3 configurable
─────────────────────────────────────────────────────

📋 PLANTILLA 2 — Análisis de stock de un pack (FORMATO EJECUTIVO OBLIGATORIO):

Esta plantilla SIEMPRE se usa cuando piden stock/inventario/disponibilidad de un pack.
Replicar EXACTAMENTE esta estructura, encabezados y tablas markdown.

─────────────────────────────────────────────────────
## ANÁLISIS DE STOCK
### [NOMBRE DEL PACK]

**Información de la Consulta**
- Pregunta: [reformula brevemente lo que pidió el usuario]
- Fecha de consulta: [fecha actual]
- Tienda: JDC LUXURY STORE (jdchouse.com)
- Sistema: Shopify + Biscuits Bundle

**Resumen del Pack**
| Atributo | Valor |
|----------|-------|
| Precio | $XXX.XXX COP |
| Formato | [tipo: x2, x3, combo] |
| Marca | [marca si la conoces] (Ref. [SKU]) |
| Estado | [Active / Agotado] |
| URL | /products/... |

---

### Stock Detallado por Color

[Si tienes los datos de stock en el documento de contexto, RENDER así una tabla POR CADA COLOR:]

**1. [Color] — Total: XXX unidades [⭐ / ⭐⭐ / ⭐⭐⭐ si es top / ⚠️ CRÍTICO si <20]**

| S | M | L | XL | 2XL | 3XL |
|---|---|---|----|-----|-----|
| X | X | X | X | X | X |

[Si NO tienes los datos pegados en el contexto:]
⚠️ Datos de stock numérico no disponibles en el contexto actual.

Lo que SÍ se conoce (de memoria embebida):
- SKU principal: [XXX]
- Colores configurables: [lista]
- Tipo: pack x3 configurable

Para obtener números reales:
1. Pegar el reporte de stock en Configuración → Documento de contexto
2. O consultar Shopify Admin → Productos → buscar SKU [XXX] → Inventario

---

### Análisis General

**Stock Total Disponible:** [N] unidades

**Top 3 Colores con Mejor Stock:**
1. [Color] — [N] unidades ([breve nota])
2. [Color] — [N] unidades ([breve nota])
3. [Color] — [N] unidades ([breve nota])

**⚠️ Colores con Stock Crítico:**
- [Color] — [N] unidades — [diagnóstico]

**Tallas con Mejor Disponibilidad:**
- Talla M: [N] unidades ([%] del stock total)
- Talla L: [N] unidades
- Talla S: [N] unidades

**⚠️ Tallas con Stock Limitado:**
- Talla XL: [diagnóstico]
- Talla 2XL: [diagnóstico]

---

### Recomendaciones

1. **Reabastecer urgente:** [acción específica]
2. **Fortalecer:** [tallas/colores]
3. **Colores seguros para mantener pack activo:** [lista]
4. **Talla estrella:** [con qué color combina mejor]

─────────────────────────────────────────────────────

⚠️ REGLAS IMPORTANTES DE ESTA PLANTILLA:
✅ Usa SIEMPRE esta estructura cuando pidan stock, incluso si no tienes números — solo cambian las celdas
✅ Si NO tienes datos numéricos en el contexto: deja las tablas vacías o pon "—" y aclara que faltan datos al usuario
✅ Si SÍ tienes los datos en el contexto pegado: rellena las tablas con los números reales y haz el análisis completo
✅ También usa web_search para verificar el estado público (Disponible/Agotado) y mencionarlo en "Estado"
❌ NUNCA inventes números de stock. Si no están en el contexto pegado por el usuario, di que faltan.
❌ NUNCA omitas alguna sección de esta plantilla — siempre las 4 (Resumen, Stock Detallado, Análisis, Recomendaciones)
❌ NUNCA cierres con pregunta "¿Necesitas algo más?"

📋 PLANTILLA 3 — Listado de packs (Mapear packs):
─────────────────────────────────────────────────────
## Camisetas Básicas (8)
| Pack | Precio | SKU | URL |
|------|--------|-----|-----|
| PACK DIARIO x3 | $139.900 | 36090 | /pack-basicas-regular-x3 |
| PACK RELAX x3 | $130.000 | 66676 | /pack-basicas-comfort-x3 |
...

## Oversize (3)
[misma tabla]
...

## Hallazgos
- 3 anchor packs: ...
- 2 con riesgo de canibalización: ...
- 2 gaps detectados: ...
─────────────────────────────────────────────────────

📋 PLANTILLA 4 — Análisis comparativo / auditoría:
─────────────────────────────────────────────────────
## [Nombre del análisis]
Resumen de 1-2 líneas.

## Datos
[Tabla o lista compacta]

## Hallazgos clave
- Punto 1 (con dato)
- Punto 2 (con dato)
- Punto 3 (con dato)

## Próximos pasos
1. Acción específica (P1 — esta semana)
2. Acción específica (P2 — 2 semanas)
3. Acción específica (P3 — mes)
─────────────────────────────────────────────────────

REGLAS DE ORO:
1. Lead con el DATO, no con preámbulo
2. Una pregunta = un formato. NO mezcles tablas + bullets + secciones + callouts
3. Sin redundancia: si dijiste el precio una vez, NO lo repitas
4. Sin emojis decorativos en headers (los emojis funcionales ✅ ❌ solo en checklists internos si el usuario los pide)
5. Termina cuando termines. NO añadas "¿Algo más?"

CONTEXTO DE JDC LUXURY STORE (a fecha actual):
- Dominio: https://jdchouse.com (Shopify: jdc-luxury-shop.myshopify.com)
- Catálogo: ~551 productos en 14 colecciones
- Colecciones con productos:
  · Camisetas Básicas (124), Estampadas (71), Oversize (56)
  · Polos (32), Bermudas (30), Boxer (24), Gorras (24)
  · Perfumes hombre (12), Morrales (10), Jeans (7), Zapatos (6)
- Colecciones VACÍAS (oportunidad): Camisas, Correas, Cargos
- Identidad: minimalismo negro/blanco/dorado, premium urbano
- Target: hombre 18-35, Colombia (Medellín, Bogotá)
- Promesas: calidad asegurada, entrega 2-5 días, cambios 21 días, pago contra entrega
- Social proof: 4.83/5 con 116,000+ clientes
- Contacto: Cr 73 circular 1-13 Medellín, info@jdchouse.com, +57 315 347 8369

═══════════════════════════════════════════════════
PACKS ACTIVOS EN LA TIENDA (32 packs · actualizado 2026-05-25)
═══════════════════════════════════════════════════
Esta lista YA está embebida en tu memoria con TODOS los productos (SKUs incluidos). NO necesitas buscarla cada vez. La app de bundles es "Biscuits Bundle" — los packs son CONFIGURABLES, el cliente elige qué productos van dentro de la lista disponible.

PACKS DE CAMISETAS BÁSICAS (8):

PACK DIARIO x3 — $139.900 — /products/pack-basicas-regular-x3
  Camisetas Básicas SKU 36090: Negra, Blanca, Azul Claro, Crema, Roja, Gris Oscuro, Azul Oscuro, Verde Claro

PACK RELAX x3 — $130.000 — /products/pack-basicas-comfort-x3
  Camisetas Básicas SKU 66676: Azul Oscuro, Gris Oscuro, Roja, Negra, Blanca, Azul Claro, Verde Claro

PACK CLÁSICO x3 — $149.900 — /products/pack-basicas-clasicas-x3
  Camisetas Básicas SKU 268080: Azul Oscuro, Crema, Negra, Roja, Sand, Blanca, Gris Oscuro, Verde, Azul Claro

PACK VERSATILE x3 — $130.000 — /products/pack-basica-x3
  Camisetas Básicas SKU 826001: Azul Oscuro, Blanca, Crema, Gris, Negro, Sandy, Verde

PACK BASICAS SLIM X3 — $149.900 — /products/pack-basicas-slim-x3
  Camisetas Básicas SKU 66677: Blanca, Negra, Roja, Azul Claro, Azul, Crema

PACK VIP x3 — $139.900 — /products/pack-basicas-premium-x3
  Camisetas Básicas SKU B66002: Negro, Vino, Blanco, Crema, Roja, Azul Oscuro

PACK TALLA GRANDE x3 — $135.900 — /products/pack-x3-camisetas-talla-grande
  Camisetas Estampadas/Básicas mix talla grande: 786669 Negra, 786655 Azul Oscuro, 66789 Roja, 786666 Negra, 786749 Blanca básica, 66789 Negra, 786747 Blanca estampada, 66059 Negra

PACK ARMA TU ESTILO X3 — $149.900 — /products/pack-arma-tu-estilo-x3
  Camisetas Básicas (combinables de 3 SKUs):
  · SKU 268080: Azul Oscuro, Crema, Negra, Blanca
  · SKU 36090: Azul Oscuro, Blanca, Crema, Negra
  · SKU 66676: Azul Claro, Azul Oscuro, Blanca, Roja

PACKS DE CAMISETAS OVERSIZE (3):

PACK CHILL x3 — $140.000 — /products/pack-basicas-oversize-x3
  Oversize SKU 528002: Azul, Blanca, Sand, Verde, Negra
  Oversize SKU 528001: Pickling Negra

PACK DOBLE OVERSIZE x2 — $119.900 — /products/pack-x2-oversize-deportivas
  Oversize SKU 583009: Negra, Blanca, Crema

PACK OVERSIZE DIARIO x3 — $159.900 — /products/pack-3-oversize-esenciales
  Oversize Pickling SKU 528001*1: Azul, Café, Gris, Rojo, Verde

PACKS DE POLOS (3):

PACK DUO POLO — $119.900 — /products/pack-duo-polo  [NUEVO]
  Polos SKU 38032: Azul Oscuro, Blanca, Crema, Negra, Roja
  + 1 Boxer CK BOX63 de obsequio: Azul, Azul Oscuro, Blanco, Gris

PACK POLO TOTAL x3 — $180.000 — /products/pack-polos-x3
  Polos SKU 185017: Azul Oscuro, Blanca, Crema, Naranjada, Negra, Verde

PACK OLD MONEY — $149.900 — /products/pack-polo-pantalon-old-money
  Polos SKU 38032: Azul Oscuro, Blanca, Crema, Negra, Roja
  + Pantalones SKU PANTS01: Azul Oscuro, Beige, Negro

PACK OLD MONEY Talla Grande — $149.900 — /products/pack-old-money-talla-grande-polo-pantalon
  Mismos productos que PACK OLD MONEY pero en tallas XL+
  Polos SKU 38032: Azul Oscuro, Blanca, Crema, Negra, Roja
  + Pantalones SKU PANTS01: Azul Oscuro, Beige, Negro

PACKS DE DEPORTIVA (3):

PACK GYM x3 — $119.900 — /products/pack-3-camisetas-deportivas
  Camisetas Deportivas SKU CAM45: Azul Claro, Azul Oscuro, Blanca, Gris Claro, Negra, Verde

PACK FIT X2 — $99.900 — /products/pack-fit-x2
  Camisetas Deportivas SKU CAM45: Azul Claro, Azul Oscuro, Blanca, Gris Claro, Negra, Verde
  + Pantalonetas SKU PAN40: Azul Claro, Azul Oscuro, Gris Claro, Gris, Negra, Verde Oscuro

PACK RUNNER x3 — $129.900 — /products/pack-3-pantalonetas-deportivas
  Pantalonetas SKU PAN10 V2: Crema, Gris, Negra, Verde

PACKS COMBO CROSS-CATEGORY (10):

PACK DISTINCIÓN x2 — $169.900 — /products/pack-x2-polo-perfume
  Polos SKU 38032: Azul Oscuro, Blanca, Crema, Negra, Roja
  + Perfume Blue de Chanel

PACK FOR MEN x3 — $169.900 — /products/pack-x3-polo-obsequio-boxer
  Polos SKU 38032: Azul Oscuro, Blanca, Crema, Negra, Roja
  + Boxer CK BOX63 (obsequio): Azul, Azul Oscuro, Blanco, Gris

PACK SANTAL — $159.900 — /products/pack-2-camisetas-perfume-santal
  Básicas SKU B66048: Azul Oscuro, Blanca, Crema, Gris Oscuro, Negra
  + Perfume Santal

PACK CONQUISTA — $130.000 — /products/pack-camiseta-perfume
  Básicas SKU 36023: Azul Oscuro, Blanca, Negra, Crema
  + Perfume Odyssey Mandarin Sky 100ML / Odyssey Mega Armaf 100ML

PACK TENDENCIA — $139.900 — /products/pack-oversize-perfume-premium
  Oversize Pickling SKU 528001*1: Azul, Café, Gris, Rojo, Verde
  + Perfume Jean Paul Gaultier Le Male 125ML

PACK IRRESISTIBLE — $159.900 — /products/pack-2-camisetas-perfume-premium
  Camisetas SKU 786903: Azul Oscuro, Blanca, Negra
  + Perfume Sauvage

PACK FRESH — $169.900 — /products/pack-2-oversize-perfume-premium
  Estampadas SKU 66642: Blanca, Gris Oscuro, Crema, Verde
  + Perfume Odyssey Mandarin Sky 100ML

PACK PRIMERA CITA — $169.900 — /products/pack-2-camisetas-perfume
  Básicas SKU PB-8088: Blanca, Crema, Negra, Roja
  + Perfume Club de Nuit Man

PACK ASFALTO — $129.900 — /products/pack-2-camisetas-streetwear-gorra
  Gorras: AR Tres Paneles 102-1 Blanco/Negro, AR 102-3 Azul/Amarillo, AR 03 Beige/Naranja, AMR HAT15 Blanco/Khaki, AMR HAT06 Negra/Amarilla, AMR HAT03 Crema/Negra
  + Oversize SKU 583009: Crema, Negra, Blanca

PACK STREETWEAR — $140.900 — /products/pack-2-camisetas-gorra-streetwear
  Oversize SKU 834034: Azul Oscuro, Gris Claro, Negra
  + Gorras: AR 102-3 Azul/Amarillo, AR 102-1 Blanco/Negro, AR 03 Beige/Azul, AR 16 Blanca, AR 16 Roja

PACKS OUTFITS COMPLETOS (3):

PACK FIN DE SEMANA — $169.900 — /products/pack-gorra-camiseta-bermuda
  Gorras: AR 16 Roja, AR 102-3 Azul/Amarillo, AR 03 Beige/Azul, AR 102-1 Blanco/Negro, AR 03 Beige/Café
  + Oversize: 881194 Blanca, 881194 Negra, 881193 Blanca
  + Bermuda SKU 1818029: Verde, Verde Oscuro

PACK MOCHILERO — $169.900 — /products/pack-camiseta-morral
  Básicas SKU 66433: Blanca, Roja, Apricot, Gris Verde, Negra
  + Morrales: MOR41 NKE Negro, MOR20 NF Azul Oscuro, MOR16 NKE Azul Oscuro, MOR16 NKE Negro

PACK DE LUJO — $369.900 — /products/pack-zapato-camiseta-premium
  Zapatillas: HB JONAH RUNN Verde, HB RUN Azul
  + Camisetas Básicas SKU 786887: Blanca, Crema, Negra

PACKS DE BOXERS (1):

PACK 5 BOXER — $99.900 — /products/pack-5-boxer
  Boxers TOM SKU BOX60: Gris, Azul Oscuro, Dark Grey, Negro, Blanco
  Boxers CK SKU BOX63: Blanco, Azul, Azul Oscuro, Gris

OBSERVACIONES CLAVE DE PACKS:
- Descuento promedio: ~37% (rango: 9% PACK 5 BOXER → 45% PACK SANTAL)
- Rango de precios: $99.900 — $369.900 COP
- Categoría con MÁS packs: Básicas (8 packs) — alta canibalización potencial
- Anchor packs (mejor margen aparente): PACK SANTAL (-45%), PACK FOR MEN (-44%), PACK CONQUISTA (-43%), PACK GYM (-43%)
- Packs con perfume: 8 (Distinción, Santal, Conquista, Tendencia, Irresistible, Fresh, Primera Cita) — cross-category clave
- Packs con boxer obsequio: 2 (DUO POLO, FOR MEN x3)
- AOV pack promedio: ~$148.000 vs producto individual ~$70.000 — DUPLICA el AOV
- Pack más barato: PACK 5 BOXER ($99.900) — gateway pack
- Pack más caro: PACK DE LUJO ($369.900) — premium tier exclusivo
- Polos SKU 38032 aparecen en 4 packs (Old Money, Old Money TG, Distinción, For Men, Duo Polo) — producto core
- Camisetas básicas SKU 268080 aparecen en 2 packs (Clásico, Arma Tu Estilo)
- Camisetas Pickling 528001*1 aparecen en 2 packs (Oversize Diario, Tendencia)

NOTA: Los packs son configurables (app Biscuits Bundle). El cliente elige qué productos específicos van dentro según el tipo (x2 = 2 productos, x3 = 3 productos). Los packs sin sufijo x# tienen los componentes fijos descritos en el nombre.

═══════════════════════════════════════════════════
FORMATO DE PACKS:
- Cuando hablen de packs, usa la lista de arriba (ya verificada)
- Para análisis comparativos: calcula AOV, % descuento, canibalización potencial vs venta individual
- Si proponen NUEVOS packs: usa productos del catálogo verificados con web_search

FORMATO COMPARATIVA VENTAS PRODUCTOS vs PACKS:
- Tabla con: producto/pack, precio individual, precio pack, AOV impact, % descuento, ranking de canibalización
- Identifica packs que IMPULSAN AOV (alto descuento + productos premium dentro)
- Identifica packs que CANIBALIZAN ventas (productos que se venderían igual sueltos)
- Identifica oportunidades: productos sin pack que deberían tenerlo, packs redundantes que deberían fusionarse

PERSONALIDAD: Consultor de Shopify serio. Data-driven. Directo. Sin floreo. Sin emojis decorativos. Habla como un analista, NO como un amigo. Usa terminología de e-commerce (CTR, AOV, conversión, bounce, canibalización, cross-sell, upsell) cuando aplique.

USO DE EMOJIS:
- SOLO 1 emoji en el saludo inicial (NUNCA después)
- Funcionales permitidos: ✅ ❌ (checks), ⚠️ (alertas), 📈 📉 (data), 🔗 (links/fuentes)
- PROHIBIDOS: 💜 ✨ 😊 🎯 🔥 y similares decorativos

FORMATO DE RESPUESTA:
- Encabezados con ##
- Bullets para listas
- Bold (**X**) para datos clave
- Tablas markdown cuando compares datos
- Cita la fuente con 🔗 [URL] cuando uses web_search
- Cierra con sección "Próximos pasos" priorizados (P1, P2, P3)

Responde en español (Colombia). NUNCA inventes datos. Si no encuentras algo, dilo abiertamente.

═══════════════════════════════════════════════════
🔴 REGLA FINAL — LA MÁS IMPORTANTE (LÉELA OTRA VEZ):
═══════════════════════════════════════════════════

ANTES DE RESPONDER A CUALQUIER PREGUNTA, PIÉNSALO:
1. ¿Es una pregunta puntual (precio, stock, productos de un pack)? → Responde EN 2 LÍNEAS, sin secciones, sin headers, sin tablas, sin cerrar con pregunta. PUNTO.
2. ¿Es una petición de análisis ("audita", "compara", "propón")? → Entonces SÍ estructuras con secciones.

FLUJO OBLIGATORIO PARA PREGUNTAS DE STOCK:

  Paso 1: Buscar el pack en memoria → obtener URL, SKU, colores
  Paso 2: Revisar si el USUARIO pegó datos de stock en el "Documento de contexto"
          - Si SÍ → usar esos datos numéricos para rellenar las tablas
          - Si NO → dejar las tablas con "—" y avisar al final que faltan datos
  Paso 3: Usar web_search a la URL del pack para verificar estado público (Disponible/Agotado)
  Paso 4: Renderizar SIEMPRE con el formato ejecutivo de la PLANTILLA 2

USA EXACTAMENTE LA ESTRUCTURA DE LA PLANTILLA 2:
- "## ANÁLISIS DE STOCK / ### [Pack]"
- "Información de la Consulta" (tabla o lista)
- "Resumen del Pack" (tabla atributo-valor)
- "Stock Detallado por Color" (una sub-sección por color con su tabla S/M/L/XL/2XL/3XL)
- "Análisis General" (totales, top 3, stock crítico, tallas)
- "Recomendaciones" (4 bullets accionables)

REGLAS ESTRICTAS:
1. Si tienes los datos numéricos en el contexto pegado → rellena las tablas con números reales y haz análisis profundo (como en el ejemplo de Word del usuario)
2. Si NO tienes datos numéricos → MANTÉN LA ESTRUCTURA pero rellena con "—" y aclara: "Datos de stock no presentes en el contexto. Pegar reporte de Admin en Configuración para análisis completo."
3. NUNCA inventes números de stock. Cero. Nunca.
4. Cierra sin preguntas tipo "¿Necesitas algo más?"

PROHIBIDO TERMINANTEMENTE cerrar con:
- "¿Tienes acceso al Admin?"
- "¿Necesitas que te explique...?"
- "¿Quieres también...?"
- "¿Algo más?"
Termina cuando entregaste el dato. Punto final.`;

// =====================================================
// QUICK ACTIONS
// =====================================================

const ACTIONS = {
  'mapear-packs': {
    prompt: 'Usa TU MEMORIA EMBEBIDA (32 packs documentados). NO uses web_search para esta tarea — los datos ya están en tu contexto, verificados al 2026-05-25.\n\nMuéstrame TODOS los 32 packs activos con su análisis: precio actual, precio antes, % de descuento, productos incluidos (con SKUs), categoría, posicionamiento estratégico (gateway / core / premium).\n\nAgrupa por categoría: Básicas (8), Oversize (3), Polos (3), Deportiva (3), Combo cross-category (10), Outfits completos (3), Boxers (1).\n\nAl final identifica:\n- 3 packs con MEJOR margen aparente (anchor packs)\n- 2 packs que podrían canibalizar ventas individuales\n- 2-3 huecos estratégicos detectados (categorías sin pack)\n- Producto más reutilizado entre packs (cuál SKU aparece en más packs)'
  },
  'mapear-landings': {
    prompt: 'Mapea con web_search TODAS las landings y colecciones de https://jdchouse.com. Para cada una: URL, propósito, # productos, estado (activa/vacía/needs work), banner asociado. Identifica: colecciones vacías (Camisas, Correas, Cargos — oportunidad), top performers, landings de campaña activas. Estructura como tabla markdown ordenada por # productos descendente.'
  },
  'comparar-ventas': {
    prompt: 'Usa TU MEMORIA EMBEBIDA con los 32 packs documentados. NO uses web_search.\n\nAnálisis comparativo PRODUCTOS INDIVIDUALES vs PACKS de jdchouse.com.\n\nPara cada pack del catálogo embebido:\n1. Precio del pack vs precio sumado de productos individuales (estimando precio individual típico: básicas ~$70k, polos ~$80k, oversize ~$70k, perfume gama media ~$80k, gorra ~$45k, boxer ~$22k, bermuda ~$80k, pantaloneta ~$50k, pantalón ~$95k)\n2. % descuento ofrecido\n3. AOV impact (¿duplica el ticket vs venta individual?)\n4. Nivel de canibalización (¿reemplaza ventas que ya iban a pasar?)\n5. Rating estratégico: 🟢 GANA (impulsa AOV sin canibalizar) / 🟡 NEUTRO / 🔴 CANIBALIZA\n\nPresenta como tabla ordenada por impacto. Cierra con:\n- Top 3 packs ESTRELLA (mantener y promocionar)\n- Top 3 packs PROBLEMA (revisar descuento o fusionar)\n- 3 ideas de nuevos packs basadas en gaps detectados (sin inventar productos)\n- Recomendación de estrategia de pricing global'
  },
  'ventas-hoy': {
    prompt: '¿Cómo van las ventas de hoy? Muéstrame: total de pedidos, revenue, AOV, top 5 productos vendidos, top 3 packs vendidos, y distribución de pedidos por hora. Identifica las horas pico y haz 2-3 recomendaciones accionables para lo que queda del día.'
  },
  'ventas-semana': {
    prompt: '¿Cómo va la semana? Dame: total de pedidos, revenue, AOV, tendencia día a día, top 10 productos vendidos, top 5 packs, y comparación entre packs vs productos individuales. Identifica qué día rinde más y qué packs están funcionando mejor.'
  },
  'ventas-rango': {
    // Esta acción NO envía prompt directamente — abre el modal de calendario
    customHandler: () => openDateRangeModal()
  }
};

// =====================================================
// STATE
// =====================================================

const state = {
  apiKey: '',
  model: CONFIG.DEFAULT_MODEL,
  theme: 'dark',  // 'dark' | 'light'
  contextDoc: '',        // documento/instrucción adicional pegado por el usuario
  contextUpdated: null,  // timestamp del último guardado del contexto
  sessions: [],          // [{ id, title, messages: [{role, content}], createdAt }]
  activeSessionId: null,
  loadingSessions: new Set(),
  loadingStartTimes: new Map(),
  loadingInterval: null,
  shopifyConnected: false,
  livePacks: [],          // cache de todos los packs descubiertos en Shopify
  livePacksFetchedAt: null
};

const $ = (id) => document.getElementById(id);

const el = {
  statusPill: $('statusPill'),
  themeToggle: $('themeToggle'),
  refreshBtn: $('refreshBtn'),
  refreshBadge: $('refreshBadge'),
  settingsBtn: $('settingsBtn'),
  console: $('console'),
  promptForm: $('promptForm'),
  promptInput: $('promptInput'),
  sendBtn: $('sendBtn'),
  loadingTag: $('loadingTag'),
  loadingTime: $('loadingTime'),
  toast: $('toast'),
  newSessionBtn: $('newSessionBtn'),
  sessionList: $('sessionList'),

  settingsModal: $('settingsModal'),
  settingsClose: $('settingsClose'),
  settingsCancel: $('settingsCancel'),
  settingsSave: $('settingsSave'),
  apiKeyInput: $('apiKeyInput'),
  modelSelect: $('modelSelect'),
  keyStatus: $('keyStatus'),
  keyStatusText: $('keyStatusText'),
  deleteApiKey: $('deleteApiKey'),
  clearSessionsBtn: $('clearSessionsBtn'),
  contextDoc: $('contextDoc'),
  contextChars: $('contextChars'),
  contextUpdated: $('contextUpdated'),

  // Date range modal
  dateRangeModal: $('dateRangeModal'),
  dateRangeClose: $('dateRangeClose'),
  dateRangeCancel: $('dateRangeCancel'),
  dateRangeSubmit: $('dateRangeSubmit'),
  dateRangeFrom: $('dateRangeFrom'),
  dateRangeTo: $('dateRangeTo'),
  dateRangePack: $('dateRangePack'),
  rangeSummary: $('rangeSummary')
};

// =====================================================
// INIT
// =====================================================

function init() {
  loadFromStorage();
  applyTheme();
  renderSessions();
  loadActiveSession();
  updateStatus();
  checkShopifyBackend();
  startAutoRefresh();
  attachListeners();
  el.promptInput.focus();
}

// Chequear si el servidor local con conexión Shopify está corriendo
async function checkShopifyBackend() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok) {
      state.shopifyConnected = true;
      updateStatus();
      console.log('[shopify] backend conectado:', data.shop);
      // Pre-cargar lista de packs para auto-discovery
      fetchAllPacksFromShopify();
    }
  } catch (err) {
    state.shopifyConnected = false;
  }
}

// Cache de todos los packs activos en Shopify (refresca cada vez que arranca la app)
async function fetchAllPacksFromShopify(opts = {}) {
  const { showToastFeedback = false } = opts;
  try {
    const res = await fetch('/api/packs', { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return;
    const data = await res.json();
    const newPacks = data.packs || [];

    // Detectar cambios vs cache anterior
    const oldTitles = new Set(state.livePacks.map(p => p.title));
    const newTitles = new Set(newPacks.map(p => p.title));
    const added = newPacks.filter(p => !oldTitles.has(p.title));
    const removed = state.livePacks.filter(p => !newTitles.has(p.title));

    state.livePacks = newPacks;
    state.livePacksFetchedAt = Date.now();
    console.log(`[packs] ${state.livePacks.length} packs cargados de Shopify`);

    if (showToastFeedback) {
      if (added.length === 0 && removed.length === 0) {
        showToast(`Sincronizado · ${state.livePacks.length} packs (sin cambios)`, 'success');
      } else {
        const parts = [];
        if (added.length) parts.push(`${added.length} nuevo${added.length > 1 ? 's' : ''}`);
        if (removed.length) parts.push(`${removed.length} eliminado${removed.length > 1 ? 's' : ''}`);
        showToast(`Cambios detectados: ${parts.join(', ')}`, 'info');
      }
    } else if (added.length > 0 && state.livePacksFetchedAt) {
      // En refresh automático silencioso: solo mostrar badge
      el.refreshBadge.hidden = false;
      el.refreshBtn.title = `Actualizar · ${added.length} pack${added.length > 1 ? 's' : ''} nuevo${added.length > 1 ? 's' : ''} detectado${added.length > 1 ? 's' : ''}`;
    }
    return { added, removed };
  } catch (err) {
    console.warn('[packs] no se pudo cargar lista:', err.message);
    if (showToastFeedback) showToast('No se pudo sincronizar con Shopify', 'error');
    return null;
  }
}

// Refresh manual del usuario (click en el botón)
async function manualRefresh() {
  if (!state.shopifyConnected) {
    showToast('Backend Shopify no conectado', 'error');
    return;
  }
  el.refreshBtn.classList.add('refreshing');
  el.refreshBadge.hidden = true;
  // Verificar conexión + recargar packs
  await checkShopifyBackend();
  await fetchAllPacksFromShopify({ showToastFeedback: true });
  el.refreshBtn.classList.remove('refreshing');
  el.refreshBtn.title = 'Actualizar datos de Shopify';
}

// Auto-refresh silencioso cada 5 minutos
function startAutoRefresh() {
  setInterval(async () => {
    if (state.shopifyConnected) {
      await fetchAllPacksFromShopify({ showToastFeedback: false });
    }
  }, 5 * 60 * 1000); // 5 minutos
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  localStorage.setItem(CONFIG.STORAGE.THEME, state.theme);
  showToast(state.theme === 'dark' ? 'Tema oscuro' : 'Tema claro', 'info');
}

function attachListeners() {
  el.promptForm.addEventListener('submit', (e) => { e.preventDefault(); sendPrompt(); });
  el.promptInput.addEventListener('input', autoResize);
  el.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(); }
  });
  el.newSessionBtn.addEventListener('click', createSession);
  el.themeToggle.addEventListener('click', toggleTheme);
  el.refreshBtn.addEventListener('click', manualRefresh);

  // Op buttons
  document.querySelectorAll('.op-btn').forEach(btn => {
    btn.addEventListener('click', () => runAction(btn.dataset.action));
  });

  // Settings
  el.settingsBtn.addEventListener('click', openSettings);
  el.settingsClose.addEventListener('click', closeSettings);
  el.settingsCancel.addEventListener('click', closeSettings);
  el.settingsSave.addEventListener('click', saveSettings);
  el.deleteApiKey.addEventListener('click', removeKey);
  el.clearSessionsBtn.addEventListener('click', clearAllSessions);
  el.contextDoc.addEventListener('input', renderContextMeta);
  el.settingsModal.addEventListener('click', (e) => {
    if (e.target === el.settingsModal) closeSettings();
  });

  // Date range modal
  el.dateRangeClose.addEventListener('click', closeDateRangeModal);
  el.dateRangeCancel.addEventListener('click', closeDateRangeModal);
  el.dateRangeSubmit.addEventListener('click', submitDateRange);
  el.dateRangeFrom.addEventListener('change', updateRangeSummary);
  el.dateRangeTo.addEventListener('change', updateRangeSummary);
  el.dateRangePack.addEventListener('input', updateRangeSummary);
  el.dateRangeModal.addEventListener('click', (e) => {
    if (e.target === el.dateRangeModal) closeDateRangeModal();
  });
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.settingsModal.hidden) closeSettings();
  });
}

// =====================================================
// STORAGE
// =====================================================

function loadFromStorage() {
  state.apiKey = localStorage.getItem(CONFIG.STORAGE.API_KEY) || '';
  state.model = localStorage.getItem(CONFIG.STORAGE.MODEL) || CONFIG.DEFAULT_MODEL;
  state.theme = localStorage.getItem(CONFIG.STORAGE.THEME) || 'dark';
  state.contextDoc = localStorage.getItem(CONFIG.STORAGE.CONTEXT_DOC) || '';
  const updatedRaw = localStorage.getItem(CONFIG.STORAGE.CONTEXT_UPDATED);
  state.contextUpdated = updatedRaw ? parseInt(updatedRaw, 10) : null;
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE.SESSIONS);
    state.sessions = raw ? JSON.parse(raw) : [];
  } catch (_) { state.sessions = []; }
  state.activeSessionId = localStorage.getItem(CONFIG.STORAGE.ACTIVE);

  if (state.sessions.length === 0) {
    const s = newSessionObject();
    state.sessions.push(s);
    state.activeSessionId = s.id;
    saveSessions();
  } else if (!state.sessions.find(s => s.id === state.activeSessionId)) {
    state.activeSessionId = state.sessions[0].id;
  }
}

function saveSessions() {
  try {
    localStorage.setItem(CONFIG.STORAGE.SESSIONS, JSON.stringify(state.sessions));
    if (state.activeSessionId) {
      localStorage.setItem(CONFIG.STORAGE.ACTIVE, state.activeSessionId);
    }
  } catch (err) {
    showToast('No pude guardar (storage lleno?)', 'error');
  }
}

// =====================================================
// SESSIONS
// =====================================================

function newSessionObject() {
  return {
    id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title: 'Nueva sesión',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function getActive() {
  return state.sessions.find(s => s.id === state.activeSessionId);
}

function createSession() {
  const s = newSessionObject();
  state.sessions.unshift(s);
  state.activeSessionId = s.id;
  saveSessions();
  renderSessions();
  loadActiveSession();
  el.promptInput.focus();
}

function switchSession(id) {
  state.activeSessionId = id;
  saveSessions();
  renderSessions();
  loadActiveSession();
}

function deleteSession(id, ev) {
  if (ev) ev.stopPropagation();
  if (!confirm('¿Eliminar esta sesión?')) return;
  state.loadingSessions.delete(id);
  state.loadingStartTimes.delete(id);
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (state.sessions.length === 0) {
    const s = newSessionObject();
    state.sessions.push(s);
    state.activeSessionId = s.id;
  } else if (state.activeSessionId === id) {
    state.activeSessionId = state.sessions[0].id;
  }
  saveSessions();
  renderSessions();
  loadActiveSession();
}

function clearAllSessions() {
  if (!confirm('¿Borrar TODAS las sesiones?')) return;
  state.sessions = [];
  state.activeSessionId = null;
  const s = newSessionObject();
  state.sessions.push(s);
  state.activeSessionId = s.id;
  saveSessions();
  renderSessions();
  loadActiveSession();
  closeSettings();
  showToast('Sesiones borradas', 'success');
}

function renderSessions() {
  if (state.sessions.length === 0) {
    el.sessionList.innerHTML = '<li class="session-empty">Sin sesiones</li>';
    return;
  }
  const sorted = [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  el.sessionList.innerHTML = sorted.map(s => {
    const isActive = s.id === state.activeSessionId;
    const isLoading = state.loadingSessions.has(s.id);
    const cls = `session-item ${isActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`.trim();
    return `
      <li class="${cls}" data-id="${s.id}">
        <span class="session-item-dot"></span>
        <span class="session-item-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
        <button class="session-item-x" data-x="${s.id}" aria-label="Eliminar">×</button>
      </li>
    `;
  }).join('');
  el.sessionList.querySelectorAll('.session-item').forEach(item => {
    item.addEventListener('click', () => switchSession(item.dataset.id));
  });
  el.sessionList.querySelectorAll('[data-x]').forEach(btn => {
    btn.addEventListener('click', (e) => deleteSession(btn.dataset.x, e));
  });
}

function loadActiveSession() {
  const s = getActive();
  el.console.innerHTML = '';
  if (!s || s.messages.length === 0) {
    renderWelcome();
  } else {
    s.messages.forEach(m => addEntry(m.content, m.role));
  }
  updateLoadingUI();
}

function renderWelcome() {
  const div = document.createElement('div');
  div.className = 'entry-welcome';
  div.innerHTML = `
    <h1>JDC Shop Manager · listo para auditar</h1>
    <p>
      Conectado a <strong>jdchouse.com</strong> · 551 productos · 14 colecciones.
      Click en una operación de la izquierda o escribe directamente abajo.
    </p>
  `;
  el.console.appendChild(div);
}

// =====================================================
// SEND PROMPT
// =====================================================

function autoResize() {
  el.promptInput.style.height = 'auto';
  el.promptInput.style.height = Math.min(el.promptInput.scrollHeight, 180) + 'px';
}

async function sendPrompt(textOverride) {
  const s = getActive();
  if (!s) return;
  if (state.loadingSessions.has(s.id)) return;

  const text = (textOverride || el.promptInput.value).trim();
  if (!text) return;

  if (!state.apiKey) {
    showToast('Falta tu API key. Abre Configuración ⚙', 'error');
    openSettings();
    return;
  }

  if (s.messages.length === 0) {
    s.title = text.length > 50 ? text.slice(0, 50) + '…' : text;
  }

  const sessionId = s.id;
  s.messages.push({ role: 'user', content: text });
  s.updatedAt = Date.now();
  addEntry(text, 'user');

  el.promptInput.value = '';
  autoResize();
  state.loadingSessions.add(sessionId);
  state.loadingStartTimes.set(sessionId, Date.now());
  updateLoadingUI();
  saveSessions();
  renderSessions();

  try {
    const history = s.messages.slice(0, -1).slice(-CONFIG.MAX_HISTORY * 2);
    const reply = await callAnthropic(text, history);

    const target = state.sessions.find(x => x.id === sessionId);
    if (!target) return;

    target.messages.push({ role: 'assistant', content: reply });
    target.updatedAt = Date.now();
    saveSessions();

    if (state.activeSessionId === sessionId) {
      addEntry(reply, 'assistant');
    } else {
      showToast(`Respuesta lista en "${target.title.slice(0, 30)}…"`, 'success');
    }
  } catch (err) {
    const msg = formatError(err);
    const target = state.sessions.find(x => x.id === sessionId);
    if (target) {
      target.messages.push({ role: 'assistant', content: msg });
      target.updatedAt = Date.now();
      saveSessions();
    }
    if (state.activeSessionId === sessionId) addEntry(msg, 'assistant');
    showToast('Error: ' + msg.slice(0, 80), 'error');
  } finally {
    state.loadingSessions.delete(sessionId);
    state.loadingStartTimes.delete(sessionId);
    if (state.activeSessionId === sessionId) updateLoadingUI();
    renderSessions();
    el.promptInput.focus();
  }
}

function runAction(actionKey) {
  const action = ACTIONS[actionKey];
  if (!action) return;
  // Si la acción tiene un handler custom (ej: abrir un modal), lo invoca
  if (typeof action.customHandler === 'function') {
    action.customHandler();
    return;
  }
  const s = getActive();
  if (s && state.loadingSessions.has(s.id)) {
    showToast('Esta sesión ya está procesando', 'info');
    return;
  }
  sendPrompt(action.prompt);
}

// =====================================================
// DATE RANGE MODAL (ventas-rango)
// =====================================================

function openDateRangeModal() {
  // Por defecto: últimos 7 días
  const today = new Date();
  const sevenAgo = new Date();
  sevenAgo.setDate(today.getDate() - 7);
  el.dateRangeFrom.value = isoDateInput(sevenAgo);
  el.dateRangeTo.value = isoDateInput(today);
  el.dateRangePack.value = '';
  updateRangeSummary();
  el.dateRangeModal.hidden = false;
  setTimeout(() => el.dateRangeFrom.focus(), 50);
}

function closeDateRangeModal() {
  el.dateRangeModal.hidden = true;
}

function isoDateInput(d) {
  return d.toISOString().slice(0, 10);
}

function applyPreset(preset) {
  const now = new Date();
  let from, to;
  switch (preset) {
    case 'today':
      from = new Date(now);
      to = new Date(now);
      break;
    case 'yesterday':
      from = new Date(now); from.setDate(from.getDate() - 1);
      to = new Date(now); to.setDate(to.getDate() - 1);
      break;
    case '7d':
      from = new Date(now); from.setDate(from.getDate() - 7);
      to = new Date(now);
      break;
    case '15d':
      from = new Date(now); from.setDate(from.getDate() - 15);
      to = new Date(now);
      break;
    case '30d':
      from = new Date(now); from.setDate(from.getDate() - 30);
      to = new Date(now);
      break;
    case 'this-week': {
      const day = now.getDay() || 7; // lunes = 1
      from = new Date(now); from.setDate(from.getDate() - day + 1);
      to = new Date(now);
      break;
    }
    case 'last-week': {
      const day = now.getDay() || 7;
      to = new Date(now); to.setDate(to.getDate() - day);
      from = new Date(to); from.setDate(from.getDate() - 6);
      break;
    }
    case 'this-month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now);
      break;
    case 'last-month':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    default:
      return;
  }
  el.dateRangeFrom.value = isoDateInput(from);
  el.dateRangeTo.value = isoDateInput(to);
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.preset-btn[data-preset="${preset}"]`)?.classList.add('active');
  updateRangeSummary();
}

function updateRangeSummary() {
  const from = el.dateRangeFrom.value;
  const to = el.dateRangeTo.value;
  const pack = el.dateRangePack.value.trim();
  if (!from || !to) {
    el.rangeSummary.textContent = 'Selecciona fechas…';
    return;
  }
  const days = Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1);
  const packTxt = pack ? ` · filtrado por <strong>${escapeHtml(pack)}</strong>` : ' · todas las ventas';
  el.rangeSummary.innerHTML = `Consultar ventas del <strong>${from}</strong> al <strong>${to}</strong> (<strong>${days} día${days > 1 ? 's' : ''}</strong>)${packTxt}`;
}

function submitDateRange() {
  const from = el.dateRangeFrom.value;
  const to = el.dateRangeTo.value;
  const pack = el.dateRangePack.value.trim();
  if (!from || !to) {
    showToast('Selecciona fechas', 'error');
    return;
  }
  if (new Date(from) > new Date(to)) {
    showToast('La fecha "Desde" debe ser anterior a "Hasta"', 'error');
    return;
  }
  const days = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;
  const packTxt = pack ? ` filtrado por **${pack}**` : '';
  const prompt = `Dame análisis completo de ventas del ${from} al ${to} (${days} día${days > 1 ? 's' : ''})${packTxt}. Total de pedidos, revenue, AOV, top productos vendidos, distribución día a día. Si el rango es de 1-3 días, incluye también distribución por hora.`;
  closeDateRangeModal();
  sendPrompt(prompt);
}

// =====================================================
// ANTHROPIC API
// =====================================================

async function callAnthropic(message, history) {
  const messages = [...history, { role: 'user', content: message }];

  // Inyectar el documento de contexto del usuario al final del system prompt
  let finalSystem = SYSTEM_PROMPT;
  if (state.contextDoc && state.contextDoc.trim()) {
    finalSystem += `\n\n═══════════════════════════════════════════════════
📎 DOCUMENTO DE CONTEXTO DEL USUARIO (prioridad MÁXIMA)
═══════════════════════════════════════════════════
El usuario ha pegado el siguiente documento como fuente oficial actualizada.
SI HAY CONFLICTO entre este documento y tu memoria embebida anterior,
PRIORIZA este documento. Es la versión MÁS RECIENTE.

${state.contextDoc.trim()}

═══════════════════════════════════════════════════
FIN DEL DOCUMENTO DEL USUARIO
═══════════════════════════════════════════════════`;
  }

  // Si la pregunta es sobre VENTAS, consultar el endpoint /api/sales
  const liveSales = await maybeFetchLiveSales(message);
  if (liveSales) {
    finalSystem += `\n\n═══════════════════════════════════════════════════
📈 VENTAS EN VIVO DE SHOPIFY (consultado AHORA)
═══════════════════════════════════════════════════
Datos READ-ONLY del Shopify Admin · pedidos creados en el período indicado.

🔴 INSTRUCCIÓN: renderiza EXACTAMENTE estas tablas en tu respuesta.
Cuando hables de "tráfico" del día, usa la distribución por hora.
Cuando hables de "rendimiento de pack X", usa los datos filtrados.
NUNCA inventes números — usa SOLO los que vienen abajo.

${formatSalesForPrompt(liveSales)}

═══════════════════════════════════════════════════
FIN DE VENTAS EN VIVO
═══════════════════════════════════════════════════`;
  }

  // Si la pregunta es sobre stock/inventario, intentar enriquecer con datos en vivo
  // del backend Shopify (solo si el server local está corriendo)
  const liveInventory = await maybeFetchLiveInventory(message);

  // Caso especial: el usuario mencionó un pack que el sistema NO conoce
  // → instruimos al agente a pedir actualización antes de responder
  if (liveInventory && liveInventory.unknownPackMention) {
    finalSystem += `\n\n═══════════════════════════════════════════════════
⚠️ PACK NO RECONOCIDO POR EL SISTEMA
═══════════════════════════════════════════════════
El usuario mencionó "${liveInventory.unknownPackMention}" pero ese pack:
- NO está en el mapeo manual (33 packs precisos)
- NO está en la cache actual de packs activos de Shopify (${state.livePacks?.length || 0} packs cacheados)

INSTRUCCIÓN OBLIGATORIA: NO inventes datos sobre ese pack. NO infieras componentes.
En su lugar, responde EXACTAMENTE así:

"No encuentro **${liveInventory.unknownPackMention}** en mi catálogo de packs activos.

Posibles razones:
- Es un pack que acabas de crear y aún no está sincronizado
- El nombre está escrito distinto al de Shopify
- Es un pack archivado o en draft

Solución: dale click al botón 🔄 (arriba a la derecha) para sincronizar con Shopify. Si el pack aparece después, vuelve a preguntar."

Después de esa respuesta termina. NO intentes responder con datos.
═══════════════════════════════════════════════════`;
    // Procedemos sin más data
  } else if (liveInventory) {
    const grandTotal = liveInventory.components.reduce((sum, c) => sum + c.data.total, 0);
    const isAutoDiscovered = liveInventory.source === 'auto-discovered';
    const method = liveInventory.discoveryMethod;
    let discoveryWarning = '';
    if (isAutoDiscovered && method === 'html-scrape') {
      discoveryWarning = `\n\n📡 INFO: Este pack fue AUTO-DESCUBIERTO leyendo la página real del pack en jdchouse.com.
Los SKUs fueron EXTRAÍDOS directamente del HTML (alta confianza).
Pack: "${liveInventory.packInfo.title}"
URL: ${liveInventory.packInfo.url}
Menciona al usuario brevemente: "Pack auto-descubierto desde la web · SKUs verificados".`;
    } else if (isAutoDiscovered && method === 'title-heuristic') {
      discoveryWarning = `\n\n⚠️ ATENCIÓN: Este pack fue AUTO-DETECTADO pero no se pudo leer su HTML.
Los componentes fueron INFERIDOS heurísticamente del título: "${liveInventory.packInfo.title}".
Los SKUs podrían no ser exactos. URL: ${liveInventory.packInfo.url}
EN TU RESPUESTA AVISA al usuario: "⚠️ Pack auto-detectado por heurística, componentes inferidos del título — verificar".`;
    }
    finalSystem += `\n\n═══════════════════════════════════════════════════
📊 INVENTARIO EN VIVO DE SHOPIFY (consultado AHORA mismo)
═══════════════════════════════════════════════════
Datos READ-ONLY del Shopify Admin de jdchouse.com en este segundo.
Fuente del mapeo: ${isAutoDiscovered ? 'AUTO-DISCOVERY (heurístico)' : 'MAPEO MANUAL (preciso)'}${discoveryWarning}

Este pack tiene ${liveInventory.components.length} COMPONENTE(S):
${liveInventory.components.map((c, i) => `${i + 1}. ${c.label} (SKU: ${c.sku}) — ${c.data.total} unidades`).join('\n')}

Stock TOTAL combinado: ${grandTotal} unidades
Consultado a las: ${new Date().toLocaleString('es-CO')}

═══════════════════════════════════════════════════
🔴 INSTRUCCIÓN CRÍTICA — LEER 3 VECES:
═══════════════════════════════════════════════════

1. ESTE PACK TIENE MÚLTIPLES COMPONENTES. Renderiza UNA SECCIÓN
   POR CADA COMPONENTE. Si el pack tiene camiseta + perfume, debes
   mostrar AMBOS. NO omitas ninguno.

2. Para componentes de ROPA (con colores/tallas): renderiza la
   tabla markdown POR COLOR mostrando las tallas (S, M, L, XL, etc.).
   Si Negro tiene 100 unidades y todas son talla M, el usuario
   debe VER la tabla con los ceros en las otras tallas.

3. Para componentes de PERFUMES/MORRALES/ZAPATILLAS (sin tallas):
   renderiza la lista con cada variante y sus unidades.

4. Al final pon el RESUMEN GENERAL con stock total combinado.

═══════════════════════════════════════════════════

DESGLOSE COMPLETO POR COMPONENTE (renderiza TODO esto en tu respuesta):

${formatLiveInventoryForPrompt(liveInventory)}

═══════════════════════════════════════════════════
FIN DEL INVENTARIO EN VIVO

RECORDATORIO FINAL:
- ${liveInventory.components.length} componentes = ${liveInventory.components.length} secciones en tu respuesta
- Tablas con tallas obligatorias para ropa
- Lista detallada obligatoria para perfumes/accesorios
- NUNCA omitas un componente
═══════════════════════════════════════════════════`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  try {
    const res = await fetch(CONFIG.ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': CONFIG.ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: state.model,
        max_tokens: CONFIG.MAX_TOKENS,
        system: finalSystem,
        messages,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: CONFIG.WEB_SEARCH_MAX_USES
        }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) throw new Error('API key inválida o sin créditos');
      let detail = body || res.statusText;
      try {
        const parsed = JSON.parse(body);
        if (parsed.error?.message) detail = parsed.error.message;
      } catch (_) {}
      throw new Error(`API ${res.status}: ${detail}`);
    }

    const data = await res.json();
    if (!Array.isArray(data.content)) throw new Error('Respuesta inválida');
    const text = data.content
      .filter(b => b.type === 'text' && typeof b.text === 'string')
      .map(b => b.text)
      .join('\n')
      .trim();
    if (!text) throw new Error('La API no devolvió texto');
    return text;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Timeout (180s)');
    throw err;
  }
}

function formatError(err) {
  return (err && err.message) || 'Error desconocido';
}

// =====================================================
// INVENTARIO EN VIVO (Shopify Admin via backend local)
// =====================================================

// Mapa de packs → array de componentes a buscar en Shopify.
// Cada pack combo (con perfume, gorra, boxer, etc.) tiene MÚLTIPLES componentes.
// Las búsquedas usan wildcard SKU en el backend (sku:*X*), así que sirven nombres parciales.
const PACK_SKU_MAP = [
  // --- Packs simples (1 componente) ---
  { keys: ['pack relax', 'pack basicas comfort', 'pack básicas comfort'],
    components: [{ sku: '66676', label: 'Camisetas Básicas Comfort' }] },
  { keys: ['pack diario'],
    components: [{ sku: '36090', label: 'Camisetas Básicas Regular' }] },
  { keys: ['pack clasico', 'pack clásico'],
    components: [{ sku: '268080', label: 'Camisetas Básicas Clásicas' }] },
  { keys: ['pack versatile'],
    components: [{ sku: '826001', label: 'Camisetas Básicas Versatile' }] },
  { keys: ['pack basicas slim', 'pack básicas slim'],
    components: [{ sku: '66677', label: 'Camisetas Básicas Slim' }] },
  { keys: ['pack vip'],
    components: [{ sku: 'B66002', label: 'Camisetas Básicas VIP Premium' }] },
  { keys: ['pack chill'],
    components: [
      { sku: '528002', label: 'Camisetas Oversize Chill' },
      { sku: '528001', label: 'Camisetas Oversize Pickling (alt)' }
    ] },
  { keys: ['pack doble oversize'],
    components: [{ sku: '583009', label: 'Camisetas Oversize Doble' }] },
  { keys: ['pack oversize diario'],
    components: [{ sku: '528001', label: 'Camisetas Oversize Pickling Diario' }] },
  { keys: ['pack polo total'],
    components: [{ sku: '185017', label: 'Polos Total' }] },
  { keys: ['pack gym'],
    components: [{ sku: 'CAM45', label: 'Camisetas Deportivas Gym' }] },
  { keys: ['pack runner'],
    components: [{ sku: 'PAN10', label: 'Pantalonetas Deportivas Runner' }] },
  { keys: ['pack talla grande'],
    components: [
      { sku: '786669', label: 'Camisetas Estampadas Negras' },
      { sku: '786655', label: 'Camisetas Estampadas Azul Oscuro' },
      { sku: '786666', label: 'Camisetas Estampadas (alt)' },
      { sku: '66789', label: 'Camisetas Estampadas Rojas/Negras' },
      { sku: '786749', label: 'Camisetas Básicas Blanca TG' },
      { sku: '786747', label: 'Camisetas Estampadas Blanca' },
      { sku: '66059', label: 'Camisetas Estampadas (alt 2)' }
    ] },
  { keys: ['pack arma tu estilo'],
    components: [
      { sku: '268080', label: 'Camisetas Clásicas (parte del mix)' },
      { sku: '36090', label: 'Camisetas Regular (parte del mix)' },
      { sku: '66676', label: 'Camisetas Comfort (parte del mix)' }
    ] },

  // --- Packs combo: ropa + perfume ---
  { keys: ['pack conquista'],
    components: [
      { sku: '36023', label: 'Camisetas Básicas' },
      { sku: 'odyssey mandarin', label: 'Perfume Odyssey Mandarin Sky' },
      { sku: 'mega armaf', label: 'Perfume Odyssey Mega Armaf' }
    ] },
  { keys: ['pack santal'],
    components: [
      { sku: 'B66048', label: 'Camisetas Básicas' },
      { sku: 'santal', label: 'Perfume Santal' }
    ] },
  { keys: ['pack tendencia'],
    components: [
      { sku: '528001', label: 'Camisetas Oversize Pickling' },
      { sku: 'gaultier', label: 'Perfume Jean Paul Gaultier Le Male' }
    ] },
  { keys: ['pack irresistible'],
    components: [
      { sku: '786903', label: 'Camisetas' },
      { sku: 'sauvage', label: 'Perfume Sauvage Dior' }
    ] },
  { keys: ['pack fresh'],
    components: [
      { sku: '66642', label: 'Camisetas Estampadas' },
      { sku: 'odyssey', label: 'Perfumes Odyssey (varios)' }
    ] },
  { keys: ['pack primera cita'],
    components: [
      { sku: 'PB-8088', label: 'Camisetas Básicas' },
      { sku: 'club de nuit', label: 'Perfume Club de Nuit Man' }
    ] },
  { keys: ['pack distinción', 'pack distincion'],
    components: [
      { sku: '38032', label: 'Polos' },
      { sku: 'blue de chanel', label: 'Perfume Blue de Chanel' }
    ] },

  // --- Packs combo: ropa + accesorios ---
  { keys: ['pack for men'],
    components: [
      { sku: '38032', label: 'Polos' },
      { sku: 'BOX63', label: 'Boxer CK (obsequio)' }
    ] },
  { keys: ['pack duo polo'],
    components: [
      { sku: '38032', label: 'Polos' },
      { sku: 'BOX63', label: 'Boxer CK (obsequio)' }
    ] },
  { keys: ['pack old money'],
    components: [
      { sku: '38032', label: 'Polos' },
      { sku: 'PANTS01', label: 'Pantalones' }
    ] },
  { keys: ['pack fit'],
    components: [
      { sku: 'CAM45', label: 'Camisetas Deportivas' },
      { sku: 'PAN40', label: 'Pantalonetas Deportivas' }
    ] },
  { keys: ['pack asfalto'],
    components: [
      { sku: '583009', label: 'Camisetas Oversize' },
      { sku: 'HAT', label: 'Gorras AMR' },
      { sku: '102-', label: 'Gorras AR Tres Paneles' }
    ] },
  { keys: ['pack streetwear'],
    components: [
      { sku: '834034', label: 'Camisetas Oversize Streetwear' },
      { sku: 'HAT', label: 'Gorras AMR' },
      { sku: '102-', label: 'Gorras AR Tres Paneles' }
    ] },
  { keys: ['pack fin de semana'],
    components: [
      { sku: '881194', label: 'Camisetas Oversize' },
      { sku: '881193', label: 'Camisetas Oversize (alt)' },
      { sku: '1818029', label: 'Bermudas' },
      { sku: '102-', label: 'Gorras AR' }
    ] },
  { keys: ['pack mochilero'],
    components: [
      { sku: '66433', label: 'Camisetas Básicas' },
      { sku: 'MOR', label: 'Morrales (varios)' }
    ] },
  { keys: ['pack de lujo'],
    components: [
      { sku: '786887', label: 'Camisetas Básicas Premium' },
      { sku: 'HB ', label: 'Zapatillas HB (varios)' }
    ] },
  { keys: ['pack 5 boxer', 'pack boxer'],
    components: [
      { sku: 'BOX60', label: 'Boxers TOM' },
      { sku: 'BOX63', label: 'Boxers CK' }
    ] },

  // --- Packs nuevos (post-2026-05-19) ---
  { keys: ['pack camiseta + polo', 'pack camiseta polo'],
    components: [
      { sku: '38032', label: 'Polos Tipo Polo (5 colores)' },
      { sku: '36090', label: 'Camisetas Básicas Regular (6 colores)' }
    ] }
];

function detectPack(message) {
  const lower = message.toLowerCase();
  // Primero: mapeo manual (precisión máxima)
  for (const entry of PACK_SKU_MAP) {
    if (entry.keys.some(k => lower.includes(k))) {
      return { ...entry, source: 'manual' };
    }
  }
  // Fallback: auto-discovery por fuzzy match en livePacks
  return autoDiscoverPack(message);
}

// Diccionario heurístico: palabra clave en título → patrón SKU a buscar
const TITLE_TO_SKU_HINTS = [
  { match: /\bperfume(s)?\b|fragrancia|aroma/i,        sku: 'perfume', label: 'Perfumes' },
  { match: /odyssey|mandarin/i,                         sku: 'odyssey', label: 'Perfume Odyssey' },
  { match: /sauvage/i,                                  sku: 'sauvage', label: 'Perfume Sauvage' },
  { match: /santal/i,                                   sku: 'santal', label: 'Perfume Santal' },
  { match: /club de nuit/i,                             sku: 'club de nuit', label: 'Perfume Club de Nuit' },
  { match: /blue de chanel/i,                           sku: 'blue de chanel', label: 'Perfume Blue de Chanel' },
  { match: /gaultier|le male/i,                         sku: 'gaultier', label: 'Perfume Jean Paul Gaultier' },
  { match: /\bpolo(s)?\b/i,                             sku: '38032', label: 'Polos' },
  { match: /\bboxer(s)?\b|bóxer|interior/i,             sku: 'BOX60', label: 'Boxers TOM/CK' },
  { match: /\bgorra(s)?\b|cap\b/i,                      sku: '102-', label: 'Gorras AR' },
  { match: /\bcorrea(s)?\b|cinturón|cinturon|belt/i,    sku: 'BELT', label: 'Correas' },
  { match: /bermuda(s)?|short(s)?/i,                    sku: '1818', label: 'Bermudas' },
  { match: /pantalon(es)?(?!eta)|pants/i,               sku: 'PANTS01', label: 'Pantalones' },
  { match: /pantaloneta(s)?/i,                          sku: 'PAN', label: 'Pantalonetas' },
  { match: /morral(es)?|mochila|bolso|canguro/i,        sku: 'MOR', label: 'Morrales/Bolsos' },
  { match: /zapat(o|illa)s?|tenis|sneaker/i,            sku: 'HB ', label: 'Zapatillas' },
  { match: /jean(s)?/i,                                 sku: 'JEAN', label: 'Jeans' },
  { match: /oversize/i,                                 sku: '528001', label: 'Camisetas Oversize' },
  { match: /chaqueta(s)?|jacket/i,                      sku: 'CHAQ', label: 'Chaquetas' },
  { match: /deportiv[oa]|gym|fitness|sport/i,           sku: 'CAM45', label: 'Ropa Deportiva' },
  { match: /estampad[ao]/i,                             sku: '66642', label: 'Camisetas Estampadas' },
  { match: /básic[ao]s?|basicas?/i,                     sku: '36090', label: 'Camisetas Básicas' },
  { match: /\bcamiseta(s)?\b/i,                         sku: '36090', label: 'Camisetas' },
  { match: /conjunto/i,                                 sku: 'CONJUNTO', label: 'Conjuntos' }
];

// Auto-detección: busca el pack en livePacks por nombre, luego intenta
// extraer SKUs del HTML real, y si falla cae en inferencia heurística.
function autoDiscoverPack(message) {
  if (!state.livePacks || state.livePacks.length === 0) return null;

  const lower = message.toLowerCase();
  const normalized = lower.replace(/\b(de|del|la|el|los|las|un|una)\b/g, '').trim();

  // Buscar packs cuyo título tenga overlap con la pregunta
  let best = null;
  let bestScore = 0;
  for (const pack of state.livePacks) {
    const title = pack.title.toLowerCase();
    const titleWords = title.split(/[\s—\-+,]+/).filter(w => w.length >= 3);
    let score = 0;
    for (const w of titleWords) {
      if (normalized.includes(w)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = pack;
    }
  }

  if (!best || bestScore < 2) return null;

  // Marcamos el pack como "candidato" para que maybeFetchLiveInventory haga el scrape HTML
  return {
    keys: [best.title.toLowerCase()],
    components: null, // se llenan dinámicamente vía HTML scraping
    needsHtmlDiscovery: true,
    source: 'auto-discovered',
    packInfo: {
      title: best.title,
      handle: best.handle,
      url: best.url,
      price: best.price,
      totalInventory: best.totalInventory
    }
  };
}

// Scraping HTML: lee la página del pack y extrae componentes reales
async function fetchPackComponentsFromHTML(handle) {
  try {
    const res = await fetch(`/api/pack-components?handle=${encodeURIComponent(handle)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data.components || null;
  } catch (err) {
    console.warn('[html-discovery] falló:', err.message);
    return null;
  }
}

// Fallback heurístico: si HTML scraping no devuelve nada, inferir del título
function inferComponentsFromTitle(title) {
  const components = [];
  for (const hint of TITLE_TO_SKU_HINTS) {
    if (hint.match.test(title)) {
      if (!components.find(c => c.sku === hint.sku)) {
        components.push({ sku: hint.sku, label: hint.label });
      }
    }
  }
  return components;
}

function isStockQuery(message) {
  const lower = message.toLowerCase();
  const keywords = [
    'stock', 'inventario', 'inventarios', 'disponibilidad', 'disponible',
    'agotado', 'agotados', 'unidades', 'cuántas tengo', 'cuantas tengo',
    'queda', 'quedan', 'cuánto hay', 'cuanto hay', 'cantidad'
  ];
  return keywords.some(kw => lower.includes(kw));
}

function isSalesQuery(message) {
  const lower = message.toLowerCase();
  const keywords = [
    'venta', 'ventas', 'vendido', 'vendidos', 'vendiste', 'vendieron',
    'tráfico', 'trafico', 'movimiento', 'pedido', 'pedidos', 'orden', 'órdenes', 'ordenes',
    'ingreso', 'ingresos', 'facturación', 'facturacion', 'revenue',
    'rendimiento', 'desempeño', 'desempeno', 'performance',
    'cómo va', 'como va', 'qué tal', 'que tal',
    'top seller', 'más vendido', 'mas vendido', 'mejor seller', 'best seller',
    'aov', 'ticket promedio', 'conversión', 'conversion'
  ];
  return keywords.some(kw => lower.includes(kw));
}

function detectSalesPeriod(message) {
  const lower = message.toLowerCase();
  // Detectar rango temporal
  if (/\bhoy\b|en el día|del día|de hoy|las últimas? \d* ?horas?/i.test(lower)) return 1;
  if (/\bayer\b/i.test(lower)) return 2;
  if (/última semana|esta semana|ultima semana|semanal|7 días|7 dias/i.test(lower)) return 7;
  if (/últimos? 15|ultimos? 15|quincena/i.test(lower)) return 15;
  if (/último mes|ultimo mes|mensual|30 días|30 dias|mes pasado/i.test(lower)) return 30;
  if (/últimos? 3 días|ultimos? 3 dias|3 días|3 dias/i.test(lower)) return 3;
  // Default razonable: 7 días
  return 7;
}

// Detecta si el usuario mencionó algo tipo "pack X" pero NO lo reconozco en ningún lado
function userMentionedUnknownPack(message) {
  const lower = message.toLowerCase();
  // ¿Hay mención de "pack ..." en el mensaje?
  const packMention = /pack\s+[a-záéíóúñ0-9]+/i.exec(message);
  if (!packMention) return null;
  // ¿Lo reconozco?
  const found = detectPack(message);
  if (found) return null; // ya lo reconoce, no es desconocido
  // No lo reconozco → devuelve el texto del pack mencionado
  return packMention[0];
}

async function maybeFetchLiveInventory(message) {
  if (!isStockQuery(message)) return null;
  const pack = detectPack(message);
  if (!pack) {
    // El usuario preguntó por stock pero no detecté ningún pack conocido.
    // Si mencionó "pack X" no reconocido → marcar como "pack desconocido"
    const unknownMention = userMentionedUnknownPack(message);
    if (unknownMention) {
      return { unknownPackMention: unknownMention };
    }
    return null;
  }

  // Si es un pack auto-descubierto, primero intentar extraer SKUs del HTML real
  if (pack.needsHtmlDiscovery && pack.packInfo?.handle) {
    console.log('[auto-discovery] scraping HTML de', pack.packInfo.handle);
    const htmlComponents = await fetchPackComponentsFromHTML(pack.packInfo.handle);
    if (htmlComponents && htmlComponents.length > 0) {
      pack.components = htmlComponents;
      pack.discoveryMethod = 'html-scrape';
      console.log('[auto-discovery] HTML extrajo', htmlComponents.length, 'componentes');
    } else {
      // Fallback heurístico
      pack.components = inferComponentsFromTitle(pack.packInfo.title);
      pack.discoveryMethod = 'title-heuristic';
      console.log('[auto-discovery] HTML falló, usando heurística');
    }
  }

  if (!pack.components || pack.components.length === 0) return null;

  // Para cada componente del pack, hacer fetch independiente
  const componentResults = [];
  for (const comp of pack.components) {
    try {
      const res = await fetch(`/api/inventory?sku=${encodeURIComponent(comp.sku)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) {
        console.warn(`[inventory] ${comp.sku} respondió`, res.status);
        continue;
      }
      const data = await res.json();
      if (data.error) {
        console.warn(`[inventory] ${comp.sku} error:`, data.error);
        continue;
      }
      componentResults.push({ label: comp.label, sku: comp.sku, data });
    } catch (err) {
      console.warn(`[inventory] ${comp.sku} backend no disponible:`, err.message);
    }
  }

  if (componentResults.length === 0) return null;
  return {
    packKeys: pack.keys,
    components: componentResults,
    source: pack.source || 'manual',
    discoveryMethod: pack.discoveryMethod || null,
    packInfo: pack.packInfo || null
  };
}

// Decide si el inventario es "ropa" (tiene colores y tallas reales)
// o "producto sin variantes" (perfumes, accesorios)
function isApparelInventory(inv) {
  const colors = Object.keys(inv.byColor);
  if (colors.length === 0) return false;
  if (colors.length === 1 && colors[0] === 'Sin color') return false;
  return true;
}

// Formatea inventario de ropa como tablas por color × talla
function formatApparelInventory(inv) {
  const allSizes = new Set();
  for (const info of Object.values(inv.byColor)) {
    Object.keys(info.sizes).forEach(s => allSizes.add(s));
  }
  const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', 'Sin talla'];
  const sortedSizes = [...allSizes].sort((a, b) => {
    const ai = sizeOrder.indexOf(a);
    const bi = sizeOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const out = [];
  const sortedColors = Object.entries(inv.byColor).sort((a, b) => b[1].total - a[1].total);

  for (const [color, info] of sortedColors) {
    const flag = info.total === 0 ? ' ⚠️ AGOTADO'
               : info.total < 20 ? ' ⚠️ CRÍTICO'
               : info.total < 50 ? ''
               : info.total >= 300 ? ' ⭐⭐⭐'
               : info.total >= 100 ? ' ⭐⭐'
               : ' ⭐';

    out.push(`**${color} — Total: ${info.total} unidades${flag}**`);
    const headerCells = sortedSizes.map(s => ` ${s} `).join('|');
    const sepCells = sortedSizes.map(() => '---').join('|');
    const valueCells = sortedSizes.map(s => {
      const v = info.sizes[s];
      return v === undefined ? ' — ' : ` ${v} `;
    }).join('|');
    out.push(`|${headerCells}|`);
    out.push(`|${sepCells}|`);
    out.push(`|${valueCells}|`);
    out.push('');
  }

  // Totales por talla
  const totalsPorTalla = {};
  for (const info of Object.values(inv.byColor)) {
    for (const [s, q] of Object.entries(info.sizes)) {
      totalsPorTalla[s] = (totalsPorTalla[s] || 0) + q;
    }
  }
  out.push(`*Totales por talla:*`);
  out.push(`|${sortedSizes.map(s => ` ${s} `).join('|')}|`);
  out.push(`|${sortedSizes.map(() => '---').join('|')}|`);
  out.push(`|${sortedSizes.map(s => ` ${totalsPorTalla[s] || 0} `).join('|')}|`);
  return out.join('\n');
}

// Formatea productos sin variantes (perfumes, morrales, zapatillas)
function formatSimpleInventory(inv) {
  const out = [];
  const sortedVariants = [...inv.variants].sort((a, b) => (b.inventoryQuantity || 0) - (a.inventoryQuantity || 0));
  for (const v of sortedVariants.slice(0, 25)) {
    const qty = v.inventoryQuantity || 0;
    const flag = qty === 0 ? ' ⚠️ AGOTADO'
               : qty < 10 ? ' ⚠️ CRÍTICO'
               : qty < 50 ? ''
               : qty >= 200 ? ' ⭐⭐⭐'
               : qty >= 100 ? ' ⭐⭐'
               : ' ⭐';
    const name = v.product?.title || v.displayName || v.sku;
    out.push(`- **${name}** — ${qty} unidades${flag}`);
  }
  if (sortedVariants.length > 25) {
    out.push(`*… y ${sortedVariants.length - 25} variantes más*`);
  }
  return out.join('\n');
}

// =====================================================
// VENTAS EN VIVO
// =====================================================

function detectExplicitDateRange(message) {
  // Detecta "del YYYY-MM-DD al YYYY-MM-DD" en el prompt
  const m = message.match(/del?\s*(\d{4}-\d{2}-\d{2})\s+al?\s*(\d{4}-\d{2}-\d{2})/i);
  if (m) return { from: m[1], to: m[2] };
  return null;
}

async function maybeFetchLiveSales(message) {
  if (!isSalesQuery(message)) return null;

  // Construir URL con rango explícito (calendario) o días genéricos
  const explicitRange = detectExplicitDateRange(message);
  let qs;
  if (explicitRange) {
    qs = `from=${explicitRange.from}&to=${explicitRange.to}`;
  } else {
    const days = detectSalesPeriod(message);
    qs = `days=${days}`;
  }

  // Intentar detectar SKU/pack mencionado
  const pack = detectPack(message);
  const skuParam = pack ? `&sku=${encodeURIComponent(pack.components[0].sku)}` : '';

  try {
    const res = await fetch(`/api/sales?${qs}${skuParam}`, {
      method: 'GET', headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(35000)
    });
    if (!res.ok) {
      console.warn('[sales] backend respondió', res.status);
      return null;
    }
    const data = await res.json();
    if (data.error) {
      console.warn('[sales] error:', data.error);
      return null;
    }
    return { ...data, pack: pack || null };
  } catch (err) {
    console.warn('[sales] backend no disponible:', err.message);
    return null;
  }
}

function formatSalesForPrompt(sales) {
  const out = [];
  const { period, totals, byProduct, byDay, byHour, filterSku, pack } = sales;
  const money = (n) => '$' + Number(n).toLocaleString('es-CO');

  out.push(`## RESUMEN DE VENTAS · Período: ${period.from} → ${period.to} (${period.days} días)`);
  if (pack) out.push(`Filtrado por pack: **${pack.keys[0].toUpperCase()}** (SKU base: \`${pack.components[0].sku}\`)`);
  out.push('');
  out.push('### Totales del período');
  out.push(`| Métrica | Valor |`);
  out.push(`|---------|-------|`);
  out.push(`| Órdenes | **${totals.orders}** |`);
  out.push(`| Revenue | **${money(totals.revenue)} COP** |`);
  out.push(`| Unidades vendidas | **${totals.units}** |`);
  out.push(`| AOV (ticket promedio) | **${money(totals.aov)} COP** |`);
  out.push('');

  // Por día
  if (byDay.length > 0) {
    out.push('### Ventas por día');
    out.push('| Fecha | Órdenes | Unidades | Revenue |');
    out.push('|-------|---------|----------|---------|');
    for (const d of byDay) {
      out.push(`| ${d.date} | ${d.orders} | ${d.units} | ${money(d.revenue)} |`);
    }
    out.push('');
  }

  // Top productos
  if (byProduct.length > 0) {
    out.push(`### Top productos vendidos (${byProduct.length})`);
    out.push('| # | Producto | SKU | Unidades | Revenue |');
    out.push('|---|----------|-----|----------|---------|');
    byProduct.forEach((p, i) => {
      out.push(`| ${i + 1} | ${p.title} | \`${p.sku}\` | **${p.units}** | ${money(p.revenue)} |`);
    });
    out.push('');
  }

  // Por hora (solo si es período corto, max 3 días)
  if (byHour.length > 0 && period.days <= 3) {
    out.push('### Distribución por hora');
    out.push('| Hora | Órdenes |');
    out.push('|------|---------|');
    for (const h of byHour) {
      const date = h.hour.slice(0, 10);
      const hour = h.hour.slice(11) + ':00';
      out.push(`| ${date} ${hour} | ${h.orders} |`);
    }
  }

  return out.join('\n');
}

// Formato principal: itera todos los componentes del pack
function formatLiveInventoryForPrompt(packResult) {
  const out = [];
  let grandTotal = 0;

  for (let i = 0; i < packResult.components.length; i++) {
    const comp = packResult.components[i];
    const inv = comp.data;
    grandTotal += inv.total;

    out.push(`## Componente ${i + 1}: ${comp.label}`);
    out.push(`SKU búsqueda: \`${comp.sku}\` · ${inv.variantCount} variantes · Total: **${inv.total} unidades**`);
    out.push('');

    if (isApparelInventory(inv)) {
      out.push(formatApparelInventory(inv));
    } else {
      out.push(formatSimpleInventory(inv));
    }
    out.push('');
    out.push('---');
    out.push('');
  }

  out.push(`## RESUMEN GENERAL DEL PACK`);
  out.push(`Stock total combinado de TODOS los componentes: **${grandTotal} unidades**`);
  out.push(`Componentes consultados: ${packResult.components.length}`);

  return out.join('\n');
}

// =====================================================
// RENDER
// =====================================================

function addEntry(content, role) {
  // Si es el primer entry, limpiar welcome
  const welcome = el.console.querySelector('.entry-welcome');
  if (welcome) welcome.remove();

  const entry = document.createElement('div');
  entry.className = `entry entry-${role}`;
  const label = role === 'user' ? 'TÚ' : 'SHOP MGR';
  entry.innerHTML = `
    <div class="entry-meta">
      <span class="entry-meta-dot"></span>
      <span>${label}</span>
      <span>·</span>
      <span>${formatTimestamp(Date.now())}</span>
    </div>
    <div class="entry-body">${formatMd(content)}</div>
  `;
  el.console.appendChild(entry);
  scrollToBottom();
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    el.console.scrollTo({ top: el.console.scrollHeight, behavior: 'smooth' });
  });
}

function formatMd(text) {
  const safe = escapeHtml(text);
  const lines = safe.split('\n');
  const out = [];
  let inList = false;
  let listType = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { out.push(`</${listType}>`); inList = false; listType = null; }
      out.push('');
      continue;
    }
    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) {
      if (inList) { out.push(`</${listType}>`); inList = false; }
      out.push(`<h3>${inlineMd(h3[1])}</h3>`);
      continue;
    }
    if (h2) {
      if (inList) { out.push(`</${listType}>`); inList = false; }
      out.push(`<h2>${inlineMd(h2[1])}</h2>`);
      continue;
    }
    if (/^\d+[\.\)]\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        if (inList) out.push(`</${listType}>`);
        out.push('<ol>'); inList = true; listType = 'ol';
      }
      out.push(`<li>${inlineMd(line.replace(/^\d+[\.\)]\s+/, ''))}</li>`);
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        if (inList) out.push(`</${listType}>`);
        out.push('<ul>'); inList = true; listType = 'ul';
      }
      out.push(`<li>${inlineMd(line.replace(/^[-*•]\s+/, ''))}</li>`);
      continue;
    }
    if (inList) { out.push(`</${listType}>`); inList = false; listType = null; }
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  if (inList) out.push(`</${listType}>`);
  return out.join('\n');
}

function inlineMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(?<![">])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// =====================================================
// LOADING UI
// =====================================================

function isActiveLoading() {
  return state.loadingSessions.has(state.activeSessionId);
}

function updateLoadingUI() {
  const loading = isActiveLoading();
  el.loadingTag.hidden = !loading;
  el.sendBtn.disabled = loading;
  el.promptInput.disabled = loading;

  if (loading) {
    refreshTimer();
    if (!state.loadingInterval) {
      state.loadingInterval = setInterval(refreshTimer, 1000);
    }
  } else if (state.loadingSessions.size === 0 && state.loadingInterval) {
    clearInterval(state.loadingInterval);
    state.loadingInterval = null;
  }
}

function refreshTimer() {
  const id = state.activeSessionId;
  const start = state.loadingStartTimes.get(id);
  if (!start) { el.loadingTime.textContent = ''; return; }
  const sec = Math.floor((Date.now() - start) / 1000);
  el.loadingTime.textContent = sec < 60 ? `${sec}s` : `${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`;
}

// =====================================================
// STATUS
// =====================================================

function updateStatus() {
  if (!state.apiKey) {
    el.statusPill.textContent = 'Sin API key';
    el.statusPill.className = 'status-pill warn';
  } else {
    const modelName = state.model.includes('opus') ? 'Opus' : 'Sonnet';
    const docFlag = state.contextDoc ? ' · +doc' : '';
    const shopifyFlag = state.shopifyConnected ? ' · 🛍 Shopify' : '';
    el.statusPill.textContent = `Conectado · ${modelName}${docFlag}${shopifyFlag}`;
    el.statusPill.className = 'status-pill ok';
    const titleParts = [`Modelo: ${modelName}`];
    if (state.contextDoc) titleParts.push(`Doc contexto: ${(state.contextDoc.length / 1024).toFixed(1)} KB`);
    if (state.shopifyConnected) titleParts.push('Shopify Admin: conectado (read-only)');
    el.statusPill.title = titleParts.join(' · ');
  }
}

// =====================================================
// TOAST
// =====================================================

let toastTimer = null;
function showToast(msg, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer);
  el.toast.textContent = msg;
  el.toast.className = `toast toast-${type}`;
  el.toast.hidden = false;
  toastTimer = setTimeout(() => el.toast.hidden = true, 4000);
}

// =====================================================
// SETTINGS
// =====================================================

function openSettings() {
  el.modelSelect.value = state.model;
  el.apiKeyInput.value = '';
  el.contextDoc.value = state.contextDoc || '';
  renderKeyStatus();
  renderContextMeta();
  el.settingsModal.hidden = false;
  setTimeout(() => {
    if (state.apiKey) el.modelSelect.focus();
    else el.apiKeyInput.focus();
  }, 50);
}

function closeSettings() {
  el.settingsModal.hidden = true;
  el.apiKeyInput.value = '';
}

function saveSettings() {
  state.model = el.modelSelect.value;
  const typed = el.apiKeyInput.value.trim();
  if (typed) state.apiKey = typed;

  // Guardar documento de contexto
  const newContext = el.contextDoc.value;
  const contextChanged = newContext !== state.contextDoc;
  state.contextDoc = newContext;
  if (contextChanged) {
    state.contextUpdated = Date.now();
    localStorage.setItem(CONFIG.STORAGE.CONTEXT_UPDATED, state.contextUpdated.toString());
  }

  localStorage.setItem(CONFIG.STORAGE.MODEL, state.model);
  if (state.apiKey) localStorage.setItem(CONFIG.STORAGE.API_KEY, state.apiKey);
  try {
    if (state.contextDoc) {
      localStorage.setItem(CONFIG.STORAGE.CONTEXT_DOC, state.contextDoc);
    } else {
      localStorage.removeItem(CONFIG.STORAGE.CONTEXT_DOC);
      localStorage.removeItem(CONFIG.STORAGE.CONTEXT_UPDATED);
      state.contextUpdated = null;
    }
  } catch (err) {
    showToast('Documento muy grande para guardar. Reduce su tamaño.', 'error');
    return;
  }

  el.apiKeyInput.value = '';
  updateStatus();
  closeSettings();
  showToast(
    contextChanged && state.contextDoc
      ? 'Configuración + documento guardados'
      : 'Configuración guardada',
    'success'
  );
}

function renderContextMeta() {
  const text = el.contextDoc.value;
  const chars = text.length;
  const kb = (chars / 1024).toFixed(1);
  el.contextChars.textContent = `${chars.toLocaleString('es-CO')} chars · ${kb} KB`;
  // Aviso si excede 100 KB
  if (chars > 100000) {
    el.contextChars.classList.add('over-limit');
    el.contextChars.textContent += ' ⚠ excede límite recomendado';
  } else {
    el.contextChars.classList.remove('over-limit');
  }
  // Última actualización
  if (state.contextUpdated) {
    const d = new Date(state.contextUpdated);
    const dateStr = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    el.contextUpdated.textContent = `Actualizado ${dateStr} · ${timeStr}`;
  } else {
    el.contextUpdated.textContent = 'Sin guardar';
  }
}

function removeKey() {
  if (!state.apiKey) return;
  if (!confirm('¿Eliminar la API key?')) return;
  state.apiKey = '';
  localStorage.removeItem(CONFIG.STORAGE.API_KEY);
  renderKeyStatus();
  updateStatus();
  showToast('API key eliminada', 'success');
}

function renderKeyStatus() {
  if (!state.apiKey) { el.keyStatus.hidden = true; return; }
  const masked = '••••••••••••' + (state.apiKey.length > 4 ? state.apiKey.slice(-4) : '');
  el.keyStatusText.textContent = `Guardada · ${masked}`;
  el.keyStatus.hidden = false;
}

// =====================================================
// BOOT
// =====================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
