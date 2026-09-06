```js
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
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end(
        "K7Devs Discord bot is online!"
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
// COMMANDS
// ==========================================

// /live

const liveCommand =
    new SlashCommandBuilder()
        .setName("live")
        .setDescription(
            "Manage KICK live alerts"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        // ------------------------------
        // /live setup
        // ------------------------------

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

        // ------------------------------
        // /live disable
        // ------------------------------

        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription(
                    "Disable KICK live alerts"
                )
        );

// /livecheck

const liveCheckCommand =
    new SlashCommandBuilder()
        .setName("livecheck")
        .setDescription(
            "Check if iik27 is live on KICK"
        );

// ==========================================
// BUSINESS COMMAND
// ==========================================

let businessCommand = null;

try {
    businessCommand =
        require(
            "./commands/utility/business"
        );

    if (
        !businessCommand ||
        !businessCommand.data ||
        typeof businessCommand.execute !==
            "function"
    ) {
        throw new Error(
            "business.js does not export valid data/execute."
        );
    }

    console.log(
        "✅ /business loaded"
    );

} catch (error) {

    console.error(
        "❌ /business could not be loaded:"
    );

    console.error(error);
}

// ==========================================
// COMMAND ARRAY
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

for (const command of commands) {
    console.log(
        `📋 /${command.name}`
    );
}

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
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36"
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

    // Acknowledge immediately.
    try {
        await interaction.deferReply();
    } catch (error) {
        console.error(
            "❌ Could not defer /livecheck:",
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

            return interaction.editReply(
                "❌ KICK could not be reached right now."
            );
        }

        const isLive =
            data.livestream != null;

        // ======================================
        // OFFLINE
        // ======================================

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

            return interaction.editReply({
                embeds: [embed]
            });
        }

        // ======================================
        // LIVE
        // ======================================

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

        const thumbnail =
            stream.thumbnail?.url ||
            (
                typeof stream.thumbnail ===
                "string"
                    ? stream.thumbnail
                    : null
            );

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

    // Acknowledge immediately.
    try {

        await interaction.deferReply({
            ephemeral: true
        });

    } catch (error) {

        console.error(
            "❌ Could not defer /live:",
            error
        );

        return;
    }

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

            if (!link || !channel) {
                return interaction.editReply(
                    "❌ Missing KICK link or Discord channel."
                );
            }

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

            console.log(
                `✅ KICK live alerts configured for ${username} in ${interaction.guild.name}`
            );

            return interaction.editReply(
                `🔴 **KICK live alerts enabled!**\n\n` +
                `🎥 Streamer: **${username}**\n` +
                `📢 Channel: ${channel}\n` +
                `🔗 https://kick.com/${username}`
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

            console.log(
                `✅ KICK live alerts disabled in ${interaction.guild.name}`
            );

            return interaction.editReply(
                "✅ KICK live alerts disabled."
            );
        }

        return interaction.editReply(
            "❌ Unknown /live subcommand."
        );

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
                "❌ Something went wrong while processing `/live`."
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

        // Ignore anything that isn't a slash command.
        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        console.log(
            `📥 Received /${interaction.commandName}`
        );

        try {

            // ======================================
            // /LIVE
            // ======================================

            if (
                interaction.commandName ===
                "live"
            ) {

                return await handleLive(
                    interaction
                );
            }

            // ======================================
            // /LIVECHECK
            // ======================================

            if (
                interaction.commandName ===
                "livecheck"
            ) {

                return await handleLiveCheck(
                    interaction
                );
            }

            // ======================================
            // /BUSINESS
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

                    console.error(
                        "❌ Business command is unavailable."
                    );

                    return interaction.reply({
                        content:
                            "❌ Business command is unavailable.",
                        ephemeral: true
                    }).catch(() => {});
                }

                // The business command itself
                // performs deferReply() immediately.
                return await businessCommand.execute(
                    interaction
                );
            }

        } catch (error) {

            console.error(
                `❌ Interaction error for /${interaction.commandName}:`,
                error
            );

            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply({
                        content:
                            "❌ Something went wrong while processing this command."
                    });

                } else {

                    await interaction.reply({
                        content:
                            "❌ Something went wrong while processing this command.",
                        ephemeral: true
                    });
                }

            } catch (replyError) {

                console.error(
                    "❌ Failed to send interaction error response:",
                    replyError
                );
            }
        }
    }
);

// ==========================================
// READY
// ==========================================

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
            `🆔 Client ID: ${client.user.id}`
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
                "⚠️ Could not set presence:",
                error
            );
        }

        // ======================================
        // REGISTER COMMANDS
        // ======================================

        await registerCommands();

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
                "❌ KICK checker failed:",
                error
            );
        }
    }
);

// ==========================================
// DISCORD ERRORS
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

client.on(
    "warn",
    warning => {

        console.warn(
            "⚠️ Discord warning:",
            warning
        );
    }
);

client.on(
    "shardError",
    error => {

        console.error(
            "❌ Discord shard error:",
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
// LOGIN
// ==========================================

async function start() {

    try {

        console.log(
            "🚀 Starting Discord bot..."
        );

        // ======================================
        // MONGODB
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

// ==========================================
// START
// ==========================================

start();
```
