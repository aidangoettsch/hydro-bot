exports.handler = async (bot, msg, args, guild) => {
  const ms = bot.modules.messageSender
  const cl = bot.modules.consoleLogger
  const vh = guild.voiceHandler
  const pf = bot.env.prefix
  const voiceState = guild.voiceState

  if (args.length !== 0) return ms.error(`Invalid usage: **${pf}skip**`, msg.channel)
  else if (!guild.voiceState.voiceConnection) return ms.error(`The bot is not in voice!`, msg.channel)
  else if (!msg.member.voice.channel || (msg.member.voice.channel.id !== guild.voiceState.voiceConnection.channel.id)) return ms.error(`You must be in the bot's voice channel!`, msg.channel)

  let embed = {
    title: ':track_next: **❱❱ SKIP VOTE ❱❱**'
  }

  const voteHandler = voiceState.voteHandlers.skip

  if (voteHandler.voterExists(msg.author.id)) {
    embed.description = `${msg.member.toString()}, you've already cast a vote.`
    embed.color = parseInt('0xff2e00')
  } else {
    voteHandler.addVoter(msg.author.id)
    const voiceMembers = voiceState.voiceConnection.channel.members.map((member) => member.id)
    const total = voiceMembers.length - 1
    const tempResults = voteHandler.getResults(voiceMembers, total)
    const result = tempResults[0]
    const votes = tempResults[1]

    if (msg.member.roles.cache.find(e => e.name.toUpperCase() === 'DJ')) {
      await vh.skipTrack()

      embed.description = 'Skipping track... **[DJ\'s request]**'
      embed.color = parseInt('0x00ff6e')
    } else if (result === 'PASSING') {
      await vh.skipTrack()

      embed.description = `Skipping track... **[${votes} / ${total}]**`
      embed.color = parseInt('0x00ff6e')
    } else if (result === 'FAILED') {
      embed.description = `${msg.member.toString()}, your vote has been placed. **[${votes} / ${total}]** (Vote needs at least **${Math.floor(total * 0.75)}** votes to pass)`
      embed.color = parseInt('0xffa100')
    }
  }

  ms.customEmbed(embed, msg.channel)
}

exports.info = {
  command: 'skip',
  alias: [],
  fullCommand: 'skip',
  shortDescription: 'Places a vote to skip the current track (Users with a "DJ" role can override)',
  longDescription: ''
}
