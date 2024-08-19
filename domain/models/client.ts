import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { Client, Collection, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { SongQueue } from './queue';

export type DiscordClient = Client<boolean> & {
  commands: Collection<string, any>
  // guild id
  queue: Map<string, {
    textChannel: TextBasedChannel | null;
    player: AudioPlayer | null;
    connection: VoiceConnection | null;
    voiceChannel: VoiceBasedChannel;
    songs: SongQueue[];
    volume: number;
    playing: boolean;
  }>
}
