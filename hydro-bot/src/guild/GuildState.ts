import fs from "fs"
import fsPromise from "fs/promises"
import {GuildConfig, defaultConfig} from "./GuildConfig";
import logger from "../Logger";
import util from "util";
import {Bot} from "../bot";
import {MediaResult} from "../downloader/Downloader";
import {StreamDispatcher, TextChannel, User, VoiceChannel, VoiceConnection} from "discord.js";
import path from "path";
import PuppeteerCapture from "../ui/PuppeteerCapture";
import debugBase from "debug";
import {PassThrough} from "stream";
import ChildProcess from 'child_process';
import obs, {Output, Scene, Source, Studio} from 'obs-node'

const debugVideo = debugBase('hydro-bot:video')
const IMAGE_EXTS = ['.jpg', '.png', '.jpeg'];
const JPEG_EXTS = ['.jpg', '.jpeg'];
const MTU = 1400;

const FFMPEG_CONFIG = {
  VP8: {
    codec: "libvpx",
    args: [
      'cpu-used=2',
      'deadline=realtime',
    ]
  },
  VP9: {
    codec: "libvpx-vp9",
    args: [
      'cpu-used=2',
      'deadline=realtime',
      'strict=experimental'
    ]
  },
  H264: {
    codec: "libx264",
    args: [
      'x264-params=bufsize=1M:pix_fmt=yuv420p:threads=2:preset=veryfast:profile=baseline',
    ]
  },
  H264_NVENC: {
    codec: "h264_nvenc",
    args: [
      'bufsize=4M',
      // 'pixfmt=yuv420p',
      'profile=baseline',
    ]
  },
  opus: {
    codec: "libopus",
    args: [
      'ar=48000',
      // '-af',
      // 'pan=stereo|FL < 1.0*FL + 0.707*FC + 0.707*BL|FR < 1.0*FR + 0.707*FC + 0.707*BR',
    ]
  },
}

export type QueuedMedia = MediaResult & {requester: User}

interface Playing {
  currentMedia: QueuedMedia
  startTime: number
}

interface VoiceState {
  queue: QueuedMedia[]
  playing: Playing | null
  voiceConnection: VoiceConnection
  voiceChannel: VoiceChannel
  logChannel: TextChannel
  audioDispatcher: StreamDispatcher
  output: Output
  videoScene: Scene
  videoSource: Source,
  audioSource: Source,
}

export default class GuildState {
  private config: GuildConfig = defaultConfig;
  private readonly configPath: string;

  private voiceState: VoiceState | null = null
  private puppeteerCapture = new PuppeteerCapture(this)

  private videoStream = new PassThrough()
  private audioStream = new PassThrough()
  private ffmpeg?: ChildProcess.ChildProcess

  constructor (private bot: Bot, public id: string) {
    this.configPath = `../../config/${id}.json`
    if (fs.existsSync(path.join(__dirname, this.configPath))) {
      this.config = require(this.configPath)
    } else {
      this.saveConfig()
    }
  }

  private saveConfig(): void {
    fsPromise.writeFile(
        path.join(__dirname, this.configPath),
        JSON.stringify(this.config)
    ).catch((e: Error) => {
      logger.error(`Error saving config for guild ${this.id}:`)
      logger.error(util.inspect(e))
    })
  }

