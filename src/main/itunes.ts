import https from 'https';
import http from 'http';

export interface iTunesMetadataResult {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year?: string;
  coverArtUrl?: string;
  coverBuffer?: Buffer;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  let matches = 0;
  for (const w1 of words1) {
    if (w1.length > 2 && words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
      matches++;
    }
  }
  return matches / Math.max(words1.length, words2.length);
}

function httpGetAsync(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = urlStr.startsWith('https') ? https : http;
    const req = client.get(urlStr, { headers: { 'User-Agent': 'NorthTracks/1.1' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGetAsync(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function httpGetBufferAsync(urlStr: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = urlStr.startsWith('https') ? https : http;
    const req = client.get(urlStr, { headers: { 'User-Agent': 'NorthTracks/1.1' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGetBufferAsync(res.headers.location).then(resolve).catch(reject);
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Image download timeout'));
    });
  });
}

export interface OnlineTrackItem {
  id: string;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  genre: string[];
  duration: number;
  bitrate: number;
  coverArt: string;
  isOnline: boolean;
  previewUrl: string;
}

export async function searchiTunesCatalog(term: string = 'top hits', limit: number = 50): Promise<OnlineTrackItem[]> {
  try {
    const cleanTerm = (term && term.trim()) ? term.trim() : 'top hits';
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm)}&media=music&entity=song&limit=${limit}`;
    const jsonStr = await httpGetAsync(searchUrl);
    const data = JSON.parse(jsonStr);

    if (!data || !data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => {
      const art = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
        : '';
      
      const durationSecs = item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30;

      return {
        id: String(item.trackId || item.collectionId || Math.random()),
        filePath: item.previewUrl || '',
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || 'Unknown Album',
        genre: item.primaryGenreName ? [item.primaryGenreName] : ['Pop'],
        duration: durationSecs,
        bitrate: 256000,
        coverArt: art,
        isOnline: true,
        previewUrl: item.previewUrl || ''
      };
    }).filter((t: any) => t.previewUrl.length > 0);
  } catch (err) {
    console.error('Failed to search iTunes catalog:', err);
    return [];
  }
}

export async function fetchiTunesMetadata(
  title: string,
  artist: string,
  rawFilename: string
): Promise<iTunesMetadataResult | null> {
  let queryTerm = '';
  if (artist && artist !== 'Unknown Artist' && title && title !== rawFilename) {
    queryTerm = `${artist} ${title}`;
  } else if (title) {
    queryTerm = title.replace(/[-_]/g, ' ');
  } else {
    queryTerm = rawFilename.replace(/[-_]/g, ' ');
  }

  // Clean common filename artifacts (e.g. 128kbps, official video, ft, etc)
  queryTerm = queryTerm
    .replace(/\b(official video|lyric video|audio|remix|hd|4k|128kbps|320kbps)\b/gi, '')
    .trim();

  if (!queryTerm || queryTerm.length < 2) return null;

  try {
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&media=music&entity=song&limit=5`;
    const jsonStr = await httpGetAsync(searchUrl);
    const data = JSON.parse(jsonStr);

    if (!data || !data.results || data.results.length === 0) {
      return null;
    }

    // Rank results based on title & artist similarity
    let bestMatch: any = null;
    let maxScore = -1;

    for (const item of data.results) {
      const titleScore = title ? calculateStringSimilarity(title, item.trackName || '') : 0.5;
      const artistScore = (artist && artist !== 'Unknown Artist') ? calculateStringSimilarity(artist, item.artistName || '') : 0.5;
      const totalScore = titleScore * 0.6 + artistScore * 0.4;

      if (totalScore > maxScore) {
        maxScore = totalScore;
        bestMatch = item;
      }
    }

    if (!bestMatch || maxScore < 0.25) {
      // Fallback to first result if score is decent
      bestMatch = data.results[0];
    }

    const highResArtUrl = bestMatch.artworkUrl100
      ? bestMatch.artworkUrl100.replace('100x100bb.jpg', '1000x1000bb.jpg')
      : undefined;

    let coverBuffer: Buffer | undefined = undefined;
    if (highResArtUrl) {
      try {
        coverBuffer = await httpGetBufferAsync(highResArtUrl);
      } catch (err) {
        console.error('Failed to download iTunes cover art:', err);
      }
    }

    return {
      title: bestMatch.trackName || title || rawFilename,
      artist: bestMatch.artistName || artist || 'Unknown Artist',
      album: bestMatch.collectionName || 'Unknown Album',
      genre: bestMatch.primaryGenreName || 'Unsorted',
      year: bestMatch.releaseDate ? new Date(bestMatch.releaseDate).getFullYear().toString() : undefined,
      coverArtUrl: highResArtUrl,
      coverBuffer
    };
  } catch (err) {
    console.error('iTunes Search API query failed:', err);
    return null;
  }
}

