import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { InteractionMessage } from '../../domain/models/interactionMessage';
import { client } from '../../..';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Shows the current queue'),
  async execute(interaction: InteractionMessage) {
    if (!interaction.guildId) {
      await interaction.reply('This command only works in a server');
      return;
    }
    const queue = client.queue.get(interaction.guildId);
    if (!queue || !queue.songs.length) {
      await interaction.reply('The queue is empty');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Queue')
      .setFooter({
        text: `Volume: ${queue.volume}% | Playing: ${queue.playing ? 'Yes' : 'No'}`
      })
      .setColor('DarkBlue')
      .setThumbnail(queue.songs[0].thumbnail)
      .addFields([
        { name: 'Now Playing', value: queue.songs[0].title }
      ])
      .setDescription(queue.songs.map((song, index) => `${index + 1}. ${song.title}`).join('\n'));
      

    await interaction.reply({ embeds: [embed] });
  }
}