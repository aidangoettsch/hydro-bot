import Discord, {MessageEmbed} from "discord.js"
import GuildState from "../guild/GuildState";
import Command from "./Command";

export default class Help extends Command {
  info = {
    command: 'help',
    alias: [],
    fullCommand: 'help [command]',
    shortDescription: '',
    longDescription: ''
  }

  async execute(msg: Discord.Message, args: string[], guild: GuildState): Promise<void> {
    if (args.length === 0) {
      msg.channel.send(new MessageEmbed({
        title: ':blue_book: __❱❱ ALL COMMANDS ❱❱__',
        description: `To get specific command help, use **${this.bot.config.prefix}help [command]**`,
        color: 3530163, // Light Aqua Green
        fields: this.commandHandler.commands.map(e => {
          return {
            name: this.bot.config.prefix + e.info.fullCommand,
            value: (e.info.shortDescription) ? e.info.shortDescription : `[No description]`
          }
        }),
        footer: this.bot.embedFactory.footer
      }))
    } else if (args.length === 1) {
      const command = this.commandHandler.commandMap.get(args[0].toLowerCase())
      if (!command) {
        msg.channel.send(
            this.bot.embedFactory.error(`Command not found! Use **${this.bot.config.prefix}help** to get a list of commands.`)
        )
        return
      }

      msg.channel.send(new MessageEmbed({
        title: ':blue_book: __❱❱ COMMAND HELP ❱❱__',
        description: `Listing help documentation for command: **${args[0].toLowerCase()}**`,
        color: 3530163, // Light Aqua Green
        fields: [
          {
            name: 'Full Usage',
            value: this.bot.config.prefix + command.info.fullCommand
          },
          {
            name: 'Full Description',
            value: command.info.longDescription || '(Empty)'
          },
          {
            name: 'Aliases',
            value: command.info.alias.join(', ') || '(None)'
          }
        ],
        footer: this.bot.embedFactory.footer
      }))
    } else msg.channel.send(
        this.bot.embedFactory.error(`Invalid usage: **${this.bot.config.prefix}help [command]**`)
    )
  }
}
