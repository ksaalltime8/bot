require("dotenv").config();

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.commands = new Collection();

/*
 * Load commands.
 */
const kickCommand =
    require("./commands/kick");

client.commands.set(
    kickCommand.data.name,
    kickCommand
);

/*
 * Slash command handler.
 */
client.on(
    "interactionCreate",
    async interaction => {
        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        const command =
            client.commands.get(
                interaction.commandName
            );

        if (!command) {
            return;
        }

        try {
            await command.execute(
                interaction
            );
        } catch (error) {
            console.error(error);

            const message = {
                content:
                    "❌ Something went wrong.",
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction.followUp(
                    message
                ).catch(() => {});
            } else {
                await interaction.reply(
                    message
                ).catch(() => {});
            }
        }
    }
);

/*
 * Discord ready.
 */
client.once("ready", () => {
    console.log(
        `✅ Logged in as ${client.user.tag}`
    );

    console.log(
        `🌐 Connected to ${client.guilds.cache.size} server(s)`
    );

    startKickChecker(client);
});

/*
 * Startup.
 */
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

        await connectDatabase();

        await client.login(
            process.env.DISCORD_TOKEN
        );
    } catch (error) {
        console.error(
            "❌ Bot failed to start:"
        );

        console.error(error);

        process.exit(1);
    }
}

start();
