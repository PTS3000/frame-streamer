const puppeteer = require('puppeteer');

puppeteer
  .createBrowserFetcher()
  .download(puppeteer._preferredRevision)
  .then(() => console.log('Chromium downloaded and installed successfully'))
  .catch((error) => {
    console.error('Failed to download and install Chromium', error);
    process.exit(1);
  });