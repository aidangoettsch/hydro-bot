import Discord from "discord.js"
import config from '../config/config.json'
import { version } from '../package.json'
import logger from './modules/Logger'
import util from "util"

interface Config {
    token: string
    videoToken: string
    prefix: string
    debug: boolean
    video: {
        resolutionMax: number
        bitrate: string
        useNvenc: boolean
        coupledAudioDelay: number
        separateAudioDelay: number
        liveDelay: number
    }
}

class Bot {
    private client: Discord.Client = new Discord.Client()
    private videoClient: Discord.Client = new Discord.Client({tokenType: 'Bearer'})
    private config: Config

    constructor(config: Config) {
        this.config = config
    }

    async login() {
        this.client.on('ready', () => {
            if (!this.client.user) {
                logger.error("User is not present - cannot login")
                return
            }

            this.client.user.setPresence({
                activity: { name: `${this.config.prefix}help // v${version}` }
            })


            logger.info('Bot started!')
            logger.info(`Invite Link: https://discordapp.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=8&scope=bot`)
        })

        this.client.on('message', (msg) => {
            if (!msg.content.startsWith(this.config.prefix) || msg.author.bot) return

            const baseCmd = msg.content.split(' ')[0]
            console.log(baseCmd)
            // const cmd = modules.commandHandler.getCommand(baseCmd.slice(config.prefix.length).toLowerCase())
            //
            // if (cmd) {
            //     const guildState = modules.guildHandler.getGuild(msg.guild.id)
            //     const baseArgs = msg.content.split(' ').slice(1)
            //     cmd.handler(bot, msg, baseArgs, guildState)
            // } else modules.messageSender.error('Command not found', msg.channel)
        })

        this.client.on('debug', (m: string) => logger.debug(`[CLIENT] ${m}`))
        this.videoClient.on('debug', (m: string) => logger.debug(`[VIDEO CLIENT] ${m}`))

        await this.client.login(config.token)
        await this.videoClient.login(config.videoToken)
    }
}

logger.debugEnabled = config.debug
const bot = new Bot(config)
bot.login().catch((e: Error) => {
    logger.error(util.inspect(e))
})
