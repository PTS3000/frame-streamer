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
  }, 2000); // 1-second interval
};

app.get("/api/get-tx-data", (req, res) => {
    console.log('Transaction data endpoint was queried');
    const txData = {
        chainId: "eip155:10",
        method: "eth_sendTransaction",
        params: {
          abi: [],
          to: "0x00000000fcCe7f938e7aE6D3c335bD6a1a7c593D",
          data: "0x783a112b0000000000000000000000000000000000000000000000000000000000000e250000000000000000000000000000000000000000000000000000000000000001",
          value: "984316556204476",
        },
    };

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.removeHeader('Last-Modified'); // Ensure no Last-Modified header is present
    res.removeHeader('ETag'); // Ensure no ETag header is present
    res.json(txData);
});

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

const handlePostRequest = (req, res) => {
  console.log("Handleendpointqueried")
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
            <meta property="og:image" content="https://frame-77.localcan.dev/api/mjpeg-stream" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="https://frame-77.localcan.dev/api/mjpeg-stream" />
            <meta property="fc:frame:button:1" content="Storm" />
            <meta property="fc:frame:button:1:action" content="tx" />
            <meta property="fc:frame:button:1:target" content="https://frame-77.localcan.dev/api/get-tx-data" />
            <meta property="fc:frame:button:1:post_url" content="https://frame-77.localcan.dev/api/next-frame"} />
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
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.send(latestScreenshotBuffer);
  } else {
    res.status(404).send('No screenshot available');
  }
};

app.post('/api/next-frame', handlePostRequest);
app.get('/api/next-frame', handlePostRequest);
app.get('/api/single-screenshot', sendLatestScreenshot);


app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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

  const intervalId = setInterval(sendImage, 500);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

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
}, 500);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});