import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_NUMBERS, masterConfig } from '../recordings/v3/master-suite.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const number of MASTER_NUMBERS) {
  const config = masterConfig(number);
  const buildDir = path.join(root, 'recordings/v3/build', config.id);
  const video = path.join(buildDir, `${config.outputBase}.mp4`);
  const contactSheet = path.join(buildDir, 'qa', `${config.outputBase}-contact-sheet.jpg`);
  const reportPath = path.join(buildDir, 'qa/qa-report.json');
  const timeline = JSON.parse(await readFile(path.join(buildDir, 'timeline.json'), 'utf8'));
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const timestamps = timeline.scenes.map((scene) => Math.max(0, scene.startSeconds + scene.durationSeconds * 0.55));
  const rows = Math.ceil(timestamps.length / 4);
  const frameDir = await mkdtemp(path.join(tmpdir(), 'resource360-contact-'));
  try {
    for (const [index, timestamp] of timestamps.entries()) {
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', timestamp.toFixed(3), '-i', video, '-frames:v', '1', '-vf', 'scale=480:-1', path.join(frameDir, `frame-${String(index + 1).padStart(3, '0')}.jpg`)], { stdio: 'inherit' });
    }
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-y', '-framerate', '1', '-start_number', '1', '-i', path.join(frameDir, 'frame-%03d.jpg'),
      '-vf', `tile=4x${rows}:nb_frames=${timestamps.length}:padding=8:margin=8:color=0x071f33`, '-frames:v', '1', '-q:v', '2', contactSheet
    ], { stdio: 'inherit' });
  } finally {
    await rm(frameDir, { recursive: true, force: true });
  }
  report.contactSheetFrames = timestamps.length;
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${config.outputBase}: ${timestamps.length} contact-sheet states\n`);
}
