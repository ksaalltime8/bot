require("dotenv").config();

const http = require("http");

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActivityType,
    EmbedBuilder
} = require("discord.js");

const axios = require("axios");

const {
    connectDatabase,
    getGuildConfig
} = require("./database/mongodb");

const {
    startKickChecker
} = require("./services/kickChecker");

// ==========================================
// ENV
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const PORT = Number(process.env.PORT) || 5000;

// ==========================================
// ENV CHECK
// ==========================================

console.log("🔎 Checking environment...");

console.log(
    `🔐 Token: ${TOKEN ? "FOUND" : "MISSING"}`
);

console.log(
    `🆔 Client ID: ${CLIENT_ID ? "FOUND" : "MISSING"}`
);

console.log(
    `🏠 Guild ID: ${GUILD_ID ? "FOUND" : "MISSING"}`
);

console.log(
    `🍃 MongoDB: ${
        process.env.MONGODB_URI
            ? "FOUND"
            : "MISSING"
    }`
);

if (!TOKEN) {
    throw new Error("DISCORD_TOKEN is missing.");
}

if (!CLIENT_ID) {
    throw new Error("CLIENT_ID is missing.");
}

if (!GUILD_ID) {
    throw new Error("GUILD_ID is missing.");
}

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing.");
}

// ==========================================
// WEB SERVER
// ==========================================

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type":
            "text/plain; charset=utf-8"
    });

    res.end(
        "Discord bot is online!"
    );
});

server.on("error", error => {
    console.error(
        "❌ Web server error:",
        error
    );
});

server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `🌐 Web server listening on ${PORT}`
        );
    }
);

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ==========================================
// /LIVE COMMAND
// ==========================================

const liveCommand =
    new SlashCommandBuilder()
        .setName("live")
        .setDescription(
            "Manage KICK live alerts"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription(
                    "Set up KICK live alerts"
                )

                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription(
                            "KICK channel link"
                        )
                        .setRequired(true)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "Discord alert channel"
                        )
                        .addChannelTypes(
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription(
                    "Disable KICK live alerts"
                )
        );

// ==========================================
// /LIVECHECK
// ==========================================

const liveCheckCommand =
    new SlashCommandBuilder()
        .setName("livecheck")
        .setDescription(
            "Check if iik27 is live on KICK"
        );

// ==========================================
// BUSINESS
// ==========================================

let businessCommand = null;

try {
    businessCommand =
        require(
            "./commands/utility/business"
        );

    console.log(
        "✅ /business loaded"
    );

} catch (error) {
    console.error(
        "❌ /business could not be loaded:",
        error
    );
}

// ==========================================
// COMMANDS
// ==========================================

const commands = [
    liveCommand.toJSON(),
    liveCheckCommand.toJSON()
];

if (
    businessCommand &&
    businessCommand.data
) {
    commands.push(
        businessCommand.data.toJSON()
    );
}

console.log(
    `📦 ${commands.length} commands ready`
);

// ==========================================
// REGISTER COMMANDS
// ==========================================

async function registerCommands() {
    console.log(
        "📋 Registering Discord commands..."
    );

    const rest =
        new REST({
            version: "10",
            timeout: 15000
        }).setToken(TOKEN);

    try {
        const result =
            await rest.put(
                Routes.applicationGuildCommands(
                    CLIENT_ID,
                    GUILD_ID
                ),
                {
                    body: commands
                }
            );

        console.log(
            "✅ Discord commands registered!"
        );

        console.log(
            `📦 ${result.length} command(s)`
        );

        return true;

    } catch (error) {
        console.error(
            "❌ Command registration failed:",
            error
        );

        return false;
    }
}

// ==========================================
// KICK API
// ==========================================

