'use strict';

const ChildProcess = require('child_process');
const EventEmitter = require('events');
const path = require('path')
const { Readable: ReadableStream, PassThrough: PassThroughStream } = require('stream');
const prism = require('prism-media');
const VideoDispatcher = require('../dispatcher/VideoDispatcher');
const dgram = require('dgram');

const FFMPEG_ARGS = {
  VP8: [
    '-an',
    '-c:v', 'libvpx',
    '-b:v', 'BITRATE',
    '-cpu-used', '2',
    '-deadline', 'realtime',
    '-f', 'rtp',
    'OUTPUT_URL',
  ],
  VP9: [
    '-an',
    '-c:v', 'libvpx-vp9',
    '-b:v', 'BITRATE',
    '-cpu-used', '2',
    '-deadline', 'realtime',
    '-strict', 'experimental',
    '-f', 'rtp',
    'OUTPUT_URL',
  ],
  H264: [
    '-an',
    '-c:v', 'libx264',
    '-b:v', 'BITRATE',
    '-bufsize', '1M',
    '-pix_fmt', 'yuv420p',
    '-threads', '2',
    '-preset', 'veryfast',
    '-profile:v', 'baseline',
    '-f', 'rtp',
    'OUTPUT_URL',
  ],
  H264_NVENC: [
    '-an',
    '-c:v', 'h264_nvenc',
    '-b:v', 'BITRATE',
    '-bufsize', '4M',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'baseline',
    '-f', 'rtp',
    'OUTPUT_URL',
  ],
  H264_VAAPI: [
    '-an',
    '-c:v', 'h264_vaapi',
    '-b:v', 'BITRATE',
    '-vf', 'format=nv12,hwupload',
    '-profile:v', '578',
    '-bufsize', '1M',
    '-vaapi_device', '/dev/dri/renderD128',
    '-f', 'rtp',
    'OUTPUT_URL',
  ],
  opus: [
    '-vn',
    '-ar', '48000',
    '-af', "pan=stereo|FL < 1.0*FL + 0.707*FC + 0.707*BL|FR < 1.0*FR + 0.707*FC + 0.707*BR",
    '-c:a', 'libopus',
    '-f', 'rtp',
    'OUTPUT_URL'
  ]
}
const MTU = 1400
const IMAGE_EXTS = [".jpg", ".png", ".jpeg"]
const JPEG_EXTS = [".jpg", ".jpeg"]

/**
 * A Video Player for a Voice Connection.
 * @private
 * @extends {EventEmitter}
 */
class VideoPlayer extends EventEmitter {
  constructor(voiceConnection) {
    super();
    this.voiceConnection = voiceConnection;

    this.dispatcher = null;

    this.streamingData = {
      channels: 2,
      sequence: 0,
      timestamp: 0,
    };
  }

  destroy() {
    if (this.ffmpeg) this.ffmpeg.kill('SIGINT')
    this.destroyDispatcher();
  }

  _destroy() {
    if (this.streams.resource) {
      this.streams.resource.destroy()
      this.streams.resource = null
    }
    if (this.server) {
      this.server.close()
      this.server = null
    }
    if (this.streams.audioStream) {
      this.streams.audioStream.destroy()
      this.streams.audioStream = null
    }
    this.emit('finish')
  }

  destroyDispatcher() {
    if (this.dispatcher) {
      this.dispatcher.destroy();
      this.dispatcher = null;
    }
  }

