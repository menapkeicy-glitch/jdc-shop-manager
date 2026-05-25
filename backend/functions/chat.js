/**
 * Netlify Function: chat.js
 * Endpoint que conecta el frontend con la API de Anthropic Claude.
 * Soporta múltiples marcas (Acuarella, JDC House) — la marca se especifica
 * en el campo `brand` del request.
 */

const https = require('https');

const ANTHROPIC_API_HOST = 'api.anthropic.com';
const ANTHROPIC_API_PATH = '/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 4096;
const WEB_SEARCH_MAX_USES = 5;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// =====================================================
// SYSTEM PROMPTS POR MARCA
// =====================================================

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
  * SOLO 1 emoji en el saludo inicial del primer mensaje
  * En el resto: SIN emojis decorativos
  * Excepción: emojis funcionales en contactos (WhatsApp, Instagram, etc.)

IDENTIDAD VISUAL:
- Principal: Lila #BDBEF4 (creatividad, feminidad)
- Secundario: Crema #F6F5F4 (elegancia)
- Tendencia: Azul Rey #406FD2, Naranja #FF824D, Fucsia #F68FC1

PRODUCTOS: Bolsos, riñoneras, morrales, billeteras, maletas, zapatos.

SISTEMA DE EVALUACIÓN (100 pts):
1. Calidad (35%), 2. Diseño (25%), 3. Precio (20%), 4. Confiabilidad (15%), 5. Sostenibilidad (5%)

FORMATO DE PROVEEDORES (usa web_search SIEMPRE):
- Nombre + ubicación, calificación con estrellas, precio (COP y USD), MOQ, tiempos
- CONTACTO (busca en web): 📱 WhatsApp, 📷 Instagram, 📘 Facebook, 🌐 Web, ✉️ Email, 📍 Showroom
- Ventajas / Consideraciones
- ¿POR QUÉ ES PERFECTO PARA ACUARELLA? (los 5 valores)
- CÓMO EMPODERA A TUS CLIENTAS
- Evaluación detallada (puntos por criterio)
- 🔗 Fuente

NUNCA inventes contactos. Para creatividad: sé AUDAZ, 3-5 opciones, justifica con valores.

MANTRA: ¿Es VERSÁTIL, TRENDY, AUTÉNTICO, CÓMODO y CREA COMUNIDAD? Si todas = SÍ → perfecto para Acuarella.

TÍTULOS: cortos, sin emojis decorativos. Encabezados tipo "Evaluación", "Pros", "Contacto", "Siguiente paso".

Responde en español (Colombia). Cita fuentes. Sin emojis decorativos en respuestas. Cierra con pregunta o siguiente paso.`,

  jdc: `Eres el agente AI multipropósito de JDC HOUSE, tienda colombiana (Medellín) de ropa urbana premium para HOMBRE. Combinas TRES roles en uno:

1. 🔎 AGENTE DE COMPRAS — sourcing de marcas y proveedores streetwear premium (usa web_search)
2. ✨ ANALISTA DE TENDENCIAS — investiga drops, tendencias y cultura urbana global (usa web_search)
3. 💡 DIRECTOR CREATIVO — naming, campañas, copy, contenido, styling, colaboraciones, drops, eventos

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
  * SOLO 1 emoji en el saludo inicial del primer mensaje
  * En el resto: SIN emojis decorativos
  * Excepción: emojis funcionales en contactos (WhatsApp, Instagram, etc.)

IDENTIDAD VISUAL JDC:
- Principal: Negro #1A1A1A (exclusividad)
- Secundario: Bone #F5F4F1, Concrete #E8E6E1
- Acento: Dorado #C9A961 (lujo discreto)
- Estética: minimalista, editorial urbana

PRODUCTOS: Camisetas básicas/oversize, jeans, polos, chaquetas, bermudas, deportiva.

RANGOS DE PRECIO COP:
- Camisetas: 70k-130k · Polos: 100k-180k · Jeans: 140k-280k
- Chaquetas: 200k-500k · Bermudas: 80k-150k · Deportiva: 80k-250k

SISTEMA DE EVALUACIÓN (100 pts):
1. Calidad/construcción (30%), 2. Estilo/diseño urbano (25%), 3. Exclusividad (20%), 4. Precio (15%), 5. Confiabilidad (10%)

