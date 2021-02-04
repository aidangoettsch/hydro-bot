"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const time_stamp_1 = __importDefault(require("time-stamp"));
class Logger {
    constructor() {
        this.debugEnabled = false;
    }
    static getTimestamp() {
        return time_stamp_1.default('[YYYY:MM:DD-HH:mm:ss]');
    }
    info(msg) {
        console.log(`${chalk_1.default.green(Logger.getTimestamp())} ${chalk_1.default.blue('[INFO] >')} ${chalk_1.default.yellow(msg)}`);
    }
    debug(msg) {
        if (this.debugEnabled)
            console.debug(`${chalk_1.default.green(Logger.getTimestamp())} ${chalk_1.default.green('[DEBUG] >')} ${chalk_1.default.yellow(msg)}`);
    }
    error(msg) {
        console.error(`${chalk_1.default.green(Logger.getTimestamp())} ${chalk_1.default.red('[ERROR] >')} ${chalk_1.default.yellow(msg)}`);
    }
}
exports.default = new Logger();
