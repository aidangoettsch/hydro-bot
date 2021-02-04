"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const config_json_1 = __importDefault(require("../config/config.json"));
const package_json_1 = require("../package.json");
const Logger_1 = __importDefault(require("./modules/Logger"));
const util_1 = __importDefault(require("util"));
class Bot {
    constructor(config) {
        this.client = new discord_js_1.default.Client();
        this.videoClient = new discord_js_1.default.Client({ tokenType: 'Bearer' });
        this.config = config;
    }
    async login() {
        this.client.on('ready', () => {
            if (!this.client.user) {
                Logger_1.default.error("User is not present - cannot login");
                return;
            }
            this.client.user.setPresence({
                activity: { name: `${this.config.prefix}help // v${package_json_1.version}` }
            });
            Logger_1.default.info('Bot started!');
            Logger_1.default.info(`Invite Link: https://discordapp.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=8&scope=bot`);
        });
        this.client.on('message', (msg) => {
            if (!msg.content.startsWith(this.config.prefix) || msg.author.bot)
                return;
            const baseCmd = msg.content.split(' ')[0];
            console.log(baseCmd);
            // const cmd = modules.commandHandler.getCommand(baseCmd.slice(config.prefix.length).toLowerCase())
            //
            // if (cmd) {
            //     const guildState = modules.guildHandler.getGuild(msg.guild.id)
            //     const baseArgs = msg.content.split(' ').slice(1)
            //     cmd.handler(bot, msg, baseArgs, guildState)
            // } else modules.messageSender.error('Command not found', msg.channel)
        });
        this.client.on('debug', (m) => Logger_1.default.debug(`[CLIENT] ${m}`));
        this.videoClient.on('debug', (m) => Logger_1.default.debug(`[VIDEO CLIENT] ${m}`));
        await this.client.login(config_json_1.default.token);
        await this.videoClient.login(config_json_1.default.videoToken);
    }
}
Logger_1.default.debugEnabled = config_json_1.default.debug;
const bot = new Bot(config_json_1.default);
bot.login().catch((e) => {
    Logger_1.default.error(util_1.default.inspect(e));
});
