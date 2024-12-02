import { GuildMember, SlashCommandBuilder, VoiceBasedChannel } from 'discord.js';
import { InteractionMessage } from '../../domain/models/interactionMessage';
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnectionStatus } from '@discordjs/voice';
import { getVideoInfoY2Mate, searchY2Mate, Vitens, VitensClass } from '../../services/y2mate';
import fetch from 'node-fetch';
import { client } from '../../main';
import { searchYT } from '../../services/yt';
import { SongQueue } from '../../domain/models/queue';
import { fetchPlaylistVideos, isPlaylist } from '../../services/youtube/playlist';
async function createDownloadStream(url: string) {
	const response = await fetch(url);
	return response.body
}

async function playlistQueue(playlistId: string, interaction: InteractionMessage, channel: VoiceBasedChannel) {
	const videos = await fetchPlaylistVideos(playlistId);
	await interaction.editReply(`Found ${videos.length} videos in playlist`);
	const queue = client.queue.get(interaction.guildId!);
	let hasQueue = queue && queue.songs.length > 0;
	let queueConstruct = queue || {
		textChannel: interaction.channel,
		voiceChannel: channel,
		songs: [],
		volume: 100,
		playing: true,
		player: null,
		connection: null
	};

	const processVideo = async (video: any) => {
		const item = new VitensClass({
			t: 'Youtube Video',
			v: video.videoId
		});
		const info = await getVideoInfoY2Mate(item);
		const highAudio = info.getHighAudio();
		if (!highAudio) {
			return;
		}
		if (!hasQueue) {
			hasQueue = true;
			const url = await info.getUrl(highAudio);
			queueConstruct.songs.push({ 
				title: info.title, 
				url, 
				highAudio,
				info,
				thumbnail: `https://i.ytimg.com/vi/${info.vid}/maxresdefault.jpg`
			});
			client.queue.set(interaction.guildId!, queueConstruct);
			play(channel, queueConstruct.songs[0]);
			return
		}
		queueConstruct.songs.push({ 
			title: info.title, 
			highAudio,
			info,
			thumbnail: `https://i.ytimg.com/vi/${info.vid}/maxresdefault.jpg`
		});
		client.queue.set(interaction.guildId!, queueConstruct);
	};

	const firstVideo = videos.shift();
	if (firstVideo) {
		await processVideo(firstVideo);
		await interaction.editReply(`Playing: ${queueConstruct.songs[0].title}`);
	}

	for (let i = 0; i < videos.length; i++) {
		if (i === 0) {
			continue;
		}
		await processVideo(videos[i]);
		await interaction.editReply(`Added to queue: ${queueConstruct.songs[i].title} - ${i + 1}/${videos.length}`);
	}

	await interaction.followUp(`Added ${videos.length + 1} songs to queue`);
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

		await interaction.reply('Identificando...');

		const isYoutubeURL = song.match(/^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+/);
		let item: VitensClass;

		if (isYoutubeURL) {
			const videoIdExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
			const videoId = song.match(videoIdExp);

			item = new VitensClass({
				t: 'Youtube Video',
				v: videoId![1],
			})

			const isPlaylistURL = isPlaylist(song);
			if (isPlaylistURL) {
				await interaction.editReply('Buscando na playlist...');
				const playlistId = song.match(/(?:list=)([a-zA-Z0-9_-]+)/);
				if (playlistId) {
					await playlistQueue( playlistId[1], interaction, channel);
					return;
				}
			}
		} else {
			await interaction.editReply('Buscando na rede...');
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
		await interaction.editReply('Obtendo Conexão IP...');
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
				highAudio,
				info,
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
					highAudio,
					info,
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
			client.queue.delete(channel.guild.id);
			connection.destroy();
			return;
		}
		play(channel, queue.songs[0]);
	})
	const url = song?.url || (await song.info.getUrl(song.highAudio))
	if (!url.includes('https://')) {
		return;
	}
	console.log('streaming', url)
	const stream = await createDownloadStream(
		url
	)
	
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