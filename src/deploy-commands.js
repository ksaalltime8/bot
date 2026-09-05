require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const liveCommand =
    require("./commands/utility/kick");

const commands = [
    liveCommand.data.toJSON()
];

async function deploy() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    console.log("================================");
    console.log("      DISCORD COMMAND DEPLOY");
    console.log("================================");

    if (!token) {
        throw new Error(
            "DISCORD_TOKEN is missing."
        );
    }

    if (!clientId) {
        throw new Error(
            "CLIENT_ID is missing."
        );
    }

    if (!guildId) {
        throw new Error(
            "GUILD_ID is missing."
        );
    }

    console.log("Client ID:", clientId);
    console.log("Guild ID:", guildId);
    console.log("Commands:", commands.map(c => c.name));

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

    console.log("");
    console.log("================================");
    console.log("       /live REGISTERED");
    console.log("================================");
}

deploy().catch(error => {
    console.error("");
    console.error("❌ DEPLOY FAILED");
    console.error(error);
    process.exit(1);
});
