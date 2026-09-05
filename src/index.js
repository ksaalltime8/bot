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

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ==========================================
// COMMAND COLLECTION
// ==========================================

client.commands = new Collection();

// ==========================================
// LOAD ALL COMMANDS
// ==========================================

function loadCommands(directory) {
    if (!fs.existsSync(directory)) {
        console.log(
            `⚠️ Command directory doesn't exist: ${directory}`
        );
        return;
    }

    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        // Search folders recursively
        if (stat.isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        // Only load JavaScript files
        if (!file.endsWith(".js")) {
            continue;
        }

        try {
            const command = require(filePath);

            if (
                command.data &&
                typeof command.execute === "function"
            ) {
                const commandName =
                    command.data.name;

                // Prevent duplicate commands
                if (client.commands.has(commandName)) {
                    console.log(
                        `⚠️ Duplicate command skipped: /${commandName}`
                    );
                    continue;
                }

                client.commands.set(
                    commandName,
                    command
                );

                console.log(
                    `📦 Loaded /${commandName}`
                );
            } else {
                console.log(
                    `⚠️ Skipped ${file} - missing data or execute`
                );
            }
        } catch (error) {
            console.error(
                `❌ Failed to load ${filePath}`
            );

            console.error(error);
        }
    }
}

loadCommands(
    path.join(__dirname, "commands")
);

console.log(
    `📦 Total commands loaded: ${client.commands.size}`
);

// ==========================================
// COMMAND HANDLER
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

        const command =
            client.commands.get(
                interaction.commandName
            );

        if (!command) {
            console.error(
                `❌ Command /${interaction.commandName} was not loaded.`
            );

            return;
        }

        try {
            await command.execute(
                interaction
            );

        } catch (error) {

            console.error(
                `❌ Error executing /${interaction.commandName}:`
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
                    "❌ Could not send error message:",
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
    () => {

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
            `🌐 Servers: ${client.guilds.cache.size}`
        );

        console.log(
            `📦 Commands loaded: ${client.commands.size}`
        );

        // ======================================
        // STREAMING STATUS
        // ======================================

        client.user.setPresence({
            activities: [
                {
                    name: "/help, Made by iik27",
                    type: 1,
                    url: "https://k7devs.com"
                }
            ],
            status: "online"
        });

        console.log(
            "🔴 Streaming status enabled!"
        );

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
    }
);

// ==========================================
// DISCORD ERRORS
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
// START BOT
// ==========================================

async function start() {

    try {

        console.log("");
        console.log(
            "🚀 Starting Discord bot..."
        );

        // --------------------------------------
        // DISCORD TOKEN
        // --------------------------------------

        if (!process.env.DISCORD_TOKEN) {

            throw new Error(
                "DISCORD_TOKEN is missing from Hostinger environment variables."
            );
        }

        // --------------------------------------
        // MONGODB
        // --------------------------------------

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

        // --------------------------------------
        // DISCORD
        // --------------------------------------

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
