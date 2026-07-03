#!/usr/bin/env node
/**
 * Minimal Kong-like gateway for local Go stack (no Docker).
 * Routes match deploy/kong/kong.yml
 */
import http from 'node:http';

const PORT = Number(process.env.GATEWAY_PORT || 8000);

const routes = [
  { prefix: '/api/v1/catalog', target: 'http://127.0.0.1:8101' },
  { prefix: '/api/v1/orders', target: 'http://127.0.0.1:8102' },
  { prefix: '/api/v1/delivery', target: 'http://127.0.0.1:8102' },
  { prefix: '/api/v1/loyalty', target: 'http://127.0.0.1:8102' },
  { prefix: '/api/v1/customers', target: 'http://127.0.0.1:8102' },
  { prefix: '/api/v1/picker', target: 'http://127.0.0.1:8103' },
  { prefix: '/api/v1/courier', target: 'http://127.0.0.1:8104' },
  { prefix: '/api/v1/payments', target: 'http://127.0.0.1:8105' },
  { prefix: '/api/v1/refunds', target: 'http://127.0.0.1:8105' },
  { prefix: '/api/v1/tickets', target: 'http://127.0.0.1:8106' },
  { prefix: '/api/v1/support', target: 'http://127.0.0.1:8106' },
  { prefix: '/api/v1/push', target: 'http://127.0.0.1:8107' },
  { prefix: '/api/v1/auth/otp', target: 'http://127.0.0.1:8107' },
  { prefix: '/api/v1/admin', target: 'http://127.0.0.1:8108' },
  { prefix: '/api/v1/darkstores', target: 'http://127.0.0.1:8108' },
  { prefix: '/api/v1/wms', target: 'http://127.0.0.1:8108' },
  { prefix: '/api/v1/ws', target: 'http://127.0.0.1:8106' },
];

function pickTarget(url) {
  for (const r of routes) {
    if (url.startsWith(r.prefix)) return r.target;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const target = pickTarget(req.url || '');
  if (!target) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'no route for ' + req.url }));
    return;
  }
  const url = target + req.url;
  try {
    const headers = { ...req.headers, host: undefined };
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? Buffer.from(await new Promise((resolve, reject) => {
          const chunks = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => resolve(Buffer.concat(chunks)));
          req.on('error', reject);
        }))
      : undefined;
    const upstream = await fetch(url, { method: req.method, headers, body });
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'BAD_GATEWAY', message: String(e.message || e) }));
  }
});

server.listen(PORT, () => {
  console.log(`local-kong listening on http://localhost:${PORT}`);
});
