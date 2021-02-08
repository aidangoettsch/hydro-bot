import GuildState from "../guild/GuildState";
import {PassThrough, Readable, ReadableOptions} from "stream";
import {Browser, Page} from "puppeteer/lib/cjs/puppeteer/api-docs-entry";
import puppeteer from "puppeteer";
import path from "path";
import debugBase from "debug";

const debugBrowser = debugBase('hydro-bot:browser')

const EXTENSION_ID = "jjndjgheafjngoipoacpjgeicjeomjli"

export default class PuppeteerCapture {
  private browser: Browser | null = null
  private page: Page | null = null
  private stream: PassThrough = new PassThrough()
  private extensionPath: string
  constructor(private guildState: GuildState) {
    const extensionPackageJson = require.resolve("puppeteer-stream-extension/package.json")
    this.extensionPath = path.dirname(extensionPackageJson)
  }

  async getStream(): Promise<Readable> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        headless: false,
        args: [
          "--load-extension=" + this.extensionPath,
          "--disable-extensions-except=" + this.extensionPath,
          "--whitelisted-extension-id=" + EXTENSION_ID,
        ]
      })

      const targets = this.browser.targets();
      const extensionTarget = targets.find(
          // @ts-ignore
          (target) => target.type() === "background_page" && target._targetInfo.title === "Video Capture"
      );
      // @ts-ignore
      this.browser.videoCaptureExtension = await extensionTarget.page();

      // @ts-ignore
      await this.browser.videoCaptureExtension.exposeFunction("sendData", (opts: any) => {
        const data = Buffer.from(opts.data, "base64");
        // @ts-ignore
        this.stream.write(data);
      });
      await this.page?.close()
      this.page = null
    }
    if (!this.page) {
      this.page = await this.browser.newPage()
      await this.page.goto("https://google.com")
      // @ts-ignore
      await (<Page>this.browser.videoCaptureExtension).evaluate(
          (settings) => {
            // @ts-ignore
            START_RECORDING(settings);
          },
          // @ts-ignore
          {
            video: true,
            audio: true,
            frameSize: 20,
            mimeType: "video/webm;codecs=h264,opus"
          }
      );
    }
    return this.stream
  }
}
