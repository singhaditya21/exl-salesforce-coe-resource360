#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const configPath = path.resolve(process.argv[2] ?? '');
if (!configPath) throw new Error('Pass a master configuration module.');
const { default: config } = await import(pathToFileURL(configPath));
const reuseSegments = process.argv.includes('--reuse-segments');
const refreshIndex = process.argv.indexOf('--refresh');
const refreshScreens = new Set(refreshIndex >= 0 ? process.argv[refreshIndex + 1].split(',') : []);
const root = path.dirname(fileURLToPath(import.meta.url));
const authoredRoot = config.authoredRoot ? path.resolve(root, config.authoredRoot) : root;
const buildDir = path.join(authoredRoot, 'build', config.id);
const audioDir = path.join(buildDir, 'audio');
const segmentDir = path.join(buildDir, 'segments');
const qaDir = path.join(buildDir, 'qa');
const publicDir = path.resolve(root, '../../public/demo-videos');
for (const directory of [audioDir, segmentDir, qaDir, publicDir]) mkdirSync(directory, { recursive: true });

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function output(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

function durationOf(file) {
  return Number(output('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]));
}

function vttTime(seconds) {
  const millis = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(millis / 3600000);
  const minutes = Math.floor((millis % 3600000) / 60000);
  const secs = Math.floor((millis % 60000) / 1000);
  const ms = millis % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function sentences(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [text];
}

function addCaptions(cues, text, start, spokenDuration) {
  const parts = sentences(text);
  const totalWords = parts.reduce((sum, part) => sum + part.split(/\s+/).length, 0);
  let cursor = start;
  for (const part of parts) {
    const duration = spokenDuration * (part.split(/\s+/).length / totalWords);
    cues.push({ start: cursor, end: cursor + duration, text: part });
    cursor += duration;
  }
}

function makeAudio(slug, text) {
  const textPath = path.join(audioDir, `${slug}.txt`);
  const audioPath = path.join(audioDir, `${slug}.aiff`);
  writeFileSync(textPath, `${text}\n`);
  run('/usr/bin/say', ['-v', 'Aman', '-r', '174', '-f', textPath, '-o', audioPath]);
  return { audioPath, duration: durationOf(audioPath) };
}

function makeOrReuseAudio(slug, text, refresh = false) {
  const audioPath = path.join(audioDir, `${slug}.aiff`);
  if (reuseSegments && !refresh && existsSync(audioPath)) return { audioPath, duration: durationOf(audioPath) };
  return makeAudio(slug, text);
}

function xml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function generatedTitleSlide() {
  const coverage = config.scenes.map((scene) => scene.screen).join(' · ');
  const titlePath = path.join(buildDir, 'title-slide.svg');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${xml(config.titleColors?.[0] || '#071f33')}"/><stop offset="1" stop-color="${xml(config.titleColors?.[1] || '#0877bd')}"/></linearGradient><radialGradient id="glow"><stop offset="0" stop-color="#ffffff" stop-opacity=".24"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>
  <rect width="1920" height="1080" fill="url(#bg)"/><circle cx="1630" cy="170" r="430" fill="url(#glow)"/><circle cx="1770" cy="940" r="330" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="90"/>
  <text x="150" y="145" fill="#91d5ff" font-family="Arial,sans-serif" font-size="30" font-weight="700" letter-spacing="5">EXL SALESFORCE COE · RESOURCE 360</text>
  <text x="150" y="295" fill="#ffffff" font-family="Arial,sans-serif" font-size="76" font-weight="800">${xml(config.title)}</text>
  <text x="150" y="370" fill="#d9efff" font-family="Arial,sans-serif" font-size="34">${xml(config.subtitle)}</text>
  <rect x="150" y="455" width="1500" height="2" fill="#ffffff" opacity=".25"/>
  <text x="150" y="535" fill="#ffffff" font-family="Arial,sans-serif" font-size="27" font-weight="700">PERSONAS</text>
  <text x="150" y="585" fill="#d9efff" font-family="Arial,sans-serif" font-size="31">${xml(config.personas)}</text>
  <text x="150" y="675" fill="#ffffff" font-family="Arial,sans-serif" font-size="27" font-weight="700">GOVERNED COVERAGE</text>
  <foreignObject x="150" y="705" width="1450" height="150"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#d9efff;font:26px Arial,sans-serif;line-height:1.55">${xml(coverage)}</div></foreignObject>
  <rect x="150" y="910" rx="28" width="420" height="56" fill="#ffffff" fill-opacity=".14" stroke="#ffffff" stroke-opacity=".25"/><text x="180" y="947" fill="#ffffff" font-family="Arial,sans-serif" font-size="23" font-weight="700">SANITIZED FICTIONAL DEMO DATA</text>
  <text x="150" y="1015" fill="#b9d8ea" font-family="Arial,sans-serif" font-size="21">Salesforce is transactional · GitHub Pages is the synchronized read-only companion</text>
  </svg>`;
  writeFileSync(titlePath, svg);
  return titlePath;
}

const titlePng = path.join(buildDir, 'title-slide.png');
const titleSource = config.titleSlide ? path.join(authoredRoot, config.titleSlide) : generatedTitleSlide();
run('sips', ['-s', 'format', 'png', titleSource, '--out', titlePng]);

const timeline = [];
const captionCues = [];
const segmentFiles = [];
let offset = 0;

{
  const audio = makeOrReuseAudio('00-intro', config.intro);
  const duration = Math.max(config.introMinimumSeconds ?? 24, audio.duration + 1.2);
  const file = path.join(segmentDir, '00-intro.mp4');
  if (!reuseSegments || !existsSync(file)) {
    run('ffmpeg', [
      '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '30', '-i', titlePng, '-i', audio.audioPath,
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x071f33,format=yuv420p',
      '-af', 'apad', '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', file,
    ]);
  }
  addCaptions(captionCues, config.intro, offset, audio.duration);
  timeline.push({ slug: '00-intro', screen: 'Overview slide', startSeconds: offset, durationSeconds: duration });
  segmentFiles.push(file);
  offset += duration;
}

const rawQa = [];
for (const [index, scene] of config.scenes.entries()) {
  const rawDir = path.join(authoredRoot, 'raw', config.rawFolder, scene.raw);
  const frames = readdirSync(rawDir).filter((name) => /^frame-\d{5}\.jpg$/.test(name)).sort();
  if (frames.length < 20) throw new Error(`${scene.screen} has only ${frames.length} raw frames.`);
  const hashes = new Set(frames.map((name) => createHash('sha256').update(readFileSync(path.join(rawDir, name))).digest('hex')));
  if (hashes.size < 4) throw new Error(`${scene.screen} has insufficient visible interaction (${hashes.size} unique frames).`);

  const slug = `${String(index + 1).padStart(2, '0')}-${scene.screen.toLowerCase()}`;
  const refresh = refreshScreens.has(scene.screen);
  const audio = makeOrReuseAudio(slug, scene.narration, refresh);
  const capturedDuration = frames.length / config.captureFramesPerSecond;
  const duration = Math.max(capturedDuration, audio.duration + 1.2);
  const inputRate = frames.length / duration;
  const file = path.join(segmentDir, `${slug}.mp4`);
  if (!reuseSegments || refresh || !existsSync(file)) {
    run('ffmpeg', [
      '-loglevel', 'error', '-y', '-framerate', inputRate.toFixed(6), '-i', path.join(rawDir, 'frame-%05d.jpg'), '-i', audio.audioPath,
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x071f33,fps=30,format=yuv420p',
      '-af', 'apad', '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', file,
    ]);
  }
  addCaptions(captionCues, scene.narration, offset, audio.duration);
  timeline.push({ slug, screen: scene.screen, title: scene.title, interaction: scene.interaction, startSeconds: offset, durationSeconds: duration, rawFrames: frames.length, uniqueFrames: hashes.size });
  rawQa.push({ screen: scene.screen, frames: frames.length, uniqueFrames: hashes.size, capturedDurationSeconds: capturedDuration, renderedDurationSeconds: duration });
  segmentFiles.push(file);
  offset += duration;
}

const concatPath = path.join(buildDir, 'concat.txt');
writeFileSync(concatPath, segmentFiles.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
const noCaptions = path.join(buildDir, `${config.outputBase}-no-captions.mp4`);
run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', '-movflags', '+faststart', noCaptions]);

const vttPath = path.join(buildDir, `${config.outputBase}.vtt`);
const vtt = ['WEBVTT', ''];
captionCues.forEach((cue, index) => vtt.push(String(index + 1), `${vttTime(cue.start)} --> ${vttTime(cue.end)}`, cue.text, ''));
writeFileSync(vttPath, vtt.join('\n'));

const finalVideo = path.join(buildDir, `${config.outputBase}.mp4`);
run('ffmpeg', [
  '-loglevel', 'error', '-y', '-i', noCaptions, '-i', vttPath,
  '-map', '0:v:0', '-map', '0:a:0', '-map', '1:0', '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text',
  '-metadata:s:s:0', 'language=eng', '-metadata:s:s:0', 'title=English', '-movflags', '+faststart', finalVideo,
]);

const contactSheet = path.join(qaDir, `${config.outputBase}-contact-sheet.jpg`);
const contactTimes = timeline.map((scene) => Math.max(0, scene.startSeconds + scene.durationSeconds * 0.55));
const contactRows = Math.ceil(contactTimes.length / 4);
const contactFramesDir = mkdtempSync(path.join(tmpdir(), 'resource360-contact-'));
try {
  for (const [index, timestamp] of contactTimes.entries()) {
    run('ffmpeg', ['-loglevel', 'error', '-y', '-ss', timestamp.toFixed(3), '-i', finalVideo, '-frames:v', '1', '-vf', 'scale=480:-1', path.join(contactFramesDir, `frame-${String(index + 1).padStart(3, '0')}.jpg`)]);
  }
  run('ffmpeg', [
    '-loglevel', 'error', '-y', '-framerate', '1', '-start_number', '1', '-i', path.join(contactFramesDir, 'frame-%03d.jpg'),
    '-vf', `tile=4x${contactRows}:nb_frames=${contactTimes.length}:padding=8:margin=8:color=0x071f33`, '-frames:v', '1', '-q:v', '2', contactSheet,
  ]);
} finally {
  rmSync(contactFramesDir, { recursive: true, force: true });
}

const finalDuration = durationOf(finalVideo);
const videoProbe = JSON.parse(output('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_name,codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', finalVideo]));
const qaReport = {
  id: config.id,
  baseline: config.baseline || 'resource360-demo-v2.1-live-interaction',
  durationSeconds: finalDuration,
  screenCount: config.scenes.length,
  overviewSlides: 1,
  contactSheetFrames: contactTimes.length,
  continuousInteraction: true,
  rawCapture: rawQa,
  probe: videoProbe,
};
writeFileSync(path.join(qaDir, 'qa-report.json'), `${JSON.stringify(qaReport, null, 2)}\n`);
writeFileSync(path.join(buildDir, 'timeline.json'), `${JSON.stringify({ totalDurationSeconds: finalDuration, scenes: timeline }, null, 2)}\n`);

copyFileSync(finalVideo, path.join(publicDir, `${config.outputBase}.mp4`));
copyFileSync(vttPath, path.join(publicDir, `${config.outputBase}.vtt`));
const posterPath = path.join(publicDir, `${config.outputBase}.jpg`);
run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', titlePng, '--out', posterPath]);

console.log(JSON.stringify({ file: finalVideo, durationSeconds: finalDuration, bytes: statSync(finalVideo).size, contactSheet }, null, 2));
