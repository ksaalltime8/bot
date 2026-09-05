require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const kickCommand =
    require("./commands/kick");

const commands = [
    kickCommand.data.toJSON()
];

const rest = new REST({
    version: "10"
}).setToken(
    process.env.DISCORD_TOKEN
);

async function deploy() {
    try {
        console.log(
            `🔄 Deploying ${commands.length} command(s)...`
        );

        if (
            process.env.GUILD_ID
        ) {
            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID,
                    process.env.GUILD_ID
                ),
                {
                    body: commands
                }
            );
        } else {
            await rest.put(
                Routes.applicationCommands(
                    process.env.CLIENT_ID
                ),
                {
                    body: commands
                }
            );
        }

        console.log(
            "✅ Commands deployed!"
        );
    } catch (error) {
        console.error(
            "❌ Command deployment failed:"
        );

        console.error(error);
    }
}

deploy();
