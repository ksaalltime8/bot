require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const liveCommand = require("./commands/utility/kick");

const commands = [
    liveCommand.data.toJSON()
];

const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
    try {
        if (!process.env.DISCORD_TOKEN) {
            throw new Error("DISCORD_TOKEN is missing.");
        }

        if (!process.env.CLIENT_ID) {
            throw new Error("CLIENT_ID is missing.");
        }

        if (!process.env.GUILD_ID) {
            throw new Error("GUILD_ID is missing.");
        }

        console.log("🔄 Registering /live...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log("✅ /live registered successfully!");
    } catch (error) {
        console.error("❌ Failed to register /live:");
        console.error(error);
        process.exit(1);
    }
}

deployCommands();
