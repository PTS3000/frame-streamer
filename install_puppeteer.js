const puppeteer = require('puppeteer');

(async () => {
  const browserFetcher = puppeteer.createBrowserFetcher();
  const revisionInfo = await browserFetcher.download('1095492');
  console.log(`Chromium downloaded and installed to ${revisionInfo.folderPath}`);
})();
