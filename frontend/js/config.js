/**
 * Configuración global del Agente Multi-Marca
 * Soporta múltiples marcas (Acuarella, JDC House) con un solo click.
 */

const CONFIG = {
  // === API ===
  API: {
    BACKEND_ENDPOINT: '/.netlify/functions/chat',
    ANTHROPIC_URL: 'https://api.anthropic.com/v1/messages',
    ANTHROPIC_VERSION: '2023-06-01',
    MODEL: 'claude-sonnet-4-5',
    MAX_TOKENS: 4096,
    TIMEOUT_MS: 120000,
    MAX_HISTORY: 20,
    WEB_SEARCH_MAX_USES: 5
  },

  // === STORAGE (claves globales, las brand-specific se generan dinámicamente) ===
  STORAGE: {
    API_KEY: 'multi.apiKey',
    MODE: 'multi.mode',
    THEME: 'multi.theme',
    SIDEBAR_COLLAPSED: 'multi.sidebarCollapsed',
    ACTIVE_BRAND: 'multi.activeBrand',
    CUSTOM_BRANDS: 'multi.customBrands',
    // Por marca, se genera: `multi.${brandId}.chats` y `multi.${brandId}.activeChatId`
  },

  // === MODES ===
  MODES: {
    AUTO: 'auto',
    DIRECT: 'direct',
    BACKEND: 'backend'
  },

  // === THEMES ===
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  },

  // === UI ===
  UI: {
    TYPING_DELAY: 30,
    SCROLL_BEHAVIOR: 'smooth',
    TOAST_DURATION: 4000,
    MAX_INPUT_HEIGHT: 180,
    MAX_TITLE_LENGTH: 40
  },

  // === MENSAJES SISTEMA UI ===
  MESSAGES: {
    ERROR_GENERIC: 'Ups, algo salió mal 💔 Intenta de nuevo en un momentito.',
    ERROR_NETWORK: 'No pude conectar con el servidor 😢 Revisa tu conexión.',
    ERROR_TIMEOUT: 'La consulta tardó demasiado. ¿Intentamos de nuevo? ⏱️',
    ERROR_NO_KEY: 'Necesito una API key de Anthropic para responder. Abre ⚙ Configuración y agrégala.',
    ERROR_BAD_KEY: 'Tu API key parece incorrecta o sin créditos. Revisa Configuración ⚙',
    CHAT_CLEARED: 'Conversación nueva creada ✨',
    CHAT_DELETED: 'Chat eliminado 🗑',
    ALL_CHATS_CLEARED: 'Todo el historial fue borrado ✨',
    SETTINGS_SAVED: 'Configuración guardada',
    INPUT_EMPTY: 'Cuéntame algo primero para poder ayudarte',
    BRAND_SWITCHED: 'Cambiaste a'
  }
};

// =====================================================
// MARCAS
// =====================================================

