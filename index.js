const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

const baseUrl = "https://cloudlines-stream-trial-05.localcan.dev";
let latestScreenshotBuffer = null;
const waitDelay = 1000;
const screenshotInterval = 500;

const capture = async (page) => {
  const buffer = await page.screenshot({ encoding: "binary" });
  latestScreenshotBuffer = buffer;

  setTimeout(async () => {
    await capture(page);
  }, screenshotInterval); // 1-second interval
};

const main = async () => {
  console.log("Starting browser...");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new",
  });
  const page = await browser.newPage();

  const vp = { width: 640, height: 360 };
  console.log(`Setting viewport to ${vp.width}x${vp.height}...`);
  await page.setViewport(vp);

  console.log("Loading page...");
  await page.goto("https://game.manada.dev/?cinematic&c_zoom=0.175");

  console.log("Waiting to load...");
  await new Promise((resolve) => setTimeout(resolve, waitDelay));

  console.log("Capturing screenshots...");
  await capture(page);
};

main();

const sendScreenshotFrame = (req, res) => {
  const timestamp = Date.now();
  if (latestScreenshotBuffer) {
    res.set("Content-Type", "text/html");
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    res.send(`
        <!DOCTYPE html>
      <html>
        <head>
          <title>Latest frame</title>
          <meta property="og:image" content="${baseUrl}/api/single-screenshot" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${baseUrl}/api/stream" />
          <meta property="fc:frame:button:1" content="Donate" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta
            property="fc:frame:button:1:target"
            content="${baseUrl}/api/next-frame"
          />
        </head>
        <body>
          <h1>Basic Frame</h1>
          <img src="${baseUrl}/api/stream" />
        </body>
      </html>
    `);
  } else {
    res.status(404).send("No screenshot available");
  }
};

const handlePostRequest = (req, res) => {
  const timestamp = Date.now();
  if (latestScreenshotBuffer) {
    res.set("Content-Type", "text/html");
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    res.send(`
      <html>
        <head>
          <title>Latest frame</title>
          <meta property="og:image" content="${baseUrl}/api/single-screenshot" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${baseUrl}/api/stream" />
          <meta property="fc:frame:button:1" content="Donate" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta
            property="fc:frame:button:1:target"
            content="${baseUrl}/api/next-frame"
          />
        </head>
        <body>
          <h1>Basic Frame</h1>
          <img src="${baseUrl}/api/stream" />
        </body>
      </html>
    `);
  } else {
    res.status(404).send("No screenshot available");
  }
};

const sendLatestScreenshot = (req, res) => {
  if (latestScreenshotBuffer) {
    res.set("Content-Type", "image/jpeg");
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    res.send(latestScreenshotBuffer);
  } else {
    res.status(404).send("No screenshot available");
  }
};

app.get("/api/next-frame", sendScreenshotFrame);
app.post("/api/next-frame", handlePostRequest);
app.get("/api/single-screenshot", sendLatestScreenshot);

const clients = [];

app.get("/", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="preload" as="image" href="${baseUrl}/api/stream" />
            <title>Cloudlines</title>
            <meta name="fc:frame" content="vNext" />
            <meta name="fc:frame:post_url" content="${baseUrl}/api/next-frame" />
            <meta name="fc:frame:image" content="${baseUrl}/api/stream" />
            <meta property="fc:frame:button:1" content="Donate" />
            <meta property="fc:frame:button:1:action" content="post" />
            <meta
              property="fc:frame:button:1:target"
              content="${baseUrl}/api/next-frame"
            />
            <meta property="og:title" content="Cloudlines" />
            <meta property="og:image" content="${baseUrl}/api/single-screenshot" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Cloudlines" />
            <meta name="twitter:image" content="${baseUrl}/api/single-screenshot" />
            <link
              rel="icon"
              href="/favicon.ico"
              type="image/x-icon"
              sizes="16x16"
            />
          </head>
          <body>
            <h1>Cloudlines</h1>
            <img src="/api/stream" />
          </body>
        </html>
    `);
  }
)

app.get("/api/stream", (req, res) => {
  var headers = {};
  var multipart = "--totalmjpeg";

  headers["Cache-Control"] = "private, no-cache, no-store, max-age=0";
  headers["Content-Type"] =
    'multipart/x-mixed-replace; boundary="' + multipart + '"';
  headers.Connection = "close";
  headers.Pragma = "no-cache";

  res.writeHead(200, headers);

  const client = {
    mjpegwrite: (buffer) => {
      res.write("--" + multipart + "\r\n", "ascii");
      res.write("Content-Type: image/jpeg\r\n");
      res.write("Content-Length: " + buffer.length + "\r\n");
      res.write("\r\n", "ascii");
      res.write(buffer, "binary");
      res.write("\r\n", "ascii");
    },
    mjpegend: () => {
      res.end();
    },
  };

  const close = () => {
    const index = clients.indexOf(client);
    if (index !== -1) {
      clients[index] = null;
      clients.splice(index, 1);
    }
  };

  res.on("finish", close);
  res.on("close", close);
  res.on("error", close);

  clients.push(client);
});

const mjpegsend = (buffer) => {
  clients.forEach((client) => client.mjpegwrite(buffer));
};

setInterval(() => {
  if (latestScreenshotBuffer) {
    mjpegsend(latestScreenshotBuffer);
  }
}, screenshotInterval);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
