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

const kickCommand =
    require("./commands/utility/kick");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.commands = new Collection();

client.commands.set(
    kickCommand.data.name,
    kickCommand
);

/*
 * Hostinger health-check server.
 * Hostinger requires the Node.js application
 * to listen on a port.
 */
const PORT =
    process.env.PORT || 3000;

const server = http.createServer(
    (req, res) => {
        res.writeHead(200, {
            "Content-Type":
                "text/plain"
        });

        res.end(
            "Discord bot is running!"
        );
    }
);

server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `🌐 Hostinger server listening on port ${PORT}`
        );
    }
);

/*
 * Discord slash commands.
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
            console.error(
                "❌ Command error:",
                error
            );

            const message = {
                content:
                    "❌ Something went wrong while running that command.",
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction
                    .followUp(message)
                    .catch(() => {});
            } else {
                await interaction
                    .reply(message)
                    .catch(() => {});
            }
        }
    }
);

/*
 * Discord connection.
 */
client.once(
    "clientReady",
    () => {
        console.log(
            `✅ Discord logged in as ${client.user.tag}`
        );

        console.log(
            `🌐 Connected to ${client.guilds.cache.size} server(s)`
        );

        startKickChecker(client);
    }
);

/*
 * Start everything.
 */
async function start() {
    try {
        console.log(
            "🚀 Starting Discord bot..."
        );

        if (!process.env.DISCORD_TOKEN) {
            throw new Error(
                "DISCORD_TOKEN is missing from Hostinger environment variables."
            );
        }

        if (!process.env.MONGODB_URI) {
            throw new Error(
                "MONGODB_URI is missing from Hostinger environment variables."
            );
        }

        await connectDatabase();

        console.log(
            "🔐 Connecting to Discord..."
        );

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
