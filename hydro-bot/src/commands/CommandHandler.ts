import Discord from "discord.js"

import help from "./help"

export interface CommandInfo {
    command: string
    alias: string[]
    fullCommand: string
    shortDescription: string
    longDescription: string
}

export interface Command {
    info: CommandInfo

    execute(msg: Discord.Message, args: string[], guild: Discord.Guild, commandHandler: CommandHandler): boolean | string
}

export class CommandHandler {
    commands: Command[]
    commandMap: Map<string, Command> = new Map()
    constructor(commands: Command[]) {
        this.commands = commands

        for (const command of this.commands) {
            this.commandMap.set(command.info.command, command)
            command.info.alias.forEach(a => this.commandMap.set(a, command))
        }
    }

    execute(commandName: string, msg: Discord.Message, args: string[], guild: Discord.Guild): boolean | string {
        const command = this.commandMap.get(commandName)
        if (!command) return false
        return command.execute(msg, args, guild, this)
    }
}

export default new CommandHandler([

])
