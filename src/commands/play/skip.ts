import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { InteractionMessage } from '../../domain/models/interactionMessage';
import { client } from '../../main';
import { play } from './play';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the current song'),
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

    if (queue.songs.length === 1 && queue.connection) {
      queue.connection.destroy();
      client.queue.delete(interaction.guildId);
      await interaction.reply('Queue cleared!');
      return;
    }

    queue.songs.shift();
    play(queue.voiceChannel, queue.songs[0]);

    await interaction.reply('Skipped!');
  }
}