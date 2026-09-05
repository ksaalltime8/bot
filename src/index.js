require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    ActivityType
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

    res.end("K7Devs Discord Bot is online!");
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

client.commands = new Collection();

// ==========================================
// LOAD COMMANDS
// ==========================================

function loadCommands(directory) {

    if (!fs.existsSync(directory)) {
        console.error(
            `❌ Commands folder not found: ${directory}`
        );
        return;
    }

    const files = fs.readdirSync(
        directory,
        { withFileTypes: true }
    );

    for (const file of files) {

        const filePath =
            path.join(directory, file.name);

        if (file.isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.name.endsWith(".js")) {
            continue;
        }

        try {

            delete require.cache[
                require.resolve(filePath)
            ];

            const command =
                require(filePath);

            if (
                !command.data ||
                typeof command.execute !== "function"
            ) {
                console.log(
                    `⚠️ Skipped invalid command: ${filePath}`
                );
                continue;
            }

            const name =
                command.data.name;

            client.commands.set(
                name,
                command
            );

            console.log(
                `✅ Loaded /${name}`
            );

        } catch (error) {

            console.error(
                `❌ Could not load ${filePath}`
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
    `📦 ${client.commands.size} commands loaded`
);

console.log(
    `📋 ${[...client.commands.keys()].join(", ")}`
);

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
            `📥 DISCORD COMMAND RECEIVED: /${interaction.commandName}`
        );

        const command =
            client.commands.get(
                interaction.commandName
            );

        if (!command) {

            console.error(
                `❌ Command NOT FOUND: /${interaction.commandName}`
            );

            // IMPORTANT:
            // Still respond to Discord.
            try {
                await interaction.reply({
                    content:
                        `❌ I don't have the /${interaction.commandName} command loaded.`,
                    ephemeral: true
                });
            } catch (error) {
                console.error(error);
            }

            return;
        }

        console.log(
            `▶️ Executing /${interaction.commandName}`
        );

        try {

            await command.execute(
                interaction
            );

            console.log(
                `✅ /${interaction.commandName} completed`
            );

        } catch (error) {

            console.error(
                `❌ /${interaction.commandName} ERROR:`
            );

            console.error(error);

            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply({
                        content:
                            "❌ The command encountered an error."
                    });

                } else {

                    await interaction.reply({
                        content:
                            "❌ The command encountered an error.",
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

        console.log(
            `📦 Commands: ${client.commands.size}`
        );

        // ======================================
        // STREAMING STATUS
        // ======================================

        client.user.setPresence({
            activities: [
                {
                    name: "Made by iik27",
                    type: ActivityType.Streaming,
                    url: "https://k7devs.com"
                }
            ],
            status: "watching"
        });

        console.log(
            "🔴 Streaming status enabled!"
        );

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

        console.log(
            `⚠️ Discord disconnected. Shard: ${shardId}`
        );

    }
);

// ==========================================
// START
// ==========================================

async function start() {

    console.log("");
    console.log(
        "🚀 Starting Discord bot..."
    );

    try {

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
            process.env.DISCORD_TOKEN
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
