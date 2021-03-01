import fs from "fs"
import fsPromise from "fs/promises"
import {GuildConfig, defaultConfig} from "./GuildConfig";
import logger from "../Logger";
import util from "util";
import {Bot} from "../bot";
import {MediaResult} from "../downloader/Downloader";
import {StreamDispatcher, TextChannel, User, VoiceChannel, VoiceConnection} from "discord.js";
import path from "path";
import debugBase from "debug";
import {AudioEncoder, Scene, Source, SceneItem, StreamOutput, Studio, VideoEncoder} from 'obs-node'

const webUiPath = require.resolve("web-ui/build/index.html")
const debugVideo = debugBase('hydro-bot:video')

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
      browser: new Source("browser_source", "Browser", {
        is_local_file: true,
        local_file: webUiPath,
        fps: 60,
        width: 1920,
        height: 1080
      }),
      text: new Source("text_ft2_source", "pog", {
        text: "pog"
      })
    }

    const videoScene = new Scene("Video Scene")

    const sceneItems = {
      browser: videoScene.addSource(sources.browser),
      video: videoScene.addSource(sources.video),
      audio: videoScene.addSource(sources.audio),
      text: videoScene.addSource(sources.text),
    }
    videoScene.assignOutputChannel(0)

    const audioEncoder = new AudioEncoder("ffmpeg_opus", "Opus Encoder", 0, {
      bitrate: 64,
    })

    // const videoEncoder = new VideoEncoder("obs_x264", "x264 Encoder",  {
    //   profile: "baseline",
    //   rate_control: "CRF",
    //   crf: 25,
    // })

    const videoEncoder = new VideoEncoder("ffmpeg_nvenc", "NVENC Encoder",  {
      profile: "baseline",
      preset: "default",
      rate_control: "CQP",
      cqp: 25,
      bf: -1,
    })

    const output = new StreamOutput("stream output")

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

    this.voiceState.sceneItems.video.setTransformInfo({
      ...this.voiceState.sceneItems.video.getTransformInfo(),
      boundsX: 1920,
      boundsY: 1080,
      boundsAlignment: 0,
      boundsType: 2,
    })

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
      this.voiceState.sources.video.updateSettings({
        close_when_inactive: true,
        hw_decode: false,
        input: "",
        is_local_file: false,
        seekable: true
      })
      this.voiceState.sources.audio.updateSettings({
        close_when_inactive: true,
        hw_decode: false,
        input: "",
        is_local_file: false,
        seekable: true
      })
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
    this.voiceState.sources.audio.updateSettings({
      close_when_inactive: true,
      hw_decode: false,
      input: resources[1] ? resources[1].resource : "",
      is_local_file: false,
      seekable: true
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

    this.voiceState.sources.video.updateSettings({
      close_when_inactive: true,
      hw_decode: false,
      input: "",
      is_local_file: false,
      seekable: true
    })
    this.voiceState.sources.audio.updateSettings({
      close_when_inactive: true,
      hw_decode: false,
      input: "",
      is_local_file: false,
      seekable: true
    })

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
