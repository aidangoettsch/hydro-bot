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
import prism from 'prism-media'

const debugVideo = debugBase('hydro-bot:video')
const IMAGE_EXTS = ['.jpg', '.png', '.jpeg'];
const JPEG_EXTS = ['.jpg', '.jpeg'];

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

    const browserStream = await this.puppeteerCapture.getStream()

    const {audio: audioDispatcher} = await voiceConnection.playVideo(
        [
          {
            resource: browserStream,
            format: "image2pipe",
            options: [
              '-framerate', '30',
              '-video_size', '1920x1080'
            ]
          },
          {
            resource: this.videoStream,
            format: "rawvideo",
            options: [
              '-pix_fmt', 'yuv420p',
              '-video_size', '1920x1080'
            ]
          },
          {
            resource: this.audioStream,
            format: "s16le",
            options: [
              '-ar', '48000',
              '-ac', '2'
            ]
          }
        ],
        {
          ...this.bot.config.video,
          volume: this.config.volume,
          filters: ['[0:v]colorkey=0x00ff00:0.2:0.2[ckout];[1:v][ckout]overlay[out]'],
          mapVideo: "[out]",
        }
    )

    this.voiceState = {
      audioDispatcher,
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

    const inputArgs: string[] = ([] as string[]).concat(
      ...resources.map((resource: {
        resource: string,
        format?: string,
        options?: string[],
      }) => {
        const isImage = IMAGE_EXTS.includes(path.parse(resource.resource).ext);
        const isJpeg = isImage && JPEG_EXTS.includes(path.parse(resource.resource).ext);

        const format = resource.format || (isJpeg ? 'jpeg_pipe' : null);
        return [
          ...(isImage ? ['-loop', '1'] : []),
          ...(resource.options || []),
          ...(format ? ['-f', format] : []),
          '-protocol_whitelist',
          'tcp,tls,pipe,http,https,crypto',
          '-re',
          '-i',
          resource.resource,
        ];
      }),
    );

    const args = [
      '-frame_drop_threshold',
      '-0.1',
      ...inputArgs,
      '-an',
      '-c:v',
      'rawvideo',
      '-pix_fmt',
      'yuv420p',
      '-vf',
      "scale='if(gt(a*sar,16/9),1920,1080*iw*sar/ih)':'if(gt(a*sar,16/9),1920*ih/iw/sar,1080)',pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
      '-f',
      'rawvideo',
      'pipe:3',
      '-vn',
      '-ar',
      '48000',
      '-c:a',
      'pcm_s16le',
      '-ac',
      '2',
      '-f',
      's16le',
      'pipe:4',
    ];

    const ffmpeg = this.ffmpeg = ChildProcess.spawn(prism.FFmpeg.getInfo().command, args, {
      windowsHide: true,
      stdio: new Array(5).fill("pipe")
    });
    ffmpeg.on('exit', () => {
      ffmpeg.stdio[3]?.removeAllListeners('data')
      this.finishTrack()
    });
    ffmpeg.stdin.on('error', e => {
      debugVideo(`[ffmpeg in] ${e.message}`)
    });
    ffmpeg.stderr.on('data', e => {
      debugVideo(`[ffmpeg err] ${e.toString()}`);
    });
    ffmpeg.stderr.on('error', e => {
      debugVideo(`[ffmpeg err] ${e.toString()}`);
    });

    this.ffmpeg.stdio[3]?.on('data', d => this.videoStream.write(d))
    this.ffmpeg.stdio[4]?.on('data', d => this.audioStream.write(d))

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
