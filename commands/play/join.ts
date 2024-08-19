import { GuildMember, SlashCommandBuilder } from 'discord.js';
import { InteractionMessage } from '../../domain/models/interactionMessage';
import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';

export default {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Joins a voice channel.'),
	async execute(interaction: InteractionMessage) {
		const member = interaction.member as GuildMember
		const channel = member.voice.channel;
		if (!channel) {
			await interaction.reply('You need to join a voice channel first!');
			return;
		}

    const permissions = channel.permissionsFor(interaction.client.user)
    if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
      await interaction.reply('I need the permissions to join and speak in your voice channel!');
      return;
    }

    const connection = getVoiceConnection(channel.guild.id) ?? joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      debug: true
    });
    if (connection?.rejoin) {
      connection.rejoin();
      await interaction.reply('Successfully rejoined!');
      return;
    }

    await interaction.reply('Successfully joined!');
  }
}