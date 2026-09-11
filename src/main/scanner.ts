import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

// Global scan cancellation state
let scanCancelled = false;

export function cancelCurrentScan() {
  scanCancelled = true;
}

export function resetScanCancellation() {
  scanCancelled = false;
}

export function isScanCancelled(): boolean {
  return scanCancelled;
}

// Helper to recursively find audio files in a single folder
export function getAudioFiles(dir: string, filesList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getAudioFiles(filePath, filesList);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.mp3', '.m4a', '.flac', '.wav'].includes(ext)) {
          filesList.push(filePath);
        }
      }
    }
  } catch (e) {
    // Ignore unreadable folders
  }
  return filesList;
}

export function findFolderImage(trackFilePath: string): string | undefined {
  try {
    const dir = path.dirname(trackFilePath);
    const files = fs.readdirSync(dir);
    
    const priorityNames = ['cover', 'folder', 'front', 'album', 'artwork'];
    for (const priority of priorityNames) {
      const match = files.find(f => {
        const ext = path.extname(f).toLowerCase();
        const base = path.basename(f, ext).toLowerCase();
        return base === priority && ['.jpg', '.jpeg', '.png'].includes(ext);
      });
      if (match) {
        return path.join(dir, match);
      }
    }
    
    const anyImg = files.find(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });
    if (anyImg) {
      return path.join(dir, anyImg);
    }
  } catch (err) {
    // Ignore errors
  }
  return undefined;
}

export interface TrackInfo {
  filePath: string;
  title: string;
  artist: string;
  album: string;
  genre: string[];
  duration: number;
  bitrate: number;
  isDuplicate?: boolean;
  coverArt?: string;
}

export async function limitConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  
  async function worker() {
    while (index < items.length) {
      if (scanCancelled) break;
      const currentIdx = index++;
      if (currentIdx % 25 === 0) {
        await new Promise<void>(resolve => setImmediate(resolve));
      }
      try {
        results[currentIdx] = await fn(items[currentIdx], currentIdx);
      } catch (e) {
        console.error(`Error in concurrency worker at index ${currentIdx}:`, e);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function getSystemDrives(): string[] {
  if (process.platform === 'win32') {
    try {
      const output = execSync('wmic logicaldisk get caption', { encoding: 'utf-8' });
      const lines = output.split('\n');
      const drives: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^[A-Z]:$/i)) {
          drives.push(`${trimmed}\\`);
        }
      }
      if (drives.length > 0) return drives;
    } catch (e) {
      // Fallback
    }
    const fallbackDrives: string[] = [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of letters) {
      const drivePath = `${letter}:\\`;
      try {
        if (fs.existsSync(drivePath)) {
          fallbackDrives.push(drivePath);
        }
      } catch (e) {}
    }
    return fallbackDrives.length > 0 ? fallbackDrives : ['C:\\'];
  } else {
    return ['/'];
  }
}

const EXCLUDED_DIRS = new Set([
  'windows',
  'program files',
  'program files (x86)',
  'appdata',
  'node_modules',
  '.git',
  '$recycle.bin',
  'system volume information',
  'temp',
  'tmp',
  'cache',
  'code cache',
  'gpucache',
  'programdata',
  'recovery',
  'msocache',
  'driverstore',
  'winsxs',
  'windowsapps',
  'local',
  'locallow',
  'roaming',
  'application data',
  'spotify',
  'discord',
  'slack',
  'teams',
  'telegram',
  'whatsapp',
  'chrome',
  'edge',
  'brave',
  'firefox',
  'opera',
  'npm',
  'pip',
  'v8',
  'build',
  'dist',
  'out',
  'target',
  'bin',
  'obj',
  'release',
  'debug',
  '.vs',
  '.vscode',
  '.idea',
  'vendor',
  'packages',
  'site-packages'
]);

