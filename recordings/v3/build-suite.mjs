import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_NUMBERS } from './master-suite.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const builder = path.resolve(root, '../v2.1/build-live-master.mjs');
const requested = process.argv.slice(2).map(Number).filter(Number.isFinite);
for (const number of requested.length ? requested : MASTER_NUMBERS) {
  const config = path.join(root, `master-${String(number).padStart(2, '0')}.config.mjs`);
  execFileSync(process.execPath, [builder, config], { stdio: 'inherit' });
}
