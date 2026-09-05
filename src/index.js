require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes
} = require("discord.js");

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

client.commands = new Collection();

// ==========================================
// LOAD COMMANDS
// ==========================================

function loadCommands(directory) {
    if (!fs.existsSync(directory)) {
        console.log(`⚠️ Commands folder missing: ${directory}`);
        return;
    }

    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.endsWith(".js")) {
            continue;
        }

        try {
            delete require.cache[require.resolve(filePath)];

            const command = require(filePath);

            if (
                command.data &&
                typeof command.execute === "function"
            ) {
                const name = command.data.name;

                client.commands.set(name, command);

                console.log(`✅ Loaded /${name}`);
            }

        } catch (error) {
            console.error(`❌ Failed loading ${filePath}`);
            console.error(error);
        }
    }
}

loadCommands(
    path.join(__dirname, "commands")
);

console.log(
    `📦 ${client.commands.size} commands loaded`
);

// ==========================================
// REGISTER COMMANDS WITH DISCORD
// ==========================================

async function registerCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!token) {
        throw new Error("DISCORD_TOKEN is missing.");
    }

    if (!clientId) {
        throw new Error("CLIENT_ID is missing.");
    }

    if (!guildId) {
        throw new Error("GUILD_ID is missing.");
    }

    const commands = [];

    for (const command of client.commands.values()) {
        commands.push(command.data.toJSON());
    }

    console.log("");
    console.log(
        `📤 Registering ${commands.length} commands...`
    );

    console.log(
        commands.map(x => `/${x.name}`).join(", ")
    );

    const rest = new REST({
        version: "10"
    }).setToken(token);

    await rest.put(
        Routes.applicationGuildCommands(
            clientId,
            guildId
        ),
        {
            body: commands
        }
    );

    console.log("✅ Discord commands registered!");
}

// ==========================================
// INTERACTION HANDLER
// ==========================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    console.log(
        `📥 RECEIVED /${interaction.commandName}`
    );

    const command =
        client.commands.get(
            interaction.commandName
        );

    if (!command) {
        console.log(
            `❌ COMMAND NOT FOUND: ${interaction.commandName}`
        );

        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(
            `❌ COMMAND ERROR /${interaction.commandName}`,
            error
        );

        try {
            if (
                interaction.deferred ||
                interaction.replied
            ) {
                await interaction.editReply({
                    content:
                        "❌ Command failed."
                });
            } else {
                await interaction.reply({
                    content:
                        "❌ Command failed.",
                    ephemeral: true
                });
            }
        } catch {}
    }
});


// ==========================================
// DISCORD READY
// ==========================================

client.once("clientReady", async () => {

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

    // ======================================
    // KICK CHECKER
    // ======================================

    try {

        const {
            startKickChecker
        } = require("./services/kickChecker");

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
});

// ==========================================
// DISCORD ERRORS
// ==========================================

client.on("error", error => {
    console.error("❌ Discord error:");
    console.error(error);
});

client.on("shardError", error => {
    console.error("❌ Discord gateway error:");
    console.error(error);
});

// ==========================================
// START
// ==========================================

async function start() {

    try {

        console.log("");
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

        // --------------------------------------
        // MONGODB
        // --------------------------------------

        console.log(
            "🍃 Connecting to MongoDB..."
        );

        const {
            connectDatabase
        } = require("./database/mongodb");

        await connectDatabase();

        console.log(
            "✅ MongoDB connected!"
        );

        // --------------------------------------
        // REGISTER COMMANDS
        // --------------------------------------

        await registerCommands();

        // --------------------------------------
        // LOGIN
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

        process.exit(1);
    }
}

start();
