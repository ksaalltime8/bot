require("dotenv").config();

const http = require("http");
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

const liveCommand =
    require("./commands/utility/kick");

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
// COMMANDS
// ==========================================

client.commands = new Collection();

client.commands.set(
    liveCommand.data.name,
    liveCommand
);

// ==========================================
// COMMAND HANDLER
// ==========================================

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    console.log(
        `📥 Received /${interaction.commandName}`
    );

    const command = client.commands.get(
        interaction.commandName
    );

    if (!command) {
        console.log(
            `❌ Command not found: ${interaction.commandName}`
        );

        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(
            "❌ Command error:",
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
});

// ==========================================
// DISCORD READY
// ==========================================

client.once("clientReady", () => {
    console.log("");
    console.log("==============================");
    console.log("      DISCORD CONNECTED");
    console.log("==============================");

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
});

// ==========================================
// DISCORD ERRORS
// ==========================================

client.on("error", error => {
    console.error(
        "❌ Discord client error:"
    );

    console.error(error);
});

// ==========================================
// START BOT
// ==========================================

async function start() {
    try {
        console.log("");
        console.log(
            "🚀 Starting Discord bot..."
        );

        // Check Discord token

        if (!process.env.DISCORD_TOKEN) {
            throw new Error(
                "DISCORD_TOKEN is missing from Hostinger environment variables."
            );
        }

        // Check MongoDB

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
