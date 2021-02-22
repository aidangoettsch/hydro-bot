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
import obs, {AudioEncoder, Output, Scene, Source, Studio, VideoEncoder} from 'obs-node'
import {SceneItem, StreamOutput} from "obs-node/dist";
import segfaultHandler from "segfault-handler";

segfaultHandler.registerHandler("crash.log")

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
  output: StreamOutput
  videoScene: Scene
  sceneItems: { [name: string]: SceneItem}
  sources: { [name: string]: Source}
}

export default class GuildState {
  private config: GuildConfig = defaultConfig;
  private readonly configPath: string;

  private voiceState: VoiceState | null = null

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

    const sources = {
      video: new Source("ffmpeg_source", "Video", {
        close_when_inactive: false,
        restart_on_activate: false,
        hw_decode: true,
        input: "",
        is_local_file: false,
        seekable: true
      }),
      audio: new Source("ffmpeg_source", "Audio", {
        close_when_inactive: false,
        restart_on_activate: false,
        hw_decode: false,
        input: "",
        is_local_file: false,
        seekable: true
      }),
      text: new Source("text_ft2_source", "pog", {
        text: "pog"
      })
    }

    const videoScene = new Scene("Video Scene")

    const sceneItems = {
      video: videoScene.addSource(sources.video),
      audio: videoScene.addSource(sources.audio),
      text: videoScene.addSource(sources.text),
    }
    videoScene.asSource().assignOutputChannel(0)

    const audioEncoder = new AudioEncoder("ffmpeg_opus", "Opus Encoder", 0, {
      "bitrate": 64
    })

    const videoEncoder = new VideoEncoder("ffmpeg_nvenc", "NVENC Encoder",  {
      "bitrate": 4000,
      "profile": "baseline"
    })

    const output = new StreamOutput("stream output")

    // output.videoStream.on('data', (d) => {
    //   debugVideo(`video ${d.toString('hex')}`)
    // })

    // output.audioStream.on('data', (d) => {
    //   debugVideo(`audio ${util.inspect(d)}`)
    // })
    const {audio: audioDispatcher} = await voiceConnection.playRawVideo(output.videoStream, output.audioStream, {volume: this.config.volume})

    output.setAudioEncoder(audioEncoder)
    output.setVideoEncoder(videoEncoder)
    output.start()

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
      sceneItems,
      sources
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
    this.voiceState.sources.video.updateSettings({
      close_when_inactive: true,
      hw_decode: false,
      input: url,
      is_local_file: false,
      seekable: true
    })
    if (resources[1]) {
      this.voiceState.sources.audio.updateSettings({
        close_when_inactive: true,
        hw_decode: false,
        input: resources[1].resource,
        is_local_file: false,
        seekable: true
      })
    }

    this.voiceState.sources.video.on('media_started', () => {
      console.log(this.voiceState?.sceneItems.video.getTransformInfo())
    })

    await this.voiceState.logChannel.send(this.bot.embedFactory.mediaInfo(media))
  }

  leaveVoice(): void {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")
    this.voiceState.output.stop()

    for (const item in this.voiceState.sceneItems) {
      this.voiceState.sceneItems[item].remove()
    }

    this.voiceState.voiceConnection.disconnect()

    this.voiceState.sceneItems = {}
    this.voiceState.sources = {}
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
