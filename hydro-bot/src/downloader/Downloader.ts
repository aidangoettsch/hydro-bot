import {VideoConfig} from "../bot";
import YtdlDownloader from "./YtdlDownloader";
import RawUrlDownloader from "./RawUrlDownloader";
import DownloadModule from "./DownloadModule";

export interface MediaResult {
  type: "media";
  title: string;
  description: string;
  author: string;
  thumbnailURL: string;
  duration: number | "live" | "unknown";
  videoURL: string;
  streamURLs: {
    both: string;
  } | {
    video: string;
    audio: string;
  };
}

export interface SearchResult {
  type: "search";
  results: MediaResult[];
}

export interface PlaylistResult {
  type: "playlist";
  title: "string";
  contents: MediaResult[];
}

export type DownloaderResult = MediaResult | SearchResult | PlaylistResult

export default class Downloader {
  private readonly downloaders: DownloadModule[]

  constructor(private videoConfig: VideoConfig) {
    this.downloaders = [
      YtdlDownloader,
      RawUrlDownloader,
    ].map(d => new d(videoConfig))
  }

  async getVideo(url: string): Promise<DownloaderResult | false> {
    for (const downloader of this.downloaders) {
      const res = await downloader.getVideo(url)
      if (res) return res
    }
    return false
  }
}
