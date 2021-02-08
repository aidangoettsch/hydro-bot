import { pathExists } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium, ChromiumBrowser } from 'playwright';
import { PageVideoCapture } from '../src/PageVideoCapture';

const buildSavePath = (): string => join(tmpdir(), `${Date.now()}.mp4`);

describe('PageVideoCapture', () => {
  let browser: ChromiumBrowser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('captures a video of the page', async () => {
    const page = await browser.newPage();
    const savePath = buildSavePath();

    const capture = await PageVideoCapture.start({ page, savePath });
    await page.setContent('<html>hello world</html>');
    await capture.stop();

    const videoPathExists = await pathExists(savePath);
    expect(videoPathExists).toBe(true);

    await page.close();
  });

  it('passes followPopups option to the collector', async () => {
    const page = await browser.newPage();
    const savePath = buildSavePath();
    const options = { followPopups: true };

    const capture = await PageVideoCapture.start({ page, savePath, options });

    expect(capture._collector._followPopups).toBe(true);

    await capture.stop();
    await page.close();
  });

  it('stops on page close', async () => {
    const page = await browser.newPage();

    const capture = await PageVideoCapture.start({
      page,
      savePath: buildSavePath(),
    });

    await page.close();
    expect(capture._stopped).toBe(true);
  });
});