const BRANDS = {
  // -----------------------------------------------------
  // ACUARELLA - Accesorios femeninos
  // -----------------------------------------------------
  acuarella: {
    id: 'acuarella',
    name: 'Acuarella',
    tagline: 'Accesorios femeninos',
    emoji: '💜',
    logo: { text: 'acuare', italic: 'lla' },
    badge: 'Agente AI',

    // Colores (sobreescriben las variables CSS)
    colors: {
      light: {
        '--color-primary': '#BDBEF4',
        '--color-primary-light': '#DED1FF',
        '--color-primary-dark': '#9B9DE8',
        '--color-secondary': '#F6F5F4',
        '--color-text-on-primary': '#FFFFFF',
        '--gradient-primary': 'linear-gradient(135deg, #BDBEF4 0%, #DED1FF 100%)',
        '--shadow-primary': '0 4px 16px rgba(189, 190, 244, 0.4)',
        '--shadow-focus': '0 0 0 4px rgba(189, 190, 244, 0.25)'
      },
      dark: {
        '--color-primary': '#BDBEF4',
        '--color-primary-light': '#3A3A5C',
        '--color-primary-dark': '#DED1FF',
        '--color-secondary': '#2A2A38',
        '--color-text-on-primary': '#FFFFFF',
        '--gradient-primary': 'linear-gradient(135deg, #BDBEF4 0%, #9B9DE8 100%)',
        '--shadow-primary': '0 4px 20px rgba(189, 190, 244, 0.35)',
        '--shadow-focus': '0 0 0 4px rgba(189, 190, 244, 0.25)'
      }
    },

    greeting: `Hola, soy tu agente Acuarella 💜

Te ayudo con sourcing de proveedores, análisis de tendencias e ideas creativas para tu marca. ¿En qué arrancamos?`,

    placeholder: 'Cuéntame qué accesorio quieres encontrar… (Enter para enviar, Shift+Enter para nueva línea)',

    composerHint: 'Evalúo todo con los 5 valores Acuarella (Versatilidad, Tendencia, Autenticidad, Comodidad, Comunidad).',

    quickActions: [
      {
        key: 'buscar-proveedores',
        emoji: '🔎',
        title: 'Buscar proveedores',
        desc: 'Encuentra fabricantes alineados con Acuarella',
        prompt: 'Quiero buscar proveedores para una nueva categoría. ¿Qué necesitas saber de mí para encontrar los 3-5 mejores aliados?'
      },
      {
        key: 'analizar-tendencias',
        emoji: '✨',
        title: 'Analizar tendencias',
        desc: 'Paletas, materiales y estilos del momento',
        prompt: 'Hazme un análisis de tendencias para la próxima temporada para mujeres entre 18-35 años en Colombia. Incluye paleta de colores con HEX, materiales, siluetas y referencias de marcas.'
      },
      {
        key: 'evaluar-proveedor',
        emoji: '⭐',
        title: 'Evaluar proveedor',
        desc: 'Califica una opción que ya tienes',
        prompt: 'Tengo un proveedor que me interesa. Quiero que me ayudes a evaluarlo con el sistema de 100 puntos de Acuarella. Te paso los datos enseguida.'
      },
      {
        key: 'idea-coleccion',
        emoji: '👜',
        title: 'Idea de colección',
        desc: 'Conceptualiza una mini-colección',
        prompt: 'Ayúdame a conceptualizar una mini-colección de bolsos y riñoneras para nuestra próxima campaña, que refleje los 5 valores de Acuarella. Dame mood, colores, materiales y story.'
      },
      {
        key: 'ideas-creativas',
        emoji: '💡',
        title: 'Ideas creativas',
        desc: 'Naming, campañas, contenido, copy y más',
        prompt: '¡Modo creativo activado! 🎨 Antes de lanzarme, dime en qué te ayudo:\n\n1. 📛 Naming (producto / colección / línea)\n2. 📸 Concepto de campaña (mood, narrativa)\n3. 📱 Contenido de redes (Reels, TikTok, posts)\n4. ✍️ Copy / storytelling (descripciones, emails)\n5. 🎨 Mood board / paleta visual\n6. 🤝 Ideas de colaboración (influencers, marcas)\n7. 🎭 Activaciones / eventos / pop-ups\n8. 🧠 Brainstorming libre\n\nResponde con el número o cuéntame tu reto directamente y arrancamos. 💜'
      }
    ],

    categories: [
      { emoji: '👜', name: 'Bolsos', query: 'Necesito proveedores de bolsos femeninos para Acuarella.' },
      { emoji: '🎒', name: 'Riñoneras', query: 'Busco proveedores de riñoneras trendy para mujer.' },
      { emoji: '🧳', name: 'Morrales', query: 'Quiero encontrar proveedores de morrales versátiles.' },
      { emoji: '👛', name: 'Billeteras', query: 'Necesito proveedores de billeteras femeninas.' },
      { emoji: '🧴', name: 'Maletas', query: 'Busco fabricantes de maletas de viaje para mujer.' },
      { emoji: '👠', name: 'Zapatos', query: 'Quiero proveedores de zapatos femeninos cómodos y trendy.' }
    ],

    trendsDiscovery: {
      actual: { label: 'Esta temporada', prompt: 'Investiga y dime las 6-8 tendencias MÁS RELEVANTES en accesorios femeninos para ESTA temporada en Colombia/LATAM. Para cada una: nombre, descripción, paleta HEX, materiales, marca referente y cómo Acuarella puede adaptarla. Usa web_search.' },
      proxima: { label: 'Próxima temporada', prompt: 'Mírate al futuro: tendencias que VAN A EXPLOTAR la próxima temporada en accesorios femeninos. 6-8 emergentes con: nombre, por qué crecerá, paleta HEX, materiales, siluetas y cómo Acuarella se adelanta. Usa web_search.' },
      atemporal: { label: 'Atemporales', prompt: 'Tendencias ATEMPORALES/CLÁSICAS en accesorios femeninos que SIEMPRE funcionan para Acuarella. 6-8 con: nombre, por qué nunca pasan de moda, paleta HEX, materiales icónicos y referencias.' },
      redes: { label: 'Virales en redes', prompt: 'Qué está EXPLOTANDO en TikTok, Instagram, Pinterest en accesorios femeninos. 6-8 micro-tendencias con: nombre, hashtags, descripción, paleta HEX, cómo Acuarella capitaliza el momento. Usa web_search.' },
      latam: { label: 'LATAM / Colombia', prompt: 'Tendencias específicas de accesorios femeninos en LATAM/Colombia para mujeres 18-35. 6-8 con: nombre, descripción, paleta HEX, contexto cultural y encaje con Acuarella. Usa web_search.' }
    }
  },

  // -----------------------------------------------------
  // JDC HOUSE - Ropa urbana premium para hombre
  // -----------------------------------------------------
  jdc: {
    id: 'jdc',
    name: 'JDC House',
    tagline: 'Ropa urbana premium',
    emoji: '🖤',
    logo: { text: 'jdc', italic: 'house' },
    badge: 'Agente AI',

    colors: {
      light: {
        '--color-primary': '#1A1A1A',
        '--color-primary-light': '#F5F4F1',
        '--color-primary-dark': '#000000',
        '--color-secondary': '#E8E6E1',
        '--color-text-on-primary': '#FFFFFF',
        '--gradient-primary': 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
        '--shadow-primary': '0 4px 16px rgba(0, 0, 0, 0.25)',
        '--shadow-focus': '0 0 0 4px rgba(26, 26, 26, 0.18)'
      },
      dark: {
        '--color-primary': '#F5F4F1',
        '--color-primary-light': '#2A2A2A',
        '--color-primary-dark': '#FFFFFF',
        '--color-secondary': '#1F1F1F',
        '--color-text-on-primary': '#1A1A1A',
        '--gradient-primary': 'linear-gradient(135deg, #F5F4F1 0%, #C9A961 100%)',
        '--shadow-primary': '0 4px 20px rgba(245, 244, 241, 0.18)',
        '--shadow-focus': '0 0 0 4px rgba(245, 244, 241, 0.2)'
      }
    },

    greeting: `Qué más, parcero. Soy tu agente JDC House 🖤

Encuentro marcas y proveedores, analizo drops y propongo ideas para mantenerte en la cima del streetwear premium. ¿En qué te ayudo?`,

    placeholder: 'Cuéntame qué buscas para JDC House… (Enter para enviar)',

    composerHint: 'Evalúo todo con los 5 pilares JDC (Exclusividad, Calidad, Estilo urbano, Cercanía, Confianza).',

    quickActions: [
      {
        key: 'buscar-marcas',
        emoji: '🔎',
        title: 'Buscar marcas / proveedores',
        desc: 'Sourcing de marcas urbanas premium',
        prompt: 'Quiero buscar marcas o proveedores de streetwear premium para JDC House. ¿Qué necesitas saber para encontrar los 3-5 mejores aliados?'
      },
      {
        key: 'drops-trending',
        emoji: '🔥',
        title: 'Drops y trending',
        desc: 'Lo que está pegando ahora en streetwear',
        prompt: 'Investiga los drops más comentados y las tendencias streetwear que están explotando este trimestre. Enfoque: hombre urbano 18-35, Colombia + influencia global. Incluye paletas, siluetas, marcas y por qué encaja con JDC. Usa web_search.'
      },
      {
        key: 'evaluar-marca',
        emoji: '⭐',
        title: 'Evaluar marca / producto',
        desc: 'Califica una opción con los criterios JDC',
        prompt: 'Tengo una marca/producto que me interesa para JDC House. Quiero que la evalúes con el sistema de 100 puntos JDC. Te paso los datos enseguida.'
      },
      {
        key: 'idea-outfit',
        emoji: '👕',
        title: 'Ideas de outfit / styling',
        desc: 'Combina piezas en looks completos',
        prompt: 'Ayúdame con styling: dame 3-5 outfits completos para JDC House que combinen las piezas del catálogo (camisetas oversize, jeans, polos, chaquetas, bermudas, deportiva). Cada outfit con vibe, ocasión y por qué funciona.'
      },
      {
        key: 'ideas-creativas',
        emoji: '💡',
        title: 'Ideas creativas',
        desc: 'Naming, campañas, contenido, copy',
        prompt: 'Modo creativo activado 🔥 Dime en qué te ayudo:\n\n1. 📛 Naming (drop / colección / pieza)\n2. 📸 Concepto de campaña\n3. 📱 Contenido de redes (Reels, TikTok)\n4. ✍️ Copy y storytelling (descripciones, emails)\n5. 🎨 Mood board / paleta\n6. 🤝 Colaboraciones (influencers, marcas)\n7. 🎭 Activaciones (drops físicos, pop-ups)\n8. 🧠 Brainstorming libre\n\nResponde con el número o cuéntame tu reto. 🖤'
      }
    ],

    categories: [
      { emoji: '👕', name: 'Camisetas', query: 'Busco proveedores de camisetas oversize y básicas premium para JDC House.' },
      { emoji: '👖', name: 'Jeans', query: 'Necesito marcas/proveedores de jeans urbanos premium hombre.' },
      { emoji: '🟣', name: 'Polos', query: 'Quiero proveedores de polos premium para hombre.' },
      { emoji: '🧥', name: 'Chaquetas', query: 'Busco marcas de chaquetas urbanas premium hombre.' },
      { emoji: '🩳', name: 'Bermudas', query: 'Necesito proveedores de bermudas urbanas premium.' },
      { emoji: '🏃', name: 'Deportiva', query: 'Busco marcas de ropa deportiva premium hombre.' }
    ],

    trendsDiscovery: {
      actual: { label: 'Esta temporada', prompt: 'Investiga las 6-8 tendencias streetwear MÁS RELEVANTES ahora para hombre urbano 18-35 en Colombia. Para cada una: nombre, descripción, paleta HEX, prendas clave, marca referente y cómo JDC House puede adaptarla. Usa web_search.' },
      proxima: { label: 'Próxima temporada', prompt: 'Tendencias streetwear que VAN A EXPLOTAR la próxima temporada para hombre. 6-8 emergentes con: nombre, por qué crecerá, paleta HEX, prendas, siluetas y cómo JDC se adelanta. Usa web_search.' },
      drops: { label: 'Drops más comentados', prompt: 'Investiga los DROPS más comentados/codiciados en streetwear globalmente. 6-8 con: marca, drop name, por qué pegó, paleta HEX y qué aprende JDC House de ellos. Usa web_search.' },
      redes: { label: 'Virales en redes', prompt: 'Qué está EXPLOTANDO en TikTok, Instagram, X (Twitter) en moda masculina urbana. 6-8 micro-tendencias con: nombre, hashtags, descripción, paleta HEX, cómo JDC capitaliza. Usa web_search.' },
      latam: { label: 'LATAM / Colombia', prompt: 'Tendencias específicas de moda urbana masculina en LATAM/Colombia (Medellín, Bogotá, CDMX, BA). 6-8 con: nombre, descripción, paleta HEX, contexto cultural y encaje con JDC House. Usa web_search.' }
    }
  }
};

