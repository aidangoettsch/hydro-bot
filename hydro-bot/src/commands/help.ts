import commandHandler, { Command } from "./CommandHandler";
import Discord from "discord.js"

class Help implements Command {
  info = {
    command: 'help',
    alias: [],
    fullCommand: 'help [command]',
    shortDescription: '',
    longDescription: ''
  }

  execute(msg: Discord.Message, args: string[], guild: Discord.Guild): boolean | string {

  }
}

export default new Help()

exports.handler = (bot, msg, args, guild) => {
  const ms = bot.modules.messageSender
  const pf = bot.env.prefix
  const ch = bot.modules.commandHandler

  if (args.length === 0) {
    ms.customEmbed({
      title: ':blue_book: __❱❱ ALL COMMANDS ❱❱__',
      description: `To get specific command help, use **${pf}help [command]**`,
      color: 3530163, // Light Aqua Green
      fields: ch.getCommands().map(e => {
        return {
          name: pf + e.info.fullCommand,
          value: (e.info.shortDescription) ? e.info.shortDescription : `[No description]`
        }
      })
    }, msg.channel)
  } else if (args.length === 1) {
    const command = ch.getCommand(args[0].toLowerCase())
    if (!command) return ms.error(`Command not found! Use **${pf}help** to get a list of commands.`, msg.channel)

    ms.customEmbed({
      title: ':blue_book: __❱❱ COMMAND HELP ❱❱__',
      description: `Listing help documentation for command: **${args[0].toLowerCase()}**`,
      color: 3530163, // Light Aqua Green
      fields: [
        {
          name: 'Full Usage',
          value: pf + command.info.fullCommand
        },
        {
          name: 'Full Description',
          value: command.info.longDescription || '(Empty)'
        },
        {
          name: 'Aliases',
          value: command.info.alias.join(', ') || '(None)'
        }
      ]
    }, msg.channel)
  } else ms.error(`Invalid usage: **${pf}help [command]**`, msg.channel)
}

exports.info = {
  command: 'help',
  alias: [],
  fullCommand: 'help [command]',
  shortDescription: '',
  longDescription: ''
}
