const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 8080;

let latestScreenshotBuffer = null;

const capture = async (page) => {
  const buffer = await page.screenshot({ encoding: 'binary' });
  latestScreenshotBuffer = buffer;

  setTimeout(async () => {
    await capture(page);
  }, 1000); // 1-second interval
};

const main = async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  const page = await browser.newPage();

  console.log('Setting viewport...');
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Loading page...');
  await page.goto('https://game.manada.dev/?cinematic');

  console.log('Waiting to load...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log('Capturing screenshots...');
  await capture(page);
};

main();

const sendScreenshotFrame = (req, res) => {
  if (latestScreenshotBuffer) {
    res.set('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Latest frame</title>
            <meta
            property="og:image"
            content="https://frame-manada-trial-20.localcan.dev/api/single-screenshot"
            />
            <meta property="fc:frame" content="vNext" />
            <meta
            property="fc:frame:image"
            content="https://frame-manada-trial-20.localcan.dev/api/single-screenshot"
            />
            <meta property="fc:frame:button:1" content="Start" />
            <meta
            property="fc:frame:post_url"
            content="https://frame-manada-trial-20.localcan.dev/api/next-frame"
            />
        </head>
        <body>
            <h1>Basic Frame</h1>
        </body>
        </html>
    `);
  } else {
    res.status(404).send('No screenshot available');
  }
};

const sendLatestScreenshot = (req, res) => {
  if (latestScreenshotBuffer) {
    res.set('Content-Type', 'image/png');
    res.send(latestScreenshotBuffer);
  } else {
    res.status(404).send('No screenshot available');
  }
};

app.get('/api/next-frame', sendScreenshotFrame);
app.get('/api/single-screenshot', sendLatestScreenshot);

app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
  });

  const sendImage = () => {
    if (latestScreenshotBuffer) {
      res.write(`--frame\r\nContent-Type: image/png\r\nContent-Length: ${latestScreenshotBuffer.length}\r\n\r\n`);
      res.write(latestScreenshotBuffer);
      res.write('\r\n');
    }
  };

  const intervalId = setInterval(sendImage, 1000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
