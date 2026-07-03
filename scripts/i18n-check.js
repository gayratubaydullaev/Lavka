#!/usr/bin/env node
/** CI check: all i18n keys have 4 locales (TZ §8.1 customer 4 languages) */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesPath = path.resolve(__dirname, '../packages/i18n/messages.json');
const required = ['ru', 'en', 'uz_latin', 'uz_cyrillic'];
const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
let missing = 0;

for (const [key, locales] of Object.entries(messages)) {
  for (const loc of required) {
    if (!locales[loc] || String(locales[loc]).trim() === '') {
      console.error(`MISSING: ${key}.${loc}`);
      missing++;
    }
  }
}

if (missing > 0) {
  console.error(`i18n check failed: ${missing} missing keys`);
  process.exit(1);
}
console.log(`i18n OK: ${Object.keys(messages).length} keys × ${required.length} locales`);
