/**
 * Netlify Function: inventory.js
 * Consulta el inventario en vivo de Shopify Admin (READ-ONLY).
 *
 * Variables de entorno requeridas en Netlify:
 *   SHOPIFY_SHOP   → ej: jdc-luxury-shop.myshopify.com
 *   SHOPIFY_TOKEN  → token con scopes read_products, read_inventory, read_locations
 *
 * Endpoint: GET /api/inventory?sku=XXX
 */

const https = require('https');

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

function shopifyGraphQL(shop, token, query, variables) {
  const body = JSON.stringify({ query, variables });
  const opts = {
    hostname: shop,
    path: '/admin/api/2024-10/graphql.json',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Solo GET' }) };
  }

  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_TOKEN;
  if (!shop || !token) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Faltan variables SHOPIFY_SHOP o SHOPIFY_TOKEN en Netlify' })
    };
  }

  const sku = (event.queryStringParameters || {}).sku;
  if (!sku) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Falta parámetro sku' }) };
  }

  try {
    // Wildcard: SKUs en Shopify pueden ser "PSYCHO BUNNY 66676 BLACK S" → match parcial
    const data = await shopifyGraphQL(shop, token, INVENTORY_QUERY, { q: `sku:*${sku}*` });
    const variants = (data.productVariants?.edges || []).map(e => e.node);

    // Agrupar por color (busca opción "Color"/"Colour") con tallas
    const byColor = {};
    let total = 0;
    for (const v of variants) {
      const color = v.selectedOptions.find(o => /color|colour/i.test(o.name))?.value || 'Sin color';
      const size = v.selectedOptions.find(o => /talla|size/i.test(o.name))?.value || 'Sin talla';
      if (!byColor[color]) byColor[color] = { sizes: {}, total: 0 };
      byColor[color].sizes[size] = (byColor[color].sizes[size] || 0) + (v.inventoryQuantity || 0);
      byColor[color].total += v.inventoryQuantity || 0;
      total += v.inventoryQuantity || 0;
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        sku,
        total,
        variantCount: variants.length,
        byColor,
        variants,
        fetchedAt: new Date().toISOString()
      })
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: e.message })
    };
  }
};
