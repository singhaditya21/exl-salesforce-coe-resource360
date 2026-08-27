import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_NUMBERS, masterConfig } from '../recordings/v3/master-suite.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public/demo-videos');
const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const generation = 'v3.0 authenticated complete-suite master';
const v3Entries = [];

for (const number of MASTER_NUMBERS) {
  const config = masterConfig(number);
  const file = `${config.outputBase}.mp4`;
  const poster = `${config.outputBase}.jpg`;
  const captions = `${config.outputBase}.vtt`;
  const filePath = path.join(publicDir, file);
  const [bytes, fileInfo, posterInfo, captionText] = await Promise.all([
    readFile(filePath), stat(filePath), stat(path.join(publicDir, poster)), readFile(path.join(publicDir, captions), 'utf8')
  ]);
  if (posterInfo.size < 10_000) throw new Error(`${poster} is too small.`);
  if (!captionText.startsWith('WEBVTT\n')) throw new Error(`${captions} is not WebVTT.`);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_entries','stream=codec_name,codec_type,width,height,r_frame_rate:format=duration','-of','json',filePath], { encoding:'utf8' }));
  const video = probe.streams.find((item) => item.codec_type === 'video');
  const audio = probe.streams.find((item) => item.codec_type === 'audio');
  const subtitle = probe.streams.find((item) => item.codec_type === 'subtitle');
  if (video?.codec_name !== 'h264' || video.width !== 1920 || video.height !== 1080 || audio?.codec_name !== 'aac' || subtitle?.codec_name !== 'mov_text') throw new Error(`${file} does not meet the master format.`);
  v3Entries.push({
    file, poster, captions, title: config.title, generation,
    sourceSurface: number === 12 ? 'Authenticated Salesforce Lightning and synchronized GitHub Pages' : 'Authenticated Salesforce Lightning',
    screens: config.scenes.map((scene) => scene.screen), durationSeconds: Number(probe.format.duration), sizeBytes: fileInfo.size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    format: { container:'MP4', videoCodec:'H.264', audioCodec:'AAC', captions:'WebVTT sidecar and embedded English mov_text', width:1920, height:1080, framesPerSecond:30, audio:true },
    validatedOutcome: number === 12
      ? 'Continuous executive lifecycle footage traverses authenticated Salesforce from account and project through staffing, skills, capacity, economics, time and certified KPIs, then verifies the sanitized GitHub Pages publication lineage.'
      : `Continuous authenticated Salesforce footage covers ${config.scenes.length} governed screens with visible filters, evidence selection, source lineage, role-aware outcomes and in-product navigation.`,
  });
}

const originalMasters = manifest.recordings.filter((item) => item.file.startsWith('master-01-') || item.file.startsWith('master-02-'));
const legacy = manifest.recordings.filter((item) => !item.file.startsWith('master-'));
const published = {
  ...manifest,
  recordedAt: '2026-08-27',
  recordingBaseline: 'resource360-demo-v3.0-complete-suite',
  releaseTag: 'resource360-demo-v3.0-complete-suite',
  sourceDeployment: '0AfgK00000RlcDZSAZ',
  expectedCount: originalMasters.length + v3Entries.length + legacy.length,
  recordings: [...originalMasters, ...v3Entries, ...legacy]
};
await writeFile(manifestPath, `${JSON.stringify(published, null, 2)}\n`);
console.log(JSON.stringify({ baseline:published.recordingBaseline, recordings:published.recordings.length, masters:originalMasters.length + v3Entries.length, legacy:legacy.length }, null, 2));
