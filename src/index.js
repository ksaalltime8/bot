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

// =====================================
// HOSTINGER WEB SERVER
// =====================================

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

// =====================================
// CHECK ENVIRONMENT
// =====================================

console.log("🔎 Checking environment variables...");

console.log(
    "DISCORD_TOKEN:",
    process.env.DISCORD_TOKEN ? "FOUND" : "MISSING"
);

console.log(
    "MONGODB_URI:",
    process.env.MONGODB_URI ? "FOUND" : "MISSING"
);

console.log(
    "CLIENT_ID:",
    process.env.CLIENT_ID ? "FOUND" : "MISSING"
);

console.log(
    "GUILD_ID:",
    process.env.GUILD_ID ? "FOUND" : "MISSING"
);

// =====================================
// DISCORD CLIENT
// =====================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.commands = new Collection();

client.commands.set(
    liveCommand.data.name,
    liveCommand
);

// =====================================
// COMMAND HANDLER
// =====================================

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    console.log(
        `📥 Command received: /${interaction.commandName}`
    );

    const command =
        client.commands.get(
            interaction.commandName
        );

    if (!command) {
        console.log(
            `❌ Unknown command: ${interaction.commandName}`
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

        if (!interaction.replied) {
            await interaction.reply({
                content:
                    "❌ Something went wrong.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// =====================================
// DISCORD READY
// =====================================

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

    // Streaming status
    client.user.setPresence({
        activities: [
            {
                name: "https://k7devs.com",
                type: 1,
                url: "https://kick.com/iik27"
            }
        ],
        status: "online"
    });

    console.log(
        "🔴 Streaming status enabled!"
    );

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
            "❌ KICK checker failed:",
            error
        );
    }
});


// =====================================
// DISCORD ERROR
// =====================================

client.on("error", error => {
    console.error(
        "❌ Discord client error:",
        error
    );
});

// =====================================
// START
// =====================================

async function start() {
    console.log("");
    console.log("🚀 Starting Discord bot...");

    // -------------------------------
    // Token
    // -------------------------------

    if (!process.env.DISCORD_TOKEN) {
        console.error(
            "❌ DISCORD_TOKEN is missing!"
        );

        return;
    }

    // -------------------------------
    // MongoDB
    // -------------------------------

    if (!process.env.MONGODB_URI) {
        console.error(
            "❌ MONGODB_URI is missing!"
        );

        return;
    }

    console.log(
        "🍃 Connecting to MongoDB..."
    );

    try {
        await connectDatabase();

        console.log(
            "✅ MongoDB connected!"
        );
    } catch (error) {
        console.error(
            "❌ MongoDB connection failed:"
        );

        console.error(error);

        return;
    }

    // -------------------------------
    // Discord
    // -------------------------------

    console.log(
        "🔐 Connecting to Discord..."
    );

    try {
        await client.login(
            process.env.DISCORD_TOKEN
        );

        console.log(
            "🔐 Discord login request sent!"
        );
    } catch (error) {
        console.error(
            "❌ Discord login failed:"
        );

        console.error(error);
    }
}

start();
