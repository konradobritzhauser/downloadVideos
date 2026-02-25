//Status: it works with a single file


const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

// 1. YOUR SPECIFIC DATA
const url = "https://storage.googleapis.com/mediastorage/1771981631651/f1yu1l774wg/342548191.mp4"
const headers = {
   "range": "bytes=13402112-",
    "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Google Chrome\";v=\"145\", \"Chromium\";v=\"145\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "Referer": "https://player-cdn.com/"
  }

async function downloadVideo() {
    console.log("Connecting to Zoom servers...");
    
    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`Download failed! Status Code: ${response.status}`);
        }

        const totalSize = parseInt(response.headers.get('content-length'), 10);
        const destination = fs.createWriteStream("zoom_recording_voice.mp4");
        
        // This is where the stream logic lives
        const reader = response.body.getReader();
        let downloadedSize = 0;

        // Process the stream
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            downloadedSize += value.length;
            destination.write(value);

            // Update progress in console
            const percentage = ((downloadedSize / totalSize) * 100).toFixed(2);
            process.stdout.write(`\rDownloading: ${percentage}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
        }

        destination.end();
        
        // Wait for the file to actually finish writing to disk
        await finished(destination);
        console.log("\nDownload Complete: zoom_recording_voice.mp4");

    } catch (err) {
        console.error("\nError: ", err.message);
    }
}

downloadVideo();