  async playVideo(resource, { bitrate = "1M", volume = 1.0, listen = false, audio = true, useNvenc = false, useVaapi = false, inputFormat = "", manualFfmpeg = false, audioDelay = 0, rtBufferSize = "" } = {}) {
    await this.voiceConnection.resetVideoContext()
    const isStream = resource instanceof ReadableStream;
    const isMux = resource.video && resource.audio
    if (!FFMPEG_ARGS.hasOwnProperty(this.voiceConnection.videoCodec)) {
      console.error(`[PLAY VIDEO ERROR] Codec ${this.voiceConnection.videoCodec} not supported`)
      return
    }
    if (isStream && manualFfmpeg) throw Error("Cannot run manual FFMPEG if input is a stream")

    this.dispatcher = this.createDispatcher()

    this.server = dgram.createSocket('udp4');
    const streams = audio ? {
      audioStream: new PassThroughStream()
    } : {}
    this.server.on('error', (err) => {
      this.destroy();
      this.emit('finish')
    });

    this.server.on('message', (buffer) => {
      const payloadType = buffer[1] & 0b1111111
      if (payloadType === 96 && this.dispatcher) this.dispatcher.write(buffer)
      if (payloadType === 97 && audio && streams.audioStream) streams.audioStream.write(buffer.slice(12))
    });

    let port = 41234
    while (port < 41240) {
      try {
        this.server.bind(port);
        break
      } catch {
        port++
      }
    }
    if (port === 41240) {
      console.error(`[PLAY VIDEO ERROR] Could not bind to any UDP port on 41234-41240`)
      return
    }
    const resourceUri = isStream ? "-" : resource
    const isImage = isStream || isMux ? false : IMAGE_EXTS.includes(path.parse(resource).ext)
    const encoderName = (this.voiceConnection.videoCodec === "H264" && useNvenc) ? "H264_NVENC" :
      (this.voiceConnection.videoCodec === "H264" && useVaapi ? "H264_VAAPI" : this.voiceConnection.videoCodec)

    let args = [
      '-protocol_whitelist', 'tcp,tls,pipe,http,https,crypto',
      '-re',
      '-frame_drop_threshold', '-0.1',
      ...(rtBufferSize ? ['-rtbufsize', rtBufferSize] : []),
      ...(isImage && JPEG_EXTS.includes(path.parse(resource).ext) ? ['-f', 'jpeg_pipe'] : []),
      '-i', ...(isMux ? [resource.video] : [resourceUri]),
      ...(audio && isMux ? ['-i', resource.audio] : []),
      ...(audioDelay < 0 ? ['-vf', `trim=${-audioDelay},setpts=PTS-STARTPTS`] : []),
      ...FFMPEG_ARGS[encoderName],
      ...((!isImage && audio) ? [
          ...(audioDelay > 0 ? ['-af', `atrim=${audioDelay},asetpts=PTS-STARTPTS`] : []),
        ...FFMPEG_ARGS.opus
      ] : [])
    ]

    if (isImage) args.unshift('-loop', '1')
    if (listen) args.unshift('-listen', '1')
    if (inputFormat) args.unshift('-f', inputFormat)

    let i = -1
    while ((i = args.indexOf("OUTPUT_URL")) > -1) {
      args[i] = `rtp://127.0.0.1:${port}/?pkt_size=${MTU}`
    }

    while ((i = args.indexOf("BITRATE")) > -1) {
      args[i] = `${bitrate}`
    }

    this.voiceConnection.emit('debug', `Launching FFMPEG: ${prism.FFmpeg.getInfo().command} ${args.join(" ")}`)
    if (!manualFfmpeg) {
      this.ffmpeg = ChildProcess.spawn(prism.FFmpeg.getInfo().command, args, {windowsHide: true});
      if (isStream) {
        streams.resource = resource;
        resource.pipe(this.ffmpeg.stdin);
      }
      this.ffmpeg.on('exit', () => {
        this._destroy()
        this.ffmpeg = null
        this.emit('finish')
      })
      this.ffmpeg.stdin.on('error', (e) => {
        this.emit('debug', `[ffmpeg in] ${e.message}`)
      })
      this.ffmpeg.stderr.on('data', (e) => {
        this.emit('debug', `[ffmpeg err] ${e.toString()}`)
      })
      this.ffmpeg.stderr.on('error', (e) => {
        this.emit('debug', `[ffmpeg err] ${e.toString()}`)
      })
    }

    this.streams = streams
    return {
      video: this.dispatcher,
      ...(audio ? { audio: this.voiceConnection.play(streams.audioStream, {type: 'opus', volume}) } : {}),
      ...(manualFfmpeg ? { args: `ffmpeg ${args.join(" ")}`} : {})
    }
  }

  createDispatcher() {
    this.destroyDispatcher();
    const dispatcher = (this.dispatcher = new VideoDispatcher(this));
    return dispatcher;
  }
}

module.exports = VideoPlayer;
