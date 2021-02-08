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

const debugVideo = debugBase('video')

export type QueuedMedia = MediaResult & {requester: User}

interface Playing {
  currentMedia: QueuedMedia
  startTime: number
  audioDispatcher: StreamDispatcher
}

interface VoiceState {
  queue: QueuedMedia[]
  playing: Playing | null
  voiceConnection: VoiceConnection
  voiceChannel: VoiceChannel
  logChannel: TextChannel
}

export default class GuildState {
  private config: GuildConfig = defaultConfig;
  private readonly configPath: string;

  private voiceState: VoiceState | null = null
  private puppeteerCapture = new PuppeteerCapture(this)

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

    this.voiceState = {
      voiceConnection,
      voiceChannel,
      logChannel,
      queue: [],
      playing: null
    }
    await logChannel.send(this.bot.embedFactory.info(
        `Joined voice channel: [${voiceChannel.id}] on guild [${voiceChannel.guild.name}]`
    ))
  }

  async finishTrack() {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")

    if (this.voiceState.queue.length === 0) {
      await this.voiceState.logChannel.send(this.bot.embedFactory.info(
          'Queue has been emptied. Leaving voice channel...'
      ))
      this.leaveVoice()
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

    const stream = await this.puppeteerCapture.getStream()
    const {audio: audioDispatcher} = await this.voiceState.voiceConnection.playVideo(
        stream,
        {
          ...this.bot.config.video,
          volume: this.config.volume
        }
    )
    // const {audio: audioDispatcher} = await this.voiceState.voiceConnection.playVideo(
    //     "video" in media.streamURLs ? media.streamURLs : media.streamURLs.both,
    //     {
    //       ...this.bot.config.video,
    //       volume: this.config.volume
    //     }
    // )

    audioDispatcher.once('finish', this.finishTrack.bind(this))

    this.voiceState.playing = {
      currentMedia: media,
      startTime: Date.now(),
      audioDispatcher
    }

    await this.voiceState.logChannel.send(this.bot.embedFactory.mediaInfo(media))
  }

  leaveVoice(): void {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")
    this.voiceState.voiceConnection.disconnect()

    if (this.voiceState.playing) {
      this.voiceState.playing.audioDispatcher.removeAllListeners('finish')
    }

    this.voiceState = null
  }

  setVolume(volume: number) {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")

    this.config.volume = volume
    this.saveConfig()

    if (this.voiceState.playing) {
      this.voiceState.playing.audioDispatcher.setVolume(volume)
    }
  }

  async skipTrack (): Promise<void> {
    if (!this.voiceState) throw new Error("Not connected to a voice channel!")
    const { player, videoPlayer } = this.voiceState.voiceConnection

    // @ts-ignore
    player.destroy()
    // @ts-ignore
    videoPlayer.destroy()
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
