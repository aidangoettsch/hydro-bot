import { Page } from 'playwright-core';
import { CaptureOptions } from './PageVideoCapture';
import {Readable} from "stream";
import {PageVideoStream} from "./PageVideoStream";

export const streamVideo =  (
  page: Page,
  options?: CaptureOptions,
): Promise<Readable> => {
  return PageVideoStream.start({
    page,
    options
  })
};
