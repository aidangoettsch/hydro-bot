import Debug from 'debug';
import { Page } from 'playwright-core';
import { SortedFrameQueue } from './SortedFrameQueue';
import {
  ScreencastFrame,
  ScreencastFrameCollector,
} from './ScreencastFrameCollector';
import {CaptureOptions} from "./PageVideoCapture";
import {PassThrough, Readable} from "stream";

const debug = Debug('pw-video:PageVideoStream');

interface ConstructorArgs {
  collector: ScreencastFrameCollector;
  queue: SortedFrameQueue;
  page: Page;
  fps: number;
}

export interface StartArgs {
  page: Page;
  options: CaptureOptions;
}

export class PageVideoStream {
  public static async start({
    page,
    options,
  }: StartArgs): Promise<Readable> {
    debug('start');

    const collector = await ScreencastFrameCollector.create(page, options);
    const queue = new SortedFrameQueue();

    const capture = new PageVideoStream({ collector, queue, page, fps: options.fps });
    await collector.start();

    return capture.output;
  }

  // public for tests
  public _collector: ScreencastFrameCollector;
  private _previousFrame?: ScreencastFrame;
  private _queue: SortedFrameQueue;
  // public for tests
  public _stopped = false;
  private _fps: number

  public output = new PassThrough()

  protected constructor({ collector, queue, page, fps }: ConstructorArgs) {
    this._collector = collector;
    this._queue = queue;
    this._fps = fps

    page.on('close', () => this.stop());

    this._listenForFrames();
  }

  private _listenForFrames(): void {
    this._collector.on('screencastframe', (screencastFrame) => {
      debug(`collected frame from screencast: ${screencastFrame.timestamp}`);
      this._writePreviousFrame(screencastFrame);
    });

    // this._queue.on('sortedframes', (frames) => {
    //   debug(`received ${frames.length} frames from queue`);
    //   frames.forEach((frame) => this._writePreviousFrame(frame));
    // });
  }

  private _outputFrame(data: Buffer, durationSeconds = 1): void {
    const numFrames = Math.max(
      Math.round(durationSeconds * this._fps),
      1,
    );
    debug(`write ${numFrames} frames for duration ${durationSeconds}s`);

    for (let i = 0; i < numFrames; i++) {
      this.output.write(data);
    }
  }

  private _writePreviousFrame(currentFrame: ScreencastFrame): void {
    // write the previous frame based on the duration between it and the current frame
    if (this._previousFrame) {
      const durationSeconds =
        currentFrame.timestamp - this._previousFrame.timestamp;
      this._outputFrame(this._previousFrame.data, durationSeconds);
    }

    this._previousFrame = currentFrame;
  }

  private _writeFinalFrameUpToTimestamp(stoppedTimestamp: number): void {
    if (!this._previousFrame) return;

    // write the final frame based on the duration between it and when the screencast was stopped
    debug('write final frame');
    const durationSeconds = stoppedTimestamp - this._previousFrame.timestamp;
    this._outputFrame(this._previousFrame.data, durationSeconds);
  }

  public async stop(): Promise<void> {
    if (this._stopped) return;

    debug('stop');
    this._stopped = true;

    const stoppedTimestamp = await this._collector.stop();
    this._queue.drain();
    this._writeFinalFrameUpToTimestamp(stoppedTimestamp);

    return this.output.destroy();
  }
}
