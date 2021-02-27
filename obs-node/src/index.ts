import * as os from 'os';
import * as path from 'path';
import {Readable} from "stream";
import EventEmitter = require("events");
import {sign} from "crypto";

let cwd = process.cwd();
let obsInstance: obs
const isWindows = os.platform() === "win32";
try {
    if (isWindows) {
        // for windows, we need set working directory to obs binary path to load obs dependencies correctly.
        process.chdir(path.resolve(__dirname, '../prebuild/obs-studio/bin/64bit'));
    }
    obsInstance = require('../prebuild/obs-node.node');
} finally {
    if (isWindows) {
        process.chdir(cwd);
    }
}

// set obs studio path before calling any function.
const obsPath = path.resolve(__dirname, '../prebuild/obs-studio');
obsInstance.Studio.startup(obsPath, 'en-US');

export type ObsData = { [key: string]: any }

export interface AudioEncoder {
    new(encoderId: string, name: string, mixIdx: number, settings: ObsData)
    updateSettings(settings: ObsData): void
    use(): void
}

interface StreamOutputInternal {
    new(name: string, settings: {
        onData: (data: ArrayBuffer, type: number) => void,
        onStop: () => void
    })
    setVideoEncoder(encoder: VideoEncoder): void
    setAudioEncoder(encoder: AudioEncoder): void
    setMixer(mixer: number): void
    updateSettings(settings: {
        onData: (data: ArrayBuffer, type: number) => void,
        onStop: () => void
    }): void
    start(): void
    stop(): void
}

export interface Output {
    new(outputId: string, name: string, settings: ObsData)
    setVideoEncoder(encoder: VideoEncoder): void
    setAudioEncoder(encoder: AudioEncoder): void
    useRaw(): void
    setMixers(mixerMask: number): void
    setService(service: OutputService): void
    updateSettings(settings: ObsData): void
    getSettings(): string
    start(): void
    stop(): void
}

export interface OutputService {
    new(serviceId: string, name: string, settings: ObsData)
    updateSettings(settings: ObsData): void
}

export interface SceneInternal {
    new(name: string, signalListener: (signal: string) => void)
    addSource(source: Source): SceneItem
    asSource(): SourceInternal
}

export interface SceneItem {
    setTransformInfo(info: TransformInfo): void
    getTransformInfo(): TransformInfo
    remove(): void
}

export interface TransformInfo {
    posX: number
    posY: number
    rot: number
    scaleX: number
    scaleY: number
    alignment: number
    boundsType: number
    boundsAlignment: number
    boundsX: number
    boundsY: number
}

interface SourceInternal {
    new(sourceId: string, name: string, signalListener: (signal: string) => void, settings: ObsData | undefined)
    updateSettings(settings: ObsData): void
    getSettings(): string
    assignOutputChannel(channel: number): void
    startTransition(): void
    getWidth(): number
    getHeight(): number
}

export interface Studio {
    startup(obsPath: string, locale: string): void
    resetVideo(videoSettings: VideoSettings): void
    resetAudio(audioSettings: AudioSettings): void
}

export interface VideoEncoder {
    new(encoderId: string, name: string, settings: ObsData)
    updateSettings(settings: ObsData)
    use()
}

export interface VideoSettings {
    baseWidth: number;
    baseHeight: number;
    outputWidth: number;
    outputHeight: number;
    fps: number;
}

export interface AudioSettings {
    sampleRate: number;
    speakers: number;
}

declare interface obs {
    AudioEncoder: AudioEncoder
    Output: Output
    OutputService: OutputService
    Scene: SceneInternal
    Source: SourceInternal
    Studio: Studio,
    StreamOutput: StreamOutputInternal,
    VideoEncoder: VideoEncoder
}

export class StreamOutput {
    private internalOutput: StreamOutputInternal
    public videoStream = new Readable({
        read() {}
    })
    public audioStream = new Readable({
        read() {}
    })

    constructor(name: string) {
        this.internalOutput = new obsInstance.StreamOutput(name, {
            onData: this.onData.bind(this),
            onStop: this.onStop.bind(this),
        })
    }

    _read(): void {}
    _destroy(): void {}

    onData(data: ArrayBuffer, type: number): void {
        if (type === 0) this.audioStream.push(Buffer.from(data))
        else this.videoStream.push(Buffer.from(data))
    }

    onStop(): void {}

    setVideoEncoder(encoder: VideoEncoder): void {
        this.internalOutput.setVideoEncoder(encoder)
    }

    setAudioEncoder(encoder: AudioEncoder): void {
        this.internalOutput.setAudioEncoder(encoder)
    }

    setMixer(mixer: number): void {
        this.internalOutput.setMixer(mixer)
    }

    updateSettings(settings: {
        onData: (data: ArrayBuffer) => void,
        onStop: () => void
    }): void {
        this.internalOutput.updateSettings(settings)
    }

    start(): void {
        this.internalOutput.start()
    }

    stop(): void {
        this.internalOutput.stop()
    }
}

export class Source extends EventEmitter {
    protected source: SourceInternal

    constructor(sourceId: string | SourceInternal, name: string, settings?: ObsData) {
        super();
        if (typeof sourceId === "string") {
            this.source = new obsInstance.Source(sourceId, name, (signal: string) => {
                console.log(`[${name}] ${signal}`)
                this.emit(signal)
            }, settings)
        } else {
            this.source = sourceId
        }
    }

    updateSettings(settings: ObsData): void {
        this.source.updateSettings(settings)
    }
    getSettings(): ObsData {
        return JSON.parse(this.source.getSettings())
    }

    assignOutputChannel(channel: number): void {
        this.source.assignOutputChannel(channel)
    }

    getWidth(): number {
        return this.source.getWidth()
    }

    getHeight(): number {
        return this.source.getHeight()
    }
}

export class Transition extends Source {
    startTransition(): void {
        this.source.startTransition()
    }
}

export class Scene extends Source {
    protected scene: SceneInternal

    constructor(name: string) {
        const scene = new obsInstance.Scene(name, (signal: string) => {
            console.log(`[${name}] ${signal}`)
            this.emit(signal)
        })
        super(scene.asSource(), name);
        this.scene = scene
    }

    addSource(source: Source): SceneItem {
        return this.scene.addSource(source)
    }
}

export const AudioEncoder = obsInstance.AudioEncoder
export const Output = obsInstance.Output
export const OutputService = obsInstance.OutputService
export const Studio = obsInstance.Studio
export const VideoEncoder = obsInstance.VideoEncoder