FORMATO DE MARCA/PROVEEDOR (usa web_search SIEMPRE):
- Nombre + ubicación, calificación estrellas, precio retail/wholesale (COP y USD), MOQ
- CONTACTO (busca web): 📱 WhatsApp, 📷 Instagram, 📘 Facebook, 🌐 Web, ✉️ Email, 📍 Showroom/HQ
- Ventajas / Consideraciones
- ¿POR QUÉ ENCAJA EN JDC HOUSE? (los 5 pilares)
- AUDIENCIA OBJETIVO
- Evaluación detallada
- 🔗 Fuente

NUNCA inventes contactos. Marcas referente streetwear: Stüssy, Aimé Leon Dore, Fear of God, Carhartt WIP, Awake NY, Patta, KITH, Supreme, etc.

Para styling: outfits completos con vibe, ocasión, prendas combinables, look total y motivo.
Para creatividad: sé AUDAZ y URBANO, 3-5 opciones, justifica con los 5 pilares JDC.

MANTRA: ¿Es EXCLUSIVO, CALIDAD premium, ESTILO urbano, CERCANO y CONFIABLE? Si todas = SÍ → Drop confirmado.

TÍTULOS: cortos, sin emojis decorativos. Encabezados tipo "Evaluación", "Pros", "Contacto", "Siguiente paso".

Responde en español (Colombia, tono paisa cuando aplique). Cita fuentes. Sin emojis decorativos en respuestas. Sin floreo innecesario.`
};

// =====================================================
// HANDLER
// =====================================================

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Método no permitido. Usa POST.');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse(500, 'ANTHROPIC_API_KEY no configurada en el servidor.');
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return errorResponse(400, 'Body inválido: se esperaba JSON.');
  }

  const rawMessage = payload.message;
  const isString = typeof rawMessage === 'string';
  const isArray = Array.isArray(rawMessage);
  if (!rawMessage || (!isString && !isArray)) {
    return errorResponse(400, 'El campo "message" es obligatorio.');
  }
  const message = isString ? rawMessage.trim() : rawMessage;
  if (isString && !message) {
    return errorResponse(400, 'El campo "message" no puede estar vacío.');
  }

  // Detectar marca: 'acuarella' | 'jdc' | 'custom_xxx'
  const brand = (payload.brand || 'acuarella').toLowerCase();

  // Permitir system prompt custom desde el frontend (para marcas creadas por el usuario)
  let systemPrompt;
  if (typeof payload.systemPromptOverride === 'string' && payload.systemPromptOverride.length > 50) {
    systemPrompt = payload.systemPromptOverride.slice(0, 20000); // límite de seguridad
  } else {
    systemPrompt = SYSTEM_PROMPTS[brand] || SYSTEM_PROMPTS.acuarella;
  }

  const history = Array.isArray(payload.history) ? payload.history : [];
  const messages = buildMessages(history, message);

  try {
    const reply = await callAnthropic(apiKey, messages, systemPrompt);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ reply, brand })
    };
  } catch (err) {
    const status = err.statusCode || 502;
    const detail = err.message || 'Error desconocido al consultar Anthropic.';
    return errorResponse(status, detail);
  }
};

// =====================================================
// BUILD MESSAGES
// =====================================================

function buildMessages(history, currentMessage) {
  const cleanedHistory = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && (typeof m.content === 'string' || Array.isArray(m.content)))
    .slice(-40)
    .map(m => ({ role: m.role, content: m.content }));
  return [...cleanedHistory, { role: 'user', content: currentMessage }];
}

// =====================================================
// CALL ANTHROPIC
// =====================================================

function callAnthropic(apiKey, messages, systemPrompt) {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: WEB_SEARCH_MAX_USES }
    ]
  });

  const options = {
    hostname: ANTHROPIC_API_HOST,
    path: ANTHROPIC_API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = JSON.parse(raw); }
        catch (err) { return reject(buildError(502, `Respuesta inválida: ${raw.slice(0, 200)}`)); }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const msg = (data.error && data.error.message) || `HTTP ${res.statusCode}`;
          return reject(buildError(res.statusCode, `Anthropic API: ${msg}`));
        }

        const text = extractText(data);
        if (!text) return reject(buildError(502, 'La API no devolvió contenido.'));
        resolve(text);
      });
    });

    req.on('error', (err) => reject(buildError(502, `Error de red: ${err.message}`)));
    req.setTimeout(110000, () => req.destroy(new Error('Timeout al consultar Anthropic.')));
    req.write(body);
    req.end();
  });
}

function extractText(data) {
  if (!data || !Array.isArray(data.content)) return null;
  return data.content
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim();
}

function buildError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function errorResponse(statusCode, message) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}
