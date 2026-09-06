require("dotenv").config();

const express = require("express");

const {
    Client,
    GatewayIntentBits,
    ActivityType,
    REST,
    Routes
} = require("discord.js");

const { connectDatabase } = require("./database/mongodb");
const { startKickChecker } = require("./services/kickChecker");

// ======================================================
// ENVIRONMENT
// ======================================================

console.log("🔎 Checking environment...");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const PORT = process.env.PORT || 5000;

console.log(TOKEN ? "🔐 Token: FOUND" : "❌ Token: MISSING");
console.log(CLIENT_ID ? "🆔 Client ID: FOUND" : "❌ Client ID: MISSING");
console.log(GUILD_ID ? "🏠 Guild ID: FOUND" : "❌ Guild ID: MISSING");
console.log(
    process.env.MONGODB_URI
        ? "🍃 MongoDB: FOUND"
        : "❌ MongoDB: MISSING"
);

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !process.env.MONGODB_URI) {
    console.error("❌ Missing required environment variables.");
    process.exit(1);
}

// ======================================================
// DISCORD CLIENT
// ======================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ======================================================
// COMMANDS
// ======================================================

const businessCommand = require("./commands/utility/business");

const commands = [
    businessCommand.data.toJSON(),

    {
        name: "livecheck",
        description: "Check if iik27 is currently live on KICK"
    },

    {
        name: "live",
        description: "Configure KICK live notifications"
    }
];

console.log("📦 Commands loaded:", commands.length);

// ======================================================
// EXPRESS SERVER
// ======================================================

const app = express();

app.get("/", (req, res) => {
    res.status(200).send("K7Devs Discord Bot is running.");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "online",
        discord: client.isReady(),
        user: client.user
            ? {
                  id: client.user.id,
                  username: client.user.username
              }
            : null
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server listening on ${PORT}`);
});

// ======================================================
// DISCORD COMMAND REGISTRATION
// ======================================================

async function registerCommands() {
    console.log("📡 Registering slash commands...");

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(
            CLIENT_ID,
            GUILD_ID
        ),
        {
            body: commands
        }
    );

    console.log("✅ Slash commands registered.");
}

// ======================================================
// INTERACTION HANDLER
// ======================================================

client.on("interactionCreate", async (interaction) => {
    try {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        console.log(
            `📥 Command received: /${interaction.commandName} from ${interaction.user.tag}`
        );

        // BUSINESS
        if (interaction.commandName === "business") {
            await businessCommand.execute(interaction);
            return;
        }

        // LIVECHECK
        if (interaction.commandName === "livecheck") {
            await interaction.deferReply();

            try {
                const axios = require("axios");

                const username = "iik27";

                const response = await axios.get(
                    `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`,
                    {
                        headers: {
                            Accept: "application/json",
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36"
                        },
                        timeout: 10000
                    }
                );

                const livestream =
                    response.data?.livestream;

                if (livestream) {
                    await interaction.editReply(
                        `🔴 **iik27 is LIVE!**\nhttps://kick.com/iik27`
                    );
                } else {
                    await interaction.editReply(
                        `⚫ **iik27 is currently offline.**`
                    );
                }
            } catch (error) {
                console.error(
                    "❌ /livecheck error:",
                    error.message
                );

                await interaction.editReply(
                    "❌ Unable to check KICK right now."
                );
            }

            return;
        }

        // LIVE
        if (interaction.commandName === "live") {
            await interaction.reply({
                content:
                    "⚙️ The `/live` configuration command is being loaded."
            });

            return;
        }

    } catch (error) {
        console.error(
            "❌ Interaction error:",
            error
        );

        try {
            if (interaction.deferred) {
                await interaction.editReply(
                    "❌ Something went wrong."
                );
            } else if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ Something went wrong.",
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error(
                "❌ Could not send error response:",
                replyError
            );
        }
    }
});

// ======================================================
// DISCORD READY
// ======================================================

client.once("ready", async () => {
    console.log("========================================");
    console.log("✅ DISCORD BOT ONLINE");
    console.log(`🤖 Logged in as: ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    console.log("========================================");

    // IMPORTANT:
    // Your requested streaming activity.
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

    console.log("🎥 Streaming activity set.");

    // Register slash commands after Discord is ready.
    try {
        await registerCommands();
    } catch (error) {
        console.error(
            "❌ Slash command registration failed:",
            error
        );
    }

    // Start KICK checker.
    try {
        startKickChecker(client);

        console.log(
            "🟢 KICK checker started."
        );
    } catch (error) {
        console.error(
            "❌ KICK checker failed to start:",
            error
        );
    }
});

// ======================================================
// DISCORD ERROR EVENTS
// ======================================================

client.on("error", (error) => {
    console.error("❌ Discord client error:", error);
});

client.on("warn", (warning) => {
    console.warn("⚠️ Discord warning:", warning);
});

client.on("shardError", (error) => {
    console.error("❌ Discord shard error:", error);
});

// ======================================================
// STARTUP TIMEOUT HELPER
// ======================================================

function timeoutPromise(promise, milliseconds, name) {
    return Promise.race([
        promise,

        new Promise((_, reject) => {
            setTimeout(() => {
                reject(
                    new Error(
                        `${name} timed out after ${milliseconds / 1000} seconds.`
                    )
                );
            }, milliseconds);
        })
    ]);
}

// ======================================================
// START BOT
// ======================================================

async function start() {
    console.log("🚀 Starting Discord bot...");

    // --------------------------------------------------
    // DATABASE
    // --------------------------------------------------

    try {
        console.log("🍃 Connecting to MongoDB...");

        await timeoutPromise(
            connectDatabase(),
            15000,
            "MongoDB connection"
        );

        console.log("✅ MongoDB connected!");
    } catch (error) {
        console.error(
            "❌ MongoDB STARTUP FAILED:"
        );

        console.error(error);

        console.error(
            "🛑 Bot startup stopped because MongoDB could not connect."
        );

        process.exit(1);
    }

    // --------------------------------------------------
    // DISCORD
    // --------------------------------------------------

    try {
        console.log("🔐 Connecting to Discord...");

        await timeoutPromise(
            client.login(TOKEN),
            30000,
            "Discord login"
        );

        console.log(
            "✅ Discord login completed."
        );
    } catch (error) {
        console.error(
            "❌ DISCORD STARTUP FAILED:"
        );

        console.error(error);

        process.exit(1);
    }
}

// ======================================================
// PROCESS ERRORS
// ======================================================

process.on("unhandledRejection", (error) => {
    console.error(
        "❌ UNHANDLED PROMISE REJECTION:",
        error
    );
});

process.on("uncaughtException", (error) => {
    console.error(
        "❌ UNCAUGHT EXCEPTION:",
        error
    );
});

process.on("SIGTERM", () => {
    console.log("🛑 SIGTERM received.");

    client.destroy();

    process.exit(0);
});

process.on("SIGINT", () => {
    console.log("🛑 SIGINT received.");

    client.destroy();

    process.exit(0);
});

// ======================================================
// RUN
// ======================================================

start();
