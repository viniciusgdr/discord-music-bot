import { SlashCommandBuilder } from 'discord.js';
import { InteractionMessage } from '../../domain/models/interactionMessage';
import { client } from '../../main';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the current song'),
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

    if (queue.player) {
      queue.player.stop();
      await interaction.reply('Stopped!');
      return;
    }

    return;
  }
}