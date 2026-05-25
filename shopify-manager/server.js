/**
 * Shop Manager — Servidor local con conexión READ-ONLY a Shopify Admin API
 *
 * Uso:
 *   1. cd shopify-manager
 *   2. node server.js
 *   3. Abre http://localhost:3737 en el navegador
 *
 * El token de Shopify se carga desde:
 *   C:\Users\JEDC\Downloads\claude code\shopify_config.env
 *
 * Endpoints expuestos (READ-ONLY):
 *   GET /api/inventory?sku=XXX     → inventario por SKU (todas las variantes)
 *   GET /api/product?handle=XXX    → datos públicos de un producto por handle
 *   GET /api/health                → estado de conexión a Shopify
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const urlMod = require('url');

const PORT = 3737;
const ENV_PATH = path.resolve(__dirname, '..', '..', 'shopify_config.env');

// ====== Cargar .env ======
function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const out = {};
  for (const line of fs.readFileSync(ENV_PATH, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}
const ENV = loadEnv();
const SHOP = ENV.SHOPIFY_SHOP || '';
const TOKEN = ENV.SHOPIFY_TOKEN || '';

if (!SHOP || !TOKEN) {
  console.error('⚠ shopify_config.env vacío o sin SHOPIFY_SHOP / SHOPIFY_TOKEN');
}

// ====== Helper: query Shopify GraphQL Admin API ======
function shopifyGraphQL(query, variables) {
  const body = JSON.stringify({ query, variables });
  const opts = {
    hostname: SHOP,
    path: '/admin/api/2024-10/graphql.json',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
      'Content-Length': Buffer.byteLength(body)
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        try {
          const data = JSON.parse(raw);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          }
          if (data.errors) return reject(new Error(JSON.stringify(data.errors)));
          resolve(data.data);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('Timeout Shopify')));
    req.write(body);
    req.end();
  });
}

// ====== /api/inventory?sku=XXX ======
const INVENTORY_QUERY = `
  query GetVariantsBySku($q: String!) {
    productVariants(first: 100, query: $q) {
      edges {
        node {
          id
          sku
          title
          displayName
          inventoryQuantity
          availableForSale
          price
          product {
            id
            title
            handle
            status
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`;

async function handleInventory(req, res) {
  const { sku } = urlMod.parse(req.url, true).query;
  if (!sku) {
    return sendJson(res, 400, { error: 'Falta parámetro sku' });
  }
  try {
    // Wildcard: SKUs en Shopify pueden ser "PSYCHO BUNNY 66676 BLACK S" → match parcial
    const data = await shopifyGraphQL(INVENTORY_QUERY, { q: `sku:*${sku}*` });
    const variants = (data.productVariants?.edges || []).map(e => e.node);
    // Agregar por color (asume que hay una opción "Color" o similar)
    const byColor = {};
    let total = 0;
    for (const v of variants) {
      const color = v.selectedOptions.find(o =>
        /color|colour/i.test(o.name)
      )?.value || 'Sin color';
      const size = v.selectedOptions.find(o =>
        /talla|size/i.test(o.name)
      )?.value || 'Sin talla';
      if (!byColor[color]) byColor[color] = { sizes: {}, total: 0 };
      byColor[color].sizes[size] = (byColor[color].sizes[size] || 0) + (v.inventoryQuantity || 0);
      byColor[color].total += v.inventoryQuantity || 0;
      total += v.inventoryQuantity || 0;
    }
    sendJson(res, 200, {
      sku,
      total,
      variantCount: variants.length,
      byColor,
      variants  // raw
    });
  } catch (e) {
    sendJson(res, 502, { error: e.message });
  }
}

// ====== /api/product?handle=XXX ======
const PRODUCT_QUERY = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      status
      vendor
      productType
      tags
      totalInventory
      variants(first: 50) {
        edges {
          node {
            id
            sku
            title
            inventoryQuantity
            availableForSale
            price
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

async function handleProduct(req, res) {
  const { handle } = urlMod.parse(req.url, true).query;
  if (!handle) return sendJson(res, 400, { error: 'Falta parámetro handle' });
  try {
    const data = await shopifyGraphQL(PRODUCT_QUERY, { handle });
    if (!data.productByHandle) return sendJson(res, 404, { error: 'Producto no encontrado' });
    sendJson(res, 200, data.productByHandle);
  } catch (e) {
    sendJson(res, 502, { error: e.message });
  }
}

// ====== /api/packs (lista todos los packs en vivo) ======
const PACKS_QUERY = `
  query GetAllPacks {
    products(first: 100, query: "title:*pack* OR title:*PACK* OR title:*BUNDLE*") {
      edges {
        node {
          id
          title
          handle
          status
          totalInventory
          tags
          productType
          variants(first: 1) {
            edges { node { sku price } }
          }
        }
      }
    }
  }
`;

async function handlePacks(req, res) {
  const q = urlMod.parse(req.url, true).query;
  const includeAll = q.all === '1' || q.all === 'true';
  try {
    const data = await shopifyGraphQL(PACKS_QUERY, {});
    let packs = (data.products?.edges || []).map(e => ({
      id: e.node.id,
      title: e.node.title,
      handle: e.node.handle,
      status: e.node.status,
      productType: e.node.productType,
      tags: e.node.tags,
      totalInventory: e.node.totalInventory,
      sampleSku: e.node.variants?.edges?.[0]?.node?.sku || null,
      price: e.node.variants?.edges?.[0]?.node?.price || null,
      url: `https://jdchouse.com/products/${e.node.handle}`
    }));

    // Por defecto: solo ACTIVE (publicados). Con ?all=1 trae todos
    const all = packs;
    if (!includeAll) packs = packs.filter(p => p.status === 'ACTIVE');

    sendJson(res, 200, {
      total: packs.length,
      totalIncludingDrafts: all.length,
      breakdown: {
        active: all.filter(p => p.status === 'ACTIVE').length,
        draft: all.filter(p => p.status === 'DRAFT').length,
        archived: all.filter(p => p.status === 'ARCHIVED').length
      },
      fetchedAt: new Date().toISOString(),
      packs
    });
  } catch (e) {
    sendJson(res, 502, { error: e.message });
  }
}

// ====== /api/pack-components (extrae SKUs reales del HTML del pack) ======
// Estrategia: como los productos en jdchouse.com tienen la referencia en el nombre
// (ej: "Camiseta 36090 Básica Negra"), podemos descubrir componentes scrapeando
// la página pública del pack y extrayendo los números de referencia.

function fetchHtml(hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 ShopMgrBot/1.0' }
    }, (res) => {
      // Seguir redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location;
        const u = new URL(next.startsWith('http') ? next : `https://${hostname}${next}`);
        return resolve(fetchHtml(u.hostname, u.pathname + u.search));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        body: Buffer.concat(chunks).toString('utf-8')
      }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Timeout')));
    req.end();
  });
}

async function handlePackComponents(req, res) {
  const q = urlMod.parse(req.url, true).query;
  const handle = q.handle;
  if (!handle) return sendJson(res, 400, { error: 'Falta parámetro handle' });

  try {
    // Fetch HTML público de la página del pack
    const { statusCode, body } = await fetchHtml('jdchouse.com', `/products/${handle}`);
    if (statusCode !== 200) {
      return sendJson(res, 502, { error: `Pack HTML status ${statusCode}` });
    }

    // Extraer el TÍTULO del producto (entre <title> o og:title) para usar como filtro principal
    const titleMatch = /<meta property="og:title" content="([^"]+)"/.exec(body) ||
                       /<title>([^<]+)<\/title>/.exec(body);
    const packTitle = titleMatch ? titleMatch[1] : '';

    // Limitar el HTML al área del configurador (cuando aparezcan)
    // Biscuits Bundle suele renderizar el config en bloques con classes específicas
    // Estrategia: extraer la primera mitad del body (donde está el configurador)
    // y excluir el footer / productos relacionados
    const bodyMatch = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(body) ||
                      /<div[^>]*product-form[\s\S]*?<\/div>/i.exec(body);
    const configArea = bodyMatch ? bodyMatch[1] || bodyMatch[0] : body.slice(0, Math.floor(body.length * 0.6));

    // 1) Extraer referencias numéricas (4-7 dígitos) junto a palabras de producto
    const skuPattern = /(?:camiseta|polo|bermuda|pantalon|short|gorra|boxer|jeans?|chaqueta|morral|conjunto|canguro|correa|bolso)\s+([A-Z]?[0-9]{4,7})/gi;
    const foundRefs = new Set();
    let m;
    while ((m = skuPattern.exec(configArea)) !== null) {
      foundRefs.add(m[1]);
    }

    // 2) Detectar perfumes: SOLO si el TÍTULO del pack menciona "perfume" o el nombre del perfume
    const titleLower = (packTitle + ' ' + handle).toLowerCase();
    const mentionsPerfume = /perfume|fragrancia|aroma/.test(titleLower);

    const perfumePatterns = [
      { match: /sauvage/i, sku: 'sauvage', label: 'Perfume Sauvage' },
      { match: /odyssey/i, sku: 'odyssey', label: 'Perfume Odyssey' },
      { match: /santal/i, sku: 'santal', label: 'Perfume Santal' },
      { match: /club de nuit/i, sku: 'club de nuit', label: 'Perfume Club de Nuit' },
      { match: /blue de chanel|bleu de chanel/i, sku: 'blue de chanel', label: 'Perfume Blue de Chanel' },
      { match: /gaultier|le male/i, sku: 'gaultier', label: 'Perfume Jean Paul Gaultier' }
    ];

    const detectedPerfumes = [];
    if (mentionsPerfume) {
      // Si el título menciona perfume, busca en TODA la página cuál es
      for (const p of perfumePatterns) {
        if (p.match.test(body)) detectedPerfumes.push({ sku: p.sku, label: p.label });
      }
      // Si no detectó ninguno específico, añade búsqueda genérica
      if (detectedPerfumes.length === 0) {
        detectedPerfumes.push({ sku: 'perfume', label: 'Perfumes (genérico)' });
      }
    }

    // 3) Detectar accesorios genéricos solo si el título los menciona
    const extras = [];
    if (/gorra/i.test(titleLower) && ![...foundRefs].some(r => /^(102|HAT)/i.test(r))) {
      extras.push({ sku: '102-', label: 'Gorras AR' });
      extras.push({ sku: 'HAT', label: 'Gorras AMR' });
    }
    if (/correa|cinturón|cinturon|belt/i.test(titleLower)) {
      extras.push({ sku: 'BELT', label: 'Correas' });
    }
    if (/morral|mochila|bolso|canguro/i.test(titleLower)) {
      extras.push({ sku: 'MOR', label: 'Morrales/Bolsos' });
    }
    if (/zapat|tenis|sneaker/i.test(titleLower)) {
      extras.push({ sku: 'HB ', label: 'Zapatillas HB' });
    }

    // 4) Construir componentes
    const components = [];
    for (const ref of foundRefs) {
      const labelMatch = new RegExp(`(camiseta|polo|bermuda|pantalon|gorra|boxer|jeans?|chaqueta|morral)[^.,;]{0,40}${ref}`, 'i').exec(configArea);
      const productType = labelMatch ? labelMatch[1] : 'Producto';
      const colorMatches = configArea.match(new RegExp(`${productType}[^.,;]{0,60}${ref}[^.,;]{0,60}`, 'gi')) || [];
      components.push({
        sku: ref,
        label: `${productType.charAt(0).toUpperCase() + productType.slice(1)} ${ref}`
      });
    }
    components.push(...detectedPerfumes);
    components.push(...extras);

    sendJson(res, 200, {
      handle,
      url: `https://jdchouse.com/products/${handle}`,
      packTitle,
      components,
      foundRefs: [...foundRefs],
      detectedPerfumes,
      extras,
      mentionsPerfume,
      htmlLength: body.length,
      fetchedAt: new Date().toISOString()
    });
  } catch (e) {
    sendJson(res, 502, { error: e.message });
  }
}

// ====== /api/sales (ventas reales por rango de fechas) ======
const ORDERS_QUERY = `
  query GetOrders($q: String!, $cursor: String) {
    orders(first: 250, query: $q, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { id }
          lineItems(first: 50) {
            edges {
              node {
                sku
                title
                quantity
                variantTitle
                originalTotalSet { shopMoney { amount } }
                product { id title handle }
              }
            }
          }
        }
      }
    }
  }
`;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchAllOrders(query) {
  const all = [];
  let cursor = null;
  let safety = 0;
  while (safety < 20) {
    const data = await shopifyGraphQL(ORDERS_QUERY, { q: query, cursor });
    const edges = data.orders?.edges || [];
    for (const e of edges) all.push(e.node);
    if (!data.orders?.pageInfo?.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
    safety++;
  }
  return all;
}

async function handleSales(req, res) {
  const q = urlMod.parse(req.url, true).query;

  // Determinar rango: ?days=7  o  ?from=YYYY-MM-DD&to=YYYY-MM-DD
  let fromDate, toDate;
  if (q.from && q.to) {
    fromDate = new Date(q.from);
    toDate = new Date(q.to);
  } else {
    const days = parseInt(q.days || '7', 10);
    toDate = new Date();
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
  }

  const filterSku = q.sku ? q.sku.toLowerCase() : null;
  const queryStr = `created_at:>=${isoDate(fromDate)} AND created_at:<=${isoDate(new Date(toDate.getTime() + 86400000))}`;

  try {
    const orders = await fetchAllOrders(queryStr);

    // Filtrar líneas si hay SKU
    const matchedOrders = filterSku
      ? orders.filter(o => o.lineItems.edges.some(le =>
          (le.node.sku || '').toLowerCase().includes(filterSku) ||
          (le.node.title || '').toLowerCase().includes(filterSku) ||
          (le.node.product?.title || '').toLowerCase().includes(filterSku)
        ))
      : orders;

    // Agregaciones
    const byProduct = {};
    const byDay = {};
    const byHour = {};
    let totalRevenue = 0;
    let totalUnits = 0;

    for (const o of matchedOrders) {
      const amount = parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
      totalRevenue += amount;
      const d = new Date(o.createdAt);
      const dayKey = isoDate(d);
      const hourKey = `${dayKey}T${String(d.getHours()).padStart(2, '0')}`;

      if (!byDay[dayKey]) byDay[dayKey] = { date: dayKey, orders: 0, revenue: 0, units: 0 };
      byDay[dayKey].orders++;
      byDay[dayKey].revenue += amount;

      if (!byHour[hourKey]) byHour[hourKey] = { hour: hourKey, orders: 0 };
      byHour[hourKey].orders++;

      for (const le of o.lineItems.edges) {
        const item = le.node;
        const sku = item.sku || item.title || '(sin sku)';
        const title = item.product?.title || item.title || sku;
        if (filterSku && !(sku.toLowerCase().includes(filterSku) || title.toLowerCase().includes(filterSku))) continue;
        if (!byProduct[title]) byProduct[title] = { sku, title, units: 0, revenue: 0, orders: 0 };
        byProduct[title].units += item.quantity || 0;
        byProduct[title].revenue += parseFloat(item.originalTotalSet?.shopMoney?.amount || '0');
        byProduct[title].orders++;
        totalUnits += item.quantity || 0;
        byDay[dayKey].units += item.quantity || 0;
      }
    }

    const topProducts = Object.values(byProduct).sort((a, b) => b.units - a.units).slice(0, 25);
    const daysSorted = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    const hoursSorted = Object.values(byHour).sort((a, b) => a.hour.localeCompare(b.hour));

    sendJson(res, 200, {
      period: { from: isoDate(fromDate), to: isoDate(toDate), days: Math.ceil((toDate - fromDate) / 86400000) || 1 },
      filterSku: filterSku || null,
      totals: {
        orders: matchedOrders.length,
        revenue: Math.round(totalRevenue),
        units: totalUnits,
        aov: matchedOrders.length ? Math.round(totalRevenue / matchedOrders.length) : 0
      },
      byProduct: topProducts,
      byDay: daysSorted,
      byHour: hoursSorted,
      fetchedAt: new Date().toISOString()
    });
  } catch (e) {
    sendJson(res, 502, { error: e.message });
  }
}

// ====== /api/health ======
async function handleHealth(req, res) {
  if (!SHOP || !TOKEN) {
    return sendJson(res, 503, { ok: false, reason: 'sin credenciales' });
  }
  try {
    const data = await shopifyGraphQL(`{ shop { name } }`, {});
    sendJson(res, 200, { ok: true, shop: data.shop?.name || SHOP });
  } catch (e) {
    sendJson(res, 502, { ok: false, reason: e.message });
  }
}

// ====== Servir archivos estáticos del shopify-manager/ ======
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res) {
  let pathname = decodeURIComponent(urlMod.parse(req.url).pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(__dirname, pathname);
  // Prevenir path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404); return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

// ====== Server ======
const server = http.createServer((req, res) => {
  // CORS abierto a localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const pathname = urlMod.parse(req.url).pathname;
  if (pathname.startsWith('/api/inventory')) return handleInventory(req, res);
  if (pathname.startsWith('/api/product')) return handleProduct(req, res);
  if (pathname.startsWith('/api/pack-components')) return handlePackComponents(req, res);
  if (pathname.startsWith('/api/packs')) return handlePacks(req, res);
  if (pathname.startsWith('/api/sales')) return handleSales(req, res);
  if (pathname.startsWith('/api/health')) return handleHealth(req, res);
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('');
  console.log('═════════════════════════════════════════════');
  console.log('  JDC Shop Manager · servidor local');
  console.log('═════════════════════════════════════════════');
  console.log(`  Abre en navegador: http://localhost:${PORT}`);
  console.log(`  Tienda Shopify:    ${SHOP || '(no configurado)'}`);
  console.log(`  Token:             ${TOKEN ? 'cargado ✓' : 'FALTA'}`);
  console.log(`  .env path:         ${ENV_PATH}`);
  console.log('═════════════════════════════════════════════');
  console.log('');
});
