import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_NUMBERS, masterConfig } from '../recordings/v3/master-suite.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uniqueFunctionalScreens = new Set();
let recordedStages = 0;

for (const number of MASTER_NUMBERS) {
  const config = masterConfig(number);
  const buildDir = path.join(root, 'recordings/v3/build', config.id);
  const report = JSON.parse(await readFile(path.join(buildDir, 'qa/qa-report.json'), 'utf8'));
  const contactSheet = path.join(buildDir, 'qa', `${config.outputBase}-contact-sheet.jpg`);
  const contactSheetStat = await stat(contactSheet);

  assert.equal(report.baseline, 'resource360-demo-v3.0-complete-suite');
  assert.equal(report.screenCount, config.scenes.length);
  assert.equal(report.rawCapture.length, config.scenes.length);
  assert.equal(report.contactSheetFrames, config.scenes.length + 1);
  assert.equal(report.continuousInteraction, true);
  assert.ok(contactSheetStat.size >= 10_000, `${config.outputBase} contact sheet is too small.`);
  assert.ok(report.rawCapture.every((scene) => scene.frames >= 10 && scene.uniqueFrames >= 4), `${config.outputBase} contains a still-dominant or incomplete take.`);
  assert.deepEqual(report.rawCapture.map((scene) => scene.screen), config.scenes.map((scene) => scene.screen));
  assert.ok(report.probe.streams.some((stream) => stream.codec_type === 'video' && stream.width === 1920 && stream.height === 1080));
  assert.ok(report.probe.streams.some((stream) => stream.codec_type === 'audio' && stream.codec_name === 'aac'));
  assert.ok(report.probe.streams.some((stream) => stream.codec_type === 'subtitle' && stream.codec_name === 'mov_text'));

  recordedStages += config.scenes.length;
  if (number < 12) for (const scene of config.scenes) uniqueFunctionalScreens.add(scene.screen);
}

assert.equal(uniqueFunctionalScreens.size, 89, 'Masters 03–11 must cover the 89 remaining unique governed screens.');
assert.equal(recordedStages, 106, 'Masters 03–12 must contain 106 recorded interaction stages.');
console.log('Validated 10 v3 masters, 106 interaction stages, 89 unique functional screens and all contact-sheet/stream QA evidence.');
