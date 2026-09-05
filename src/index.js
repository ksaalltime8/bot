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
// ENVIRONMENT
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MONGODB_URI = process.env.MONGODB_URI;

const PORT = process.env.PORT || 5000;

// ==========================================
// ENV CHECK
// ==========================================

console.log("🔎 Checking environment...");

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing.");
}

if (!CLIENT_ID) {
    console.error("❌ CLIENT_ID is missing.");
}

if (!GUILD_ID) {
    console.error("❌ GUILD_ID is missing.");
}

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is missing.");
}

// ==========================================
// HOSTINGER WEB SERVER
// ==========================================

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("K7Devs Discord bot is online!");
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
// /LIVE
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
                            "Your KICK channel link"
                        )
                        .setRequired(true)
                )

                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "Discord channel for alerts"
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
            "Check if iik27 is currently live on KICK"
        );

// ==========================================
// /BUSINESS
// ==========================================
//
// This loads your existing business.js.
// Make sure the file exists at:
//
// commands/utility/business.js
//
// ==========================================

let businessCommand = null;

try {

    businessCommand =
        require(
            "./commands/utility/business"
        );

    console.log(
        "✅ Loaded /business"
    );

} catch (error) {

    console.error(
        "⚠️ Could not load /business:"
    );

    console.error(error);
}

// ==========================================
// COMMAND LIST
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

console.log("");
console.log(
    `📦 ${commands.length} command(s) prepared`
);

for (const command of commands) {
    console.log(
        `📋 /${command.name}`
    );
}

console.log("");

// ==========================================
// REGISTER DISCORD COMMANDS
// ==========================================

async function registerCommands() {

    console.log(
        "📋 Registering Discord commands..."
    );

    try {

        if (!TOKEN) {
            throw new Error(
                "DISCORD_TOKEN is missing."
            );
        }

        if (!CLIENT_ID) {
            throw new Error(
                "CLIENT_ID is missing."
            );
        }

        if (!GUILD_ID) {
            throw new Error(
                "GUILD_ID is missing."
            );
        }

        const rest =
            new REST({
                version: "10",
                timeout: 15000
            }).setToken(TOKEN);

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

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "✅ DISCORD COMMANDS REGISTERED"
        );
        console.log(
            `📦 ${result.length} commands registered`
        );

        for (const command of result) {

            console.log(
                `✅ /${command.name}`
            );
        }

        console.log(
            "================================"
        );
        console.log("");

        return true;

    } catch (error) {

        console.error("");
        console.error(
            "❌ COMMAND REGISTRATION FAILED"
        );

        console.error(error);

        return false;
    }
}

// ==========================================
// KICK API
// ==========================================

async function getKickChannel(username) {

    try {

        const response =
            await axios.get(
                `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
                {
                    headers: {
                        Accept:
                            "application/json",

                        "User-Agent":
                            "Mozilla/5.0 DiscordBot"
                    },

                    timeout: 10000
                }
            );

        return response.data;

    } catch (error) {

        console.error(
            "❌ KICK API error:",
            error.response?.status ||
            error.message
        );

        return null;
    }
}

// ==========================================
// /LIVECHECK HANDLER
// ==========================================

async function handleLiveCheck(
    interaction
) {

    // IMPORTANT:
    // Reply immediately.
    await interaction.deferReply();

    const username = "iik27";

    try {

        console.log(
            `📺 Checking KICK status for ${username}...`
        );

        const data =
            await getKickChannel(
                username
            );

        if (!data) {

            return interaction.editReply(
                "❌ I couldn't reach KICK right now. Please try again."
            );
        }

        const isLive =
            data.livestream !== null &&
            data.livestream !== undefined;

        // ======================================
        // OFFLINE
        // ======================================

        if (!isLive) {

            console.log(
                `⚫ ${username} is NOT live.`
            );

            const embed =
                new EmbedBuilder()
                    .setColor(0x2b2d31)
                    .setTitle(
                        "⚫ KICK Live Check"
                    )
                    .setDescription(
                        `**${username} is not live right now.**`
                    )
                    .setURL(
                        `https://kick.com/${username}`
                    )
                    .setFooter({
                        text:
                            "K7Devs • KICK Live Check"
                    })
                    .setTimestamp();

            return interaction.editReply({
                embeds: [embed]
            });
        }

        // ======================================
        // LIVE
        // ======================================

        const livestream =
            data.livestream || {};

        const title =
            livestream.session_title ||
            livestream.stream_title ||
            "Live now!";

        const category =
            livestream.category?.name ||
            "Unknown";

        const viewers =
            livestream.viewer_count ?? 0;

        const thumbnail =
            livestream.thumbnail?.url ||
            livestream.thumbnail ||
            null;

        const embed =
            new EmbedBuilder()
                .setColor(0x53fc18)
                .setTitle(
                    "🔴 iik27 is LIVE!"
                )
                .setURL(
                    `https://kick.com/${username}`
                )
                .setDescription(
                    `**${username} is currently live on KICK!**`
                )
                .addFields(
                    {
                        name: "📝 Title",
                        value:
                            String(title).slice(
                                0,
                                1024
                            ),
                        inline: false
                    },
                    {
                        name: "🎮 Category",
                        value:
                            String(category).slice(
                                0,
                                1024
                            ),
                        inline: true
                    },
                    {
                        name: "👀 Viewers",
                        value:
                            String(viewers),
                        inline: true
                    }
                )
                .setFooter({
                    text:
                        "K7Devs • KICK Live Check"
                })
                .setTimestamp();

        if (thumbnail) {

            embed.setImage(
                thumbnail
            );
        }

        console.log(
            `🔴 ${username} IS LIVE!`
        );

        return interaction.editReply({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "❌ /livecheck failed:"
        );

        console.error(error);

        return interaction.editReply(
            "❌ Something went wrong while checking KICK."
        ).catch(() => {});
    }
}