const EXCLUDED_KEYWORDS = [
  'voicerecorder',
  'soundeffect',
  'sfx',
  'ringtones',
  'gamedata',
  'assets',
  'plugins',
  'driver',
  'system32',
  'windows',
  'microsoft',
  'cache',
  'chromium',
  'node_modules',
  'appdata',
  'recording',
  'recordings',
  'call_rec',
  'callrec',
  'calls',
  'voice_notes',
  'whatsapp audio',
  'telegram audio',
  'dictation',
  'speech',
  'meeting',
  'zoom',
  'sound_recorder',
  'aud_rec',
  'voice_memos',
  'spam',
  'alert',
  'truecaller',
  'jio',
  'airtel',
  'voicemail'
];

// Enhanced regex matching call recordings, phone numbers (+91...), podcasts, spam alerts, voice memos, WAV clips, and system audio logs
const RECORDING_FILENAME_REGEX = /(^\+?\d{7,}(-\d+)?$)|(^\+?\d{10,})|(^1800\d+)|(^(wav|rec|call|voice|recording|audiorecord|sound|track|memo|aud)[_-])|\b(rec(ording)?|call_rec|call|voice_note|aud-\d|ptt-\d|sound_rec|dictation|speech|zoom_\d|meeting|voice\d*|wav_\d*|rec_\d*|spam|alert|truecaller|jio|airtel|voicemail|podcast|episode|talk|interview|audiobook)\b|(\-\d{8,})|(_\d{8,})/i;

export function isRecordingTrack(titleOrPath: string, artist?: string, album?: string, duration?: number): boolean {
  if (!titleOrPath) return false;
  const cleanStr = titleOrPath.toLowerCase().trim();
  const filename = path.basename(cleanStr);
  
  // Phone numbers (+91..., 022..., 9876543210...)
  if (/(^\+?\d{7,})|(\b0?\d{10,}\b)|(\+91\d+)|(\d{3,4}[-._]\d{6,})/.test(filename)) return true;

  // Recording, voice memo, spam, call recording, podcast, audiobook keywords
  const recordingKeywords = [
    'spam alert', 'call recording', 'voice recording', 'call_rec', 'callrec', 'rec_', 'aud-', 'ptt-',
    'voicemail', 'truecaller', 'jio', 'airtel', 'sound_recorder', 'voice_notes', 'whatsapp audio',
    'telegram audio', 'dictation', 'speech', 'meeting', 'zoom', 'podcast', 'episode', 'interview',
    'audiobook', 'speech_rec', 'voice_memo'
  ];

  if (recordingKeywords.some(k => cleanStr.includes(k))) return true;
  if (RECORDING_FILENAME_REGEX.test(filename)) return true;

  // Short clips (< 12 seconds) are likely sound effects/ringtones
  if (duration !== undefined && duration > 0 && duration < 12) return true;

  const isUnknownArtist = !artist || artist.toLowerCase() === 'unknown artist' || artist.toLowerCase() === 'unknown';
  const isUnknownAlbum = !album || album.toLowerCase() === 'unknown album' || album.toLowerCase() === 'unknown';
  if ((isUnknownArtist || isUnknownAlbum) && RECORDING_FILENAME_REGEX.test(cleanStr)) {
    return true;
  }
  return false;
}

export interface ScanProgressData {
  stage: 'scanning' | 'metadata';
  scannedFiles: number;
  foundCandidates: number;
  currentDir?: string;
  metadataCurrent?: number;
  metadataTotal?: number;
  currentTrackName?: string;
}

