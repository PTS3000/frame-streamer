const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

let idx = 0;
let latestScreenshotPath = '';

const capture = async (page) => {
  idx++;
  const newScreenshotPath = path.join(__dirname, `screenshot${String(idx).padStart(4, '0')}.png`);
  
  // Capture the new screenshot
  await page.screenshot({ path: newScreenshotPath, fullPage: false, omitBackground: true });

  // Delete the old screenshot if it exists
  if (latestScreenshotPath) {
    fs.unlink(latestScreenshotPath, (err) => {
      if (err) console.error(`Failed to delete ${latestScreenshotPath}:`, err);
      else console.log(`Deleted ${latestScreenshotPath}`);
    });
  }

  // Update the latest screenshot path
  latestScreenshotPath = newScreenshotPath;

  setTimeout(async () => {
    await capture(page);
  }, 1000); // Reduced interval for faster updates
};

const main = async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
  });
  const page = await browser.newPage();
  
  console.log('Loading page...');
  await page.goto('https://game.manada.dev/?cinematic', { waitUntil: 'networkidle2' });
  
  console.log('Waiting to load...');
  await new Promise((resolve) => setTimeout(resolve, 5000)); // Reduced waiting time

  console.log('Capturing screenshots...');
  await capture(page);
};

main();

app.get('/api/latest-screenshot', (req, res) => {
  if (latestScreenshotPath) {
    res.sendFile(latestScreenshotPath);
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
    if (latestScreenshotPath) {
      fs.readFile(latestScreenshotPath, (err, data) => {
        if (err) {
          console.error('Failed to read image:', err);
          return;
        }

        res.write(`--frame\r\nContent-Type: image/png\r\nContent-Length: ${data.length}\r\n\r\n`);
        res.write(data);
        res.write('\r\n');
      });
    }
  };

  const intervalId = setInterval(sendImage, 1000); // Reduced interval for faster updates

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