// ==========================================
// /LIVE HANDLER
// ==========================================

async function handleLive(
    interaction
) {

    // Respond immediately.
    await interaction.deferReply({
        ephemeral: true
    });

    try {

        const subcommand =
            interaction.options.getSubcommand();

        // ======================================
        // SETUP
        // ======================================

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
                    "❌ Invalid URL. Example: `https://kick.com/iik27`"
                );
            }

            const hostname =
                url.hostname.toLowerCase();

            if (
                hostname !== "kick.com" &&
                hostname !== "www.kick.com"
            ) {

                return interaction.editReply(
                    "❌ Please provide a KICK URL such as `https://kick.com/iik27`."
                );
            }

            const username =
                url.pathname
                    .split("/")
                    .filter(Boolean)[0];

            if (!username) {

                return interaction.editReply(
                    "❌ I couldn't find the KICK username."
                );
            }

            console.log(
                `📺 Setting up KICK: ${username}`
            );

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            // IMPORTANT:
            // Your MongoDB schema uses kickLive.
            config.kickLive = {
                enabled: true,

                username:
                    username.toLowerCase(),

                channelId:
                    channel.id,

                lastLive: false
            };

            await config.save();

            console.log(
                "✅ KICK configuration saved"
            );

            return interaction.editReply(
                `🔴 **KICK live alerts enabled!**\n\n` +
                `🎥 **Streamer:** ${username}\n` +
                `📢 **Alert channel:** ${channel}\n` +
                `🔗 **KICK:** https://kick.com/${username}\n\n` +
                `🔄 Checking every 60 seconds.`
            );
        }

        // ======================================
        // DISABLE
        // ======================================

        if (
            subcommand === "disable"
        ) {

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            if (!config.kickLive) {

                config.kickLive = {
                    enabled: false,
                    username: null,
                    channelId: null,
                    lastLive: false
                };

            } else {

                config.kickLive.enabled =
                    false;

                config.kickLive.lastLive =
                    false;
            }

            await config.save();

            return interaction.editReply(
                "✅ **KICK live alerts disabled.**"
            );
        }

        return interaction.editReply(
            "❌ Unknown `/live` option."
        );

    } catch (error) {

        console.error(
            "❌ /live ERROR:"
        );

        console.error(error);

        return interaction.editReply(
            "❌ Something went wrong configuring KICK live alerts."
        ).catch(() => {});
    }
}