export async function fastScanAllDrives(
  targetRoots?: string[],
  onProgress?: (data: ScanProgressData) => void,
  allowedExtensions?: string[]
): Promise<TrackInfo[]> {
  resetScanCancellation();
  const defaultMusicDir = path.join(os.homedir(), 'Music');
  const roots = (targetRoots && targetRoots.length > 0) ? targetRoots : [defaultMusicDir];
  const audioCandidates: string[] = [];
  let scannedFiles = 0;
  const audioExtensions = (allowedExtensions && allowedExtensions.length > 0) 
    ? new Set(allowedExtensions.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`))
    : new Set(['.mp3', '.m4a', '.flac', '.wav']);
  const rejectionStats: Record<string, number> = {};
  const sampleRejections: Array<{ path: string; reason: string }> = [];

  function recordRejection(filePath: string, reason: string) {
    rejectionStats[reason] = (rejectionStats[reason] || 0) + 1;
    if (sampleRejections.length < 50) {
      sampleRejections.push({ path: filePath, reason });
    }
  }

  async function scanDir(dir: string) {
    if (scanCancelled) return;

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (scanCancelled) break;

        const fullPath = path.join(dir, entry.name);
        const nameLower = entry.name.toLowerCase();

        if (entry.isDirectory()) {
          if (EXCLUDED_DIRS.has(nameLower)) continue;
          if (EXCLUDED_KEYWORDS.some(k => nameLower.includes(k))) continue;
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          scannedFiles++;
          const ext = path.extname(entry.name).toLowerCase();
          if (audioExtensions.has(ext)) {
            const dirLower = dir.toLowerCase();
            if (EXCLUDED_KEYWORDS.some(k => dirLower.includes(k))) {
              recordRejection(fullPath, 'Directory contains excluded non-music keyword');
            } else if (RECORDING_FILENAME_REGEX.test(entry.name)) {
              recordRejection(fullPath, 'Phone call or voice recording filename pattern');
            } else {
              audioCandidates.push(fullPath);
            }
          }
          if (scannedFiles % 100 === 0 && onProgress) {
            onProgress({
              stage: 'scanning',
              scannedFiles,
              foundCandidates: audioCandidates.length,
              currentDir: dir
            });
            await new Promise<void>(resolve => setImmediate(resolve));
          }
        }
      }
    } catch (e) {
      // Permission denied or unreadable directory
    }
  }

  for (const root of roots) {
    if (scanCancelled) break;
    await scanDir(root);
  }

  if (scanCancelled) {
    return [];
  }

  if (onProgress) {
    onProgress({
      stage: 'metadata',
      scannedFiles,
      foundCandidates: audioCandidates.length,
      metadataCurrent: 0,
      metadataTotal: audioCandidates.length,
      currentTrackName: 'Initializing metadata engine...'
    });
  }

  let cacheDir = '';
  let debugLogPath = '';
  try {
    const { app } = await import('electron');
    cacheDir = path.join(app.getPath('userData'), 'ArtPreviews');
    debugLogPath = path.join(app.getPath('userData'), 'scan-debug-log.json');
  } catch (e) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    cacheDir = path.join(appData, 'northtracks', 'ArtPreviews');
    debugLogPath = path.join(appData, 'northtracks', 'scan-debug-log.json');
  }

  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create ArtPreviews directory:', e);
  }

  const { parseFile } = await import('music-metadata');
  const folderImageCache = new Map<string, string | undefined>();

  let metadataProcessedCount = 0;

  const rawTracks = await limitConcurrency(audioCandidates, 8, async (filePath) => {
    if (scanCancelled) return null;

    metadataProcessedCount++;
    if (onProgress && metadataProcessedCount % 5 === 0) {
      onProgress({
        stage: 'metadata',
        scannedFiles,
        foundCandidates: audioCandidates.length,
        metadataCurrent: metadataProcessedCount,
        metadataTotal: audioCandidates.length,
        currentTrackName: path.basename(filePath)
      });
    }

    try {
      const metadata = await parseFile(filePath);
      const duration = metadata.format.duration || 0;

      // Smart Filter 1: Ignore short audio clips (< 30 seconds) like UI sound effects or short voice notes
      if (duration > 0 && duration < 30) {
        recordRejection(filePath, 'Short audio clip (< 30s)');
        return null;
      }

      const numberOfChannels = metadata.format.numberOfChannels || 2;
      const bitrate = metadata.format.bitrate || 0;
      const sampleRate = metadata.format.sampleRate || 44100;
      const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
      const artist = metadata.common.artist || 'Unknown Artist';
      const album = metadata.common.album || 'Unknown Album';

      // Smart Filter 2: Ignore mono low-bitrate / low-sample-rate voice recordings without artist/album tags
      if (numberOfChannels === 1 && (bitrate > 0 && bitrate < 96000 || sampleRate < 32000) && artist === 'Unknown Artist' && album === 'Unknown Album') {
        recordRejection(filePath, 'Mono low-bitrate voice recording without ID3 tags');
        return null;
      }

      // Smart Filter 3: Check if filename/title matches numeric call recording pattern or spam alert pattern
      const fileName = path.basename(filePath);
      if (isRecordingTrack(title, artist, album) || isRecordingTrack(fileName, artist, album)) {
        recordRejection(filePath, 'Call recording or spam alert audio');
        return null;
      }

      const pictures = metadata.common.picture;
      let coverArt: string | undefined = undefined;

      if (pictures && pictures.length > 0) {
        const pic = pictures[0];
        try {
          let format = pic.format || 'image/jpeg';
          if (!format.includes('/')) {
            format = `image/${format}`;
          }
          const ext = format.includes('png') ? '.png' : '.jpg';
          const hash = crypto.createHash('md5').update(filePath).digest('hex');
          const cacheImagePath = path.join(cacheDir, `${hash}${ext}`);

          if (!fs.existsSync(cacheImagePath)) {
            const buffer = Buffer.isBuffer(pic.data) ? pic.data : Buffer.from(pic.data as any);
            await fs.promises.writeFile(cacheImagePath, buffer);
          }
          coverArt = `media:///${cacheImagePath.replace(/\\/g, '/')}`;
        } catch (e) {
          console.error('Failed to convert cover art to file:', e);
        }
      } else {
        const dir = path.dirname(filePath);
        let localImgPath = folderImageCache.get(dir);
        if (!folderImageCache.has(dir)) {
          localImgPath = findFolderImage(filePath);
          folderImageCache.set(dir, localImgPath);
        }
        if (localImgPath) {
          coverArt = `media:///${localImgPath.replace(/\\/g, '/')}`;
        }
      }

      return {
        filePath,
        title,
        artist,
        album,
        genre: metadata.common.genre || [],
        duration,
        bitrate,
        coverArt,
      };
    } catch (err) {
      // If parsing failed and filename matches recording pattern, reject it
      const baseName = path.basename(filePath);
      if (RECORDING_FILENAME_REGEX.test(baseName)) {
        recordRejection(filePath, 'Unparseable file matching call recording pattern');
        return null;
      }

      return {
        filePath,
        title: path.basename(filePath, path.extname(filePath)),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        genre: [],
        duration: 0,
        bitrate: 0,
        coverArt: undefined,
      };
    }
  });

  if (scanCancelled) return [];

  const validTracks = (rawTracks.filter(Boolean) as TrackInfo[]).filter(t => t.duration === 0 || t.duration >= 30);

  // Mark duplicates
  const groups = new Map<string, number[]>();
  validTracks.forEach((track, index) => {
    const key = `${track.title.toLowerCase().trim()}|${track.artist.toLowerCase().trim()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(index);
  });

  groups.forEach((indices) => {
    if (indices.length > 1) {
      for (let i = 0; i < indices.length - 1; i++) {
        validTracks[indices[i]].isDuplicate = true;
      }
    }
  });

  // Write debug scan log to disk
  try {
    const debugData = {
      timestamp: new Date().toISOString(),
      targetRoots: roots,
      scannedFiles,
      foundCandidates: audioCandidates.length,
      acceptedMusicTracks: validTracks.length,
      rejectionStats,
      sampleRejections
    };
    const logDir = path.dirname(debugLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(debugLogPath, JSON.stringify(debugData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write scan debug log:', e);
  }

  return validTracks;
}

export async function scanLibrary(sourceFolder: string): Promise<TrackInfo[]> {
  return fastScanAllDrives([sourceFolder]);
}
