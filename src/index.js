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

const PORT =
    process.env.PORT || 3000;

const server = http.createServer(
    (req, res) => {
        res.writeHead(200, {
            "Content-Type": "text/plain"
        });

        res.end("Discord bot is online!");
    }
);

server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `🌐 Web server listening on ${PORT}`
        );
    }
);

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
            console.log(
                `Unknown command: ${interaction.commandName}`
            );
            return;
        }

        try {
            await command.execute(
                interaction
            );
        } catch (error) {
            console.error(
                "Command error:",
                error
            );
        }
    }
);

client.once(
    "clientReady",
    () => {
        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            `🌐 Servers: ${client.guilds.cache.size}`
        );

        startKickChecker(client);
    }
);

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

        if (!process.env.MONGODB_URI) {
            throw new Error(
                "MONGODB_URI is missing."
            );
        }

        await connectDatabase();

        console.log(
            "🍃 MongoDB connected!"
        );

        await client.login(
            process.env.DISCORD_TOKEN
        );

    } catch (error) {
        console.error(
            "❌ Bot startup failed:"
        );

        console.error(error);
    }
}

start();
