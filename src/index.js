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

// ============================================================
// ENV
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const PORT = process.env.PORT || 5000;

// ============================================================
// ENV CHECK
// ============================================================

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

// ============================================================
// WEB SERVER
// ============================================================

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

// ============================================================
// DISCORD CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ============================================================
// COMMANDS
// ============================================================

// ------------------------------------------------------------
// /live
// ------------------------------------------------------------

const liveCommand =
    new SlashCommandBuilder()
        .setName("live")
        .setDescription(
            "Manage KICK live alerts"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        // /live setup
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

        // /live disable
        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription(
                    "Disable KICK live alerts"
                )
        );

// ------------------------------------------------------------
// /livecheck
// ------------------------------------------------------------

const liveCheckCommand =
    new SlashCommandBuilder()
        .setName("livecheck")
        .setDescription(
            "Check if iik27 is live on KICK"
        );

// ============================================================
// BUSINESS COMMAND
// ============================================================

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
    console.log(
        "⚠️ /business could not be loaded."
    );

    console.error(error);
}

// ============================================================
// COMMAND ARRAY
// ============================================================

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

for (const command of commands) {
    console.log(
        `📋 /${command.name}`
    );
}

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {
    console.log(
        "📋 Registering Discord commands..."
    );

    const rest = new REST({
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

        for (const command of result) {
            console.log(
                `✅ /${command.name}`
            );
        }

        return true;

    } catch (error) {
        console.error(
            "❌ Command registration failed:"
        );

        console.error(error);

        return false;
    }
}

// ============================================================
// KICK API
// ============================================================

async function getKickChannel(username) {
    try {
        const response =
            await axios.get(
                `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
                {
                    headers: {
                        Accept: "application/json",
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

// ============================================================
// /LIVECHECK
// ============================================================

async function handleLiveCheck(interaction) {

    // IMPORTANT:
    // Acknowledge Discord immediately.
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }
    } catch (error) {
        console.error(
            "❌ Failed to acknowledge /livecheck:",
            error
        );

        return;
    }

    const username = "iik27";

    try {
        console.log(
            `📺 Checking ${username}...`
        );

        const data =
            await getKickChannel(
                username
            );

        if (!data) {
            return await interaction.editReply(
                "❌ KICK could not be reached right now."
            );
        }

        const isLive =
            data.livestream != null;

        // --------------------------------------------------------
        // OFFLINE
        // --------------------------------------------------------

        if (!isLive) {
            console.log(
                `⚫ ${username} is offline.`
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
                    .setTimestamp();

            return await interaction.editReply({
                embeds: [embed]
            });
        }

        // --------------------------------------------------------
        // LIVE
        // --------------------------------------------------------

        const stream =
            data.livestream;

        const title =
            stream.session_title ||
            stream.stream_title ||
            "Live now!";

        const category =
            stream.category?.name ||
            "Unknown";

        const viewers =
            stream.viewer_count ?? 0;

        const thumbnail =
            stream.thumbnail?.url ||
            stream.thumbnail ||
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
                    "**iik27 is currently live on KICK!**"
                )
                .addFields(
                    {
                        name: "📝 Title",
                        value:
                            String(title).slice(
                                0,
                                1024
                            )
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
                .setTimestamp();

        if (thumbnail) {
            embed.setImage(thumbnail);
        }

        console.log(
            `🔴 ${username} is LIVE!`
        );

        return await interaction.editReply({
            embeds: [embed]
        });

    } catch (error) {
        console.error(
            "❌ /livecheck error:",
            error
        );

        try {
            if (
                interaction.deferred ||
                interaction.replied
            ) {
                await interaction.editReply(
                    "❌ Error checking KICK."
                );
            } else {
                await interaction.reply({
                    content:
                        "❌ Error checking KICK.",
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error(
                "❌ Failed to send /livecheck error response:",
                replyError
            );
        }
    }
}

// ============================================================
// /LIVE
// ============================================================

async function handleLive(interaction) {

    // ========================================================
    // ACKNOWLEDGE IMMEDIATELY
    // ========================================================

    try {
        if (
            !interaction.deferred &&
            !interaction.replied
        ) {
            await interaction.deferReply({
                ephemeral: true
            });
        }
    } catch (error) {
        console.error(
            "❌ Failed to acknowledge /live:",
            error
        );

        return;
    }

    console.log(
        "✅ /live interaction acknowledged."
    );

    try {
        const subcommand =
            interaction.options.getSubcommand();

        console.log(
            `🛠️ /live ${subcommand} started.`
        );

        // ====================================================
        // SETUP
        // ====================================================

        if (subcommand === "setup") {

            const link =
                interaction.options.getString(
                    "link"
                );

            const channel =
                interaction.options.getChannel(
                    "channel"
                );

            console.log(
                `🔗 KICK link: ${link}`
            );

            console.log(
                `📢 Discord channel: ${
                    channel?.id || "NONE"
                }`
            );

            // ------------------------------------------------
            // Validate channel
            // ------------------------------------------------

            if (!channel) {
                return await interaction.editReply(
                    "❌ Discord channel could not be found."
                );
            }

            // ------------------------------------------------
            // Validate URL
            // ------------------------------------------------

            let url;

            try {
                url = new URL(link);
            } catch {
                return await interaction.editReply(
                    "❌ Invalid KICK URL."
                );
            }

            const hostname =
                url.hostname.toLowerCase();

            if (
                hostname !== "kick.com" &&
                hostname !== "www.kick.com"
            ) {
                return await interaction.editReply(
                    "❌ Please use a KICK URL."
                );
            }

            // ------------------------------------------------
            // Get username
            // ------------------------------------------------

            const username =
                url.pathname
                    .split("/")
                    .filter(Boolean)[0];

            if (!username) {
                return await interaction.editReply(
                    "❌ KICK username not found."
                );
            }

            console.log(
                `👤 KICK username: ${username}`
            );

            // ------------------------------------------------
            // Database
            // ------------------------------------------------

            console.log(
                "🍃 Loading guild configuration..."
            );

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            if (!config) {
                throw new Error(
                    "getGuildConfig returned null/undefined."
                );
            }

            console.log(
                "🍃 Guild configuration loaded."
            );

            // ------------------------------------------------
            // Save settings
            // ------------------------------------------------

            config.kickLive = {
                enabled: true,
                username:
                    username.toLowerCase(),
                channelId:
                    channel.id,
                lastLive: false
            };

            console.log(
                "💾 Saving KICK configuration..."
            );

            await config.save();

            console.log(
                "✅ KICK configuration saved."
            );

            // ------------------------------------------------
            // Response
            // ------------------------------------------------

            return await interaction.editReply(
                `🔴 **KICK live alerts enabled!**\n\n` +
                `🎥 Streamer: **${username}**\n` +
                `📢 Channel: ${channel}\n` +
                `🔗 https://kick.com/${username}`
            );
        }

        // ====================================================
        // DISABLE
        // ====================================================

        if (subcommand === "disable") {

            console.log(
                "🛑 Disabling KICK live alerts..."
            );

            const config =
                await getGuildConfig(
                    interaction.guildId
                );

            if (!config) {
                throw new Error(
                    "getGuildConfig returned null/undefined."
                );
            }

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

            console.log(
                "✅ KICK live alerts disabled."
            );

            return await interaction.editReply(
                "✅ KICK live alerts disabled."
            );
        }

        // ====================================================
        // UNKNOWN SUBCOMMAND
        // ====================================================

        return await interaction.editReply(
            "❌ Unknown `/live` subcommand."
        );

    } catch (error) {

        console.error(
            "❌ /live error:",
            error
        );

        try {

            if (
                interaction.deferred ||
                interaction.replied
            ) {
                await interaction.editReply(
                    "❌ Something went wrong while processing the command."
                );
            } else {
                await interaction.reply({
                    content:
                        "❌ Something went wrong while processing the command.",
                    ephemeral: true
                });
            }

        } catch (replyError) {

            console.error(
                "❌ Failed to send /live error response:",
                replyError
            );
        }
    }
}

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        // ----------------------------------------------------
        // Ignore non-chat-input interactions
        // ----------------------------------------------------

        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        console.log(
            `📥 Received /${interaction.commandName}`
        );

        try {

            // =================================================
            // /live
            // =================================================

            if (
                interaction.commandName ===
                "live"
            ) {
                return await handleLive(
                    interaction
                );
            }

            // =================================================
            // /livecheck
            // =================================================

            if (
                interaction.commandName ===
                "livecheck"
            ) {
                return await handleLiveCheck(
                    interaction
                );
            }

            // =================================================
            // /business
            // =================================================

            if (
                interaction.commandName ===
                "business"
            ) {

                if (
                    !businessCommand ||
                    typeof businessCommand.execute !==
                        "function"
                ) {

                    console.error(
                        "❌ Business command is unavailable."
                    );

                    return await interaction.reply({
                        content:
                            "❌ Business command is unavailable.",
                        ephemeral: true
                    });
                }

                try {

                    return await businessCommand.execute(
                        interaction
                    );

                } catch (error) {

                    console.error(
                        "❌ /business error:",
                        error
                    );

                    if (
                        interaction.replied ||
                        interaction.deferred
                    ) {

                        return await interaction.editReply(
                            "❌ Something went wrong."
                        ).catch(() => {});

                    }

                    return await interaction.reply({
                        content:
                            "❌ Something went wrong.",
                        ephemeral: true
                    }).catch(() => {});
                }
            }

            // =================================================
            // UNKNOWN COMMAND
            // =================================================

            console.warn(
                `⚠️ No handler found for /${interaction.commandName}`
            );

        } catch (error) {

            console.error(
                `❌ Interaction handler error for /${interaction.commandName}:`,
                error
            );

            try {

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

            } catch (replyError) {

                console.error(
                    "❌ Could not send interaction error response:",
                    replyError
                );
            }
        }
    }
);

