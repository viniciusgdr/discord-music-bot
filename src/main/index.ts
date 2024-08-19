import { ActivityType, Client, Collection, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { DiscordClient } from '../domain/models/client';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
}) as DiscordClient;

client.on('ready', () => {
  console.log(`Logged in as ${client.user!.tag}!`);
});

const commands: any[] = [];

async function loadCommands() {
  client.commands = new Collection();
  client.queue = new Map();
  const foldersPath = path.join(__dirname, '..', 'commands');
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = (await import(filePath)).default;
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        client.commands.set(command.data.name, command);
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }
  console.log(`Started refreshing ${commands.length} application (/) commands.`);

  // The put method is used to fully refresh all commands in the guild with the current set
  const res: unknown = await rest.put(
    Routes.applicationCommands(CLIENT_ID!),
    { body: commands },
  );

  console.log(`Successfully reloaded ${(res as any[]).length} application (/) commands.`);
}

(async () => {
  try {

    await loadCommands();

    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand()) return;
      // @ts-ignore
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
    });

    await client.login(TOKEN);
    client.user!.setActivity({
      name: 'music 🎵',
      type: ActivityType.Playing,
    })
  } catch (error) {
    console.error(error);
  }
})()