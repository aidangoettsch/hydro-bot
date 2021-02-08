import Discord, {MessageEmbed} from "discord.js"
import logger from './Logger'
import util from "util"
import debugBase from "debug"
import CommandHandler from "./CommandHandler";
import EmbedFactory from "./EmbedFactory"
import GuildState from "./guild/GuildState";
import Downloader from "./downloader/Downloader";

export interface VideoConfig {
    resolutionMax: number
    resolutionSoftMin: number
    bitrate: string
    useNvenc: boolean
    useVaapi: boolean
    coupledAudioDelay: number
    separateAudioDelay: number
    rtBufferSize: string
    searchLimit: number
}

export interface Config {
    token: string
    videoToken: string
    prefix: string
    queuePageLength: number
    video: VideoConfig
}

export class Bot {
    private client: Discord.Client = new Discord.Client()
    videoClient: Discord.Client = new Discord.Client({tokenType: 'Bearer'})
    public commandHandler: CommandHandler = new CommandHandler(this)
    public embedFactory: EmbedFactory = new EmbedFactory(this)
    public config: Config
    public downloader: Downloader
    public version: string = require("../package.json").version
    public profilePicUrl: string | null = null;
    private guildMap: {[ id: string ]: GuildState } = {}

    constructor(config: Config) {
        this.config = config
        this.downloader = new Downloader(this.config.video)
    }

    getGuildState(id: string): GuildState {
        if (!this.guildMap[id]) {
            this.guildMap[id] = new GuildState(this, id)
        }
        return this.guildMap[id]
    }

    async login(): Promise<void> {
        this.client.on('ready', () => {
            if (!this.client.user) {
                logger.error("User is not present - cannot login")
                return
            }

            this.client.user.setPresence({
                activity: { name: `${this.config.prefix}help // v${this.version}` }
            })

            this.profilePicUrl = this.client.user.avatarURL({ size: 32 })

            logger.info('Bot started!')
            logger.info(`Invite Link: https://discordapp.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=8&scope=bot`)
        })

        this.client.on('message', (msg) => {
            if (!msg.content.startsWith(this.config.prefix) || msg.author.bot) return
            if (!msg.guild) {
                msg.channel.send(new MessageEmbed(this.embedFactory.error("Commands can only be used in a guild!")))
                return
            }

            const split = msg.content.split(' ')
            const baseCmd = split[0]
            const guildState = this.getGuildState(msg.guild.id)
            this.commandHandler.execute(baseCmd.slice(this.config.prefix.length).toLowerCase(), msg, split.slice(1), guildState)
                .catch((error: Error) => {
                    msg.channel.send(new MessageEmbed(this.embedFactory.error(error.message)))
                    logger.error(`Error processing message ${msg.content}`)
                    logger.error(util.inspect(error))
                })
        })

        this.client.on('debug', (m: string) => debugBase('hydro-bot:discordjs-client')(`[CLIENT] ${m}`))
        this.videoClient.on('debug', (m: string) => debugBase('hydro-bot:discordjs-video')(`[VIDEO CLIENT] ${m}`))

        await this.client.login(this.config.token)
        await this.videoClient.login(this.config.videoToken)
    }
}

const bot = new Bot(require("../config/config.json"))
bot.login().catch((e: Error) => {
    logger.error("Error logging in:")
    logger.error(util.inspect(e))
})
