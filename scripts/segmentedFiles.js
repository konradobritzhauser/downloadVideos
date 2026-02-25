const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require("ffmpeg-static");

//obtain m3u8 url and headers to do this

// --- CONFIGURATION ---
const M3U8_URL = "https://okqtss1gbbnca8e.harbortraildesignstudio.cyou/jxnu44rmvdct/hls3/01/02327/it743bpdj1je_,n,h,.urlset/index-f2-v1-a1.txt";
const headersObj = {
   'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'Referer': 'https://yuguaab.com/', // This MUST match the site you're watching on
    'Origin': 'https://yuguaab.com',
    'Accept': '*/*'
  };
const OUTPUT_NAME = 'Death Note (2006) - S01E22-2.mp4';

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