// ============================================================
// READY
// ============================================================

client.once(
    "ready",
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

        // ====================================================
        // STREAMING STATUS
        // ====================================================

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
                "❌ Failed to set presence:",
                error
            );
        }

        // ====================================================
        // REGISTER COMMANDS
        // ====================================================

        const registered =
            await registerCommands();

        if (!registered) {
            console.error(
                "⚠️ Commands may not be available correctly."
            );
        }

        // ====================================================
        // KICK CHECKER
        // ====================================================

        try {

            startKickChecker(
                client
            );

            console.log(
                "📺 KICK checker started!"
            );

        } catch (error) {

            console.error(
                "❌ KICK checker failed:",
                error
            );
        }
    }
);

// ============================================================
// DISCORD ERRORS
// ============================================================

client.on(
    "error",
    error => {

        console.error(
            "❌ Discord error:",
            error
        );
    }
);

client.on(
    "warn",
    warning => {

        console.warn(
            "⚠️ Discord warning:",
            warning
        );
    }
);

// ============================================================
// UNHANDLED ERRORS
// ============================================================

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "❌ UNHANDLED REJECTION:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "❌ UNCAUGHT EXCEPTION:",
            error
        );
    }
);

// ============================================================
// LOGIN
// ============================================================

async function start() {

    try {

        console.log(
            "🚀 Starting Discord bot..."
        );

        console.log(
            "🍃 Connecting to MongoDB..."
        );

        await connectDatabase();

        console.log(
            "✅ MongoDB connected!"
        );

        console.log(
            "🔐 Connecting to Discord..."
        );

        // ====================================================
        // LOGIN TIMEOUT
        // ====================================================

        const loginTimeout =
            setTimeout(() => {

                console.error("");

                console.error(
                    "❌ DISCORD LOGIN TIMEOUT"
                );

                console.error(
                    "Discord did not complete the connection within 30 seconds."
                );

                console.error(
                    "Check your DISCORD_TOKEN and Hostinger network configuration."
                );

                process.exit(1);

            }, 30000);

        try {

            await client.login(
                TOKEN
            );

            clearTimeout(
                loginTimeout
            );

        } catch (error) {

            clearTimeout(
                loginTimeout
            );

            throw error;
        }

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

        process.exit(1);
    }
}

// ============================================================
// START
// ============================================================

start();
