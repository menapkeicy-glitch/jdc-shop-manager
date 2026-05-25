/**
 * Netlify Function: health.js
 * Verifica si el backend está conectado a Shopify.
 * GET /api/health → { ok: true, shop: "..." }
 */

const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8'
};

function quickCheck(shop, token) {
  const body = JSON.stringify({ query: '{ shop { name } }' });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: shop,
      path: '/admin/api/2024-10/graphql.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          if (data.errors) return reject(new Error('Token inválido o sin permisos'));
          resolve(data.data?.shop?.name);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('Timeout')));
    req.write(body);
    req.end();
  });
}

exports.handler = async () => {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_TOKEN;
  if (!shop || !token) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ ok: false, reason: 'Sin SHOPIFY_SHOP o SHOPIFY_TOKEN configurados' })
    };
  }
  try {
    const shopName = await quickCheck(shop, token);
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, shop: shopName || shop })
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ ok: false, reason: e.message })
    };
  }
};
