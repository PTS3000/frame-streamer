const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

let latestScreenshotBuffer = null;

const capture = async (page) => {
  try {
    latestScreenshotBuffer = await page.screenshot({ encoding: 'binary' });
  } catch (error) {
    console.error('Screenshot capture failed:', error);
  }

  setTimeout(async () => {
    await capture(page);
  }, 50); // Adjust interval for performance
};

const main = async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless'],
  });
  console.log('Started browser proccess...');
  process.on('exit', () => {
    browser.close();
  });

  const page = await browser.newPage();
  
  console.log('Loading page...');
  await page.goto('https://game.manada.dev/?cinematic');
  
  console.log('Waiting to load...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log('Capturing screenshots...');
  await capture(page);
};

main().catch(error => {
  console.error('Error in main:', error);
  process.exit(1);
});

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

  const intervalId = setInterval(sendImage, 50);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
