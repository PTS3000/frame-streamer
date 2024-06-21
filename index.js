const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--swiftshader'],
    headless: 'new'
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('error', error => console.log('ERROR:', error));

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

app.get('/api/latest-screenshot', (req, res) => {
  if (latestScreenshotBuffer) {
    res.set('Content-Type', 'image/png');
    res.send(latestScreenshotBuffer);
  } else {
    res.status(404).send('No screenshot available');
  }
});

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