async function getKickChannel(username) {
    if (!username) {
        return null;
    }

    try {
        const response =
            await axios.get(
                `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
                {
                    headers: {
                        Accept:
                            "application/json",

                        "User-Agent":
                            "Mozilla/5.0"
                    },

                    timeout: 10000
                }
            );

        return response.data || null;

    } catch (error) {
        console.error(
            "❌ KICK API error:",
            error.response?.status ||
            error.code ||
            error.message
        );

        return null;
    }
}

// ==========================================
// /LIVECHECK
// ==========================================

async function handleLiveCheck(
    interaction
) {
    try {
        await interaction.deferReply();

        const username = "iik27";

        console.log(
            `📺 Checking ${username}...`
        );

        const data =
            await getKickChannel(
                username
            );

        if (!data) {
            return interaction.editReply(
                "❌ KICK could not be reached right now."
            );
        }

        const isLive =
            data.livestream != null;

        if (!isLive) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x2b2d31)
                        .setTitle(
                            "⚫ iik27 is offline"
                        )
                        .setDescription(
                            "**iik27 is not live right now.**"
                        )
                        .setFooter({
                            text:
                                "KICK Live Check"
                        })
                        .setTimestamp()
                ]
            });
        }

        const stream =
            data.livestream || {};

        const title =
            stream.session_title ||
            stream.stream_title ||
            "Live now!";

        const category =
            stream.category?.name ||
            "Unknown";

        const viewers =
            stream.viewer_count ?? 0;

        const kickUrl =
            `https://kick.com/${username}`;

        const embed =
            new EmbedBuilder()
                .setColor(0x53fc18)

                .setTitle(
                    "🔴 iik27 is LIVE!"
                )

                .setURL(kickUrl)

                .setDescription(
                    `**${String(title).slice(0, 4000)}**`
                )

                .addFields(
                    {
                        name:
                            "🎮 Category",
                        value:
                            `\`${String(category).slice(0, 100)}\``,
                        inline: true
                    },
                    {
                        name:
                            "👀 Viewers",
                        value:
                            `\`${Number(viewers).toLocaleString()}\``,
                        inline: true
                    }
                )

                .setFooter({
                    text:
                        "KICK Live Check"
                })

                .setTimestamp();

        return interaction.editReply({
            embeds: [embed]
        });

    } catch (error) {
        console.error(
            "❌ /livecheck error:",
            error
        );

        if (
            interaction.deferred ||
            interaction.replied
        ) {
            return interaction.editReply(
                "❌ Error checking KICK."
            ).catch(() => {});
        }
    }
}

// ==========================================
// /LIVE
// ==========================================

async function handleLive(
    interaction
) {
    try {
        await interaction.deferReply({
            ephemeral: true
        });

        const subcommand =
            interaction.options.getSubcommand();

        if (
            subcommand === "setup"
        ) {
            const link =
                interaction.options.getString(
                    "link"
                );

            const channel =
                interaction.options.getChannel(
                    "channel"
                );

            let url;

            try {
                url = new URL(link);

            } catch {
                return interaction.editReply(
                    "❌ Invalid KICK URL."
                );
            }

            const hostname =
                url.hostname.toLowerCase();

            if (
                hostname !== "kick.com" &&
                hostname !== "www.kick.com"
            ) {
                return interaction.editReply(
                    "❌ Please use a KICK URL."
                );
            }

            const parts =
                url.pathname
                    .split("/")
                    .filter(Boolean);

            const username =
                parts[0];

            if (!username) {
                return interaction.editReply(
                    "❌ KICK username not found."
                );
            }

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            config.kickLive = {
                enabled: true,
                username:
                    username
                        .trim()
                        .toLowerCase(),
                channelId:
                    channel.id,
                lastLive: false
            };

            await config.save();

            return interaction.editReply(
                `🔴 **KICK live alerts enabled!**\n\n` +
                `🎥 Streamer: **${username}**\n` +
                `📢 Channel: ${channel}\n` +
                `🔗 https://kick.com/${username}`
            );
        }

        if (
            subcommand === "disable"
        ) {
            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            config.kickLive = {
                enabled: false,
                username:
                    config.kickLive?.username ||
                    "",
                channelId:
                    config.kickLive?.channelId ||
                    "",
                lastLive: false
            };

            await config.save();

            return interaction.editReply(
                "✅ KICK live alerts disabled."
            );
        }

    } catch (error) {
        console.error(
            "❌ /live error:",
            error
        );

        if (
            interaction.deferred ||
            interaction.replied
        ) {
            return interaction.editReply(
                "❌ Something went wrong."
            ).catch(() => {});
        }
    }
}

// ==========================================
// INTERACTIONS
// ==========================================

client.on(
    "interactionCreate",
    async interaction => {
        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        console.log(
            `📥 Received /${interaction.commandName}`
        );

        try {
            if (
                interaction.commandName ===
                "live"
            ) {
                return await handleLive(
                    interaction
                );
            }

            if (
                interaction.commandName ===
                "livecheck"
            ) {
                return await handleLiveCheck(
                    interaction
                );
            }

            if (
                interaction.commandName ===
                "business"
            ) {
                return await businessCommand.execute(
                    interaction
                );
            }

        } catch (error) {
            console.error(
                "❌ Interaction error:",
                error
            );
        }
    }
);

// ==========================================
// READY
// ==========================================

client.once(
    "ready",
    async () => {
        console.log(
            "================================"
        );

        console.log(
            "       DISCORD CONNECTED"
        );

        console.log(
            "================================"
        );

        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            `🆔 Client ID: ${client.user.id}`
        );

        console.log(
            `🌐 Servers: ${client.guilds.cache.size}`
        );

        client.user.setPresence({
            activities: [
                {
                    name:
                        "/livecheck, /business",

                    type:
                        ActivityType.Streaming,

                    url:
                        "https://kick.com/iik27"
                }
            ],

            status: "online"
        });

        await registerCommands();

        startKickChecker(client);
    }
);

// ==========================================
// ERRORS
// ==========================================

client.on(
    "error",
    error => {
        console.error(
            "❌ Discord error:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "❌ Unhandled promise rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "❌ Uncaught exception:",
            error
        );
    }
);

// ==========================================
// START
// ==========================================

async function start() {
    try {
        console.log(
            "🚀 Starting Discord bot..."
        );

        await connectDatabase();

        console.log(
            "✅ MongoDB connected!"
        );

        await client.login(
            TOKEN
        );

    } catch (error) {
        console.error(
            "❌ BOT STARTUP FAILED:",
            error
        );

        process.exit(1);
    }
}

start();
