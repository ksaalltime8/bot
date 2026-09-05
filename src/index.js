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
    ActivityType
} = require("discord.js");

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

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing.");
}

if (!CLIENT_ID) {
    console.error("❌ CLIENT_ID is missing.");
}

if (!GUILD_ID) {
    console.error("❌ GUILD_ID is missing.");
}

// ==========================================
// HOSTINGER WEB SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("K7Devs Discord bot is online!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web server listening on ${PORT}`);
});

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

const liveCommand = new SlashCommandBuilder()
    .setName("live")
    .setDescription("Manage KICK live alerts")
    .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild
    )

    .addSubcommand(sub =>
        sub
            .setName("setup")
            .setDescription("Set up KICK live alerts")

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
// /BUSINESS COMMAND
// ==========================================

const businessCommand = require(
    "./commands/utility/business"
);

// ==========================================
// REGISTER COMMANDS
// ==========================================

async function registerCommands() {

    try {

        console.log("📋 Registering Discord commands...");

        const rest = new REST({
            version: "10"
        }).setToken(TOKEN);

        const commands = [
            liveCommand.toJSON(),
            businessCommand.data.toJSON()
        ];

        const result = await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            "================================"
        );

        console.log(
            "✅ DISCORD COMMANDS REGISTERED"
        );

        console.log(
            `📦 ${result.length} commands registered`
        );

        console.log(
            "📋 /live"
        );

        console.log(
            "📋 /business"
        );

        console.log(
            "================================"
        );

    } catch (error) {

        console.error(
            "❌ Failed to register Discord commands:"
        );

        console.error(error);
    }
}

// ==========================================
// INTERACTION HANDLER
// ==========================================

client.on(
    "interactionCreate",
    async interaction => {

        if (!interaction.isChatInputCommand()) {
            return;
        }

        console.log(
            `📥 Received /${interaction.commandName}`
        );

        // ======================================
        // /BUSINESS
        // ======================================

        if (
            interaction.commandName === "business"
        ) {

            try {

                await businessCommand.execute(
                    interaction
                );

            } catch (error) {

                console.error(
                    "❌ /business error:",
                    error
                );

                if (
                    interaction.deferred ||
                    interaction.replied
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
        // /LIVE
        // ======================================

        if (
            interaction.commandName !== "live"
        ) {
            return;
        }

        try {

            await interaction.deferReply({
                ephemeral: true
            });

            const subcommand =
                interaction.options.getSubcommand();

            // ==================================
            // LIVE SETUP
            // ==================================

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
                        "❌ Invalid URL. Example: `https://kick.com/username`"
                    );
                }

                const hostname =
                    url.hostname.toLowerCase();

                if (
                    hostname !== "kick.com" &&
                    hostname !== "www.kick.com"
                ) {

                    return interaction.editReply(
                        "❌ Please provide a KICK URL such as `https://kick.com/username`."
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

                config.kickLive = {
                    enabled: true,
                    username:
                        username.toLowerCase(),
                    channelId: channel.id,
                    lastLive: false
                };

                await config.save();

                console.log(
                    "✅ KICK configuration saved."
                );

                return interaction.editReply(
                    `🔴 **KICK live alerts enabled!**\n\n` +
                    `🎥 **Streamer:** ${username}\n` +
                    `📢 **Alert channel:** ${channel}\n` +
                    `🔗 **KICK:** https://kick.com/${username}\n\n` +
                    `🔄 Checking every 60 seconds.`
                );
            }

            // ==================================
            // LIVE DISABLE
            // ==================================

            if (
                subcommand === "disable"
            ) {

                const config =
                    await getGuildConfig(
                        interaction.guildId
                    );

                config.kickLive.enabled = false;
                config.kickLive.lastLive = false;

                await config.save();

                console.log(
                    "🛑 KICK live alerts disabled."
                );

                return interaction.editReply(
                    "✅ **KICK live alerts disabled.**"
                );
            }

        } catch (error) {

            console.error(
                "❌ /live error:"
            );

            console.error(error);

            if (
                interaction.deferred ||
                interaction.replied
            ) {

                await interaction.editReply(
                    "❌ Something went wrong while processing `/live`."
                ).catch(() => {});

            } else {

                await interaction.reply({
                    content:
                        "❌ Something went wrong.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
);

// ==========================================
// DISCORD READY
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

        client.user.setPresence({
            activities: [
                {
                    name: "Made by iik27",
                    type: ActivityType.Streaming,
                    url: "https://kick.com/iik27"
                }
            ],
            status: "online"
        });

        console.log(
            "🔴 Streaming status enabled!"
        );

        // ======================================
        // REGISTER COMMANDS
        // ======================================

        await registerCommands();

        // ======================================
        // KICK CHECKER
        // ======================================

        try {

            startKickChecker(client);

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
// DISCORD ERRORS
// ==========================================

client.on(
    "error",
    error => {

        console.error(
            "❌ Discord error:"
        );

        console.error(error);
    }
);

// ==========================================
// START BOT
// ==========================================

async function start() {

    try {

        console.log(
            "🚀 Starting Discord bot..."
        );

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

        if (!process.env.MONGODB_URI) {
            throw new Error(
                "MONGODB_URI is missing."
            );
        }

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

        await client.login(
            TOKEN
        );

    } catch (error) {

        console.error("");

        console.error(
            "❌ BOT STARTUP FAILED"
        );

        console.error(error);
    }
}

start();