  async joinVoiceChannel(voiceChannel: VoiceChannel, logChannel: TextChannel) {
    const videoClientChannel = this.bot.videoClient.channels.resolve(voiceChannel.id)
    if (!videoClientChannel) throw new Error("Video client cannot access channel")
    if (!(videoClientChannel instanceof VoiceChannel)) throw new Error("Channel is not a voice channel")

    const voiceConnection  = await videoClientChannel.join(true)

    const {port, audio: audioDispatcher} = await voiceConnection.manualPlayVideo()

    Studio.resetVideo({
      baseWidth: 1920,
      baseHeight: 1080,
      outputWidth: 1920,
      outputHeight: 1080,
      fps: 60,
    })

    Studio.resetAudio({
      sampleRate: 48000,
      speakers: 1,
    })

    const videoSource = new Source("ffmpeg_source", "Video", {
      close_when_inactive: false,
      restart_on_activate: false,
      hw_decode: true,
      input: "https://r3---sn-8xgp1vo-p5qs.googlevideo.com/videoplayback?expire=1613435073&ei=YLwqYKuGPLbmhwbH16qQCg&ip=108.45.29.59&id=o-ADjGDtoh5Qhs80qlHGpBRNcqWjn_5KyQJnNanKKC50W6&itag=271&aitags=133%2C134%2C135%2C136%2C137%2C160%2C242%2C243%2C244%2C247%2C248%2C271%2C278%2C313%2C394%2C395%2C396%2C397%2C398%2C399%2C400%2C401&source=youtube&requiressl=yes&mh=LM&mm=31%2C29&mn=sn-8xgp1vo-p5qs%2Csn-p5qlsnd6&ms=au%2Crdu&mv=m&mvi=3&pl=16&initcwndbps=2196250&vprv=1&mime=video%2Fwebm&ns=zWcCBGncbBetcdQMRdRcdB0F&gir=yes&clen=274172482&dur=666.065&lmt=1612491224164985&mt=1613413243&fvip=3&keepalive=yes&c=WEB&txp=5532432&n=UWYfFoVNEb_NVTZqIb&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cvprv%2Cmime%2Cns%2Cgir%2Cclen%2Cdur%2Clmt&sig=AOq0QJ8wRgIhAN_G9ShJnqiOd731nNoQ8LXXGBKgAzgavTjV_h9GVQ1VAiEA_feTkRuYwHJArZV1vYxm7JV8DuqYLdphl307zDDcmAY%3D&lsparams=mh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Cinitcwndbps&lsig=AG3C_xAwRAIgLvzkVdCixUcwKtBIEt2EvVmNo9nniSn0KMjTD0U1e0sCIDOLAMP2PAx0INBMb5xRxpYfJQhMQL90AQlCXvdWBKXo&ratebypass=yes",
      is_local_file: false,
      seekable: true
    })

    const audioSource = new Source("ffmpeg_source", "Audio", {
      close_when_inactive: false,
      restart_on_activate: false,
      hw_decode: false,
      input: "",
      is_local_file: false,
      seekable: true
    })

    const textTest = new Source("text_ft2_source", "Video", {
      text: "pog"
    })

    const videoScene = new Scene("Video Scene")
    videoScene.addSource(videoSource)
    videoScene.addSource(audioSource)
    videoScene.addSource(textTest)
    videoScene.asSource().assignOutputChannel(0)

    const output = new Output("ffmpeg_output", "ffmpeg", {
      url: `rtp://127.0.0.1:${port}/?pkt_size=${MTU}`,
      video_encoder: "h264_nvenc",
      video_bitrate: 4 * 1000,
      format_name: "rtp",
      video_settings: FFMPEG_CONFIG.H264_NVENC.args.join(' '),
    })

    const audioOutput = new Output("ffmpeg_output", "ffmpeg audio", {
      url: `rtp://127.0.0.1:${port + 2}/?pkt_size=${MTU}`,
      audio_encoder: "libbopus",
      format_name: "rtp",
      audio_settings: FFMPEG_CONFIG.opus.args.join(' '),
    })

    // audioOutput.setMixers(0xffffffffffffffff)
    output.useRaw()
    audioOutput.useRaw()
    output.start()
    audioOutput.start()
    debugVideo(`obs started for guild ${this.id}`)

    this.voiceState = {
      audioDispatcher,
      voiceConnection,
      voiceChannel,
      logChannel,
      queue: [],
      playing: null,
      output,
      videoScene,
      videoSource,
      audioSource
    }

    await logChannel.send(this.bot.embedFactory.info(
        `Joined voice channel: [${voiceChannel.id}] on guild [${voiceChannel.guild.name}]`
    ))
  }

  async finishTrack() {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")

    if (this.voiceState.queue.length === 0) {
      await this.voiceState.logChannel.send(this.bot.embedFactory.info(
          'Queue has been emptied. Queue something else with $play!'
      ))
    } else if (this.voiceState.voiceConnection.channel.members.array().length == 1) {
      await this.voiceState.logChannel.send(this.bot.embedFactory.info(
          'Empty voice channel detected. Leaving voice channel...'
      ))
      this.leaveVoice()
    } else await this.playNextMedia()
  }

  async addMedia(media: QueuedMedia): Promise<void> {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")
    this.voiceState.queue.push(media)
    if (!this.voiceState.playing) {
      await this.playNextMedia()
    }
  }

  async playNextMedia(): Promise<void> {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")

    const media = this.voiceState.queue.shift()
    if (!media) throw new Error("Queue is empty")

    this.voiceState.playing = {
      currentMedia: media,
      startTime: Date.now(),
    }

    const resources = "both" in media.streamURLs ? [
      {
        resource: media.streamURLs.both
      }
    ] : [
      {
        resource: media.streamURLs.video
      },
      {
        resource: media.streamURLs.audio
      }
    ]

    const url = resources[0].resource
    this.voiceState.videoSource.updateSettings({
      close_when_inactive: true,
      hw_decode: false,
      input: url,
      is_local_file: false,
      seekable: true
    })
    if (resources[1]) {
      this.voiceState.audioSource.updateSettings({
        close_when_inactive: true,
        hw_decode: false,
        input: resources[1].resource,
        is_local_file: false,
        seekable: true
      })
    }

    await this.voiceState.logChannel.send(this.bot.embedFactory.mediaInfo(media))
  }

  leaveVoice(): void {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")
    this.voiceState.voiceConnection.disconnect()
    this.puppeteerCapture.destroy()

    if (this.voiceState.playing) {
      this.voiceState.audioDispatcher.removeAllListeners('finish')
    }

    this.voiceState = null
  }

  setVolume(volume: number) {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")

    this.config.volume = volume
    this.saveConfig()

    if (this.voiceState.playing) {
      this.voiceState.audioDispatcher.setVolume(volume)
    }
  }

  async skipTrack(): Promise<void> {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")

    this.ffmpeg?.kill()
  }

  public get inVoice(): boolean {
    return !!this.voiceState
  }

  public get currentChannel(): VoiceChannel | undefined {
    return this.voiceState?.voiceChannel
  }

  public get nowPlaying(): QueuedMedia | undefined {
    return this.voiceState?.playing?.currentMedia
  }

  public get queue(): QueuedMedia[] {
    return this.voiceState?.queue || []
  }
}
