import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { jomboyAliases } from '../../scripts/vite-aliases.mjs';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: jomboyAliases() },
  server: { port: 5174 },
});
