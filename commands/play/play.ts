import { GuildMember, SlashCommandBuilder, VoiceBasedChannel } from 'discord.js';
import { InteractionMessage } from '../../domain/models/interactionMessage';
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnectionStatus } from '@discordjs/voice';
import { getVideoInfoY2Mate, searchY2Mate, Vitens, VitensClass } from '../../services/y2mate';
import fetch from 'node-fetch';
import { client } from '../..';
import { searchYT } from '../../services/yt';
import { SongQueue } from '../../domain/models/queue';
async function createDownloadStream(url: string) {
	const response = await fetch(url);
	return response.body
}
export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays a song.')
		.addStringOption(option =>
			option.setName('song')
				.setDescription('The song to play')
				.setRequired(true)),
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

		const song = interaction.options.getString('song');
		if (!song) {
			await interaction.reply('You need to provide a song to play!');
			return;
		}

		await interaction.reply('Searching...');

		const isYoutubeURL = song.match(/^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+/);
		let item: VitensClass;
		if (isYoutubeURL) {
			item = new VitensClass({
				t: 'Youtube Video',
				v: song,
			})
		} else {
			const search = await searchYT(song);
			if (!search.length) {
				await interaction.reply('No results found!');
				return;
			}
			item = new VitensClass({
				v: search[0].videoId,
				t: search[0].title,
			});
		}
		const info = await getVideoInfoY2Mate(item);
		const highAudio = info.getHighAudio();
		if (!highAudio) {
			await interaction.reply('No audio found!');
			return;
		}
		const url = await info.getUrl(highAudio);

		const queue = client.queue.get(interaction.guildId!);
		if (queue) {
			queue.songs.push({ 
				title: info.title, 
				url, 
				thumbnail: `https://i.ytimg.com/vi/${info.vid}/maxresdefault.jpg`
			});
			await interaction.editReply(`Added to queue: ${info.title}`);
			client.queue.set(interaction.guildId!, queue);
			return;
		}
		const queueConstruct = {
			textChannel: interaction.channel,
			voiceChannel: channel,
			songs: [
				{
					title: info.title,
					url,
					thumbnail: `https://i.ytimg.com/vi/${info.vid}/maxresdefault.jpg`
				}
			],
			volume: 100,
			playing: true,
			player: null,
			connection: null
		};
		client.queue.set(interaction.guildId!, queueConstruct);
		await interaction.editReply(`Playing: ${info.title}`);

		play(channel, queueConstruct.songs[0])
	},
};

async function probeAndCreateResource(readableStream: NodeJS.ReadableStream) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, { inputType: type });
}

export async function play(channel: VoiceBasedChannel, song: SongQueue) {
	const queue = client.queue.get(channel.guild.id);
	if (!queue) {
		client.queue.delete(channel.guild.id);
		return;
	}

	
	const connection = getVoiceConnection(channel.guild.id) ?? joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: channel.guild.voiceAdapterCreator,
		debug: true
	});
	const player = createAudioPlayer({
		behaviors: {
			noSubscriber: NoSubscriberBehavior.Pause
		}
	})
	player.on(AudioPlayerStatus.Idle, () => {
		queue.songs.shift();
		if (queue.songs.length === 0) {
			player.stop();
			connection.destroy();
			return;
		}
		play(channel, queue.songs[0]);
	})
	const stream = await createDownloadStream(song.url)
	
	const mp3Stream = await probeAndCreateResource(stream)
	player.play(mp3Stream);
	connection.subscribe(player)
	connection.on('stateChange', async (_, newState) => {
		if (newState.status === VoiceConnectionStatus.Disconnected) {
			connection.destroy()
		}
	})
	queue.player = player;
	queue.connection = connection;
}