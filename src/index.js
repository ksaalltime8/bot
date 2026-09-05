require("dotenv").config();

const http = require("http");
const {
    Client,
    Collection,
    GatewayIntentBits
} = require("discord.js");

const { connectDatabase } = require("./database/mongodb");
const { startKickChecker } = require("./services/kickChecker");
const kickCommand = require("./commands/utility/kick");

// ─────────────────────────────────────
// Hostinger web server
// ─────────────────────────────────────

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Bot is online!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web server listening on port ${PORT}`);
});

// ─────────────────────────────────────
// Discord client
// ─────────────────────────────────────

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

client.commands.set(
    kickCommand.data.name,
    kickCommand
);

// ─────────────────────────────────────
// Slash commands
// ─────────────────────────────────────

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(
        interaction.commandName
    );

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error("❌ Command error:", error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "❌ Something went wrong.",
                ephemeral: true
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: "❌ Something went wrong.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// ─────────────────────────────────────
// Discord ready
// ─────────────────────────────────────

client.once("clientReady", () => {
    console.log(`✅ Discord logged in as ${client.user.tag}`);
    console.log(
        `🌐 Connected to ${client.guilds.cache.size} server(s)`
    );

    startKickChecker(client);
});

// ─────────────────────────────────────
// Start bot
// ─────────────────────────────────────

async function start() {
    try {
        console.log("🚀 Starting bot...");

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

        await connectDatabase();

        console.log("🔐 Logging into Discord...");

        await client.login(
            process.env.DISCORD_TOKEN
        );

    } catch (error) {
        console.error("❌ Startup error:");
        console.error(error);
    }
}

start();
