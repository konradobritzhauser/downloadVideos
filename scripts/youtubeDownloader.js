//status: it works with a single file

const ytDl = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');

// --- CONFIGURATION ---
const VIDEO_URL = 'https://www.youtube.com/watch?v=XRh6Z6Ih6Wg';
const QUALITY = '2160'; // Options: '1080', '720', '480', or 'best'
const FILENAME = 'my_youtube_video4k.mp4';

async function downloadYoutube() {
    console.log(`Checking for video and preparing download at ${QUALITY}p...`);

    try {
        await ytDl(VIDEO_URL, {
            // 1. Quality Logic: Find best video up to chosen height, and best audio
            format: `bestvideo[height<=${QUALITY}]+bestaudio/best[height<=${QUALITY}]`,
            
            // 2. Use the local FFmpeg we installed for merging
            ffmpegLocation: ffmpegPath,
            
            // 3. Output file name
            output: FILENAME,
            
            // 4. Progress tracking
            newline: true,
        });

        console.log(`\nSuccess! Video saved as ${FILENAME}`);
    } catch (error) {
        console.error('Download failed:', error.message);
    }
}

downloadYoutube();