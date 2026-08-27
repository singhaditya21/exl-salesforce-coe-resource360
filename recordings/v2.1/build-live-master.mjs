#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const configPath = path.resolve(process.argv[2] ?? '');
if (!configPath) throw new Error('Pass a master configuration module.');
const { default: config } = await import(pathToFileURL(configPath));
const root = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(root, 'build', config.id);
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

const titlePng = path.join(buildDir, 'title-slide.png');
run('sips', ['-s', 'format', 'png', path.join(root, config.titleSlide), '--out', titlePng]);

const timeline = [];
const captionCues = [];
const segmentFiles = [];
let offset = 0;

{
  const audio = makeAudio('00-intro', config.intro);
  const duration = Math.max(config.introMinimumSeconds ?? 24, audio.duration + 1.2);
  const file = path.join(segmentDir, '00-intro.mp4');
  run('ffmpeg', [
    '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '30', '-i', titlePng, '-i', audio.audioPath,
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x071f33,format=yuv420p',
    '-af', 'apad', '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', file,
  ]);
  addCaptions(captionCues, config.intro, offset, audio.duration);
  timeline.push({ slug: '00-intro', screen: 'Overview slide', startSeconds: offset, durationSeconds: duration });
  segmentFiles.push(file);
  offset += duration;
}

const rawQa = [];
for (const [index, scene] of config.scenes.entries()) {
  const rawDir = path.join(root, 'raw', config.rawFolder, scene.raw);
  const frames = readdirSync(rawDir).filter((name) => /^frame-\d{5}\.jpg$/.test(name)).sort();
  if (frames.length < 20) throw new Error(`${scene.screen} has only ${frames.length} raw frames.`);
  const hashes = new Set(frames.map((name) => createHash('sha256').update(readFileSync(path.join(rawDir, name))).digest('hex')));
  if (hashes.size < 4) throw new Error(`${scene.screen} has insufficient visible interaction (${hashes.size} unique frames).`);

  const slug = `${String(index + 1).padStart(2, '0')}-${scene.screen.toLowerCase()}`;
  const audio = makeAudio(slug, scene.narration);
  const capturedDuration = frames.length / config.captureFramesPerSecond;
  const duration = Math.max(capturedDuration, audio.duration + 1.2);
  const inputRate = frames.length / duration;
  const file = path.join(segmentDir, `${slug}.mp4`);
  run('ffmpeg', [
    '-loglevel', 'error', '-y', '-framerate', inputRate.toFixed(6), '-i', path.join(rawDir, 'frame-%05d.jpg'), '-i', audio.audioPath,
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x071f33,fps=30,format=yuv420p',
    '-af', 'apad', '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', file,
  ]);
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
const sampleRate = Math.max(8, Math.floor(offset / 12));
run('ffmpeg', [
  '-loglevel', 'error', '-y', '-i', finalVideo,
  '-vf', `fps=1/${sampleRate},scale=480:-1,tile=4x3:padding=8:margin=8:color=0x071f33`,
  '-frames:v', '1', '-q:v', '2', contactSheet,
]);

const finalDuration = durationOf(finalVideo);
const videoProbe = JSON.parse(output('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_name,codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', finalVideo]));
const qaReport = {
  id: config.id,
  baseline: 'resource360-demo-v2.1-live-interaction',
  durationSeconds: finalDuration,
  screenCount: config.scenes.length,
  overviewSlides: 1,
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
