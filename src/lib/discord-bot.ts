import fs from "node:fs";
import path from "node:path";
import { Client, Events, GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "./logger";
import {
  addActivity,
  getState,
  recordAction,
  recordCommandUse,
  syncServers,
  type ModerationAction,
} from "./bot-store";

let client: Client | undefined;
let botStatus: "online" | "offline" | "setup_required" = "setup_required";
let connectedAt: string | null = null;
let latency = 0;

function getConfiguredToken() {
  const environmentToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (environmentToken) return environmentToken;

  const configPath = path.resolve(process.env.DISCORD_BOT_CONFIG ?? "bot-config.json");
  if (!fs.existsSync(configPath)) return undefined;

  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as { token?: unknown };
  return typeof config.token === "string" && config.token.trim() ? config.token.trim() : undefined;
}

const slashCommands = [
  { name: "ping", description: "Check the bot response time" },
  { name: "help", description: "Show available commands" },
  { name: "server", description: "Show server health and member stats" },
  {
    name: "poll",
    description: "Start a quick community poll",
    options: [
      {
        name: "question",
        description: "The question to ask",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "warn",
    description: "Issue a documented warning",
    options: [
      { name: "member", description: "The member to warn", type: 6, required: true },
      { name: "reason", description: "Why the warning is being issued", type: 3, required: true },
    ],
  },
  {
    name: "mute",
    description: "Temporarily restrict a member",
    options: [
      { name: "member", description: "The member to mute", type: 6, required: true },
      { name: "reason", description: "Why the member is being muted", type: 3, required: true },
    ],
  },
];

async function findMember(serverId: string, userId: string) {
  if (!client) return undefined;
  const guild = await client.guilds.fetch(serverId);
  return guild.members.fetch(userId).catch(async () => {
    const matches = await guild.members.search({ query: userId, limit: 1 });
    return matches.first();
  });
}

export async function applyLiveModerationAction(
  serverId: string,
  userId: string,
  action: ModerationAction,
  reason: string,
) {
  if (getBotStatus().mode !== "live" || getBotStatus().status !== "online") return;
  const member = await findMember(serverId, userId);
  if (!member) throw new Error("Discord member could not be found in this server");

  if (action === "warn") {
    await member.send(`A moderator warning was issued: ${reason}`);
  } else if (action === "mute") {
    await member.timeout(10 * 60 * 1000, reason);
  } else if (action === "kick") {
    await member.kick(reason);
  } else if (action === "ban") {
    await member.ban({ reason });
  }
  recordAction();
}

async function replyToCommand(interaction: ChatInputCommandInteraction) {
  recordCommandUse(interaction.commandName);
  addActivity({
    kind: "command",
    title: `/${interaction.commandName} used`,
    detail: `${interaction.guild?.name ?? "Direct message"} · by ${interaction.user.username}`,
    timestamp: "just now",
    tone: "purple",
  });

  if (interaction.commandName === "ping") {
    await interaction.reply(`Pong — ${Math.max(0, latency)}ms`);
    return;
  }

  if (interaction.commandName === "help") {
    const commands = getState().commands
      .filter((command) => command.enabled)
      .map((command) => `/${command.name} — ${command.description}`)
      .join("\n");
    await interaction.reply(`Available commands:\n${commands}`);
    return;
  }

  if (interaction.commandName === "server") {
    const guild = interaction.guild;
    await interaction.reply(
      `${guild?.name ?? "This server"} has ${guild?.memberCount ?? "your"} members. The command center is watching.`,
    );
    return;
  }

  if (interaction.commandName === "poll") {
    const question = interaction.options.getString("question", true);
    await interaction.reply(`Poll started: ${question}\nReact with the option you choose.`);
    return;
  }

  if (interaction.commandName === "warn" || interaction.commandName === "mute") {
    const member = interaction.options.getMember("member");
    const reason = interaction.options.getString("reason", true);
    if (!member || !("user" in member)) {
      await interaction.reply("I could not find that member.");
      return;
    }
    await applyLiveModerationAction(
      interaction.guildId ?? "",
      member.user.id,
      interaction.commandName,
      reason,
    );
    await interaction.reply(`${interaction.commandName} applied to ${member.user.username}.`);
  }
}

export async function startDiscordBot() {
  const token = getConfiguredToken();
  if (!token) {
    botStatus = "setup_required";
    return;
  }

  syncServers([]);
  client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences] });
  const syncDiscordServers = (readyClient: Client) => {
    syncServers(
      readyClient.guilds.cache.map((guild) => ({
        id: guild.id,
        name: guild.name,
        initials: guild.name.slice(0, 2).toUpperCase(),
        memberCount: guild.memberCount ?? 0,
        onlineCount: guild.presences.cache.size,
        status: "healthy" as const,
        accent: "violet",
      })),
    );
  };
  client.once(Events.ClientReady, async (readyClient) => {
    botStatus = "online";
    connectedAt = new Date().toISOString();
    latency = Math.max(0, readyClient.ws.ping);
    await readyClient.application.commands.set(slashCommands);
    syncDiscordServers(readyClient);
    const syncTimer = setInterval(() => {
      if (client?.isReady()) syncDiscordServers(client);
    }, 30000);
    syncTimer.unref();
    logger.info({ username: readyClient.user.username }, "Discord bot connected");
  });
  client.on(Events.ShardDisconnect, () => {
    botStatus = "offline";
  });
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await replyToCommand(interaction);
    } catch (error) {
      logger.error({ err: error }, "Discord command failed");
    }
  });

  try {
    await client.login(token);
  } catch (error) {
    botStatus = "offline";
    logger.error({ err: error }, "Discord bot could not connect");
  }
}

export function getBotStatus() {
  if (!getConfiguredToken()) {
    return {
      mode: "demo" as const,
      status: "setup_required" as const,
      label: "Demo mode · token not configured",
      latency: 0,
      connectedAt: null,
    };
  }

  return {
    mode: "live" as const,
    status: botStatus,
    label:
      botStatus === "online"
        ? "Live connection · watching your servers"
        : botStatus === "offline"
          ? "Connection failed · check the bot token"
          : "Connecting to Discord",
    latency,
    connectedAt,
  };
}