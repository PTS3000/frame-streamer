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
  const timestamp = Date.now();
  if (latestScreenshotBuffer) {
    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Latest frame</title>
            <meta property="og:image" content="https://frame-manada-trial-20.localcan.dev/api/mjpeg-stream" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="https://frame-manada-trial-20.localcan.dev/api/mjpeg-stream" />
            <meta property="fc:frame:button:1" content="Donate" />
            <meta property="fc:frame:button:1:action" content="post" />
            <meta property="fc:frame:button:1:target" content="https://frame-manada-trial-20.localcan.dev/api/next-frame" />
        </head>
        <body>
            <h1>Basic Frame</h1>
            <img src="https://frame-manada-trial-20.localcan.dev/api/mjpeg-stream" />
        </body>
        </html>
    `);
  } else {
    res.status(404).send('No screenshot available');
  }
};

const handlePostRequest = (req, res) => {
  const timestamp = Date.now();
  if (latestScreenshotBuffer) {
    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Latest frame</title>
            <meta property="og:image" content="https://frame-manada-trial-20.localcan.dev/api/mjpeg-stream" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="https://frame-manada-trial-20.localcan.dev/api/mjpeg-stream" />
            <meta property="fc:frame:button:1" content="Donate" />
            <meta property="fc:frame:button:1:action" content="post" />
            <meta property="fc:frame:button:1:target" content="https://frame-manada-trial-20.localcan.dev/api/next-frame" />
        </head>
        <body>
            <h1>Basic Frame</h1>
            <img src="https://frame-manada-trial-20.localcan.dev/api/mjpeg-stream" />
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
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.send(latestScreenshotBuffer);
  } else {
    res.status(404).send('No screenshot available');
  }
};

app.get('/api/next-frame', sendScreenshotFrame);
app.post('/api/next-frame', handlePostRequest);
app.get('/api/single-screenshot', sendLatestScreenshot);

const clients = [];

app.get('/api/mjpeg-stream', (req, res) => {
  const headers = {
    'Cache-Control': 'private, no-cache, no-store, max-age=0',
    'Content-Type': 'multipart/x-mixed-replace; boundary=mjpeg',
    'Connection': 'close',
    'Pragma': 'no-cache',
  };

  res.writeHead(200, headers);

  const client = {
    mjpegwrite: (buffer) => {
      res.write('--mjpeg\r\n', 'ascii');
      res.write('Content-Type: image/jpeg\r\n');
      res.write('Content-Length: ' + buffer.length + '\r\n');
      res.write('\r\n', 'ascii');
      res.write(buffer, 'binary');
      res.write('\r\n', 'ascii');
    },
    mjpegend: () => {
      res.end();
    },
  };

  const close = () => {
    const index = clients.indexOf(client);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  };

  res.on('finish', close);
  res.on('close', close);
  res.on('error', close);

  clients.push(client);
});

const mjpegsend = (buffer) => {
  clients.forEach((client) => client.mjpegwrite(buffer));
};

setInterval(() => {
  if (latestScreenshotBuffer) {
    mjpegsend(latestScreenshotBuffer);
  }
}, 1000);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
