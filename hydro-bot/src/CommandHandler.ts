import Discord from "discord.js"
import {Bot} from "./bot";
import GuildState from "./guild/GuildState";
import Help from "./commands/Help";
import Leave from "./commands/Leave";
import NowPlaying from "./commands/NowPlaying";
import Play from "./commands/Play";
import Queue from "./commands/Queue";
import Skip from "./commands/Skip";
import Volume from "./commands/Volume";
import Command from "./commands/Command";

const commands = [
    Help,
    Leave,
    NowPlaying,
    Play,
    Queue,
    Skip,
    Volume,
]

export default class CommandHandler {
    public commands: Command[]
    public commandMap: Map<string, Command> = new Map()
    constructor(private bot: Bot) {
        this.commands = commands.map(c => new c(bot, this))

        for (const command of this.commands) {
            this.commandMap.set(command.info.command, command)
            command.info.alias.forEach(a => this.commandMap.set(a, command))
        }
    }

    execute(commandName: string, msg: Discord.Message, args: string[], state: GuildState): Promise<void> {
        const command = this.commandMap.get(commandName)
        if (!command) return Promise.reject(new Error("No such command"))
        return command.execute(msg, args, state)
    }
}
