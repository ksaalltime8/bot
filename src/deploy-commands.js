require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const liveCommand =
    require("./commands/utility/kick");

async function deploy() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!token) {
        throw new Error("DISCORD_TOKEN is missing");
    }

    if (!clientId) {
        throw new Error("CLIENT_ID is missing");
    }

    if (!guildId) {
        throw new Error("GUILD_ID is missing");
    }

    const commands = [
        liveCommand.data.toJSON()
    ];

    console.log("🔄 Registering commands...");
    console.log("Guild:", guildId);
    console.log(
        "Commands:",
        commands.map(command => command.name)
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

    console.log("✅ /live registered!");
}

deploy().catch(error => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
});
