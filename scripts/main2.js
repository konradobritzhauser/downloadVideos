const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

// 1. YOUR SPECIFIC DATA
const url = "https://ssrweb.zoom.us/file?cid=aw1&data=af923f1e9a30a091bd1b94831612630d5681be3bc382f652712a0ffae71cfa82&fid=39ofghnwzY4iDLW0lPi5dn7WordsEJyhDBvjvtNOHoqgELSunfr6h1NeDqHtriWHnY_SEuzBBmMwqiQ.VY7UzI-7MNE_mnYf&mode=play&path=s3%3A%2F%2Fzoom-cmr-01%2Freplay02%2F2026%2F02%2F10%2FDB98F0BB-D950-450F-9E42-D4A1FFB4D053%2FGMT20260210-200248_Recording_avo_1280x720.mp4kms&response-cache-control=max-age%3D0%2Cs-maxage%3D86400&s001=yes&s002=OkW4vOSI5wPJgWJXc-ihcAtGS-cFMoThsEUgV8w1ZAY-qWjYMtdltY0EBaC0JgpeJYGF3Exk8o1GHhw6tNIJncGXScrF.Qk_SWhtR1tSkc_Kd&jwt=eyJ0eXAiOiJKV1QiLCJrIjoiL2xUY3E4SlMiLCJ6bV9za20iOiJ6bV9vMm0iLCJhbGciOiJFUzI1NiJ9.eyJhdWQiOiJmaWxlIiwiZGlnIjoiNjUzMzFiYTVmOGI3YWJjZGZiYzVjNzYwMzg0MGE1NDQ3ZjkzOGJhNjFiMmQyNmE5MWM1Y2JkNTE1NTZjMDk0YSIsImlzcyI6IndlYiIsImhkaWciOiJlM2IwYzQ0Mjk4ZmMxYzE0OWFmYmY0Yzg5OTZmYjkyNDI3YWU0MWU0NjQ5YjkzNGNhNDk1OTkxYjc4NTJiODU1IiwiZXhwIjoxNzcwNzY3Njg0LCJpYXQiOjE3NzA3NjA2NzB9.qJp9cTaH44hNqtvPkFPhlH_NqMcgAz6LakBTpkIHO_TISZQzsFvjWDXhXWCgGZEit_AcmzF6YdDO4_UlDw_PpQ&Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6Imh0dHBzOi8vc3Nyd2ViLnpvb20udXMvZmlsZT9jaWQ9YXcxJmRhdGE9YWY5MjNmMWU5YTMwYTA5MWJkMWI5NDgzMTYxMjYzMGQ1NjgxYmUzYmMzODJmNjUyNzEyYTBmZmFlNzFjZmE4MiZmaWQ9MzlvZmdobnd6WTRpRExXMGxQaTVkbjdXb3Jkc0VKeWhEQnZqdnROT0hvcWdFTFN1bmZyNmgxTmVEcUh0cmlXSG5ZX1NFdXpCQm1Nd3FpUS5WWTdVekktN01ORV9tbllmJm1vZGU9cGxheSZwYXRoPXMzJTNBJTJGJTJGem9vbS1jbXItMDElMkZyZXBsYXkwMiUyRjIwMjYlMkYwMiUyRjEwJTJGREI5OEYwQkItRDk1MC00NTBGLTlFNDItRDRBMUZGQjREMDUzJTJGR01UMjAyNjAyMTAtMjAwMjQ4X1JlY29yZGluZ19hdm9fMTI4MHg3MjAubXA0a21zJnJlc3BvbnNlLWNhY2hlLWNvbnRyb2w9bWF4LWFnZSUzRDAlMkNzLW1heGFnZSUzRDg2NDAwJnMwMDE9eWVzJnMwMDI9T2tXNHZPU0k1d1BKZ1dKWGMtaWhjQXRHUy1jRk1vVGhzRVVnVjh3MVpBWS1xV2pZTXRkbHRZMEVCYUMwSmdwZUpZR0YzRXhrOG8xR0hodzZ0TklKbmNHWFNjckYuUWtfU1dodFIxdFNrY19LZCZqd3Q9ZXlKMGVYQWlPaUpLVjFRaUxDSnJJam9pTDJ4VVkzRTRTbE1pTENKNmJWOXphMjBpT2lKNmJWOXZNbTBpTENKaGJHY2lPaUpGVXpJMU5pSjkuZXlKaGRXUWlPaUptYVd4bElpd2laR2xuSWpvaU5qVXpNekZpWVRWbU9HSTNZV0pqWkdaaVl6VmpOell3TXpnME1HRTFORFEzWmprek9HSmhOakZpTW1ReU5tRTVNV00xWTJKa05URTFOVFpqTURrMFlTSXNJbWx6Y3lJNkluZGxZaUlzSW1oa2FXY2lPaUpsTTJJd1l6UTBNams0Wm1NeFl6RTBPV0ZtWW1ZMFl6ZzVPVFptWWpreU5ESTNZV1UwTVdVME5qUTVZamt6TkdOaE5EazFPVGt4WWpjNE5USmlPRFUxSWl3aVpYaHdJam94Tnpjd056WTNOamcwTENKcFlYUWlPakUzTnpBM05qQTJOekI5LnFKcDljVGFINDRoTnF0dlBrRlBobEhfTnFNY2dBejZMYWtCVHBrSUhPX1RJU1pRenNGdmpXRFhoWFdDZ0daRWl0X0FjbXpGNllkRE80X1VsRHdfUHBRIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzcwNzY3Njg0fX19XX0_&Signature=Kw87vv3zTG0SVPG-RhS1aeKWOHIm4cDlWh05IEQGcl9-uPfE2JDUG~gw4Ym0mOEhArZqxYWAiqsN7LknyclpUJjtq2KGPUlHpIAl-MbOKh0Doi6mdnqMKlyeuHwSP31TYFji4OeIDmWKu6qTv3dt289CdBeS2ABWzhru-qaM8DkqOZAiXFRTER2C8FmnLeMauHjxIzGdIcZBZMcDVKyRBkEZXPXYclQs159l-c513Wb54uAM2Qipdu8Pmo0x-MEBil8GsciuxDfXcxA7jLQO1ls8fPIEkpby57Aej5H9C8brAU0szckAtAHAYRxB3ZKRbbuzEEIglpTyIX~sC8id1g__&Key-Pair-Id=K1YYCGW8V4AHXW"
const headers = {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9,fr-CA;q=0.8,fr;q=0.7,es;q=0.6,la;q=0.5',
    'Connection': 'keep-alive',
    'If-Range': '"cc2839c09b2969ae634b79a9ab5fb6ec-8"',
    'Range': 'bytes=342556672-396625366',
    'Referer': 'https://zoom.us/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'Cookie': '_zm_mtk_guid=b0fd20f1ed3f4476b724b75827ac774a; _zm_csp_script_nonce=f4321GZhTGCbb0-qfanSxQ; _zm_currency=CAD; _zm_visitor_guid=51722da102d843fea46328da49596a62; OnetrustActiveGroups=C0001C0002C0003C0004; OptanonAlertBoxClosed=2026-02-10T20:00:32.712Z; _zm_wc_user=1; _zm_lang=en-US; _zm_cdn_blocked=unlog_unblk; __utmzz=campaign=(not set); __utmzzses=campaign=(not set); _zm_join_utid=UTID_8539333bfa05403690420e3ff05e3794; _zm_fingerprint=b9f422df347437847dc363cc3ce34257; _zm_cid2=1%3BMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE%2BP9TfntMX6uT1P3rAk4XlzqZ%2BLbTqOQnAJGjk7FZOaULsBPH7uJsezRcEQte7jaiQfb1fXVEPFPZCsTV%2BqO%2BBw%3D%3D%3Bd051dnZsTjI2cHB4%3BMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEkQv7kZwQbHsIs7aIswcZftMTW5w3wkEAXXPlE8yZt62krjDPsCDMi12yei41%2Bd8VwrdEP5VrnypQh%2Fw5mfZs6w%3D%3D%3BZUqXkY8BGSXN6Qg6fJuMofvepLY8jqmVPGiw2zBGIboUxPraKTDkkzT0DIaCXX3vNu13RcBeCWKrzJTIeUOjcCcxfwsmN4jPPPuX%2FZVjg4i3czms1wauZdJuCKYuXu2DwgRwFqRtl2w%3D; _zm_wc_remembered_name=Konrad; wULrMv6t=A30MgEmcAQAAMxUYJhZqSQMN9fuoutvE9RXuJvF0fFDguSeHF5Y36U490T8GAbiQ1-WuctCMwH9eCOfvosJeCA|1|0|3271c2f495c3d5ea3cc2e142caaf1a75f3cd354f; _zm_tracking_guid=614ad4f40edc46cf839ec2034a1bc533; IR_gbd=zoom.us; IR_PI=2e47da29-06c9-11f1-9d57-01d1c11c1c98%7C1770846055922; _ga=GA1.1.1777308622.1770759656; _yjsu_yjad=1770759656.45655abe-79bd-46b6-a5d5-d056608e4c0b; zm_oauth_cluster=us05; __Secure-Fgp=8724AAE3B0087B5C118A980DB4782742E474B87F308538C578591E6D1654F74A; _zm_everlogin_type=2; _zm_bu=https%3A%2F%2Fzoom.us%2Frec%2Fshare%2FKHIwR2Jb4Aa4fbZEeLQPULTYQRzqbASm6dc6oddxFCpFCHWj_q2Vn3n4CdGz0tbI.LJTAkaC3PKs4W_V1%3Fiet%3D7PcfNivSGYwr0SVATzKkQgCaYBt8xmgrcmUpuhDLCG0.AG.O_he9_QZ1YhRBpxhhEUrzXP6BY0fcUkJfzLpaEVTTzFcc409vmLxCdJdp5zDe4_CjtNorS2U62N75OvGzELDF56J8Y0-WBNfszHKjrnAYsOL4qZqqcno5BY2PDYBtUw.oyhlWemoAe2aGM98gNMMpg.-LaBR30lk4eWM6RO%26pwd%3DDLlAy-OTyUtDqqQDrQAAIAAAAONbQnqgdujgr0_owKwmwJOovmAlK_1W3jdqiq0xOBdKV8UrcXXnScRf1iDnSXdLETAwMDAwNA; _zm_page_auth=aw1_c_gsfbzXmiTBqBogf4RmgRww; _cs_c=0; _gcl_au=1.1.1414685132.1770759656.1862460817.1770759658.1770759727; _zm_ssid=aw1_c_cxyuJgBcRcyDok_TXEJscQ; zm_cluster=aw1; zm_aid=18J0budoSyq5pLUg-4B6bQ; zm_haid=181; zm_web_domain=zoom.us; _zm_multi_ac=~USER_CRYPTO~DLDNkD6Bs8MLXoxWPAAADQEAANcaIOuVxlwbqvjOH2QGKtQdkqjVOf2_TQyctO6r5NPa0wKsVdkk7YE4wf5dQxESxg1goZAQsG0mSDyaGC9wfR6CB79wh9yHaHiySvfqLGHcQ67BQrm3flE_YjY6YIBaSDbgxlBm581IFc9VCqxZ-T9B7b40Wzi3mk4NhHUCXxahJVMfQDLriINE_GXEIqTVdrYxFwfl4BYx-lTo_O_VxB8rqlB0K2bgSNJlFlmy-nwYMrd1K7xxaSAyPZ2v-K0Iz4RuFFrPCRgnfeesd-eY0VnEUVsxssMrmXzyUN1e4OaQMxc0bHOB9HPwDeyRWXlpPd-fBnRP0zTfM2IrvHMonM1r04Aj5S9unTzx0zuRKowcxbyFMdx9qtAAjIV7QjAwMDAwMQ; zm_huid=ae16ecf814328fb62ae948aa1d5e8be3; _zm_cms_guid=DJ25vO7mRNJ8YBrNTQAAFgAAANOOv2mf6LTEtkCb7-IpaHbiM80b7OKh3hyQMtaEbiMXbkKxfc3qMDAwMDAx; _zm_date_format=mm/dd/yy; _zm_date_format_standard=MM/DD/YYYY; _zm_12-hour=1; _zm_start_day_of_week=7; _zm_billing_visitor_guid=f141ab7af7e944b497f68d69c573e54a; optimizelySession=1770759740045; IR_17910=1770759740135%7C0%7C1770759740135%7C%7C; __cf_bm=45RiTWr4LYgIyXV5e2.GaBOBQ6CLKn2Q8vlzAgv7qi0-1770759740-1.0.1.1-NfJl5hBvT_qGmtlIPwvneX_1CUN4b9m1CpiCQdo2X46mjbx2IcO5.6k6BM9azVWtv7bZFLOPpjDzky40uvkwUlMIGrZymYusWlRiPGqtBhg; _cs_cvars=%7B%7D; _cs_id=7fdb62f9-e37b-ad43-9e11-0198b40c4834.1770759694.1.1770759740.1770759694.1762274953.1804923694068.1.x; _zm_ga_trackid=d17625fb94cd68983ef0846ba6aca6b11418f32103a64c333f6638758502c1b8; _rdt_uuid=1770759655955.46e0af87-e4f9-4280-ae21-db0a19772bf8; _uetsid=2e53cb2006c911f185eb19b9c3e93349; _uetvid=2e53ec4006c911f1ab1e1184909bc4cb; AMP_0753e77572=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjI1Y2MyOGViYS01YmVmLTQ1MzAtOTkzMi1hZjkzYmFhM2Q4NWIlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJLbTlVJTJCQjlUZW81YlZqb2R5MjgzYWM2S2VLUVBxdEtOaUM2YUxNeG5Udm8lM0QlMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNzcwNzU5NjU2NjIwJTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTc3MDc1OTc0MzMzNyUyQyUyMmxhc3RFdmVudElkJTIyJTNBNDMlMkMlMjJwYWdlQ291bnRlciUyMiUzQTklMkMlMjJjb29raWVEb21haW4lMjIlM0ElMjIuem9vbS51cyUyMiU3RA==; OptanonConsent=isGpcEnabled=0&datestamp=Tue+Feb+10+2026+16%3A57%3A50+GMT-0500+(Eastern+Standard+Time)&version=6.21.0&isIABGlobal=false&hosts=&consentId=d8d4e5cb-6e81-43ad-819c-261bd2c97682&interactionCount=2&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1&geolocation=CA%3BQC&AwaitingReconsent=false; _cs_s=2.0.U.9.1770762487468; _ga_L8TBF28DDX=GS2.1.s1770759656$o1$g1$t1770760689$j60$l0$h0'
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