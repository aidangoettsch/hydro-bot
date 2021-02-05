import {DownloaderResult} from "./Downloader";
import ytdl, {videoFormat} from "ytdl-core"
import DownloadModule from "./DownloadModule";

export default class YtdlDownloader extends DownloadModule {
  selectFormat(formats: videoFormat[]) {
    const { resolutionMax, resolutionSoftMin } = this.videoConfig

    const livestream = formats.some(f => f.isLive)
    const highestRes = Math.max.apply(Math, formats.map(format => format.height || 0))
    const highestFrameRate = Math.max.apply(Math, formats.map(format => format.fps || 0))

    let chosenFormat: (videoFormat & {height: number, fake?: undefined}) | {height: number, fake: true} = {
      height: (highestRes >= resolutionSoftMin ? resolutionSoftMin : highestRes) - 1,
      fake: true
    }

    for (const format of formats) {
      if (!format.height && format.qualityLabel) format.height = parseInt(format.qualityLabel.slice(0, format.qualityLabel.indexOf("p")))
      if (
          format.audioBitrate &&
          format.height &&
          format.height > chosenFormat.height &&
          format.height <= resolutionMax &&
          !format.qualityLabel.includes("HDR") &&
          (format.fps === highestFrameRate || livestream) &&
          (livestream === format.isLive)
      ) {
        chosenFormat = format as videoFormat & {height: number}
      }
    }

    if (!chosenFormat.fake) return chosenFormat

    for (const format of formats) {
      if (
          format.height &&
          format.height > chosenFormat.height &&
          format.height <= resolutionMax &&
          !format.qualityLabel.includes("HDR") &&
          (format.fps === highestFrameRate || livestream) &&
          (livestream === format.isLive)
      ) {
        chosenFormat = format as videoFormat & {height: number}
      }
    }

    if (!chosenFormat.fake) return chosenFormat

    chosenFormat.height = -1
    for (const format of formats) {
      if (
          format.height &&
          format.height > chosenFormat.height &&
          format.height <= resolutionMax &&
          (livestream === format.isLive)
      ) {
        chosenFormat = format as videoFormat & {height: number}
      }
    }

    if (!chosenFormat.fake) return chosenFormat
    return false
  }

  async getVideo(url: string): Promise<DownloaderResult | false> {
    if (!ytdl.validateURL(url)) return false
    const info = await ytdl.getInfo(url)
    const format = this.selectFormat(info.formats)
    if (!format) throw new Error("Could not find a format for this video")

    return {
      type: "media",
      title: info.videoDetails.title,
      description: info.videoDetails.description || "",
      author: info.videoDetails.author.name,
      duration: info.videoDetails.isLiveContent ? "live" : parseInt(info.videoDetails.lengthSeconds),
      thumbnailURL: info.videoDetails.thumbnails[0].url,
      videoURL: info.videoDetails.video_url,
      streamURLs: format.audioBitrate ? {
        both: format.url
      } : {
        audio: info.formats
            .filter(f => f.hasAudio && !f.hasVideo)
            .sort(((a, b) => (a?.audioBitrate || 0) - (b?.audioBitrate || 0)))[0].url,
        video: format.url
      },
    }
  }
}
