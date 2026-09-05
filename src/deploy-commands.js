require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    REST,
    Routes
} = require("discord.js");

const commands = [];

function loadCommands(directory) {
    if (!fs.existsSync(directory)) {
        console.error(
            `❌ Commands folder not found: ${directory}`
        );
        return;
    }

    const files = fs.readdirSync(
        directory,
        { withFileTypes: true }
    );

    for (const file of files) {

        const filePath =
            path.join(directory, file.name);

        if (file.isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.name.endsWith(".js")) {
            continue;
        }

        try {
            const command =
                require(filePath);

            if (!command.data) {
                console.log(
                    `⚠️ Skipping ${filePath}`
                );
                continue;
            }

            commands.push(
                command.data.toJSON()
            );

            console.log(
                `📦 Preparing /${command.data.name}`
            );

        } catch (error) {
            console.error(
                `❌ Failed loading ${filePath}`
            );
            console.error(error);
        }
    }
}

loadCommands(
    path.join(__dirname, "commands")
);

console.log("");
console.log(
    `📦 ${commands.length} commands ready to deploy`
);

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

const token =
    process.env.DISCORD_TOKEN;

const clientId =
    process.env.DISCORD_CLIENT_ID;

const guildId =
    process.env.DISCORD_GUILD_ID;

if (!token) {
    throw new Error(
        "❌ DISCORD_TOKEN is missing."
    );
}

if (!clientId) {
    throw new Error(
        "❌ DISCORD_CLIENT_ID is missing."
    );
}

if (!guildId) {
    throw new Error(
        "❌ DISCORD_GUILD_ID is missing."
    );
}

// ==========================================
// DEPLOY
// ==========================================

const rest = new REST({
    version: "10"
}).setToken(token);

async function deploy() {

    try {

        console.log("");
        console.log(
            "🚀 Registering Discord commands..."
        );

        console.log(
            `🤖 Client ID: ${clientId}`
        );

        console.log(
            `🏠 Guild ID: ${guildId}`
        );

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
            "✅ COMMANDS REGISTERED!"
        );
        console.log(
            "================================"
        );

        console.log(
            `📦 Registered ${commands.length} commands`
        );

        console.log(
            `📋 ${commands.map(c => "/" + c.name).join(", ")}`
        );

    } catch (error) {

        console.error("");
        console.error(
            "❌ COMMAND DEPLOYMENT FAILED"
        );

        console.error(error);
    }
}

deploy();
