#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const narrationPath = path.join(root, 'narration.md');
const audioDir = path.join(root, 'audio');
const framesDir = path.join(root, 'frames');
const videoDir = path.join(root, 'video');

for (const directory of [audioDir, framesDir, videoDir, path.join(root, 'qa')]) mkdirSync(directory, { recursive: true });

const sceneDefinitions = [
  { heading: 'Intro', slug: '00-intro', image: 'title-slide.png', title: '' },
  { heading: 'GLB-01 — EXL SSO entry', slug: '01-glb-01', image: 'glb-01-top.png', detail: 'glb-01-detail.png', title: 'GLB-01  |  EXL SSO ENTRY  |  LIVE SALESFORCE' },
  { heading: 'GLB-02 — Role-aware home', slug: '02-glb-02', image: 'glb-02-top.png', detail: 'glb-02-detail.png', title: 'GLB-02  |  ROLE-AWARE HOME  |  LIVE SALESFORCE' },
  { heading: 'GLB-03 — Notification center', slug: '03-glb-03', image: 'glb-03-top.png', detail: 'glb-03-detail.png', title: 'GLB-03  |  NOTIFICATION CENTER  |  LIVE SALESFORCE' },
  { heading: 'GLB-04 — Global search', slug: '04-glb-04', image: 'glb-04-top.png', detail: 'glb-04-detail.png', title: 'GLB-04  |  GLOBAL SEARCH  |  LIVE SALESFORCE' },
  { heading: 'GLB-05 — Role and scope switcher', slug: '05-glb-05', image: 'glb-05-top.png', detail: 'glb-05-detail.png', title: 'GLB-05  |  ROLE AND SCOPE  |  LIVE SALESFORCE' },
  { heading: 'GLB-06 — User preferences and help', slug: '06-glb-06', image: 'glb-06-top.png', detail: 'glb-06-detail.png', title: 'GLB-06  |  PREFERENCES AND HELP  |  LIVE SALESFORCE' },
  { heading: 'Close', slug: '07-close', image: 'glb-06-top.png', detail: 'glb-06-detail.png', title: 'MASTER 01 COMPLETE  |  NEXT: ENGAGEMENT 360' },
];

const source = readFileSync(narrationPath, 'utf8');
const sectionMatches = [...source.matchAll(/^## (.+)\n\n([\s\S]*?)(?=^## |\s*$)/gm)];
const narration = new Map(sectionMatches.map((match) => [match[1].trim(), match[2].trim().replace(/\n+/g, ' ')]));

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function durationOf(file) {
  const raw = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], { encoding: 'utf8' });
  return Number(raw.trim());
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
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [text];
}

const timeline = [];
let videoOffset = 0;
const captionCues = [];

for (const [index, scene] of sceneDefinitions.entries()) {
  const text = narration.get(scene.heading);
  if (!text) throw new Error(`Missing narration section: ${scene.heading}`);

  const textPath = path.join(audioDir, `${scene.slug}.txt`);
  const audioPath = path.join(audioDir, `${scene.slug}.aiff`);
  writeFileSync(textPath, `${text}\n`);
  run('/usr/bin/say', ['-v', 'Aman', '-r', '175', '-f', textPath, '-o', audioPath]);

  let audioDuration = durationOf(audioPath);
  const narrationWordCount = text.split(/\s+/).length;
  if (audioDuration > narrationWordCount * 0.7) {
    console.warn(`Regenerating anomalous narration duration for ${scene.slug}: ${audioDuration.toFixed(2)}s`);
    run('/usr/bin/say', ['-v', 'Aman', '-r', '175', '-f', textPath, '-o', audioPath]);
    audioDuration = durationOf(audioPath);
  }
  const sceneDuration = audioDuration + 1;
  const sceneVideo = path.join(videoDir, `${scene.slug}.mp4`);
  const firstImage = path.join(framesDir, scene.image);
  const secondImage = path.join(framesDir, scene.detail ?? scene.image);
  const half = sceneDuration / 2;
  const transitionDuration = 0.8;
  const transitionOffset = Math.max(0.1, half - transitionDuration / 2);
  const filter = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x071f33,zoompan=z='min(zoom+0.00012,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,trim=duration=${half.toFixed(3)},setpts=PTS-STARTPTS[v0]`,
    `[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x071f33,zoompan=z='min(zoom+0.00010,1.03)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,trim=duration=${half.toFixed(3)},setpts=PTS-STARTPTS[v1]`,
    `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${transitionOffset.toFixed(3)},format=yuv420p[v]`,
    `[2:a]apad=pad_dur=1[a]`,
  ].join(';');

  run('ffmpeg', [
    '-loglevel', 'error', '-y',
    '-loop', '1', '-framerate', '30', '-i', firstImage,
    '-loop', '1', '-framerate', '30', '-i', secondImage,
    '-i', audioPath,
    '-filter_complex', filter,
    '-map', '[v]', '-map', '[a]',
    '-t', sceneDuration.toFixed(3),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    sceneVideo,
  ]);

  const sentenceList = sentences(text);
  const totalWords = sentenceList.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0);
  let captionOffset = videoOffset;
  for (const sentence of sentenceList) {
    const words = sentence.split(/\s+/).length;
    const sentenceDuration = audioDuration * (words / totalWords);
    captionCues.push({ start: captionOffset, end: captionOffset + sentenceDuration, text: sentence });
    captionOffset += sentenceDuration;
  }

  timeline.push({
    index,
    heading: scene.heading,
    slug: scene.slug,
    startSeconds: videoOffset,
    endSeconds: videoOffset + sceneDuration,
    durationSeconds: sceneDuration,
    sourceFrames: [scene.image, scene.detail ?? scene.image],
  });
  videoOffset += sceneDuration;
}

const concatPath = path.join(videoDir, 'concat.txt');
writeFileSync(concatPath, sceneDefinitions.map((scene) => `file '${scene.slug}.mp4'`).join('\n') + '\n');
const noCaptions = path.join(videoDir, 'resource360-master-01-global-entry-home-access-no-captions.mp4');
run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', '-movflags', '+faststart', noCaptions]);

const vttPath = path.join(videoDir, 'resource360-master-01-global-entry-home-access.vtt');
const vtt = ['WEBVTT', ''];
captionCues.forEach((cue, index) => {
  vtt.push(String(index + 1), `${vttTime(cue.start)} --> ${vttTime(cue.end)}`, cue.text, '');
});
writeFileSync(vttPath, vtt.join('\n'));

const finalVideo = path.join(videoDir, 'resource360-master-01-global-entry-home-access.mp4');
run('ffmpeg', [
  '-loglevel', 'error', '-y',
  '-i', noCaptions,
  '-i', vttPath,
  '-map', '0:v:0', '-map', '0:a:0', '-map', '1:0',
  '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text',
  '-metadata:s:s:0', 'language=eng',
  '-metadata:s:s:0', 'title=English',
  '-movflags', '+faststart',
  finalVideo,
]);

writeFileSync(path.join(videoDir, 'timeline.json'), `${JSON.stringify({ totalDurationSeconds: videoOffset, scenes: timeline }, null, 2)}\n`);
console.log(`Built ${finalVideo}`);
console.log(`Duration: ${videoOffset.toFixed(2)} seconds`);
