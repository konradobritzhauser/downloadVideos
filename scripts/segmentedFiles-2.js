const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static'); // Uses local node_modules binary

// --- CONFIGURATION ---
const STREAM_URL = 'https://filelions.top/stream/hooAahGqJ88UYiOdUH4T7g/hjkrhuihghfvu/1785083213/6100859/index-f3-v1-a1.m3u8';
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'The Boondocks (s01e01).mp4');
const TEMP_DIR = path.join(__dirname, 'temp_segments');

const headersObj = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.8",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Brave\";v=\"146\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sec-fetch-storage-access": "none",
    "sec-gpc": "1",
    "cookie": "tsn=43",
    "Referer": "https://filelions.top/v/ens5a33g7y4m"
};

// Helper utilities for delays and jitter
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Filelions/VidHide disguise MPEG-TS as PNG: a 1x1 PNG header, then raw TS bytes.
 * Players strip the PNG; without that step, players/ffmpeg see an "image" and no video.
 */
function unwrapDisguisedSegment(filePath) {
    const data = fs.readFileSync(filePath);
    if (data.length < 8 || data[0] !== 0x89 || data.toString('ascii', 1, 4) !== 'PNG') {
        return false;
    }
    const iend = data.indexOf(Buffer.from('IEND'));
    if (iend === -1) return false;
    const payload = data.subarray(iend + 8); // IEND chunk type + CRC
    if (payload.length === 0 || payload[0] !== 0x47) {
        // 0x47 = MPEG-TS sync; if missing, leave file alone
        return false;
    }
    fs.writeFileSync(filePath, payload);
    return true;
}

// Pre-check for local FFmpeg binary
function checkFFmpeg() {
    return ffmpegPath && fs.existsSync(ffmpegPath);
}

async function downloadHLSStream() {
    // Check local FFmpeg BEFORE downloading anything
    if (!checkFFmpeg()) {
        console.error('[ERROR] Local FFmpeg binary from `ffmpeg-static` could not be found.');
        console.error('[ABORT] Please run `npm install ffmpeg-static`. Your temp folder was left untouched.');
        return;
    }

    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('[START] Fetching m3u8 playlist...');
    let playlistResponse;
    try {
        playlistResponse = await axios.get(STREAM_URL, { headers: headersObj });
    } catch (err) {
        console.error(`[ERROR] Failed to fetch playlist: ${err.message}`);
        return;
    }

    const playlistContent = playlistResponse.data;
    console.log("playlistContent", playlistContent);
    const lines = playlistContent.split('\n');
    const segments = [];
    const baseUrl = STREAM_URL.substring(0, STREAM_URL.lastIndexOf('/') + 1);

    for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            let segmentUrl = line.startsWith('http') ? line : baseUrl + line;
            segments.push(segmentUrl);
        }
    }

    console.log(`[INFO] Found ${segments.length} segments. Processing queue...`);

    const downloadedFiles = [];

    for (let i = 0; i < segments.length; i++) {
        const segUrl = segments[i];
        const segName = `seg_${String(i).padStart(5, '0')}.ts`;
        const segPath = path.join(TEMP_DIR, segName);

        // Resume Capability: Check if segment already exists and is non-empty
        if (fs.existsSync(segPath) && fs.statSync(segPath).size > 0) {
            unwrapDisguisedSegment(segPath); // in case a prior run left PNG-wrapped files
            process.stdout.write(`\r[SKIP] Segment ${i + 1} of ${segments.length} (Already downloaded)`);
            downloadedFiles.push(segPath);
            continue;
        }

        process.stdout.write(`\rDownloading segment ${i + 1} of ${segments.length}`);

        let success = false;
        let attempts = 0;
        const maxRetries = 3;

        while (!success && attempts < maxRetries) {
            try {
                attempts++;
                const writer = fs.createWriteStream(segPath);
                const segResponse = await axios({
                    url: segUrl,
                    method: 'GET',
                    responseType: 'stream',
                    headers: headersObj,
                    timeout: 15000 // 15-second safety timeout
                });

                segResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                // Verify file actually saved correctly
                if (fs.existsSync(segPath) && fs.statSync(segPath).size > 0) {
                    unwrapDisguisedSegment(segPath);
                    downloadedFiles.push(segPath);
                    success = true;
                } else {
                    throw new Error('Downloaded file is empty');
                }
            } catch (err) {
                if (attempts >= maxRetries) {
                    console.error(`\n[ERROR] Failed downloading segment ${i + 1} after ${maxRetries} attempts: ${err.message}`);
                } else {
                    // Back off exponentially before retrying
                    await sleep(1000 * attempts);
                }
            }
        }

        // Polite jitter delay between requests to protect against CDN rate limiting
        await sleep(getRandomDelay(100, 300));
    }

    // Gather all existing segments in temp dir in case previous runs left some behind
    const allSegments = fs.readdirSync(TEMP_DIR)
        .filter(file => file.startsWith('seg_') && file.endsWith('.ts'))
        .sort()
        .map(file => path.join(TEMP_DIR, file));

    console.log(`\n[INFO] Creating file list for FFmpeg (${allSegments.length} segments found)...`);
    const listFilePath = path.join(TEMP_DIR, 'file_list.txt');
    
    const fileListContent = allSegments
        .map(file => `file '${file.replace(/\\/g, '/')}'`)
        .join('\n');
    
    fs.writeFileSync(listFilePath, fileListContent);

    console.log('[INFO] Stitching segments together into final video using local FFmpeg...');
    try {
        // Wrap path in quotes to handle potential spaces in project paths safely
        execSync(`"${ffmpegPath}" -f concat -safe 0 -i "${listFilePath}" -c copy "${OUTPUT_FILE}"`, { stdio: 'inherit' });
        console.log(`\n[SUCCESS] Completed: ${OUTPUT_FILE}`);
    } catch (error) {
        console.error(`\n[ERROR] FFmpeg stitching failed. Temporary files have been preserved.`);
        return;
    }

    // Cleanup only runs if stitching succeeds completely
    console.log('[INFO] Cleaning up temporary files...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log('[DONE] Process finished.');
}

downloadHLSStream();