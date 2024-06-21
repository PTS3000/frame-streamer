const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Path to the fixed image
const fixedImagePath = path.join(__dirname, 'image.png');

// Function to capture screenshots (remains unchanged)
const capture = async (page) => {
  const newScreenshotPath = path.join(__dirname, 'latest-screenshot.png');
  
  // Capture the new screenshot
  await page.screenshot({ path: newScreenshotPath, fullPage: false, omitBackground: true });

  setTimeout(async () => {
    await capture(page);
  }, 1000); // Reduced interval for faster updates
};

// Main function to start the browser and begin capturing screenshots
const main = async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-dev-tools',
      '--disable-software-rasterizer'
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
  res.sendFile(fixedImagePath, (err) => {
    if (err) {
      console.error('Failed to send image:', err);
      res.status(500).send('Failed to send image');
    }
  });
});

app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
  });

  const sendImage = () => {
    fs.readFile(fixedImagePath, (err, data) => {
      if (err) {
        console.error('Failed to read image:', err);
        return;
      }

      res.write(`--frame\r\nContent-Type: image/png\r\nContent-Length: ${data.length}\r\n\r\n`);
      res.write(data);
      res.write('\r\n');
    });
  };

  const intervalId = setInterval(sendImage, 1000); // Reduced interval for faster updates

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
