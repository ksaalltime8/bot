require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits
} = require("discord.js");

const {
    connectDatabase
} = require("./database/mongodb");

const {
    startKickChecker
} = require("./services/kickChecker");

// ==========================================
// HOSTINGER WEB SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Discord bot is online!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web server listening on ${PORT}`);
});

server.on("error", (error) => {
    console.error("❌ Web server error:", error);
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
// DISCORD ERROR HANDLERS
// ==========================================

client.on("error", (error) => {
    console.error("❌ Discord client error:");
    console.error(error);
});

client.on("shardError", (error) => {
    console.error("❌ Discord shard error:");
    console.error(error);
});

client.on("warn", (message) => {
    console.warn("⚠️ Discord warning:", message);
});

client.on("debug", (message) => {
    // Only print useful gateway messages
    if (
        message.includes("Heartbeat") ||
        message.includes("READY") ||
        message.includes("Session")
    ) {
        console.log("🔎 Discord:", message);
    }
});

// ==========================================
// COMMANDS
// ==========================================

client.commands = new Collection();

function loadCommands(directory) {

    if (!fs.existsSync(directory)) {
        console.error(
            `❌ Commands folder not found: ${directory}`
        );
        return;
    }

    const files = fs.readdirSync(directory);

    for (const file of files) {

        const filePath = path.join(
            directory,
            file
        );

        const stat = fs.statSync(filePath);

        // Search subfolders
        if (stat.isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        // Only JavaScript files
        if (!file.endsWith(".js")) {
            continue;
        }

        try {

            // Clear cache so Hostinger doesn't
            // accidentally use an old command
            delete require.cache[
                require.resolve(filePath)
            ];

            const command = require(filePath);

            if (
                command.data &&
                typeof command.execute === "function"
            ) {

                const name =
                    command.data.name;

                if (client.commands.has(name)) {
                    console.warn(
                        `⚠️ Duplicate command /${name} - skipping ${filePath}`
                    );

                    continue;
                }

                client.commands.set(
                    name,
                    command
                );

                console.log(
                    `✅ Loaded /${name}`
                );

            } else {

                console.warn(
                    `⚠️ Skipped ${filePath}: missing data or execute`
                );
            }

        } catch (error) {

            console.error(
                `❌ Failed to load command: ${filePath}`
            );

            console.error(error);
        }
    }
}

loadCommands(
    path.join(__dirname, "commands")
);

console.log("");
console.log(
    `📦 Total commands loaded: ${client.commands.size}`
);

console.log(
    `📋 Commands: ${
        [...client.commands.keys()]
            .map(name => `/${name}`)
            .join(", ")
    }`
);

console.log("");

// ==========================================
// COMMAND HANDLER
// ==========================================

client.on(
    "interactionCreate",
    async (interaction) => {

        if (!interaction.isChatInputCommand()) {
            return;
        }

        console.log(
            `📥 Received /${interaction.commandName}`
        );

        const command =
            client.commands.get(
                interaction.commandName
            );

        if (!command) {

            console.error(
                `❌ Command /${interaction.commandName} does not exist in memory.`
            );

            try {
                await interaction.reply({
                    content:
                        "❌ This command is not loaded by the bot.",
                    ephemeral: true
                });
            } catch {}

            return;
        }

        try {

            await command.execute(
                interaction
            );

            console.log(
                `✅ /${interaction.commandName} completed`
            );

        } catch (error) {

            console.error(
                `❌ /${interaction.commandName} failed:`
            );

            console.error(error);

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({
                        content:
                            "❌ Something went wrong while running this command.",
                        ephemeral: true
                    });

                } else {

                    await interaction.reply({
                        content:
                            "❌ Something went wrong while running this command.",
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
            "=============================="
        );
        console.log(
            "      DISCORD CONNECTED"
        );
        console.log(
            "=============================="
        );

        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            `🆔 Bot ID: ${client.user.id}`
        );

        console.log(
            `🌐 Servers: ${client.guilds.cache.size}`
        );

        console.log(
            `📦 Commands loaded: ${client.commands.size}`
        );

        // ======================================
        // STREAMING STATUS
        // ======================================

        try {

            client.user.setPresence({
                activities: [
                    {
                        name: "K7Devs Live",
                        type: 1,
                        url: "https://k7devs.com"
                    }
                ],
                status: "online"
            });

            console.log(
                "🟣 Streaming status enabled!"
            );

        } catch (error) {

            console.error(
                "❌ Failed to set streaming status:",
                error
            );
        }

        // ======================================
        // KICK CHECKER
        // ======================================

        console.log(
            "📺 Starting KICK checker..."
        );

        try {

            startKickChecker(client);

            console.log(
                "✅ KICK checker started!"
            );

        } catch (error) {

            console.error(
                "❌ KICK checker failed:"
            );

            console.error(error);
        }

        console.log("");
        console.log(
            "🚀 BOT IS FULLY ONLINE!"
        );
        console.log("");
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
        // ENVIRONMENT VARIABLES
        // ======================================

        if (!process.env.DISCORD_TOKEN) {

            throw new Error(
                "DISCORD_TOKEN is missing from Hostinger environment variables."
            );
        }

        if (!process.env.MONGODB_URI) {

            throw new Error(
                "MONGODB_URI is missing from Hostinger environment variables."
            );
        }

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
        // DISCORD LOGIN
        // ======================================

        console.log(
            "🔐 Connecting to Discord..."
        );

        console.log(
            "🔐 Discord login starting..."
        );

        try {

            await client.login(
                process.env.DISCORD_TOKEN
            );

            console.log(
                "🔑 Discord login successful!"
            );

        } catch (error) {

            console.error("");
            console.error(
                "❌ DISCORD LOGIN FAILED"
            );
            console.error(
                "--------------------------------"
            );
            console.error(error);
            console.error(
                "--------------------------------"
            );
            console.error(
                "Check that DISCORD_TOKEN is the Bot Token from Discord Developer Portal."
            );

            process.exit(1);
        }

    } catch (error) {

        console.error("");
        console.error(
            "❌ BOT STARTUP FAILED"
        );

        console.error(error);

        // Don't silently pretend the bot started
        process.exit(1);
    }
}

// ==========================================
// START
// ==========================================

start();
