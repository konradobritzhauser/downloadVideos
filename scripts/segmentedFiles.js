//Status: it works with a single file

const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require("ffmpeg-static");

//obtain m3u8 url and headers to do this

// --- CONFIGURATION ---
const M3U8_URL = "https://s13.vimeos.net/hls2/02/00009/e663e8i0orde_h/index-v1-a1.m3u8?t=bFXJORASAt_L8bMG1ye9J2Nl9IchnS594IzJRgJWeWc&s=1785021305&e=43200&v=302711992&i=0.3&sp=0&fr=e663e8i0orde&r=e";
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
const OUTPUT_NAME = 'The Great Gatsby (2013).mp4';

async function downloadSegmentedStream() {
    try {
        // // 1. Load and parse headers
        // if (!fs.existsSync(HEADERS_FILE)) {
        //     throw new Error("headers.json not found!");
        // }
        // const headersObj = JSON.parse(fs.readFileSync(HEADERS_FILE, 'utf8'));

        // 2. Format headers for FFmpeg
        // FFmpeg expects headers as a single string separated by \r\n
        const headerString = Object.entries(headersObj)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\r\n') + '\r\n';

        console.log("Starting FFmpeg sewing process...");

        // 3. Spawn FFmpeg process
        // -headers: injects our cookies/referer
        // -i: the input m3u8
        // -c copy: "sews" chunks together without re-encoding (instant & high quality)
        const ffmpeg = spawn(ffmpegPath, [
            '-headers', headerString,
            '-i', M3U8_URL,
            '-c', 'copy',
            '-y', // Overwrite output file if exists
            OUTPUT_NAME
        ]);

        // 4. Capture FFmpeg output to show progress
        ffmpeg.stderr.on('data', (data) => {
            const output = data.toString();
            // FFmpeg sends progress to stderr, let's look for "time="
            if (output.includes('time=')) {
                const timeMatch = output.match(/time=([\d:.]+)/);
                if (timeMatch) {
                    process.stdout.write(`\rProcessed video length: ${timeMatch[1]}`);
                }
            }
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`\n\nSuccess! Video saved as: ${OUTPUT_NAME}`);
            } else {
                console.error(`\n\nFFmpeg failed with code ${code}. Check your URL or Headers.`);
            }
        });

    } catch (err) {
        console.error("Error:", err.message);
    }
}

downloadSegmentedStream();