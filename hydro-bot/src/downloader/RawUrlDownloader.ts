import {DownloaderResult} from "./Downloader";
import path from "path";
import DownloadModule from "./DownloadModule";

const EXTENSION_WHITELIST = ["m3u8", "mp4", "webm"]

export default class RawUrlDownloader extends DownloadModule {
  async getVideo(url: string): Promise<DownloaderResult | false> {
    try {
      const urlInfo = new URL(url)
      const urlPath = path.parse(urlInfo.pathname)
      if (EXTENSION_WHITELIST.includes(urlPath.ext))
        return {
          type: "media",
          title: urlPath.name,
          description: "Raw Video File",
          author: "",
          thumbnailURL: "",
          videoURL: url,
          duration: "unknown",
          streamURLs: {
            both: url
          }
        }
      else return false
    } catch (e) {
      return false
    }
  }
}
