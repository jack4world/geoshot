import puppeteer, { type Browser, type Page } from "puppeteer";

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--hide-scrollbars",
        // Enable WebGL for MapLibre GL
        "--enable-webgl",
        "--enable-webgl2",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
  }
  return browserInstance;
}

export async function createPage(
  width: number,
  height: number,
  dpi: number
): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setViewport({
    width,
    height,
    deviceScaleFactor: dpi,
  });

  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance && browserInstance.connected) {
    await browserInstance.close();
    browserInstance = null;
  }
}
