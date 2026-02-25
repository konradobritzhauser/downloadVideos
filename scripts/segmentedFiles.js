//Status: it works with a single file

const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require("ffmpeg-static");

//obtain m3u8 url and headers to do this

// --- CONFIGURATION ---
const M3U8_URL = "https://cdn-992jsdmdmsldvz5t.edgeon-bandwidth.com/engine/hls2/01/09927/m6ldsc0xnykf_,n,.urlset/index-v1-a1.m3u8?t=_FOCZchARJgU1FdCiqhy8YuinrsxZw8txpml2NVuU4s&s=1771982531&e=14400&f=49635356&node=W0ccubUK3UhzYApjfynV/zE/oC0jZ2F0YlJ3fOIjreo=&i=184.144&sp=2500&asn=577&q=n&rq=LI9qaysGXw7SB1cWt2BjOwih5o5cKzqOazPhEbGW";
const headersObj = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9,fr-CA;q=0.8,fr;q=0.7,es;q=0.6,la;q=0.5',
    'priority': 'u=1, i',
    'referer': 'https://audinifer.com/e/bvby04hvbxjn',
    'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-storage-access': 'active',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'cookie': '_ym_uid=1771977766548088472; _ym_d=1771977766; _ym_isad=1; _ym_visorc=b'
};
const OUTPUT_NAME = 'Death Note (2006) - S01E34.mp4';

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