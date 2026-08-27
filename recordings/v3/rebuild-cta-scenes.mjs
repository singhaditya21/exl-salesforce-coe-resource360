import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const builder = path.resolve(root, '../v2.1/build-live-master.mjs');
const refreshes = new Map([
  [3, 'STFUI-01'],
  [4, 'STFUI-18,STFUI-21'],
  [6, 'SKLUI-14'],
  [7, 'BUDUI-09'],
  [8, 'TIMEUI-04'],
  [12, 'STFUI-21']
]);

for (const [number, screens] of refreshes) {
  const config = path.join(root, `master-${String(number).padStart(2, '0')}.config.mjs`);
  const result = spawnSync(process.execPath, [builder, config, '--reuse-segments', '--refresh', screens], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