// =====================================================
// SYSTEM PROMPTS
// =====================================================
// IMPORTANTE: Mantener sincronizado con backend/functions/chat.js

const SYSTEM_PROMPTS = {
  acuarella: `Eres el agente AI multipropósito de ACUARELLA, marca colombiana de accesorios femeninos (bolsos, riñoneras, morrales, billeteras, maletas, zapatos). Combinas TRES roles en uno:

1. 🔎 AGENTE DE COMPRAS — sourcing de proveedores reales (usa web_search)
2. ✨ ANALISTA DE TENDENCIAS — investiga lo que está sonando (usa web_search)
3. 💡 DIRECTORA CREATIVA — naming, campañas, copy, contenido, mood boards, storytelling, colaboraciones, eventos, brainstorming

Atiendes lo que la usuaria pida en cualquiera de los 3 roles, siempre desde el ADN Acuarella.

VALORES (Evalúa TODO con estos):
1. VERSATILIDAD: ¿Funciona para múltiples ocasiones, día/noche, múltiples estilos?
2. TENDENCIA: ¿Está al día con colores vibrantes, estampados, detalles innovadores?
3. AUTENTICIDAD: ¿Empodera a las mujeres, inspira confianza, tiene diseño único?
4. COMODIDAD: ¿Materiales de calidad, práctico, precio justo?
5. COMUNIDAD: ¿Es compartible en redes? ¿Conecta mujeres?

PERSONALIDAD: "La Amiga Fashionista Confiable"
- Tono: Alegre, empático, cálido, cercano pero profesional
- Comunicación: Como una amiga, NO como vendedora
- Estilo: Informal pero profesional
- USO DE EMOJIS (regla estricta):
  * SOLO puedes usar 1 emoji en el saludo inicial del primer mensaje de la conversación
  * En TODAS las respuestas posteriores: SIN emojis decorativos
  * Excepción: emojis funcionales para etiquetar contacto (WhatsApp, Instagram, etc.) están permitidos

IDENTIDAD VISUAL:
- Principal: Lila #BDBEF4 (creatividad, feminidad)
- Secundario: Crema #F6F5F4 (elegancia)
- Tendencia: Azul Rey #406FD2, Naranja #FF824D, Fucsia #F68FC1

PRODUCTOS: Bolsos, riñoneras, morrales, billeteras, maletas, zapatos.

SISTEMA DE EVALUACIÓN (100 pts):
1. Calidad (35%): Materiales, acabados
2. Diseño (25%): Alegre/fashionista/versátil/trendy
3. Precio (20%): Justo (Bolsos 80.000-250.000 COP)
4. Confiabilidad (15%): Entregas, comunicación
5. Sostenibilidad (5%): Prácticas éticas

CALIFICACIÓN:
⭐⭐⭐⭐⭐ (90-100): Excelente
⭐⭐⭐⭐ (75-89): Muy bueno - solicitar muestras
⭐⭐⭐ (60-74): Bueno - orden pequeña
⭐⭐ (50-59): Regular - alta supervisión
⭐ (<50): No recomendado

FORMATO DE PROVEEDORES (usa web_search SIEMPRE):
- Nombre + ubicación
- Calificación con estrellas
- Precio (COP y USD)
- MOQ y tiempos
- CONTACTO (busca en web):
  - 📱 WhatsApp/Teléfono
  - 📷 Instagram (@usuario)
  - 📘 Facebook
  - 🌐 Sitio web
  - ✉️ Email
  - 📍 Showroom
- Ventajas / Consideraciones
- ¿POR QUÉ ES PERFECTO PARA ACUARELLA? (los 5 valores)
- CÓMO EMPODERA A TUS CLIENTAS
- Evaluación detallada (puntos por criterio)
- 🔗 Fuente

Si NO encuentras un contacto, dilo abiertamente. NUNCA inventes.

PARA TENDENCIAS: paleta HEX, materiales, siluetas, marcas referente, adaptación Acuarella.

PARA CREATIVIDAD: sé AUDAZ, mínimo 3-5 opciones, justifica con los 5 valores, sugiere siguiente paso.

MANTRA: ¿Es VERSÁTIL, TRENDY, AUTÉNTICO, CÓMODO y CREA COMUNIDAD?
Si todas = SÍ → Es perfecto para Acuarella.

TÍTULOS / FORMATO:
- Usa títulos cortos y sin emojis decorativos.
- Encabezados claros tipo "Evaluación", "Pros", "Contacto", "Siguiente paso" — sin emojis al inicio.

REGLAS:
- Responde en español (Colombia).
- Usa web_search para sourcing real.
- NUNCA inventes contactos.
- Cita fuentes.
- Respuestas claras y escaneables.
- Sin emojis decorativos (excepto los funcionales para contacto y el del saludo inicial).
- Cierra con pregunta o siguiente paso.`,

  jdc: `Eres el agente AI multipropósito de JDC HOUSE, tienda colombiana (Medellín) de ropa urbana premium para HOMBRE. Combinas TRES roles en uno:

1. 🔎 AGENTE DE COMPRAS — sourcing de marcas y proveedores streetwear premium (usa web_search)
2. ✨ ANALISTA DE TENDENCIAS — investiga drops, tendencias y cultura urbana global (usa web_search)
3. 💡 DIRECTOR CREATIVO — naming, campañas, copy, contenido, styling, colaboraciones, drops, eventos

Atiendes lo que el usuario pida en cualquiera de los 3 roles, siempre desde el ADN JDC House.

5 PILARES JDC (Evalúa TODO con estos):
1. EXCLUSIVIDAD: ¿Es una pieza/marca curada, limitada, no de masa?
2. CALIDAD: ¿Materiales y construcción premium asegurados?
3. ESTILO URBANO: ¿Habla streetwear moderno con identidad propia?
4. CERCANÍA: ¿Mantiene la conexión humana con el cliente JDC?
5. CONFIANZA: ¿Entregas puntuales, soporte, garantía?

PERSONALIDAD: "El hermano que sabe de moda urbana"
- Tono: directo, confiado, moderno, cercano, sin sobreactuar
- Comunicación: como pana que sabe del tema y te da el dato real
- Estilo: informal premium, urbano, masculino sin caer en cliché
- USO DE EMOJIS (regla estricta):
  * SOLO puedes usar 1 emoji en el saludo inicial del primer mensaje de la conversación
  * En TODAS las respuestas posteriores: SIN emojis decorativos
  * Excepción: emojis funcionales para etiquetar contacto (WhatsApp, Instagram, etc.) están permitidos

IDENTIDAD VISUAL JDC:
- Principal: Negro #1A1A1A (exclusividad, premium)
- Secundario: Bone #F5F4F1, Concrete #E8E6E1
- Acento sutil: Dorado #C9A961 (lujo discreto)
- Estética: minimalista, foto editorial urbana

PRODUCTOS: Camisetas básicas/oversize, jeans, pantalones, polos, chaquetas, bermudas, deportiva.

RANGO DE PRECIOS REFERENCIAL:
- Camisetas: 70.000-130.000 COP
- Polos: 100.000-180.000 COP
- Jeans: 140.000-280.000 COP
- Chaquetas: 200.000-500.000 COP
- Bermudas: 80.000-150.000 COP
- Deportiva: 80.000-250.000 COP

SISTEMA DE EVALUACIÓN (100 pts):
1. Calidad/construcción (30%)
2. Estilo/diseño urbano (25%)
3. Exclusividad/curaduría (20%)
4. Precio justificado vs mercado (15%)
5. Confiabilidad del proveedor (10%)

CALIFICACIÓN:
⭐⭐⭐⭐⭐ (90-100): Drop inmediato
⭐⭐⭐⭐ (75-89): Muy bueno - pedir muestra
⭐⭐⭐ (60-74): Bueno - prueba con orden pequeña
⭐⭐ (50-59): Regular - alta supervisión
⭐ (<50): No recomendado

FORMATO DE MARCA/PROVEEDOR (usa web_search SIEMPRE):
- Nombre + ubicación
- Calificación con estrellas
- Precio retail / wholesale (COP y USD)
- MOQ y tiempos
- CONTACTO (busca en web):
  - 📱 WhatsApp/Teléfono
  - 📷 Instagram (@usuario)
  - 📘 Facebook
  - 🌐 Sitio web
  - ✉️ Email
  - 📍 Showroom/HQ
- Ventajas / Consideraciones
- ¿POR QUÉ ENCAJA EN JDC HOUSE? (los 5 pilares)
- AUDIENCIA OBJETIVO QUE LO COMPRARÍA
- Evaluación detallada (puntos por criterio)
- 🔗 Fuente

Si NO encuentras un contacto, dilo. NUNCA inventes.

PARA TENDENCIAS: paleta HEX, prendas clave, siluetas, marcas (Stüssy, Aimé Leon Dore, Fear of God, Carhartt WIP, Awake NY, Patta, KITH, etc.), cómo JDC adapta.

PARA STYLING: outfits completos con vibe, ocasión, prendas combinables, look total y motivo.

PARA CREATIVIDAD: sé AUDAZ y URBANO, mínimo 3-5 opciones, justifica con los 5 pilares JDC, sugiere ejecución.

MANTRA: ¿Es EXCLUSIVO, CALIDAD premium, ESTILO urbano, CERCANO y CONFIABLE?
Si todas = SÍ → Drop confirmado para JDC House.

TÍTULOS / FORMATO:
- Usa títulos cortos y sin emojis decorativos.
- Encabezados claros tipo "Evaluación", "Pros", "Contacto", "Siguiente paso" — sin emojis al inicio.

REGLAS:
- Responde en español (Colombia, con tono paisa cuando aplique).
- Usa web_search para sourcing real.
- NUNCA inventes contactos.
- Cita fuentes.
- Respuestas claras, urbanas, sin floreo innecesario.
- Sin emojis decorativos (excepto los funcionales para contacto y el del saludo inicial).
- Cierra con pregunta o siguiente paso.`
};

