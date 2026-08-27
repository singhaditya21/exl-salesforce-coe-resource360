import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const directory = new URL("../public/demo-videos/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8"));

if (!Number.isInteger(manifest.expectedCount) || manifest.expectedCount < 1) throw new Error("Manifest expectedCount must be a positive integer.");
if (manifest.recordings.length !== manifest.expectedCount) throw new Error(`Expected ${manifest.expectedCount} recordings, found ${manifest.recordings.length}.`);

for (const recording of manifest.recordings) {
  if (!/^[a-z0-9-]+\.mp4$/.test(recording.file)) throw new Error(`Unsafe recording filename: ${recording.file}`);
  const videoUrl = new URL(recording.file, directory);
  const posterUrl = new URL(recording.poster, directory);
  const captionsUrl = new URL(recording.captions, directory);
  const [bytes, fileStat, posterStat, captions] = await Promise.all([readFile(videoUrl), stat(videoUrl), stat(posterUrl), readFile(captionsUrl, "utf8")]);
  const signature = bytes.subarray(4, 8).toString("ascii");
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (signature !== "ftyp") throw new Error(`${recording.file} is not an ISO base media file.`);
  if (fileStat.size !== recording.sizeBytes) throw new Error(`${recording.file} size does not match its manifest.`);
  if (digest !== recording.sha256) throw new Error(`${recording.file} SHA-256 does not match its manifest.`);
  if (posterStat.size < 10_000) throw new Error(`${recording.poster} is not a usable poster image.`);
  if (!captions.startsWith("WEBVTT\n") || !captions.includes("-->")) throw new Error(`${recording.captions} is not a usable WebVTT caption file.`);
  if (recording.generation?.includes("master")) {
    if (recording.format?.width !== 1920 || recording.format?.height !== 1080 || recording.format?.framesPerSecond !== 30 || recording.format?.audio !== true) {
      throw new Error(`${recording.file} does not declare the 1080p narrated-master format.`);
    }
    if (!Array.isArray(recording.screens) || recording.screens.length === 0) throw new Error(`${recording.file} has no governed screen coverage.`);
    if (recording.generation === "v2.1 live-interaction master" && !recording.validatedOutcome.includes("Continuous authenticated Salesforce footage")) {
      throw new Error(`${recording.file} does not declare continuous authenticated Salesforce evidence.`);
    }
  }
}

console.log(`Validated ${manifest.recordings.length} Resource360 demo recordings against the integrity manifest.`);
