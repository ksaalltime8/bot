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
// HOSTINGER SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Discord bot is online!");
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

client.commands = new Collection();

function loadCommands(directory) {
    if (!fs.existsSync(directory)) {
        return;
    }

    for (const file of fs.readdirSync(directory)) {
        const filePath = path.join(
            directory,
            file
        );

        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.endsWith(".js")) {
            continue;
        }

        try {
            const command = require(filePath);

            if (
                command.data &&
                typeof command.execute === "function"
            ) {
                client.commands.set(
                    command.data.name,
                    command
                );

                console.log(
                    `📦 Loaded /${command.data.name}`
                );
            }
        } catch (error) {
            console.error(
                `❌ Failed loading ${filePath}`
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
// INTERACTIONS
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
                `❌ /${interaction.commandName} is not loaded`
            );

            return;
        }

        try {
            await command.execute(
                interaction
            );
        } catch (error) {
            console.error(
                `❌ /${interaction.commandName} failed:`,
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction.followUp({
                    content:
                        "❌ Something went wrong.",
                    ephemeral: true
                }).catch(() => {});
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
// READY
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
            `📦 Commands: ${client.commands.size}`
        );

        // Streaming activity
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

        // KICK checker
        try {
            startKickChecker(client);

            console.log(
                "📺 KICK checker started."
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
// DISCORD ERROR
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

// ==========================================
// START
// ==========================================

async function start() {

    try {

        console.log(
            "🚀 Starting Discord bot..."
        );

        if (!process.env.DISCORD_TOKEN) {
            throw new Error(
                "DISCORD_TOKEN is missing."
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
            process.env.DISCORD_TOKEN
        );

    } catch (error) {

        console.error(
            "❌ BOT STARTUP FAILED:"
        );

        console.error(error);
    }
}

start();
