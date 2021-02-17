import * as os from 'os';
import * as path from 'path';
import {Readable} from "stream";

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
        onData: (data: Buffer) => void,
        onStop: () => void
    })
    setVideoEncoder(encoder: VideoEncoder): void
    setAudioEncoder(encoder: AudioEncoder): void
    setMixer(mixer: number): void
    updateSettings(settings: {
        onData: (data: Buffer) => void,
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

export interface Scene {
    new(name: string)
    addSource(source: Source): void
    asSource(): Source
}

export interface Source {
    new(sourceId: string, name: string, settings: ObsData)
    updateSettings(settings: ObsData): void
    getSettings(): string
    assignOutputChannel(channel: number): void
}

interface SourceInternal {
    new(sourceId: string, name: string, settings: ObsData)
    updateSettings(settings: ObsData): void
    getSettings(): string
    assignOutputChannel(channel: number): void
    startTransition(): void
}

export interface Studio {
    startup(obsPath: string, locale: string): void
    resetVideo(videoSettings: VideoSettings): void
    resetAudio(audioSettings: AudioSettings): void
}

export class Transition {
    private source: SourceInternal

    constructor(sourceId: string, name: string, settings: ObsData) {
        this.source = new obsInstance.Source(sourceId, name, settings)
    }

    updateSettings(settings: ObsData): void {
        this.source.updateSettings(settings)
    }

    startTransition(): void {
        this.source.startTransition()
    }
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
    Scene: Scene
    Source: Source
    Studio: Studio,
    StreamOutput: StreamOutputInternal,
    VideoEncoder: VideoEncoder
}

export class StreamOutput extends Readable {
    private internalOutput: StreamOutputInternal

    constructor(name: string) {
        super();
        this.internalOutput = new obsInstance.StreamOutput(name, {
            onData: this.onData,
            onStop: this.onStop,
        })
    }

    _read(): void {}
    _destroy(): void {}

    onData(data: Buffer): void {
        this.push(data)
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
        onData: (data: Buffer) => void,
        onStop: () => void
    }): void {
        this.internalOutput.updateSettings(settings)
    }

    start(): void{
        this.internalOutput.start()
    }

    stop(): void {
        this.internalOutput.stop()
    }
}

export const AudioEncoder = obsInstance.AudioEncoder
export const Output = obsInstance.Output
export const OutputService = obsInstance.OutputService
export const Scene = obsInstance.Scene
export const Source = obsInstance.Source
export const Studio = obsInstance.Studio
export const VideoEncoder = obsInstance.VideoEncoder
