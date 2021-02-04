exports.handler = async (bot, msg, args, guild) => {
  const cl = bot.modules.consoleLogger
  const ms = bot.modules.messageSender
  const pf = bot.env.prefix

  const pageLength = 5
  const queue = guild.voiceState.queue

  // Default embed, when no tracks are queued
  const embed = {
    title: ':notepad_spiral: **❱❱ QUEUE ❱❱**',
    description: `The queue is currently empty. Use **${pf}play <url>** to queue a track.`,
    color: parseInt('676767', 16) // Gray
  }

  // Command logic & result sending
  if (guild.voiceState.nowPlaying) {
    const nowPlaying = guild.voiceState.nowPlaying
    let data = []

    // Custom titling for currently playing track
    data.push({
      name: `NP | ${nowPlaying.title}`,
      value: `[${nowPlaying.duration.format('d[d] h[h] m[m] s[s]')}] - Uploaded by **${nowPlaying.uploader}** - Requested by ${nowPlaying.requester}`
    })

    // Numbers & Formats the rest of queue based on embed field format
    let counter = 2
    queue.forEach((track) => {
      data.push({
        name: `#${counter} | ${track.title}`,
        value: `[${track.duration.format('d[d] h[h] m[m] s[s]')}] - Uploaded by **${track.uploader}** - Requested by ${track.requester}`
      })
      counter++
    })

    const pageNum = args[0] || 1
    const maxPage = Math.ceil(data.length / pageLength)

    if (isNaN(pageNum) || pageNum > maxPage || pageNum < 1) {
      embed.description = `Invalid page number! Page number should be **between 1 and ${maxPage}.**`
      embed.color = parseInt('ff4f4f', 16) // Light Red
    } else {
      embed.description = `Showing Page **[${pageNum} / ${maxPage}]** | Total Tracks: **${data.length}**\n` +
                          `Use **${pf}queue {page #}** to specify the page number.`

      embed.color = parseInt('b634eb', 16) // Purple
      embed.fields = data.slice(pageLength * (pageNum - 1), pageLength * pageNum)
    }
  }

  ms.customEmbed(embed, msg.channel, 0)
}

exports.info = {
  command: 'queue',
  alias: [],
  fullCommand: 'queue {page #}',
  shortDescription: '',
  longDescription: ''
}