// =====================================================
// QUICK ACTIONS POR TIPO DE NEGOCIO
// =====================================================

const BUSINESS_TYPE_LABELS = {
  'marca-propia': 'Marca propia',
  'reventa': 'Reventa / Distribución',
  'mayorista': 'Mayorista B2B',
  'servicios': 'Servicios',
  'marketplace': 'Marketplace',
  'otro': 'Negocio'
};

/**
 * Valores predeterminados sugeridos por tipo de negocio.
 * El formulario los pre-rellena al crear la marca y se sustituyen automáticamente
 * cuando el usuario cambia el tipo, A MENOS que el usuario los haya modificado.
 */
const DEFAULT_VALUES_BY_TYPE = {
  'marca-propia': ['Calidad', 'Originalidad', 'Diseño', 'Comunidad', 'Sostenibilidad'],
  'reventa': ['Selección curada', 'Precio justo', 'Confianza', 'Atención rápida', 'Logística ágil'],
  'mayorista': ['Calidad consistente', 'Precio competitivo', 'Confiabilidad', 'Volumen escalable', 'Soporte B2B'],
  'servicios': ['Resultados medibles', 'Experiencia', 'Cercanía', 'Compromiso', 'Innovación'],
  'marketplace': ['Curaduría', 'Confianza', 'Variedad', 'Experiencia de uso', 'Soporte'],
  'otro': ['Calidad', 'Confianza', 'Innovación', 'Cercanía', 'Excelencia']
};

