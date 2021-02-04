import chalk from 'chalk'
import timestamp from 'time-stamp'

class Logger {
    debugEnabled: boolean = false

    private static getTimestamp(): string {
        return timestamp('[YYYY:MM:DD-HH:mm:ss]')
    }

    info(msg: string) {
        console.log(`${chalk.green(Logger.getTimestamp())} ${chalk.blue('[INFO] >')} ${chalk.yellow(msg)}`)
    }

    debug(msg: string) {
        if (this.debugEnabled)
            console.debug(`${chalk.green(Logger.getTimestamp())} ${chalk.green('[DEBUG] >')} ${chalk.yellow(msg)}`)
    }

    error(msg: string) {
        console.error(`${chalk.green(Logger.getTimestamp())} ${chalk.red('[ERROR] >')} ${chalk.yellow(msg)}`)
    }
}

export default new Logger()