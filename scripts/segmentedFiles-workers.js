const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');

// --- CONFIGURATION ---
const JOB_WORKERS = 2;          // how many videos to process at once
const SEGMENT_WORKERS = 4;      // parallel segment downloads per video
const MAX_RETRIES = 3;
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const TEMP_ROOT = path.join(__dirname, 'temp_segments');

/**
 * Each item:
 *   name      – output filename without extension (saved as .mp4 in /output)
 *   streamUrl – media playlist (.m3u8) URL
 *   headers   – optional per-job request headers (falls back to defaultHeaders)
 */
const downloadList = [
    // {
    //     name: 'Example Video',
    //     streamUrl: 'https://example.com/path/index.m3u8',
    //     headers: { Referer: 'https://example.com/' },
    // },

   

];

const defaultHeaders = {
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
    "sec-gpc": "1"
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
}

/**
 * Some hosts disguise MPEG-TS as PNG: a 1x1 PNG header, then raw TS bytes.
 * Safe no-op for normal .ts segments.
 */
function unwrapDisguisedSegment(filePath) {
    const data = fs.readFileSync(filePath);
    if (data.length < 8 || data[0] !== 0x89 || data.toString('ascii', 1, 4) !== 'PNG') {
        return false;
    }
    const iend = data.indexOf(Buffer.from('IEND'));
    if (iend === -1) return false;
    const payload = data.subarray(iend + 8);
    if (payload.length === 0 || payload[0] !== 0x47) {
        return false;
    }
    fs.writeFileSync(filePath, payload);
    return true;
}

function checkFFmpeg() {
    return ffmpegPath && fs.existsSync(ffmpegPath);
}

function resolveHeaders(job) {
    return { ...defaultHeaders, ...(job.headers || {}) };
}

async function fetchPlaylistSegments(streamUrl, headers) {
    const response = await axios.get(streamUrl, { headers, timeout: 20000 });
    const content = typeof response.data === 'string' ? response.data : String(response.data);
    const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
    const segments = [];

    for (let line of content.split('\n')) {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            segments.push(line.startsWith('http') ? line : baseUrl + line);
        }
    }

    if (segments.length === 0) {
        throw new Error('Playlist contained no media segments (is this a master playlist?)');
    }

    return segments;
}

async function downloadSegment(segUrl, segPath, headers) {
    if (fs.existsSync(segPath) && fs.statSync(segPath).size > 0) {
        unwrapDisguisedSegment(segPath);
        return 'skipped';
    }

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const writer = fs.createWriteStream(segPath);
            const response = await axios({
                url: segUrl,
                method: 'GET',
                responseType: 'stream',
                headers,
                timeout: 15000,
            });

            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
            });

            if (!fs.existsSync(segPath) || fs.statSync(segPath).size === 0) {
                throw new Error('Downloaded file is empty');
            }

            unwrapDisguisedSegment(segPath);
            return 'downloaded';
        } catch (err) {
            lastError = err;
            if (fs.existsSync(segPath)) {
                try { fs.unlinkSync(segPath); } catch (_) { /* ignore */ }
            }
            if (attempt < MAX_RETRIES) {
                await sleep(1000 * attempt);
            }
        }
    }

    throw lastError || new Error('Segment download failed');
}

async function runPool(items, limit, workerFn) {
    const queue = [...items];
    const workers = [];

    const worker = async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            if (!item) break;
            await workerFn(item);
        }
    };

    const count = Math.min(limit, items.length);
    for (let i = 0; i < count; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
}

async function downloadOneJob(job, jobIndex, totalJobs) {
    const label = `[${jobIndex + 1}/${totalJobs}] ${job.name}`;
    const headers = resolveHeaders(job);
    const safeName = sanitizeFilename(job.name);
    const outputFile = path.join(OUTPUT_DIR, `${safeName}.mp4`);
    const tempDir = path.join(TEMP_ROOT, safeName);

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0) {
        console.log(`${label} — already exists, skipping`);
        return { name: job.name, status: 'skipped' };
    }

    fs.mkdirSync(tempDir, { recursive: true });

    console.log(`${label} — fetching playlist...`);
    const segments = await fetchPlaylistSegments(job.streamUrl, headers);
    console.log(`${label} — ${segments.length} segments, downloading (x${SEGMENT_WORKERS})...`);

    let completed = 0;
    const segmentJobs = segments.map((url, i) => ({
        url,
        path: path.join(tempDir, `seg_${String(i).padStart(5, '0')}.ts`),
        index: i,
    }));

    await runPool(segmentJobs, SEGMENT_WORKERS, async (seg) => {
        await downloadSegment(seg.url, seg.path, headers);
        completed += 1;
        process.stdout.write(`\r${label} — segments ${completed}/${segments.length}   `);
        await sleep(getRandomDelay(100, 300));
    });
    process.stdout.write('\n');

    const allSegments = fs.readdirSync(tempDir)
        .filter((file) => file.startsWith('seg_') && file.endsWith('.ts'))
        .sort()
        .map((file) => path.join(tempDir, file));

    if (allSegments.length === 0) {
        throw new Error('No segments downloaded');
    }

    const listFilePath = path.join(tempDir, 'file_list.txt');
    const fileListContent = allSegments
        .map((file) => `file '${file.replace(/\\/g, '/')}'`)
        .join('\n');
    fs.writeFileSync(listFilePath, fileListContent);

    console.log(`${label} — stitching with FFmpeg...`);
    execSync(
        `"${ffmpegPath}" -y -f concat -safe 0 -i "${listFilePath}" -c copy "${outputFile}"`,
        { stdio: 'pipe' }
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`${label} — done → ${outputFile}`);
    return { name: job.name, status: 'success', outputFile };
}

async function main() {
    if (!checkFFmpeg()) {
        console.error('[ERROR] Local FFmpeg binary from `ffmpeg-static` could not be found.');
        console.error('[ABORT] Run `npm install ffmpeg-static`.');
        process.exit(1);
    }

    if (!downloadList.length) {
        console.error('[ABORT] downloadList is empty. Add jobs at the top of this file.');
        process.exit(1);
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(TEMP_ROOT, { recursive: true });

    console.log(`[START] ${downloadList.length} job(s), ${JOB_WORKERS} video worker(s), ${SEGMENT_WORKERS} segment worker(s) each`);

    const results = [];
    const indexed = downloadList.map((job, index) => ({ job, index }));

    await runPool(indexed, JOB_WORKERS, async ({ job, index }) => {
        try {
            const result = await downloadOneJob(job, index, downloadList.length);
            results.push(result);
        } catch (err) {
            console.error(`\n[${index + 1}/${downloadList.length}] ${job.name} — FAILED: ${err.message}`);
            results.push({ name: job.name, status: 'failed', error: err.message });
        }
    });

    const ok = results.filter((r) => r.status === 'success').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    console.log(`\n--- DONE — ${ok} saved, ${skipped} skipped, ${failed} failed ---`);
}

main().catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
});
