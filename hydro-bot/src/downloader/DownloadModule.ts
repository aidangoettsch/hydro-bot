import {VideoConfig} from "../bot";
import {DownloaderResult} from "./Downloader";

export default abstract class DownloadModule {
  constructor(protected videoConfig: VideoConfig) {}

  abstract getVideo(url: string): Promise<DownloaderResult | false>
}
