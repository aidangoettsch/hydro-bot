import { pathExists } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium, ChromiumBrowser } from 'playwright';
import { saveVideo } from '../src/saveVideo';

jest.setTimeout(10 * 1000)

describe('saveVideo', () => {
  let browser: ChromiumBrowser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('captures a video of the page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const savePath = join(tmpdir(), `${Date.now()}.mp4`);

    const capture = await saveVideo(page, savePath);

    for (let i = 0; i < 10; i++) {
      await page.setContent(`<html>hello world ${i}</html>`);
      await new Promise((r) => setTimeout(r, 100));
    }

    await capture.stop();

    const videoPathExists = await pathExists(savePath);
    expect(videoPathExists).toBe(true);

    await page.close();
  });

  it('passes followPopups option to PageVideoCapture', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const savePath = join(tmpdir(), `${Date.now()}.mp4`);

    const capture = await saveVideo(page, savePath, { followPopups: true });

    expect(capture._collector._followPopups).toBe(true);

    await capture.stop();
    await page.close();
  });
});
