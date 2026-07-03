/**
 * Microservice health stub — proxies to mock API (TZ §3.1 eight services).
 * Run: SERVICE_NAME=catalog PORT=8101 MOCK_URL=http://localhost:4010 node server.js
 */
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const name = process.env.SERVICE_NAME ?? 'catalog';
const port = process.env.PORT ?? 8101;
const mockUrl = process.env.MOCK_URL ?? 'http://localhost:4010';

app.get('/health', (_req, res) => {
  res.json({ service: name, status: 'ok', mock: mockUrl });
});

app.use('/api/v1', createProxyMiddleware({ target: mockUrl, changeOrigin: true }));

app.listen(port, () => {
  console.log(`[${name}] http://localhost:${port}/health → mock ${mockUrl}`);
});
