/**
 * Netlify Function: sales.js
 * Consulta ventas reales de Shopify Admin (READ-ONLY).
 * Requiere scope: read_orders
 *
 * GET /api/sales?days=7              → última semana
 * GET /api/sales?days=1              → últimas 24h
 * GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
 * GET /api/sales?sku=66676&days=30   → filtrar por SKU
 */

const https = require('https');

const ORDERS_QUERY = `
  query GetOrders($q: String!, $cursor: String) {
    orders(first: 250, query: $q, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id name createdAt
          displayFinancialStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { id }
          lineItems(first: 50) {
            edges {
              node {
                sku title quantity variantTitle
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8'
};

function shopifyGraphQL(shop, token, query, variables) {
  const body = JSON.stringify({ query, variables });
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
        const raw = Buffer.concat(chunks).toString('utf-8');
        try {
          const data = JSON.parse(raw);
          if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          if (data.errors) return reject(new Error(JSON.stringify(data.errors)));
          resolve(data.data);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => req.destroy(new Error('Timeout Shopify')));
    req.write(body);
    req.end();
  });
}

function isoDate(d) { return d.toISOString().slice(0, 10); }

async function fetchAllOrders(shop, token, query) {
  const all = [];
  let cursor = null;
  let safety = 0;
  while (safety < 20) {
    const data = await shopifyGraphQL(shop, token, ORDERS_QUERY, { q: query, cursor });
    const edges = data.orders?.edges || [];
    for (const e of edges) all.push(e.node);
    if (!data.orders?.pageInfo?.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
    safety++;
  }
  return all;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Solo GET' }) };

  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_TOKEN;
  if (!shop || !token) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Faltan SHOPIFY_SHOP/TOKEN' }) };
  }

  const q = event.queryStringParameters || {};
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
    const orders = await fetchAllOrders(shop, token, queryStr);

    const matchedOrders = filterSku
      ? orders.filter(o => o.lineItems.edges.some(le =>
          (le.node.sku || '').toLowerCase().includes(filterSku) ||
          (le.node.title || '').toLowerCase().includes(filterSku) ||
          (le.node.product?.title || '').toLowerCase().includes(filterSku)
        ))
      : orders;

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

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        period: { from: isoDate(fromDate), to: isoDate(toDate), days: Math.ceil((toDate - fromDate) / 86400000) || 1 },
        filterSku: filterSku || null,
        totals: {
          orders: matchedOrders.length,
          revenue: Math.round(totalRevenue),
          units: totalUnits,
          aov: matchedOrders.length ? Math.round(totalRevenue / matchedOrders.length) : 0
        },
        byProduct: Object.values(byProduct).sort((a, b) => b.units - a.units).slice(0, 25),
        byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
        byHour: Object.values(byHour).sort((a, b) => a.hour.localeCompare(b.hour)),
        fetchedAt: new Date().toISOString()
      })
    };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
