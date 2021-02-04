exports.handler = (bot, msg, args, guild) => {
  const ms = bot.modules.messageSender
  const vh = guild.voiceHandler
  const pf = bot.env.prefix
  const voiceState = guild.voiceState

  let embed = {
    title: ':track_next: **❱❱ LEAVE VOTE ❱❱**'
  }

  const voteHandler = voiceState.voteHandlers.leave

  if (voteHandler.voterExists(msg.author.id)) {
    embed.description = `${msg.member.toString()}, you've already cast a vote.`
    embed.color = parseInt('0xff2e00')
  } else {
    voteHandler.addVoter(msg.author.id)
    if (!voiceState.voiceConnection) {
      ms.error("Not yet connected to voice", msg.channel)
      return
    }
    const voiceMembers = voiceState.voiceConnection.channel.members.map((member) => member.id)
    const total = voiceMembers.length - 1
    const tempResults = voteHandler.getResults(voiceMembers, total)
    const result = tempResults[0]
    const votes = tempResults[1]

    if (msg.member.roles.cache.find(e => e.name.toUpperCase() === 'DJ')) {
      vh.leaveVoice()

      embed.description = 'Disconnecting bot... **[DJ\'s request]**'
      embed.color = parseInt('0x00ff6e')
    } else if (result === 'PASSING') {
      vh.leaveVoice()

      embed.description = `Disconnecting bot... **[${votes} / ${total}]**`
      embed.color = parseInt('0x00ff6e')
    } else if (result === 'FAILED') {
      embed.description = `${msg.member.toString()}, your vote has been placed. **[${votes} / ${total}]** (Vote needs at least **${Math.floor(total * 0.75)}** votes to pass)`
      embed.color = parseInt('0xffa100')
    }
  }

  ms.customEmbed(embed, msg.channel)
}

exports.info = {
  command: 'leave',
  alias: [],
  fullCommand: 'leave',
  shortDescription: '',
  longDescription: ''
}