// ==========================================
// INTERACTION HANDLER
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

        // ======================================
        // LIVE
        // ======================================

        if (
            interaction.commandName === "live"
        ) {

            await handleLive(
                interaction
            );

            return;
        }

        // ======================================
        // LIVECHECK
        // ======================================

        if (
            interaction.commandName ===
            "livecheck"
        ) {

            await handleLiveCheck(
                interaction
            );

            return;
        }

        // ======================================
        // BUSINESS
        // ======================================

        if (
            interaction.commandName ===
            "business"
        ) {

            if (
                !businessCommand ||
                typeof businessCommand.execute !==
                    "function"
            ) {

                return interaction.reply({
                    content:
                        "❌ The business command could not be loaded.",
                    ephemeral: true
                });
            }

            try {

                await businessCommand.execute(
                    interaction
                );

            } catch (error) {

                console.error(
                    "❌ /business ERROR:",
                    error
                );

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.editReply(
                        "❌ Something went wrong."
                    ).catch(() => {});

                } else {

                    await interaction.reply({
                        content:
                            "❌ Something went wrong.",
                        ephemeral: true
                    }).catch(() => {});
                }
            }

            return;
        }

        // ======================================
        // UNKNOWN
        // ======================================

        console.log(
            `⚠️ Unknown command: /${interaction.commandName}`
        );
    }
);

// ==========================================
// READY
// ==========================================

client.once(
    "clientReady",
    async () => {

        console.log("");
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
            `🌐 Servers: ${client.guilds.cache.size}`
        );

        // ======================================
        // STREAMING STATUS
        // ======================================

        try {

            client.user.setPresence({

                activities: [
                    {
                        name:
                            "Made by iik27",

                        type:
                            ActivityType.Streaming,

                        url:
                            "https://kick.com/iik27"
                    }
                ],

                status: "online"
            });

            console.log(
                "🔴 Streaming status enabled!"
            );

        } catch (error) {

            console.error(
                "❌ Failed to set streaming status:",
                error
            );
        }

        // ======================================
        // REGISTER COMMANDS
        // ======================================

        const registered =
            await registerCommands();

        if (!registered) {

            console.error(
                "⚠️ Commands could not be registered."
            );

        }

        // ======================================
        // KICK CHECKER
        // ======================================

        try {

            startKickChecker(
                client
            );

            console.log(
                "📺 KICK checker started!"
            );

        } catch (error) {

            console.error(
                "❌ KICK checker failed:"
            );

            console.error(error);
        }
    }
);

// ==========================================
// DISCORD ERROR
// ==========================================

client.on(
    "error",
    error => {

        console.error(
            "❌ Discord client error:"
        );

        console.error(error);
    }
);

// ==========================================
// DISCONNECT
// ==========================================

client.on(
    "shardDisconnect",
    (event, shardId) => {

        console.error(
            `⚠️ Discord disconnected. Shard: ${shardId}`
        );

        console.error(event);
    }
);

// ==========================================
// RECONNECT
// ==========================================

client.on(
    "shardReconnecting",
    shardId => {

        console.log(
            `🔄 Discord reconnecting. Shard: ${shardId}`
        );
    }
);

// ==========================================
// START BOT
// ==========================================

async function start() {

    try {

        console.log("");
        console.log(
            "🚀 Starting Discord bot..."
        );

        // ======================================
        // ENV VALIDATION
        // ======================================

        if (!TOKEN) {

            throw new Error(
                "DISCORD_TOKEN is missing."
            );
        }

        if (!CLIENT_ID) {

            throw new Error(
                "CLIENT_ID is missing."
            );
        }

        if (!GUILD_ID) {

            throw new Error(
                "GUILD_ID is missing."
            );
        }

        if (!MONGODB_URI) {

            throw new Error(
                "MONGODB_URI is missing."
            );
        }

        // ======================================
        // DATABASE
        // ======================================

        console.log(
            "🍃 Connecting to MongoDB..."
        );

        await connectDatabase();

        console.log(
            "✅ MongoDB connected!"
        );

        // ======================================
        // DISCORD
        // ======================================

        console.log(
            "🔐 Connecting to Discord..."
        );

        await client.login(
            TOKEN
        );

    } catch (error) {

        console.error("");
        console.error(
            "================================"
        );
        console.error(
            "❌ BOT STARTUP FAILED"
        );
        console.error(
            "================================"
        );

        console.error(error);

        // Don't silently keep a broken process
        process.exitCode = 1;
    }
}

// ==========================================
// PROCESS ERRORS
// ==========================================

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "❌ Unhandled promise rejection:"
        );

        console.error(error);
    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "❌ Uncaught exception:"
        );

        console.error(error);
    }
);

// ==========================================
// START
// ==========================================

start();
