//work in progress

const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require("ffmpeg-static");

// --- CONFIGURATION ---
const CONCURRENCY_LIMIT = 2; // Adjust this to change how many download at once

const downloadList = [
    { name: 'The Great Gatsby (2013)', hlsLink: 'https://s13.vimeos.net/hls2/02/00009/e663e8i0orde_h/index-v1-a1.m3u8?t=bFXJORASAt_L8bMG1ye9J2Nl9IchnS594IzJRgJWeWc&s=1785021305&e=43200&v=302711992&i=0.3&sp=0&fr=e663e8i0orde&r=e' },
];

const headersObj = {
   "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Brave\";v=\"150\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "sec-gpc": "1"
};

/**
 * Single Downloader Logic wrapped in a Promise
 */
function downloadFile({ name, hlsLink }) {
    return new Promise((resolve, reject) => {
        const headerString = Object.entries(headersObj)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\r\n') + '\r\n';

        console.log(`[START] Processing: ${name}`);

        const ffmpeg = spawn(ffmpegPath, [
            '-headers', headerString,
            '-i', hlsLink,
            '-c', 'copy',
            '-y',
            name
        ]);

        ffmpeg.stderr.on('data', (data) => {
            const output = data.toString();
            const timeMatch = output.match(/time=([\d:.]+)/);
            if (timeMatch) {
                // Prepend name to log so we know which worker is talking
                process.stdout.write(`\r[${name}] Progress: ${timeMatch[1]}`);
            }
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`\n[SUCCESS] Completed: ${name}`);
                resolve();
            } else {
                console.error(`\n[ERROR] FFmpeg failed for ${name} (Code: ${code})`);
                reject(new Error(`Exit code ${code}`));
            }
        });
    });
}

/**
 * Queue Manager to handle concurrency
 */
async function processQueue(list, limit) {
    const queue = [...list];
    const workers = [];

    const worker = async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            try {
                await downloadFile(item);
            } catch (err) {
                console.error(`Task failed: ${item.name}`);
            }
        }
    };

    // Fire off the initial batch of workers
    for (let i = 0; i < Math.min(limit, list.length); i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
    console.log("\n--- ALL DOWNLOADS COMPLETE ---");
}

// Start the process
processQueue(downloadList, CONCURRENCY_LIMIT);