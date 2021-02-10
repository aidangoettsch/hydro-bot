import GuildState from "../guild/GuildState";
import { Readable} from "stream";
import debugBase from "debug";
import playwright, {Browser, Page} from "playwright";
import {saveVideo, streamVideo} from "playwright-video"

const debugBrowser = debugBase('hydro-bot:browser')

export default class PuppeteerCapture {
  private browser: Browser | null = null
  private page: Page | null = null
  private stream: Readable = new Readable()
  private webUiPath = `file://${require.resolve("web-ui/build/index.html")}`
  constructor(private guildState: GuildState) {}

  async getStream(): Promise<Readable> {
    debugBrowser(`getStream`)

    if (!this.browser) {
      this.browser = await playwright.chromium.launch({
        // headless: false
      })

      await this.page?.close()
      this.page = null
    }

    if (!this.page) {
      this.page = await this.browser.newPage({
        viewport: {
          width: 1920,
          height: 1080,
        }
      })
      debugBrowser(`opening browser with path ${this.webUiPath}`)

      await this.page.goto(this.webUiPath)
      this.stream = await streamVideo(this.page, {
        followPopups: false,
        fps: 30
      })
    }

    return this.stream
  }

  destroy() {
    this.page?.close()
    this.browser?.close()
    this.page = null
    this.browser = null
    this.stream.destroy()
  }
}
