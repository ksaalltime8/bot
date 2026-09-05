require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    REST,
    Routes
} = require("discord.js");

const commands = [];

const commandsPath = path.join(
    __dirname,
    "commands"
);

function loadCommands(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const fullPath = path.join(
            directory,
            file
        );

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadCommands(fullPath);
            continue;
        }

        if (!file.endsWith(".js")) {
            continue;
        }

        const command = require(fullPath);

        if (!command.data || !command.execute) {
            console.log(
                `⚠️ Skipping ${file} - invalid command`
            );

            continue;
        }

        commands.push(
            command.data.toJSON()
        );

        console.log(
            `📦 Loaded /${command.data.name}`
        );
    }
}

loadCommands(commandsPath);

async function deploy() {
    const token =
        process.env.DISCORD_TOKEN;

    const clientId =
        process.env.CLIENT_ID;

    const guildId =
        process.env.GUILD_ID;

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

    console.log("");
    console.log(
        `🚀 Deploying ${commands.length} commands...`
    );

    console.log(
        "Commands:",
        commands.map(c => `/${c.name}`).join(", ")
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

    console.log("");
    console.log(
        "================================"
    );
    console.log(
        "✅ ALL COMMANDS REGISTERED"
    );
    console.log(
        "================================"
    );
}

deploy().catch(error => {
    console.error(
        "❌ Deployment failed:"
    );

    console.error(error);

    process.exit(1);
});