function getDefaultValuesText(type) {
  const vals = DEFAULT_VALUES_BY_TYPE[type] || DEFAULT_VALUES_BY_TYPE['otro'];
  return vals.join('\n');
}

/**
 * Comprueba si el texto actual corresponde a alguno de los sets de defaults
 * (para saber si el usuario lo modificó o sigue siendo el pre-rellenado).
 */
function isStillDefaultValues(text) {
  const normalized = (text || '').trim();
  if (!normalized) return true;
  return Object.values(DEFAULT_VALUES_BY_TYPE).some(set => set.join('\n').trim() === normalized);
}

function buildQuickActionsForType(type, brandName) {
  const n = brandName;
  const map = {
    'marca-propia': [
      { key: 'buscar-proveedores', emoji: '🔎', title: 'Buscar fabricantes', desc: `Encuentra fabricantes/proveedores para ${n}`,
        prompt: `Quiero buscar fabricantes o proveedores para ${n}. ¿Qué necesitas saber para encontrar los 3-5 mejores aliados?` },
      { key: 'analizar-tendencias', emoji: '✨', title: 'Analizar tendencias', desc: 'Tendencias del momento',
        prompt: `Hazme un análisis de tendencias actuales para ${n} en su mercado objetivo. Usa web_search e incluye paleta HEX, materiales, estilos y referencias.` },
      { key: 'evaluar-proveedor', emoji: '⭐', title: 'Evaluar proveedor', desc: 'Sistema de 100 puntos',
        prompt: `Tengo un proveedor que me interesa. Evalúalo con el sistema de 100 puntos de ${n}. Te paso los datos enseguida.` },
      { key: 'idea-producto', emoji: '🎨', title: 'Idea de producto', desc: 'Conceptualiza nuevos productos',
        prompt: `Ayúdame a conceptualizar 3-5 ideas de productos nuevos para ${n} alineados con nuestros valores. Mood, materiales, story y siguiente paso.` },
      { key: 'ideas-creativas', emoji: '💡', title: 'Ideas creativas', desc: 'Naming, campañas, contenido',
        prompt: 'Modo creativo. Dime qué necesitas: 1) Naming  2) Campaña  3) Contenido redes  4) Copy  5) Mood board  6) Colaboraciones  7) Activaciones  8) Brainstorming libre.' }
    ],

    'reventa': [
      { key: 'buscar-productos', emoji: '🛒', title: 'Buscar productos hot', desc: 'Encuentra productos para revender',
        prompt: `Quiero encontrar productos para revender en ${n}. ¿Qué categoría te interesa explorar? Buscaré los más demandados y rentables con web_search.` },
      { key: 'productos-trending', emoji: '🔥', title: 'Productos trending', desc: 'Lo que está pegando ahora',
        prompt: `Investiga los productos que están EXPLOTANDO en ventas online ahora mismo (TikTok shop, dropshipping, etc.) relevantes para ${n}. Margen, demanda, dónde sourcear. Usa web_search.` },
      { key: 'evaluar-proveedor', emoji: '⭐', title: 'Evaluar proveedor', desc: 'Mayoristas / dropshippers',
        prompt: `Tengo un proveedor mayorista que me interesa para ${n}. Evalúalo con sistema de 100 puntos: precio, MOQ, tiempos, confiabilidad, márgen potencial. Te paso los datos.` },
      { key: 'pricing', emoji: '💰', title: 'Estrategia de precios', desc: 'Cálculo de márgenes',
        prompt: `Ayúdame a definir estrategia de precios para ${n}. Te paso el costo del producto y me dices el precio sugerido considerando margen, competencia y posicionamiento.` },
      { key: 'ideas-creativas', emoji: '💡', title: 'Marketing / promociones', desc: 'Estrategias de venta',
        prompt: 'Modo creativo. Dime qué necesitas: 1) Naming de colección  2) Promociones  3) Contenido redes  4) Copy / descripciones  5) Email marketing  6) Influencers  7) Activaciones  8) Brainstorming libre.' }
    ],

    'mayorista': [
      { key: 'buscar-clientes', emoji: '🎯', title: 'Buscar clientes', desc: 'Encuentra compradores B2B',
        prompt: `Quiero encontrar clientes B2B potenciales para ${n}. Dime qué perfil de cliente buscas (sector, tamaño, ubicación) y los buscaré con web_search incluyendo contactos verificables.` },
      { key: 'analisis-competencia', emoji: '🔍', title: 'Análisis de competencia', desc: 'Otros mayoristas del sector',
        prompt: `Investiga los 5-8 principales mayoristas/competidores de ${n}. Para cada uno: portafolio, precios públicos, posicionamiento, fortalezas y debilidades. Usa web_search.` },
      { key: 'catalogo-pitch', emoji: '📋', title: 'Catálogo y pitch', desc: 'Material comercial',
        prompt: `Ayúdame a estructurar el catálogo / pitch comercial de ${n} para clientes B2B. Estructura, secciones, mensajes clave, propuesta de valor, condiciones comerciales.` },
      { key: 'estrategia-comercial', emoji: '📈', title: 'Estrategia comercial', desc: 'Crecimiento de cartera',
        prompt: `Dame una estrategia comercial para que ${n} aumente su cartera de clientes B2B. Canales, tácticas, métricas clave, primeros 30/60/90 días.` },
      { key: 'ideas-creativas', emoji: '💡', title: 'Ideas creativas', desc: 'Branding, copy, contenido B2B',
        prompt: 'Modo creativo B2B. Dime qué necesitas: 1) Naming / rebranding  2) Pitch deck  3) LinkedIn / contenido B2B  4) Email comercial  5) Brochure / one-pager  6) Eventos / ferias  7) Casos de éxito  8) Brainstorming libre.' }
    ],

    'servicios': [
      { key: 'captacion', emoji: '🎯', title: 'Captación de clientes', desc: 'Encuentra prospectos',
        prompt: `Quiero captar clientes para ${n}. Dime qué perfil buscas y los identificaré con web_search incluyendo perfiles, contactos y enfoque sugerido para cada uno.` },
      { key: 'analisis-mercado', emoji: '🔍', title: 'Análisis de mercado', desc: 'Competencia y oportunidades',
        prompt: `Investiga el mercado de ${n}: principales competidores, precios típicos, gaps de oportunidad, tendencias en el sector. Usa web_search.` },
      { key: 'propuesta', emoji: '📝', title: 'Propuesta / pricing', desc: 'Estructura de servicios',
        prompt: `Ayúdame a estructurar paquetes y pricing para los servicios de ${n}. Propón 2-3 tiers (básico, medio, premium) con qué incluye cada uno y precio sugerido.` },
      { key: 'contenido', emoji: '📱', title: 'Contenido y marketing', desc: 'Posicionamiento',
        prompt: `Estrategia de contenido para ${n}: ¿en qué redes estar, qué tipo de contenido publicar, frecuencia, hooks que funcionen para mi servicio? Plan de 30 días.` },
      { key: 'ideas-creativas', emoji: '💡', title: 'Ideas creativas', desc: 'Branding, naming, campañas',
        prompt: 'Modo creativo. Dime qué necesitas: 1) Naming / branding  2) Propuesta de valor  3) Contenido redes  4) Email marketing  5) Casos de éxito  6) Colaboraciones  7) Webinars / eventos  8) Brainstorming libre.' }
    ],

    'marketplace': [
      { key: 'buscar-vendors', emoji: '🤝', title: 'Buscar vendors / partners', desc: 'Encuentra sellers para tu plataforma',
        prompt: `Quiero encontrar vendors / partners para ${n}. Dime qué categoría buscas y identificaré candidatos con web_search incluyendo contacto y enfoque para cada uno.` },
      { key: 'analisis-categorias', emoji: '📊', title: 'Análisis de categorías', desc: 'Qué categorías escalar',
        prompt: `Investiga qué categorías están creciendo más en marketplaces como Amazon, Mercado Libre, Etsy, etc., aplicable a ${n}. Da números, tendencias y oportunidades. Usa web_search.` },
      { key: 'evaluar-vendor', emoji: '⭐', title: 'Evaluar vendor', desc: 'Sistema de 100 puntos',
        prompt: `Tengo un vendor potencial para ${n}. Evalúalo con el sistema de 100 puntos: catálogo, calidad, logística, alineación con marca, escalabilidad. Te paso los datos.` },
      { key: 'estrategia-growth', emoji: '📈', title: 'Estrategia de growth', desc: 'GMV, comisiones, expansión',
        prompt: `Dame una estrategia de crecimiento para ${n}: cómo aumentar GMV, optimizar comisiones, retener vendors top, captar compradores. Tácticas accionables.` },
      { key: 'ideas-creativas', emoji: '💡', title: 'Ideas creativas', desc: 'Branding, campañas, contenido',
        prompt: 'Modo creativo. Dime qué necesitas: 1) Naming de categorías  2) Campañas estacionales  3) Contenido para compradores  4) Onboarding de vendors  5) Eventos / ferias  6) Colaboraciones  7) Programas de fidelidad  8) Brainstorming libre.' }
    ],

    'otro': [
      { key: 'investigar', emoji: '🔎', title: 'Investigar mercado', desc: 'Información del sector',
        prompt: `Quiero investigar el mercado de ${n}. ¿Qué quieres saber primero? Competencia, tendencias, clientes, proveedores, regulación, etc. Usa web_search.` },
      { key: 'analizar-tendencias', emoji: '✨', title: 'Tendencias del sector', desc: 'Qué está pasando ahora',
        prompt: `Hazme un análisis de tendencias actuales relevantes para ${n}. Identifica las 5-8 más importantes con datos, fuentes y oportunidades. Usa web_search.` },
      { key: 'evaluar', emoji: '⭐', title: 'Evaluar opción', desc: 'Califica cualquier oportunidad',
        prompt: `Tengo una oportunidad (proveedor, cliente, alianza, producto, etc.) que quiero evaluar para ${n}. Te paso los datos y la analizas con sistema de 100 puntos según los valores de la marca.` },
      { key: 'estrategia', emoji: '📈', title: 'Estrategia', desc: 'Plan accionable',
        prompt: `Ayúdame con una estrategia para ${n}. Cuéntame el objetivo (crecer ventas, mejorar marca, lanzar producto, etc.) y arma un plan de 30/60/90 días.` },
      { key: 'ideas-creativas', emoji: '💡', title: 'Ideas creativas', desc: 'Naming, campañas, contenido',
        prompt: 'Modo creativo. Dime qué necesitas: 1) Naming / branding  2) Campañas  3) Contenido redes  4) Copy  5) Mood board  6) Colaboraciones  7) Eventos  8) Brainstorming libre.' }
    ]
  };
  return map[type] || map['otro'];
}

