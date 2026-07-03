import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** Shared Vite resolve aliases for admin apps */
export function jomboyAliases() {
  return {
    '@jomboy/ui-web/styles': path.join(root, 'packages/ui-web/src/styles/global.css'),
    '@jomboy/ui-web': path.join(root, 'packages/ui-web/src/index.ts'),
    '@jomboy/i18n': path.join(root, 'packages/i18n/messages.json'),
    '@jomboy/design-tokens/css': path.join(root, 'packages/design-tokens/tokens.css'),
  };
}