// =====================================================
// HELPERS PARA MARCAS PERSONALIZADAS
// =====================================================

/**
 * Aclara un color HEX por un porcentaje (0-1). Ej: lighten('#7C3AED', 0.7) → tinte muy claro
 */
function lightenHex(hex, percent) {
  const c = parseHex(hex);
  const r = Math.round(c.r + (255 - c.r) * percent);
  const g = Math.round(c.g + (255 - c.g) * percent);
  const b = Math.round(c.b + (255 - c.b) * percent);
  return rgbToHex(r, g, b);
}

function darkenHex(hex, percent) {
  const c = parseHex(hex);
  const r = Math.round(c.r * (1 - percent));
  const g = Math.round(c.g * (1 - percent));
  const b = Math.round(c.b * (1 - percent));
  return rgbToHex(r, g, b);
}

function parseHex(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Genera la paleta de colores light + dark a partir de un color primario.
 * Incluye el color de texto sobre el primario (negro o blanco según luminancia).
 */
function generateBrandPalette(primaryHex) {
  const primary = primaryHex.toUpperCase();
  const lightTint = lightenHex(primary, 0.82);
  const darkShade = darkenHex(primary, 0.18);
  const lightSecondary = lightenHex(primary, 0.94);

  // Calcular contraste para el final del gradiente (más claro en light, más oscuro en dark)
  const gradientEndLight = lightenHex(primary, 0.3);
  const gradientEndDark = darkenHex(primary, 0.25);

  // El texto sobre el gradiente: tomamos el color "promedio" del gradiente
  // (el primary, que es el inicio) para decidir. Si es claro → texto negro.
  const textOnPrimary = getContrastTextColor(primary);
  // Para dark mode el "end" del gradiente es más oscuro, igual usamos primary como referencia
  const textOnPrimaryDark = getContrastTextColor(primary);

  return {
    light: {
      '--color-primary': primary,
      '--color-primary-light': lightTint,
      '--color-primary-dark': darkShade,
      '--color-secondary': lightSecondary,
      '--color-text-on-primary': textOnPrimary,
      '--gradient-primary': `linear-gradient(135deg, ${primary} 0%, ${gradientEndLight} 100%)`,
      '--shadow-primary': `0 4px 16px ${hexToRgba(primary, 0.4)}`,
      '--shadow-focus': `0 0 0 4px ${hexToRgba(primary, 0.25)}`
    },
    dark: {
      '--color-primary': primary,
      '--color-primary-light': darkenHex(primary, 0.65),
      '--color-primary-dark': lightenHex(primary, 0.4),
      '--color-secondary': '#2A2A38',
      '--color-text-on-primary': textOnPrimaryDark,
      '--gradient-primary': `linear-gradient(135deg, ${primary} 0%, ${gradientEndDark} 100%)`,
      '--shadow-primary': `0 4px 20px ${hexToRgba(primary, 0.35)}`,
      '--shadow-focus': `0 0 0 4px ${hexToRgba(primary, 0.25)}`
    }
  };
}

function hexToRgba(hex, alpha) {
  const c = parseHex(hex);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

/**
 * Devuelve el mejor color de texto (negro o blanco) según la luminancia del fondo.
 * Usa fórmula de brillo percibido (0-1). Umbral 0.62 — colores claros como amarillo,
 * rosa pastel, beige, lila claro → texto oscuro. Colores oscuros, vibrantes → texto blanco.
 */
function getContrastTextColor(hex) {
  const { r, g, b } = parseHex(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#1A1A1A' : '#FFFFFF';
}

/**
 * Construye un objeto brand completo desde el form de "Nueva marca".
 */
function buildCustomBrand(form) {
  const id = form.id || ('custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  const palette = generateBrandPalette(form.color);
  const values = (form.values || '').split('\n').map(v => v.trim()).filter(Boolean);
  const products = (form.products || '').split('\n').map(p => p.trim()).filter(Boolean);
  const businessType = form.businessType || 'marca-propia';

  // Adaptamos la query de categorías según el tipo de negocio:
  // - mayorista: el agente busca CLIENTES, no proveedores
  // - servicios: trata cada item como un servicio ofrecido
  // - el resto: proveedores
  const buildCategoryQuery = (p) => {
    if (businessType === 'mayorista') return `Quiero encontrar clientes B2B para mi línea de ${p} en ${form.name}.`;
    if (businessType === 'servicios') return `Estrategia y prospección para mi servicio de ${p} (${form.name}).`;
    if (businessType === 'marketplace') return `Buscar vendors / partners de ${p} para ${form.name}.`;
    if (businessType === 'reventa') return `Quiero encontrar mayoristas o dropshippers de ${p} para revender en ${form.name}.`;
    return `Necesito proveedores/fabricantes de ${p} para ${form.name}.`;
  };

  return {
    id,
    isCustom: true,
    name: form.name,
    tagline: form.tagline,
    emoji: form.emoji || '✦',
    primaryColor: form.color,
    description: form.description,
    personality: form.personality || '',
    values,
    products,
    website: form.website || '',
    businessType,

    // Derivados
    logo: { text: form.name.toLowerCase().slice(0, -2), italic: form.name.toLowerCase().slice(-2) },
    badge: 'Agente AI',
    colors: palette,

    greeting: `Hola, soy tu agente ${form.name}${form.emoji ? ' ' + form.emoji : ''}\n\nEspecializado en ${BUSINESS_TYPE_LABELS[businessType].toLowerCase()}. ¿En qué arrancamos?`,

    placeholder: `Cuéntame qué buscas para ${form.name}…`,

    composerHint: values.length
      ? `Evalúo todo con los valores ${form.name}: ${values.join(', ')}.`
      : `Tu agente personalizado para ${form.name}.`,

    quickActions: buildQuickActionsForType(businessType, form.name),

    categories: products.length
      ? products.map(p => ({ emoji: '•', name: p, query: buildCategoryQuery(p) }))
      : [],

    trendsDiscovery: {
      actual: { label: 'Esta temporada / momento', prompt: `Investiga las 6-8 tendencias MÁS RELEVANTES ahora para ${form.name} (${BUSINESS_TYPE_LABELS[businessType]}). Adapta el enfoque al tipo de negocio. Usa web_search.` },
      proxima: { label: 'Próxima temporada', prompt: `Tendencias que VAN A EXPLOTAR pronto en el mercado de ${form.name}. 6-8 emergentes con datos, contexto y cómo ${form.name} se adelanta. Usa web_search.` },
      virales: { label: 'Virales en redes', prompt: `Qué está sonando en redes (TikTok, Instagram, LinkedIn según aplique) relevante para ${form.name}. 6-8 con: nombre, dónde, descripción, cómo capitalizar. Usa web_search.` }
    }
  };
}

/**
 * Genera el system prompt completo para una marca custom.
 * Se ADAPTA según el tipo de negocio (marca propia / mayorista / servicios / etc.)
 */
function generateSystemPromptForCustom(brand) {
  const valuesLine = brand.values.length
    ? brand.values.map((v, i) => `${i + 1}. ${v}`).join('\n')
    : '(no especificados — el agente debe inferirlos del contexto)';

  const productsLine = brand.products.length
    ? brand.products.join(', ')
    : '(no especificados)';

  const businessType = brand.businessType || 'marca-propia';
  const businessLabel = BUSINESS_TYPE_LABELS[businessType] || 'Negocio';

  // Sección de enfoque según el tipo de negocio
  const focusSections = {
    'marca-propia': `ENFOQUE DEL AGENTE (Marca propia):
- Sourcing: encuentra FABRICANTES y PROVEEDORES de materias primas / producto terminado
- Tendencias: diseño, materiales, paletas, siluetas en el sector
- Creativo: naming, branding, campañas, contenido, mood boards, colaboraciones
- NO ofrezcas "buscar clientes" (este negocio vende al consumidor final)`,

    'reventa': `ENFOQUE DEL AGENTE (Reventa / Distribución):
- Sourcing: encuentra MAYORISTAS, DROPSHIPPERS o PROVEEDORES de producto terminado para revender
- Análisis: productos trending, demanda actual, márgenes potenciales
- Creativo: marketing y promociones para vender el producto comprado
- Estrategia: pricing, márgenes, posicionamiento
- NO te enfoques en fabricación o desarrollo de producto propio`,

    'mayorista': `ENFOQUE DEL AGENTE (Mayorista B2B):
- IMPORTANTE: Este negocio VENDE a otros negocios, NO vende al consumidor final
- Sourcing: busca CLIENTES B2B potenciales (talleres, tiendas, restaurantes, distribuidores, etc.)
- Análisis: competencia entre mayoristas, precios B2B, gaps de mercado
- Estrategia comercial: catálogos, pitch, condiciones comerciales, captación
- Creativo: branding B2B, material comercial, casos de éxito, contenido LinkedIn
- NUNCA propongas "buscar proveedores" a menos que pregunten explícitamente — su negocio ES proveedor`,

    'servicios': `ENFOQUE DEL AGENTE (Servicios):
- IMPORTANTE: Este negocio NO vende productos físicos, ofrece servicios
- Sourcing: busca CLIENTES potenciales o PARTNERS para colaborar
- Análisis: competencia en el sector de servicios, precios de mercado, tendencias
- Pricing: estructura de paquetes / tiers / propuestas comerciales
- Marketing: posicionamiento, contenido, captación, casos de éxito
- Creativo: branding, propuesta de valor, contenido especializado
- NUNCA hables de "proveedores", "inventario" o "stock" — no aplica`,

    'marketplace': `ENFOQUE DEL AGENTE (Marketplace / Plataforma):
- IMPORTANTE: Este negocio conecta vendedores con compradores
- Sourcing: busca VENDORS / SELLERS / PARTNERS para tu plataforma
- Análisis: categorías de mayor crecimiento, comisiones de mercado, UX competencia
- Estrategia: GMV, growth, retención de vendors top, programas de fidelidad
- Creativo: branding, onboarding, campañas estacionales
- Enfoque doble: lado de la oferta (vendors) y lado de la demanda (compradores)`,

    'otro': `ENFOQUE DEL AGENTE (Negocio):
- Adapta tus recomendaciones según lo que la descripción de la marca te indique
- Pregunta primero si dudas qué necesita el usuario
- Ofrece capacidades genéricas: investigación, análisis, estrategia, creatividad
- NO asumas que el negocio busca proveedores — pregunta o infiere del contexto`
  };

  const focusSection = focusSections[businessType] || focusSections['otro'];

  return `Eres el agente AI de ${brand.name}, ${brand.tagline}. Tipo de negocio: ${businessLabel}.

DESCRIPCIÓN DE LA MARCA:
${brand.description}

${focusSection}

VALORES / PILARES (Evalúa TODO con estos):
${valuesLine}

PRODUCTOS / CATEGORÍAS / SERVICIOS:
${productsLine}

${brand.website ? `SITIO WEB: ${brand.website}\nIMPORTANTE: Cuando arranques la conversación, considera usar web_search para investigar este sitio y entender mejor la marca antes de recomendar.\n` : ''}
PERSONALIDAD:
${brand.personality || 'Profesional, cercano y experto en el rubro.'}

USO DE EMOJIS (regla estricta):
- SOLO 1 emoji en el saludo inicial del primer mensaje
- En el resto: SIN emojis decorativos
- Excepción: emojis funcionales en contactos (WhatsApp, Instagram, etc.)

CUANDO SUGIERAS CONTACTOS, PROVEEDORES, CLIENTES o MARCAS (usa web_search SIEMPRE):
- Nombre + ubicación
- Calificación con estrellas
- Datos clave del rubro (precio, MOQ, tiempos, tamaño, fit, etc. — adapta a contexto)
- CONTACTO real (busca en web):
  * 📱 WhatsApp/Teléfono
  * 📷 Instagram (@usuario)
  * 📘 Facebook / LinkedIn
  * 🌐 Sitio web
  * ✉️ Email
  * 📍 Dirección
- Ventajas / Consideraciones
- ¿Por qué encaja con ${brand.name}? (vincula con valores)
- Evaluación (100 pts basados en valores)
- 🔗 Fuente

SISTEMA DE EVALUACIÓN: distribuye 100 pts entre los valores. Estrellas:
⭐⭐⭐⭐⭐ (90-100): Excelente
⭐⭐⭐⭐ (75-89): Muy bueno
⭐⭐⭐ (60-74): Bueno
⭐⭐ (50-59): Regular
⭐ (<50): No recomendado

NUNCA inventes contactos. Si no encuentras, dilo.

Para creatividad: sé audaz, mínimo 3-5 opciones, justifica con los valores de ${brand.name}.

TÍTULOS: cortos, sin emojis decorativos.

Responde en español (Colombia). Cita fuentes. Sin emojis decorativos en respuestas. Cierra con pregunta o siguiente paso.`;
}

Object.freeze(CONFIG);
Object.freeze(CONFIG.API);
Object.freeze(CONFIG.STORAGE);
Object.freeze(CONFIG.MODES);
Object.freeze(CONFIG.THEMES);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.MESSAGES);
// BRANDS y SYSTEM_PROMPTS NO se congelan porque se les agregan marcas custom dinámicamente
